
// src/routes/evidence/$evidenceId.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/evidence/$evidenceId')({
    component: EvidenceDetail,
})

function EvidenceDetail() {
    return <div>Evidence Detail Stub</div>
}
