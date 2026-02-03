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

            const result = {
                executive: summaries.executive || "",
                keyQuestions: Object.fromEntries(
                    Object.entries(summaries).filter(([k]) => k !== 'executive')
                ),
            };

            // Save summaries to database for UI display
            const db = drizzle(this.env.DB, { schema });
            await db.update(schema.inspectionPacks)
                .set({
                    executiveSummary: result.executive,
                    keyQuestionSummaries: JSON.stringify(result.keyQuestions),
                })
                .where(eq(schema.inspectionPacks.id, packId));

            return result;
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

            // Professional color scheme (CQC blue theme)
            const colors = {
                primary: [0, 82, 147],      // CQC Blue
                secondary: [100, 100, 100], // Dark Gray
                accent: [0, 150, 200],      // Light Blue
                light: [240, 240, 240],     // Light Gray background
                white: [255, 255, 255],
                text: [50, 50, 50],         // Dark text
                success: [34, 139, 34],   // Green for good
                warning: [255, 165, 0],   // Orange for warning
                danger: [220, 20, 60],     // Red for missing
            };

            const addPage = () => {
                doc.addPage();
                y = margin;
            };

            const checkPageBreak = (needed: number) => {
                if (y + needed > pageHeight - margin) {
                    addPage();
                }
            };

            // Helper to set fill color
            const setFillColor = (rgb: number[]) => {
                doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            };

            // Helper to set text color
            const setTextColor = (rgb: number[]) => {
                doc.setTextColor(rgb[0], rgb[1], rgb[2]);
            };

            // Professional Cover Page
            // Header bar
            setFillColor(colors.primary);
            doc.rect(0, 0, pageWidth, 100, 'F');

            // Title on header
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont("helvetica", "bold");
            doc.text("CQC Inspection Pack", pageWidth / 2, 50, { align: 'center' });

            doc.setFontSize(16);
            doc.setFont("helvetica", "normal");
            doc.text(packData.siteName, pageWidth / 2, 75, { align: 'center' });

            // White content area
            y = 130;
            setTextColor(colors.text);

            // Info box
            setFillColor(colors.light);
            doc.roundedRect(margin, y, pageWidth - 2 * margin, 60, 3, 3, 'F');

            y += 15;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Pack Information", margin + 10, y);
            y += 12;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin + 10, y);
            y += 8;
            doc.text(`Scope: ${packData.scopeType === 'full_site' ? 'Full Site Inspection' : 'Focused Inspection'}`, margin + 10, y);
            y += 8;
            doc.text(`Pack ID: ${packId}`, margin + 10, y);

            // Summary statistics cards
            y += 40;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Summary Statistics", margin, y);
            y += 15;

            // Draw stat boxes
            const boxWidth = (pageWidth - 2 * margin - 30) / 3;
            const statY = y;

            // Evidence box
            setFillColor(colors.accent);
            doc.roundedRect(margin, statY, boxWidth, 35, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(String(packData.totalEvidence), margin + boxWidth / 2, statY + 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text("Evidence Items", margin + boxWidth / 2, statY + 28, { align: 'center' });

            // Controls box
            setFillColor(colors.secondary);
            doc.roundedRect(margin + boxWidth + 15, statY, boxWidth, 35, 3, 3, 'F');
            doc.text(String(packData.totalControls), margin + boxWidth + 15 + boxWidth / 2, statY + 18, { align: 'center' });
            doc.setFontSize(9);
            doc.text("Controls", margin + boxWidth + 15 + boxWidth / 2, statY + 28, { align: 'center' });

            // Gaps box (color based on count)
            const gapColor = packData.totalGaps === 0 ? colors.success : packData.totalGaps < 5 ? colors.warning : colors.danger;
            setFillColor(gapColor);
            doc.roundedRect(margin + 2 * (boxWidth + 15), statY, boxWidth, 35, 3, 3, 'F');
            doc.text(String(packData.totalGaps), margin + 2 * (boxWidth + 15) + boxWidth / 2, statY + 18, { align: 'center' });
            doc.setFontSize(9);
            doc.text("Gaps Identified", margin + 2 * (boxWidth + 15) + boxWidth / 2, statY + 28, { align: 'center' });

            y = statY + 50;

            // Footer on cover
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(9);
            doc.text("Generated by Compass by aiigent.io", pageWidth / 2, pageHeight - 20, { align: 'center' });

            // Executive Summary Page
            addPage();
            y = margin;

            // Section header with background
            setFillColor(colors.primary);
            doc.rect(0, y - 5, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Executive Summary", margin + 5, y + 10);
            y += 35;

            // AI Summary content
            setTextColor(colors.text);
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const executiveText = aiSummaries.executive || "No AI summary available. The executive summary provides an overview of the practice's compliance posture, highlighting key strengths and areas requiring attention.";
            const splitExecutive = doc.splitTextToSize(executiveText, pageWidth - 2 * margin);
            for (const line of splitExecutive) {
                checkPageBreak(7);
                doc.text(line, margin, y);
                y += 7;
            }

            // Gap Analysis Page
            addPage();
            y = margin;

            // Section header
            setFillColor(colors.primary);
            doc.rect(0, y - 5, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Gap Analysis", margin + 5, y + 10);
            y += 35;

            if (packData.gaps.length === 0) {
                // Success message
                setFillColor([230, 255, 230]);
                doc.roundedRect(margin, y, pageWidth - 2 * margin, 40, 3, 3, 'F');
                setTextColor(colors.success);
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("✓ No gaps identified", margin + 10, y + 18);
                setTextColor(colors.text);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text("All controls have current evidence. The practice is up to date with compliance requirements.", margin + 10, y + 32);
            } else {
                // Gap summary stats
                const missingCount = packData.gaps.filter(g => g.gapType === 'missing').length;
                const outdatedCount = packData.gaps.filter(g => g.gapType === 'outdated').length;
                const expiringCount = packData.gaps.filter(g => g.gapType === 'expiring_soon').length;

                setFillColor(colors.light);
                doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 3, 3, 'F');
                setTextColor(colors.text);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Missing Evidence: ${missingCount}  |  Outdated: ${outdatedCount}  |  Expiring Soon: ${expiringCount}`, margin + 10, y + 18);
                y += 40;

                // Gap table header
                setFillColor(colors.secondary);
                doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text("Type", margin + 5, y + 8);
                doc.text("Control", margin + 50, y + 8);
                doc.text("Quality Statement", margin + 150, y + 8);
                y += 15;

                // Gap rows
                setTextColor(colors.text);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);

                for (const gap of packData.gaps.slice(0, 40)) {
                    checkPageBreak(12);

                    // Alternating row background
                    if ((packData.gaps.indexOf(gap) % 2) === 1) {
                        setFillColor([250, 250, 250]);
                        doc.rect(margin, y - 5, pageWidth - 2 * margin, 10, 'F');
                    }

                    const gapTypeLabel = gap.gapType === 'missing' ? 'Missing' :
                        gap.gapType === 'outdated' ? 'Outdated' : 'Expiring';

                    // Color code the type
                    const typeColor = gap.gapType === 'missing' ? colors.danger :
                        gap.gapType === 'outdated' ? colors.warning : colors.accent;
                    setTextColor(typeColor);
                    doc.text(gapTypeLabel, margin + 5, y + 3);

                    setTextColor(colors.text);
                    doc.text(gap.controlTitle.substring(0, 40), margin + 50, y + 3);
                    doc.text(gap.qsTitle.substring(0, 35), margin + 150, y + 3);
                    y += 10;
                }

                if (packData.gaps.length > 40) {
                    y += 8;
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(150, 150, 150);
                    doc.text(`... and ${packData.gaps.length - 40} more gaps (see gap-analysis.csv in ZIP for full list)`, margin, y);
                }
            }

            // Key Question Sections
            for (const kq of packData.keyQuestions) {
                addPage();
                y = margin;

                // Section header with accent color
                setFillColor(colors.accent);
                doc.rect(0, y - 5, pageWidth, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.text(kq.title, margin + 5, y + 10);
                y += 35;

                // Stats bar
                setFillColor(colors.light);
                doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, 'F');
                setTextColor(colors.text);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Evidence: ${kq.evidenceCount} items  |  Controls: ${kq.controlCount}  |  Gaps: ${kq.gapCount}`, margin + 10, y + 12);
                y += 30;

                // KQ AI Summary
                const kqSummary = aiSummaries.keyQuestions[kq.id] || "";
                if (kqSummary) {
                    setFillColor([235, 245, 255]);
                    doc.roundedRect(margin, y, pageWidth - 2 * margin, 60, 3, 3, 'F');
                    setTextColor(colors.primary);
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("AI Assessment", margin + 10, y + 12);
                    setTextColor(colors.text);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    const splitSummary = doc.splitTextToSize(kqSummary, pageWidth - 2 * margin - 20);
                    let summaryY = y + 22;
                    for (const line of splitSummary.slice(0, 5)) { // Limit lines
                        doc.text(line, margin + 10, summaryY);
                        summaryY += 6;
                    }
                    y += 70;
                }

                // Quality Statements list
                if (kq.qualityStatements.length > 0) {
                    setTextColor(colors.secondary);
                    doc.setFontSize(11);
                    doc.setFont("helvetica", "bold");
                    doc.text("Quality Statements", margin, y);
                    y += 12;

                    for (const qs of kq.qualityStatements) {
                        checkPageBreak(25);

                        setFillColor(colors.light);
                        doc.roundedRect(margin + 5, y - 5, pageWidth - 2 * margin - 10, 18, 2, 2, 'F');

                        setTextColor(colors.accent);
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.text(qs.code, margin + 12, y + 5);

                        setTextColor(colors.text);
                        doc.setFont("helvetica", "normal");
                        const titleLines = doc.splitTextToSize(qs.title, pageWidth - 2 * margin - 80);
                        doc.text(titleLines[0], margin + 40, y + 5);

                        // Stats on right
                        setTextColor(120, 120, 120);
                        doc.setFontSize(8);
                        doc.text(`${qs.evidence.length} evidence`, pageWidth - margin - 40, y + 5, { align: 'right' });

                        y += 20;
                    }
                }
            }

            // Evidence Index Page
            addPage();
            y = margin;

            // Section header
            setFillColor(colors.primary);
            doc.rect(0, y - 5, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Evidence Index", margin + 5, y + 10);
            y += 35;

            setTextColor(colors.text);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Complete list of ${packData.totalEvidence} evidence items organized by Key Question and Quality Statement.`, margin, y);
            y += 15;

            // Evidence list (limited)
            doc.setFontSize(9);
            let evidenceCount = 0;
            for (const kq of packData.keyQuestions) {
                for (const qs of kq.qualityStatements) {
                    for (const evidence of qs.evidence) {
                        if (evidenceCount >= 60) break;
                        checkPageBreak(15);

                        // Evidence entry
                        setFillColor(colors.light);
                        doc.roundedRect(margin, y - 3, pageWidth - 2 * margin, 12, 2, 2, 'F');

                        setTextColor(colors.accent);
                        doc.setFont("helvetica", "bold");
                        doc.text(evidence.title.substring(0, 70), margin + 5, y + 4);

                        setTextColor(120, 120, 120);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(7);
                        doc.text(`${kq.title} > ${qs.code}`, margin + 5, y + 10);

                        y += 15;
                        evidenceCount++;
                    }
                }
            }

            if (packData.totalEvidence > 60) {
                y += 10;
                setFillColor([255, 250, 235]);
                doc.roundedRect(margin, y, pageWidth - 2 * margin, 30, 3, 3, 'F');
                setTextColor(colors.warning);
                doc.setFontSize(10);
                doc.setFont("helvetica", "italic");
                doc.text(`... and ${packData.totalEvidence - 60} more evidence items`, margin + 10, y + 18);
                setTextColor(colors.text);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.text("See complete evidence-index.csv in the ZIP archive", margin + 10, y + 26);
            }

            // Professional Footer on all pages
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);

                // Footer line
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

                // Footer text
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `CQC Inspection Pack | ${packData.siteName} | Page ${i} of ${pageCount}`,
                    margin,
                    pageHeight - 15
                );
                doc.text(
                    `Generated by Compass by aiigent.io`,
                    pageWidth - margin,
                    pageHeight - 15,
                    { align: 'right' }
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
