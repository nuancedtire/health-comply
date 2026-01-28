import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ComplianceProgress } from '@/components/dashboard/compliance-progress'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { EvidenceList } from '@/components/evidence/evidence-list'
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
  // Minimal stubs for UI composition. Data will be wired up by the real app logic.
  const evidence: any[] = []
  const handleSelectEvidence = (item: any) => {
    // no-op placeholder for evidence row click in this UI pass
    return
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
    </MainLayout>
  )
}

export default DashboardPage
