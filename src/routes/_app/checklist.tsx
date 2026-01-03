
// src/routes/_app/checklist.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/checklist')({
    component: Checklist,
})

function Checklist() {
    return <div className="p-4">Compliance Checklist (Stub)</div>
}
