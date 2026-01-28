import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ComplianceProgress } from '@/components/dashboard/compliance-progress'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { EvidenceList } from '@/components/evidence/evidence-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, ShieldCheck } from 'lucide-react'

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
  // Static demo data for the Evidence table (placeholder)
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
  ]

  const [samplePacks, setSamplePacks] = useState<any[]>([])

  useEffect(() => {
    // Dynamically import the extended_controls JSON so the UI demo reads the same source of truth
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
        <div className="md:col-span-2">
          <ComplianceProgress />
        </div>
        <div>
          <AlertsList />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Recent Evidence</h2>
        <EvidenceList evidence={evidence} onSelect={handleSelectEvidence} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Sample Inspection Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {samplePacks.length === 0 ? (
            <div className="text-muted-foreground">Loading sample packs...</div>
          ) : (
            samplePacks.map((pack: any, idx: number) => (
              <Card key={`${pack.packId}-${idx}`}>
                <CardHeader>
                  <CardTitle>{pack.packName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{pack.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">{pack.description}</p>

                  {pack.evidenceExamples?.good?.length ? (
                    <div className="mt-3">
                      <div className="text-[11px] font-semibold mb-1">Good evidence examples</div>
                      <ul className="list-disc ml-4 text-xs text-muted-foreground">
                        {pack.evidenceExamples.good.slice(0, 3).map((ex: string, i: number) => (
                          <li key={i}>{ex}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default DashboardPage
