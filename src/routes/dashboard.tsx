import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ComplianceProgress } from '@/components/dashboard/compliance-progress'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { EvidenceList } from '@/components/evidence/evidence-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, ShieldCheck, TrendingUp, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'Dashboard' }] }),
  component: DashboardPage,
})

function DashboardPage() {
  const evidence: any[] = [
    {
      id: 'ev-001',
      siteId: 's_1',
      title: 'Hand hygiene audit - Jan 2026',
      qsId: 'safe.infection_prevention_and_control',
      evidenceCategoryId: 'peoples_experience',
      status: 'approved',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 12432,
      mimeType: 'application/pdf',
      summary: 'Audit completed across all clinical areas. Improvement actions recorded.',
      aiConfidence: 87,
      localControl: { title: 'Hand hygiene audit' },
      qs: {
        title: 'Infection prevention and control',
        keyQuestion: {
          title: 'Safe',
        },
      },
      reviewerName: 'Dr. Sarah Smith',
    },
    {
      id: 'ev-002',
      siteId: 's_1',
      title: 'Fire drill - Feb 2026',
      qsId: 'safe.safe_environments',
      evidenceCategoryId: 'staff_feedback',
      status: 'pending_review',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 8421,
      mimeType: 'application/pdf',
      summary: 'Evacuation completed in 3m20s, learning points noted.',
      aiConfidence: 74,
      localControl: { title: 'Fire drill' },
      qs: {
        title: 'Safe environments',
        keyQuestion: {
          title: 'Safe',
        },
      },
      assigneeRole: 'Practice Manager',
    },
    {
      id: 'ev-003',
      siteId: 's_1',
      title: 'Patient feedback summary - Q4 2025',
      qsId: 'caring.kindness_compassion_dignity',
      evidenceCategoryId: 'peoples_experience',
      status: 'approved',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 15234,
      mimeType: 'application/pdf',
      summary: 'Overall satisfaction score 4.7/5. Key feedback themes compiled.',
      aiConfidence: 91,
      localControl: { title: 'Patient experience monitoring' },
      qs: {
        title: 'Kindness, compassion and dignity',
        keyQuestion: {
          title: 'Caring',
        },
      },
      reviewerName: 'Charlie Nurse',
    },
  ]

  // Reference packs with realistic placeholder data
  const samplePacks = [
    {
      id: 'pack_safe_ipc',
      packName: 'Infection Prevention',
      keyQuestion: 'Safe',
      title: 'Infection Prevention & Control',
      description: 'Comprehensive guidance on maintaining infection control standards, hand hygiene compliance, and environmental cleanliness across all clinical areas.',
      evidenceCount: 12,
      lastUpdated: 'Jan 2026',
      completionRate: 85,
      examples: [
        'Hand hygiene audit results',
        'Environmental cleaning schedules',
        'PPE stock monitoring logs',
      ],
    },
    {
      id: 'pack_safe_safeguarding',
      packName: 'Safeguarding',
      keyQuestion: 'Safe',
      title: 'Safeguarding Adults & Children',
      description: 'Essential controls for safeguarding vulnerable patients, maintaining risk registers, and ensuring staff training compliance.',
      evidenceCount: 18,
      lastUpdated: 'Feb 2026',
      completionRate: 92,
      examples: [
        'Safeguarding policy reviews',
        'Staff training certificates',
        'Risk assessment documentation',
      ],
    },
    {
      id: 'pack_effective_outcomes',
      packName: 'Clinical Outcomes',
      keyQuestion: 'Effective',
      title: 'Monitoring & Improving Outcomes',
      description: 'Track clinical effectiveness through audits, patient outcome measures, and quality improvement initiatives.',
      evidenceCount: 15,
      lastUpdated: 'Jan 2026',
      completionRate: 78,
      examples: [
        'Clinical audit reports',
        'QI project documentation',
        'Patient outcome tracking',
      ],
    },
    {
      id: 'pack_caring_dignity',
      packName: 'Patient Experience',
      keyQuestion: 'Caring',
      title: 'Kindness, Compassion & Dignity',
      description: 'Demonstrate patient-centered care through feedback, complaints handling, and evidence of dignity in care delivery.',
      evidenceCount: 10,
      lastUpdated: 'Feb 2026',
      completionRate: 88,
      examples: [
        'Patient satisfaction surveys',
        'Complaints and resolutions log',
        'Thank you cards and feedback',
      ],
    },
    {
      id: 'pack_responsive_access',
      packName: 'Access & Flow',
      keyQuestion: 'Responsive',
      title: 'Person-Centred Care',
      description: 'Evidence of responsive services including appointment access, reasonable adjustments, and care coordination.',
      evidenceCount: 14,
      lastUpdated: 'Jan 2026',
      completionRate: 81,
      examples: [
        'Access audit results',
        'Reasonable adjustments register',
        'Appointment waiting times',
      ],
    },
    {
      id: 'pack_wellled_governance',
      packName: 'Governance',
      keyQuestion: 'Well-led',
      title: 'Governance & Risk Management',
      description: 'Leadership evidence including meeting minutes, risk registers, incident reporting, and continuous improvement plans.',
      evidenceCount: 20,
      lastUpdated: 'Feb 2026',
      completionRate: 90,
      examples: [
        'Clinical governance meetings',
        'Risk register reviews',
        'Incident investigation reports',
      ],
    },
  ]

  const handleSelectEvidence = (_item: any) => {
    // placeholder click handler
  }

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold mb-1">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor your CQC compliance progress and evidence collection status</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KPICard
            title="Compliance Score"
            value="82%"
            description="Practice average"
            icon={ShieldCheck}
            trend="up"
            trendValue="4%"
          />

          <KPICard
            title="Evidence Uploaded"
            value="59"
            description="Last 7 days"
            icon={FileText}
            trend="neutral"
          />

          <KPICard
            title="Open Actions"
            value="7"
            description="Overdue tasks"
            icon={Users}
            trend="down"
            trendValue="2"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <ComplianceProgress />
          </div>
          <div>
            <AlertsList />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                This Month's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Quality Statement Coverage</p>
                  <p className="text-xs text-muted-foreground">8 of 10 statements</p>
                </div>
                <Badge variant="outline">80%</Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Evidence Examples Collected</p>
                  <p className="text-xs text-muted-foreground">23 items submitted</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Compliance Gaps Resolved</p>
                  <p className="text-xs text-muted-foreground">12 of 15 actions</p>
                </div>
                <Badge variant="outline">80%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium">Q1 Evidence Review</p>
                  <p className="text-xs text-muted-foreground">Due Feb 28, 2026</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium">Prepare Inspection Pack</p>
                  <p className="text-xs text-muted-foreground">Due Apr 15, 2026</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">Mock Inspection Review</p>
                  <p className="text-xs text-muted-foreground">Due May 1, 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Evidence Submissions</h2>
            <EvidenceList evidence={evidence} onSelect={handleSelectEvidence} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Quality Statement Reference Packs</h2>
            <p className="text-sm text-muted-foreground mb-4">Organized guidance for each CQC quality statement with evidence examples and completion tracking.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {samplePacks.map((pack: any) => (
              <Card key={pack.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{pack.keyQuestion}</Badge>
                    <Badge variant="secondary" className="text-xs">{pack.completionRate}%</Badge>
                  </div>
                  <CardTitle className="text-base">{pack.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{pack.description}</p>

                  <div>
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      Example Evidence Types
                    </div>
                    <ul className="space-y-1">
                      {pack.examples.map((example: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-green-600 flex-shrink-0">•</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{pack.evidenceCount} controls</span>
                    <span className="text-muted-foreground">Updated {pack.lastUpdated}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default DashboardPage
