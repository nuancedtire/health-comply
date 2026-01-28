import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/presentation')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: PresentationPage,
})

function PresentationPage() {
  const [packs, setPacks] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    import('@/core/data/extended_controls.json')
      .then((m: any) => {
        const arr = m?.default || m || []
        // group by packId and pick the first occurrence per pack
        const map = new Map()
        for (const p of arr) {
          if (!map.has(p.packId)) map.set(p.packId, p)
        }
        setPacks(Array.from(map.values()).slice(0, 6))
      })
      .catch(() => setPacks([]))
  }, [])

  const selected = packs[selectedIndex]

  return (
    <MainLayout title="CQC Presentation">
      <div className="space-y-6">
        <div className="bg-muted/50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">CQC Presentation</h2>
          <p className="text-muted-foreground">Presentation-ready view of inspection packs and evidence examples.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selected.packName} — {selected.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{selected.description}</p>

                  <div className="mt-4">
                    <h4 className="text-sm font-semibold">Good evidence examples</h4>
                    <ul className="list-disc ml-5 text-sm text-muted-foreground mt-2">
                      {selected.evidenceExamples?.good?.map((g: string, i: number) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => setSelectedIndex((idx) => Math.max(0, idx - 1))}>
                      Previous
                    </Button>
                    <Button onClick={() => setSelectedIndex((idx) => Math.min(packs.length - 1, idx + 1))}>
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-muted-foreground">Loading packs...</div>
            )}
          </div>

          <aside>
            <h4 className="text-sm font-semibold mb-2">Available Packs</h4>
            <div className="space-y-2">
              {packs.map((p: any, i: number) => (
                <div key={p.packId} className={`p-3 border rounded hover:bg-muted/50 cursor-pointer ${i === selectedIndex ? 'bg-muted/20' : ''}`} onClick={() => setSelectedIndex(i)}>
                  <div className="font-medium">{p.packName}</div>
                  <div className="text-xs text-muted-foreground">{p.title}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="bg-card p-4 rounded-lg">
          <h3 className="text-lg font-medium">Inspection Pack Summary (Demo)</h3>
          <p className="text-sm text-muted-foreground">Use these sample packs to present to inspectors. Data is static from extended_controls.json.</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default PresentationPage
