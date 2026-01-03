
// src/routes/_app/sign-off.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/sign-off')({
    component: SignOff,
})

function SignOff() {
    return <div className="p-4">Expert Sign-Off (Stub)</div>
}
