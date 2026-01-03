
// src/routes/_app/team.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/team')({
    component: Team,
})

function Team() {
    return <div className="p-4">Teams & Tasks (Stub)</div>
}
