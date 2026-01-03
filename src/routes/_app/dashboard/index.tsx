
// src/routes/_app/dashboard/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/dashboard/')({
    loader: () => {
        throw redirect({
            to: '/dashboard/qs',
        })
    },
})
