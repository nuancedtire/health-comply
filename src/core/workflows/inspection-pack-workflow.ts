import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

type Env = {
    R2: R2Bucket;
    AI: any;
    DB: D1Database;
    CEREBRAS_API_KEY: string;
};

type InspectionPackParams = {
    packId: string;
    tenantId: string;
    siteId: string;
};

interface EvidenceData {
    id: string;
    title: string;
    r2Key: string;
    mimeType: string;
    qsId: string;
    qsTitle: string;
    qsCode: string;
    kqId: string;
    kqTitle: string;
    controlId: string | null;
    controlTitle: string | null;
    evidenceDate: Date | null;
    uploadedAt: Date;
    summary: string | null;
}

interface ControlData {
    id: string;
    title: string;
    qsId: string;
    frequencyDays: number | null;
    lastEvidenceAt: Date | null;
}

interface GapData {
    controlId: string;
    controlTitle: string;
    qsId: string;
    qsTitle: string;
    kqTitle: string;
    gapType: 'missing' | 'outdated' | 'expiring_soon';
    daysOverdue?: number;
}

interface KeyQuestionData {
    id: string;
    title: string;
    displayOrder: number;
    qualityStatements: QualityStatementData[];
    evidenceCount: number;
    controlCount: number;
    gapCount: number;
    aiSummary?: string;
}

interface QualityStatementData {
    id: string;
    title: string;
    code: string;
    controls: ControlData[];
    evidence: EvidenceData[];
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 6): Promise<Response> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.ok) return response;

        if (response.status === 429 || response.status >= 500) {
            const jitter = Math.random() * 2000;
            const delay = Math.pow(2, attempt) * 2000 + jitter;
            console.log(`API rate limit or server error (status: ${response.status}). Attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
        }

        return response;
    }
    throw new Error(`Max retries (${maxRetries}) exceeded for API call`);
}

export class InspectionPackWorkflow extends WorkflowEntrypoint<Env, InspectionPackParams> {
    async run(event: WorkflowEvent<InspectionPackParams>, step: WorkflowStep) {
        console.log("Inspection Pack Workflow Started:", JSON.stringify(event));
        const { packId, tenantId, siteId } = event.payload;

        // Step 1: Gather all data
        const packData = await step.do('gather-data', async () => {
            const db = drizzle(this.env.DB, { schema });

            // Fetch pack record
            const pack = await db.query.inspectionPacks.findFirst({
                where: eq(schema.inspectionPacks.id, packId)
            });

            if (!pack) throw new Error(`Pack ${packId} not found`);

            // Parse scope data
            const scopeData = pack.scopeData ? JSON.parse(pack.scopeData) : null;

            // Determine which QS are in scope
            let qsIds: string[] = [];
            if (scopeData && Array.isArray(scopeData)) {
                qsIds = scopeData;
            } else {
                // Full site - get all QS
                const allQs = await db.select({ id: schema.cqcQualityStatements.id })
                    .from(schema.cqcQualityStatements);
                qsIds = allQs.map(qs => qs.id);
            }

            // Fetch site info
            const site = await db.query.sites.findFirst({
                where: eq(schema.sites.id, siteId)
            });

            // Fetch key questions
            const keyQuestions = await db.select()
                .from(schema.cqcKeyQuestions)
                .orderBy(schema.cqcKeyQuestions.displayOrder);

            // Fetch quality statements in scope
            const qualityStatements = await db.select({
                id: schema.cqcQualityStatements.id,
                title: schema.cqcQualityStatements.title,
                code: schema.cqcQualityStatements.code,
                keyQuestionId: schema.cqcQualityStatements.keyQuestionId,
            })
                .from(schema.cqcQualityStatements)
                .where(qsIds.length > 0 ? inArray(schema.cqcQualityStatements.id, qsIds) : undefined);

            // Fetch controls
            const controls = await db.select({
                id: schema.localControls.id,
                title: schema.localControls.title,
                qsId: schema.localControls.qsId,
                frequencyDays: schema.localControls.frequencyDays,
                lastEvidenceAt: schema.localControls.lastEvidenceAt,
            })
                .from(schema.localControls)
                .where(
                    and(
                        eq(schema.localControls.tenantId, tenantId),
                        eq(schema.localControls.siteId, siteId),
                        eq(schema.localControls.active, true),
                        qsIds.length > 0 ? inArray(schema.localControls.qsId, qsIds) : undefined
                    )
                );

            // Fetch approved evidence with related data
            const evidence = await db.select({
                id: schema.evidenceItems.id,
                title: schema.evidenceItems.title,
                r2Key: schema.evidenceItems.r2Key,
                mimeType: schema.evidenceItems.mimeType,
                qsId: schema.evidenceItems.qsId,
                localControlId: schema.evidenceItems.localControlId,
                evidenceDate: schema.evidenceItems.evidenceDate,
                uploadedAt: schema.evidenceItems.uploadedAt,
                summary: schema.evidenceItems.summary,
                qsTitle: schema.cqcQualityStatements.title,
                qsCode: schema.cqcQualityStatements.code,
                kqId: schema.cqcKeyQuestions.id,
                kqTitle: schema.cqcKeyQuestions.title,
                controlTitle: schema.localControls.title,
            })
                .from(schema.evidenceItems)
                .leftJoin(schema.cqcQualityStatements, eq(schema.evidenceItems.qsId, schema.cqcQualityStatements.id))
                .leftJoin(schema.cqcKeyQuestions, eq(schema.cqcQualityStatements.keyQuestionId, schema.cqcKeyQuestions.id))
                .leftJoin(schema.localControls, eq(schema.evidenceItems.localControlId, schema.localControls.id))
                .where(
                    and(
                        eq(schema.evidenceItems.tenantId, tenantId),
                        eq(schema.evidenceItems.siteId, siteId),
                        eq(schema.evidenceItems.status, 'approved'),
                        qsIds.length > 0 ? inArray(schema.evidenceItems.qsId, qsIds) : undefined
                    )
                )
                .orderBy(desc(schema.evidenceItems.evidenceDate));

            // Calculate gaps
            const now = new Date();
            const gaps: GapData[] = [];

            for (const control of controls) {
                const controlEvidence = evidence.filter(e => e.localControlId === control.id);
                const qs = qualityStatements.find(q => q.id === control.qsId);
                const kq = keyQuestions.find(k => k.id === qs?.keyQuestionId);

                if (controlEvidence.length === 0) {
                    gaps.push({
                        controlId: control.id,
                        controlTitle: control.title,
                        qsId: control.qsId,
                        qsTitle: qs?.title || 'Unknown',
                        kqTitle: kq?.title || 'Unknown',
                        gapType: 'missing',
                    });
                } else if (control.frequencyDays && control.lastEvidenceAt) {
                    const lastDate = new Date(control.lastEvidenceAt);
                    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysSince > control.frequencyDays) {
                        gaps.push({
                            controlId: control.id,
                            controlTitle: control.title,
                            qsId: control.qsId,
                            qsTitle: qs?.title || 'Unknown',
                            kqTitle: kq?.title || 'Unknown',
                            gapType: 'outdated',
                            daysOverdue: daysSince - control.frequencyDays,
                        });
                    } else if (control.frequencyDays - daysSince <= 30) {
                        gaps.push({
                            controlId: control.id,
                            controlTitle: control.title,
                            qsId: control.qsId,
                            qsTitle: qs?.title || 'Unknown',
                            kqTitle: kq?.title || 'Unknown',
                            gapType: 'expiring_soon',
                        });
                    }
                }
            }

            // Build structured data by key question
            const kqData: KeyQuestionData[] = [];
            for (const kq of keyQuestions) {
                const kqQualityStatements = qualityStatements.filter(qs => qs.keyQuestionId === kq.id);
                if (kqQualityStatements.length === 0) continue;

                const qsData: QualityStatementData[] = [];
                let kqEvidenceCount = 0;
                let kqControlCount = 0;
                let kqGapCount = 0;

                for (const qs of kqQualityStatements) {
                    const qsControls = controls.filter(c => c.qsId === qs.id);
                    const qsEvidence = evidence.filter(e => e.qsId === qs.id).map(e => ({
                        id: e.id,
                        title: e.title,
                        r2Key: e.r2Key,
                        mimeType: e.mimeType,
                        qsId: e.qsId,
                        qsTitle: e.qsTitle || '',
                        qsCode: e.qsCode || '',
                        kqId: e.kqId || '',
                        kqTitle: e.kqTitle || '',
                        controlId: e.localControlId,
                        controlTitle: e.controlTitle,
                        evidenceDate: e.evidenceDate,
                        uploadedAt: e.uploadedAt,
                        summary: e.summary,
                    }));
                    const qsGaps = gaps.filter(g => g.qsId === qs.id);

                    qsData.push({
                        id: qs.id,
                        title: qs.title,
                        code: qs.code,
                        controls: qsControls,
                        evidence: qsEvidence,
                    });

                    kqEvidenceCount += qsEvidence.length;
                    kqControlCount += qsControls.length;
                    kqGapCount += qsGaps.length;
                }

                kqData.push({
                    id: kq.id,
                    title: kq.title,
                    displayOrder: kq.displayOrder,
                    qualityStatements: qsData,
                    evidenceCount: kqEvidenceCount,
                    controlCount: kqControlCount,
                    gapCount: kqGapCount,
                });
            }

            return {
                siteName: site?.name || 'Unknown Site',
                scopeType: pack.scopeType,
                keyQuestions: kqData,
                gaps,
                totalEvidence: evidence.length,
                totalControls: controls.length,
                totalGaps: gaps.length,
                createdAt: pack.createdAt,
            };
        });

        // Step 2: Generate AI summaries
        const aiSummaries = await step.do('generate-summaries', async () => {
            const summaries: Record<string, string> = {};

            const apiKey = this.env.CEREBRAS_API_KEY;
            if (!apiKey) {
                console.warn("CEREBRAS_API_KEY not set, skipping AI summaries");
                return { executive: "", keyQuestions: {} };
            }

            // Generate executive summary
            try {
                const overviewPrompt = `You are a CQC compliance expert. Generate a brief executive summary (2-3 paragraphs) for a GP practice inspection pack.

Site: ${packData.siteName}
Scope: ${packData.scopeType === 'full_site' ? 'Full Site Inspection' : 'Focused Inspection'}
Total Evidence Items: ${packData.totalEvidence}
Total Controls: ${packData.totalControls}
Gaps Identified: ${packData.totalGaps}

Key Questions Covered:
${packData.keyQuestions.map(kq => `- ${kq.title}: ${kq.evidenceCount} evidence items, ${kq.gapCount} gaps`).join('\n')}

Gaps Summary:
${packData.gaps.slice(0, 10).map(g => `- ${g.gapType}: ${g.controlTitle} (${g.qsTitle})`).join('\n')}
${packData.gaps.length > 10 ? `... and ${packData.gaps.length - 10} more gaps` : ''}

Write a professional executive summary highlighting:
1. Overall compliance posture
2. Key strengths based on evidence coverage
3. Priority areas requiring attention based on gaps
`;

                const response = await fetchWithRetry(
                    "https://gateway.ai.cloudflare.com/v1/151e582b06846b3de11ef19dede88cc0/default/compat/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: "cerebras/zai-glm-4.7",
                            messages: [
                                { role: "user", content: overviewPrompt }
                            ],
                            temperature: 0.3,
                            max_tokens: 1000,
                        })
                    }
                );

                if (response.ok) {
                    const json: any = await response.json();
                    summaries.executive = json.choices?.[0]?.message?.content || "";
                }
            } catch (error) {
                console.error("Failed to generate executive summary:", error);
            }

            // Generate per-KQ summaries
            for (const kq of packData.keyQuestions) {
                if (kq.evidenceCount === 0) continue;

                try {
                    const kqPrompt = `You are a CQC compliance expert. Generate a brief summary (1-2 paragraphs) for the "${kq.title}" domain.

Quality Statements Covered: ${kq.qualityStatements.length}
Evidence Items: ${kq.evidenceCount}
Controls: ${kq.controlCount}
Gaps: ${kq.gapCount}

Quality Statements:
${kq.qualityStatements.map(qs => `- ${qs.title}: ${qs.evidence.length} evidence items`).join('\n')}

Provide a compliance assessment for this domain.`;

                    const response = await fetchWithRetry(
                        "https://gateway.ai.cloudflare.com/v1/151e582b06846b3de11ef19dede88cc0/default/compat/chat/completions",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: "cerebras/zai-glm-4.7",
                                messages: [
                                    { role: "user", content: kqPrompt }
                                ],
                                temperature: 0.3,
                                max_tokens: 500,
                            })
                        }
                    );

                    if (response.ok) {
                        const json: any = await response.json();
                        summaries[kq.id] = json.choices?.[0]?.message?.content || "";
                    }
                } catch (error) {
                    console.error(`Failed to generate summary for ${kq.id}:`, error);
                }
            }

            return {
                executive: summaries.executive || "",
                keyQuestions: Object.fromEntries(
                    Object.entries(summaries).filter(([k]) => k !== 'executive')
                ),
            };
        });

        // Step 3: Build ZIP archive
        const zipR2Key = await step.do('build-zip', async () => {
            const zip = new JSZip();

            // Create folder structure
            const indexFolder = zip.folder("00-Index");

            // Executive summary
            indexFolder?.file("executive-summary.txt", `
CQC Inspection Pack - Executive Summary
========================================
Site: ${packData.siteName}
Generated: ${new Date().toISOString()}
Scope: ${packData.scopeType === 'full_site' ? 'Full Site' : 'Focused'}

${aiSummaries.executive || 'No AI summary available.'}

Key Metrics:
- Total Evidence Items: ${packData.totalEvidence}
- Total Controls: ${packData.totalControls}
- Gaps Identified: ${packData.totalGaps}

Key Questions Summary:
${packData.keyQuestions.map(kq => `
${kq.title}
  - Evidence: ${kq.evidenceCount}
  - Controls: ${kq.controlCount}
  - Gaps: ${kq.gapCount}
`).join('')}
`);

            // Gap analysis CSV
            const gapCsvRows = [
                ['Gap Type', 'Control', 'Quality Statement', 'Key Question', 'Days Overdue'],
                ...packData.gaps.map(g => [
                    g.gapType,
                    g.controlTitle,
                    g.qsTitle,
                    g.kqTitle,
                    g.daysOverdue?.toString() || ''
                ])
            ];
            const gapCsv = gapCsvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            indexFolder?.file("gap-analysis.csv", gapCsv);

            // Evidence index CSV
            const evidenceRows: string[][] = [
                ['ID', 'Title', 'Key Question', 'Quality Statement', 'Control', 'Evidence Date', 'Summary']
            ];

            // Add evidence files to folders and build index
            for (const kq of packData.keyQuestions) {
                const kqFolderName = `${String(kq.displayOrder).padStart(2, '0')}-${kq.title.replace(/[^a-zA-Z0-9]/g, '-')}`;
                const kqFolder = zip.folder(kqFolderName);

                // Add KQ summary
                kqFolder?.file("_summary.txt", `
${kq.title}
${'='.repeat(kq.title.length)}

${aiSummaries.keyQuestions[kq.id] || 'No AI summary available.'}

Statistics:
- Evidence Items: ${kq.evidenceCount}
- Controls: ${kq.controlCount}
- Gaps: ${kq.gapCount}
`);

                for (const qs of kq.qualityStatements) {
                    const qsFolderName = `${qs.code}`;
                    const qsFolder = kqFolder?.folder(qsFolderName);

                    for (const evidence of qs.evidence) {
                        // Add to index
                        evidenceRows.push([
                            evidence.id,
                            evidence.title,
                            kq.title,
                            qs.title,
                            evidence.controlTitle || 'N/A',
                            evidence.evidenceDate?.toString() || evidence.uploadedAt?.toString() || '',
                            evidence.summary || ''
                        ]);

                        // Fetch file from R2 and add to ZIP
                        try {
                            if (this.env.R2) {
                                const r2Object = await this.env.R2.get(evidence.r2Key);
                                if (r2Object) {
                                    const buffer = await r2Object.arrayBuffer();
                                    // Sanitize filename
                                    const sanitizedTitle = evidence.title.replace(/[^a-zA-Z0-9.-]/g, '_');
                                    qsFolder?.file(sanitizedTitle, buffer);
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to fetch evidence ${evidence.id}:`, error);
                        }
                    }
                }
            }

            const evidenceCsv = evidenceRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            indexFolder?.file("evidence-index.csv", evidenceCsv);

            // Generate ZIP buffer
            const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

            // Upload to R2
            const r2Key = `t/${tenantId}/packs/${packId}/archive.zip`;
            await this.env.R2.put(r2Key, zipBuffer, {
                httpMetadata: {
                    contentType: 'application/zip',
                }
            });

            console.log(`ZIP archive uploaded to ${r2Key}`);
            return r2Key;
        });

        // Step 4: Build PDF report
        const pdfR2Key = await step.do('build-pdf', async () => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let y = margin;

            const addPage = () => {
                doc.addPage();
                y = margin;
            };

            const checkPageBreak = (needed: number) => {
                if (y + needed > pageHeight - margin) {
                    addPage();
                }
            };

            // Cover Page
            doc.setFontSize(24);
            doc.setFont("helvetica", "bold");
            doc.text("CQC Inspection Pack", pageWidth / 2, 60, { align: 'center' });

            doc.setFontSize(16);
            doc.setFont("helvetica", "normal");
            doc.text(packData.siteName, pageWidth / 2, 80, { align: 'center' });

            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 100, { align: 'center' });
            doc.text(`Scope: ${packData.scopeType === 'full_site' ? 'Full Site Inspection' : 'Focused Inspection'}`, pageWidth / 2, 110, { align: 'center' });

            doc.setFontSize(14);
            y = 140;
            doc.text("Summary Statistics", margin, y);
            y += 10;
            doc.setFontSize(11);
            doc.text(`Total Evidence Items: ${packData.totalEvidence}`, margin + 10, y);
            y += 7;
            doc.text(`Total Controls: ${packData.totalControls}`, margin + 10, y);
            y += 7;
            doc.text(`Gaps Identified: ${packData.totalGaps}`, margin + 10, y);

            // Executive Summary Page
            addPage();
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Executive Summary", margin, y);
            y += 15;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const executiveText = aiSummaries.executive || "No AI summary available.";
            const splitExecutive = doc.splitTextToSize(executiveText, pageWidth - 2 * margin);
            for (const line of splitExecutive) {
                checkPageBreak(7);
                doc.text(line, margin, y);
                y += 7;
            }

            // Gap Analysis Page
            addPage();
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Gap Analysis", margin, y);
            y += 15;

            if (packData.gaps.length === 0) {
                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                doc.text("No gaps identified. All controls have current evidence.", margin, y);
            } else {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("Gap Type", margin, y);
                doc.text("Control", margin + 30, y);
                doc.text("Quality Statement", margin + 100, y);
                y += 7;

                doc.setFont("helvetica", "normal");
                for (const gap of packData.gaps.slice(0, 30)) { // Limit to 30 for PDF
                    checkPageBreak(7);
                    const gapTypeLabel = gap.gapType === 'missing' ? 'Missing' :
                        gap.gapType === 'outdated' ? 'Outdated' : 'Expiring';
                    doc.text(gapTypeLabel, margin, y);
                    doc.text(gap.controlTitle.substring(0, 35), margin + 30, y);
                    doc.text(gap.qsTitle.substring(0, 30), margin + 100, y);
                    y += 6;
                }

                if (packData.gaps.length > 30) {
                    y += 5;
                    doc.text(`... and ${packData.gaps.length - 30} more gaps (see CSV for full list)`, margin, y);
                }
            }

            // Key Question Sections
            for (const kq of packData.keyQuestions) {
                addPage();
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.text(kq.title, margin, y);
                y += 12;

                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                doc.text(`Evidence Items: ${kq.evidenceCount}  |  Controls: ${kq.controlCount}  |  Gaps: ${kq.gapCount}`, margin, y);
                y += 10;

                // KQ Summary
                const kqSummary = aiSummaries.keyQuestions[kq.id] || "";
                if (kqSummary) {
                    const splitSummary = doc.splitTextToSize(kqSummary, pageWidth - 2 * margin);
                    for (const line of splitSummary) {
                        checkPageBreak(7);
                        doc.text(line, margin, y);
                        y += 6;
                    }
                    y += 5;
                }

                // Quality Statements
                for (const qs of kq.qualityStatements) {
                    checkPageBreak(20);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text(`${qs.code}: ${qs.title}`, margin + 5, y);
                    y += 6;

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.text(`Evidence: ${qs.evidence.length}  |  Controls: ${qs.controls.length}`, margin + 10, y);
                    y += 8;
                }
            }

            // Evidence Index (simplified)
            addPage();
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text("Evidence Index", margin, y);
            y += 15;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");

            let evidenceCount = 0;
            for (const kq of packData.keyQuestions) {
                for (const qs of kq.qualityStatements) {
                    for (const evidence of qs.evidence) {
                        if (evidenceCount >= 50) break; // Limit for PDF
                        checkPageBreak(12);
                        doc.setFont("helvetica", "bold");
                        doc.text(evidence.title.substring(0, 60), margin, y);
                        y += 5;
                        doc.setFont("helvetica", "normal");
                        doc.text(`${kq.title} > ${qs.title}`, margin + 5, y);
                        y += 7;
                        evidenceCount++;
                    }
                }
            }

            if (packData.totalEvidence > 50) {
                y += 5;
                doc.text(`... and ${packData.totalEvidence - 50} more items (see CSV for full list)`, margin, y);
            }

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.text(
                    `Page ${i} of ${pageCount} | Generated by Compass by aiigent.io`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Generate PDF buffer
            const pdfBuffer = doc.output('arraybuffer');

            // Upload to R2
            const r2Key = `t/${tenantId}/packs/${packId}/report.pdf`;
            await this.env.R2.put(r2Key, pdfBuffer, {
                httpMetadata: {
                    contentType: 'application/pdf',
                }
            });

            console.log(`PDF report uploaded to ${r2Key}`);
            return r2Key;
        });

        // Step 5: Finalize - update database
        await step.do('finalize', async () => {
            const db = drizzle(this.env.DB, { schema });

            // Insert output records
            await db.insert(schema.inspectionPackOutputs).values([
                {
                    id: `po_${crypto.randomUUID()}`,
                    tenantId,
                    packId,
                    kind: 'zip',
                    r2Key: zipR2Key,
                    createdAt: new Date(),
                },
                {
                    id: `po_${crypto.randomUUID()}`,
                    tenantId,
                    packId,
                    kind: 'pdf',
                    r2Key: pdfR2Key,
                    createdAt: new Date(),
                },
            ]);

            // Update pack status to ready
            await db.update(schema.inspectionPacks)
                .set({ status: 'ready' })
                .where(eq(schema.inspectionPacks.id, packId));

            console.log(`Inspection pack ${packId} completed successfully`);
        });
    }
}
