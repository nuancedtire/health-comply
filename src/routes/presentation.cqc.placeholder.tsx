import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/presentation/cqc.placeholder')({
  head: () => ({ meta: [{ title: 'CQC Presentation (Placeholder)' }] }),
  component: CQCPlaceholder,
})

function CQCPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">CQC Presentation — Placeholder</h1>
      <p className="mt-2">Placeholder for the CQC presentation view. Will summarise quality statements, evidence and inspection packs for presentation to inspectors.</p>
      <p className="mt-4 text-sm text-muted-foreground">Non-functional placeholder — for review only.</p>
    </div>
  )
}

export default CQCPlaceholder
