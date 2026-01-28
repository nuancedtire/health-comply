import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard.placeholder')({
  head: () => ({ meta: [{ title: 'Dashboard (Placeholder)' }] }),
  component: DashboardPlaceholder,
})

function DashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard — Placeholder</h1>
      <p className="mt-2">This is a non-functional placeholder page created for UI/UX review. The real dashboard will show KPIs, compliance progress, and quick actions.</p>
      <p className="mt-4 text-sm text-muted-foreground">See project README for implementation notes.</p>
    </div>
  )
}

export default DashboardPlaceholder
