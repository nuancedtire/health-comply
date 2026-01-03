import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/evidence/$evidenceId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/evidence/$evidenceId"!</div>
}
