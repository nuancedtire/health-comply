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
    },
    {
      id: 'ev-003',
      siteId: 's_1',
      title: 'Patient feedback summary - Q4 2025',
      qsId: 'caring.patient_experience',
      evidenceCategoryId: 'service_user_feedback',
      status: 'approved',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 15234,
      mimeType: 'application/pdf',
      summary: 'Overall satisfaction score 4.7/5. Key feedback themes compiled.',
      aiConfidence: 91,
      localControl: { title: 'Patient experience monitoring' },
    },
  ]

  const [samplePacks, setSamplePacks] = useState<any[]>([])

  useEffect(() => {
    import('@/core/data/extended_controls.json')
      .then((m: any) => {
        const arr = m?.default || m || []
        const map = new Map()
        for (const p of arr) {
          if (!map.has(p.packId)) map.set(p.packId, p)
        }
        setSamplePacks(Array.from(map.values()).slice(0, 6))
      })
      .catch(() => setSamplePacks([]))
  }, [])

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
            <p className="text-sm text-muted-foreground mb-4">Use these packs as templates when gathering evidence. Each includes best-practice examples.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {samplePacks.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">Loading reference packs...</div>
            ) : (
              samplePacks.map((pack: any, idx: number) => (
                <Card key={`${pack.packId}-${idx}`} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div>
                      <Badge className="mb-2 w-fit">{pack.packName}</Badge>
                      <CardTitle className="text-base">{pack.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{pack.description}</p>

                    {pack.evidenceExamples?.good?.length ? (
                      <div>
                        <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Good Evidence Examples
                        </div>
                        <ul className="space-y-1">
                          {pack.evidenceExamples.good.slice(0, 2).map((ex: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-green-600 flex-shrink-0">•</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                          {pack.evidenceExamples.good.length > 2 && (
                            <li className="text-xs text-muted-foreground italic">+{pack.evidenceExamples.good.length - 2} more examples</li>
                          )}
                        </ul>
                      </div>
                    ) : null}

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">View full pack for complete guidance and examples.</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default DashboardPage
