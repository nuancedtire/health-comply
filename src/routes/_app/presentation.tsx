import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/presentation')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/presentation"!</div>
}
