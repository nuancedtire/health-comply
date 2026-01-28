import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { UnifiedControlsHub } from '@/components/checklist/unified-controls-hub'

export const Route = createFileRoute('/presentation')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: PresentationPage,
})

function PresentationPage() {
  return (
    <MainLayout title="CQC Presentation">
      <div className="space-y-6">
        <div className="bg-muted/50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">CQC Presentation</h2>
          <p className="text-muted-foreground">View your compliance status in a presentation-ready format.</p>
        </div>

        {/* Controls hub provides a focused view of quality statements and controls that is useful for presentations */}
        <UnifiedControlsHub />

        <div className="bg-card p-4 rounded-lg">
          <h3 className="text-lg font-medium">Inspection Packs</h3>
          <p className="text-sm text-muted-foreground">Generate inspection packs filtered for the current presentation. (UI placeholder)</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default PresentationPage
