import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,

  FileText,
  FolderTree,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  FileArchive,
  Users,
  Shield,
} from 'lucide-react'

export const Route = createFileRoute('/presentation')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'CQC Inspection Packs' }] }),
  component: InspectionPacksPage,
})

// Static demo data for inspection packs
const DEMO_PACKS = [
  {
    id: 'pk_001',
    name: 'Safe - Full Domain Pack',
    scopeType: 'key_question',
    keyQuestion: 'safe',
    keyQuestionTitle: 'Is it Safe?',
    createdAt: new Date('2026-01-20'),
    createdBy: 'Dr. Sarah Mitchell',
    status: 'ready',
    evidenceCount: 47,
    qualityStatements: 8,
    dateRange: { from: '2025-01-01', to: '2026-01-20' },
  },
  {
    id: 'pk_002',
    name: 'Well-led - Leadership & Culture',
    scopeType: 'quality_statements',
    keyQuestion: 'well_led',
    keyQuestionTitle: 'Is it Well-led?',
    createdAt: new Date('2026-01-15'),
    createdBy: 'Practice Manager',
    status: 'ready',
    evidenceCount: 32,
    qualityStatements: 3,
    dateRange: { from: '2025-06-01', to: '2026-01-15' },
  },
  {
    id: 'pk_003',
    name: 'Full Site Inspection Pack',
    scopeType: 'full_site',
    keyQuestion: null,
    keyQuestionTitle: 'All Domains',
    createdAt: new Date('2026-01-10'),
    createdBy: 'Dr. James Wilson',
    status: 'building',
    evidenceCount: 0,
    qualityStatements: 34,
    dateRange: { from: '2024-01-01', to: '2026-01-10' },
  },
  {
    id: 'pk_004',
    name: 'Effective - Clinical Care Review',
    scopeType: 'quality_statements',
    keyQuestion: 'effective',
    keyQuestionTitle: 'Is it Effective?',
    createdAt: new Date('2025-12-15'),
    createdBy: 'Dr. Sarah Mitchell',
    status: 'ready',
    evidenceCount: 28,
    qualityStatements: 5,
    dateRange: { from: '2025-01-01', to: '2025-12-15' },
  },
]

const KEY_QUESTIONS = [
  { id: 'safe', title: 'Is it Safe?', color: 'bg-red-100 text-red-800', icon: Shield },
  { id: 'effective', title: 'Is it Effective?', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  { id: 'caring', title: 'Is it Caring?', color: 'bg-purple-100 text-purple-800', icon: Users },
  { id: 'responsive', title: 'Is it Responsive?', color: 'bg-green-100 text-green-800', icon: Clock },
  { id: 'well_led', title: 'Is it Well-led?', color: 'bg-amber-100 text-amber-800', icon: Users },
]

function InspectionPacksPage() {
  const [selectedPack, setSelectedPack] = useState<string | null>(DEMO_PACKS[0].id)

  const pack = DEMO_PACKS.find((p) => p.id === selectedPack)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        )
      case 'building':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Building
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <MainLayout title="CQC Inspection Packs">
      <div className="space-y-6">
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">CQC Inspection Packs</h1>
            <p className="text-muted-foreground max-w-2xl">
              Create and manage inspection-ready evidence packs for CQC visits. Each pack includes a comprehensive
              summary, evidence index, audit trail, and all supporting documents organized by quality statement.
            </p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Pack
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pack List Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Inspection Packs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {DEMO_PACKS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPack(p.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedPack === p.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">{p.name}</span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {p.evidenceCount} evidence items
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">CQC Key Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {KEY_QUESTIONS.map((kq) => {
                  const Icon = kq.icon
                  return (
                    <div key={kq.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className={kq.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {kq.title}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* Pack Detail View */}
          <div className="lg:col-span-2">
            {pack && (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5" />
                          <CardTitle className="text-xl">{pack.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          Created by {pack.createdBy} on {new Date(pack.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {getStatusBadge(pack.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Scope Type</p>
                        <p className="font-medium capitalize">{pack.scopeType.replace('_', ' ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Key Question</p>
                        <p className="font-medium">{pack.keyQuestionTitle}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Quality Statements</p>
                        <p className="font-medium">{pack.qualityStatements} statements</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3">Evidence Period</h4>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{pack.dateRange.from}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{pack.dateRange.to}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3">Pack Contents</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{pack.evidenceCount} Evidence Items</p>
                            <p className="text-xs text-muted-foreground">Across all categories</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium">{pack.qualityStatements} Quality Statements</p>
                            <p className="text-xs text-muted-foreground">With coverage analysis</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {pack.status === 'ready' && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Download Pack</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <Button variant="outline" className="gap-2">
                            <FileArchive className="w-4 h-4" />
                            ZIP Archive
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <FileText className="w-4 h-4" />
                            PDF Report
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <FolderTree className="w-4 h-4" />
                            Tree View
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Downloads include: Executive summary, evidence index organized by quality statement, all
                          supporting documents, and a complete audit trail.
                        </p>
                      </div>
                    )}

                    {pack.status === 'building' && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                          <div>
                            <p className="font-medium text-blue-900">Pack Generation in Progress</p>
                            <p className="text-sm text-blue-700">
                              Collecting evidence, generating summaries, and compiling documents...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {pack.status === 'ready' && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Pack Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h5 className="text-sm font-semibold mb-2">Executive Summary</h5>
                        <p className="text-sm text-muted-foreground">
                          This inspection pack covers the "{pack.keyQuestionTitle}" domain for the period from{' '}
                          {pack.dateRange.from} to {pack.dateRange.to}. Evidence has been collected across{' '}
                          {pack.evidenceCount} items, organized by quality statement to demonstrate compliance with CQC
                          standards.
                        </p>
                      </div>

                      <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold mb-3">Evidence Coverage by Category</h5>
                        <div className="space-y-2 text-sm">
                          {[
                            { name: "People's Experience", count: 12, color: 'bg-purple-500' },
                            { name: 'Staff Feedback', count: 8, color: 'bg-blue-500' },
                            { name: 'Processes', count: 15, color: 'bg-green-500' },
                            { name: 'Outcomes', count: 12, color: 'bg-amber-500' },
                          ].map((cat) => (
                            <div key={cat.name} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm">{cat.name}</span>
                                  <span className="text-xs text-muted-foreground">{cat.count} items</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${cat.color}`}
                                    style={{ width: `${(cat.count / pack.evidenceCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h5 className="text-sm font-semibold mb-2">Audit Trail</h5>
                        <p className="text-xs text-muted-foreground">
                          All evidence items include upload timestamps, review dates, approver details, and version
                          history. The pack maintains a complete audit trail of all compliance activities during the
                          specified period.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">About Inspection Packs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Inspection packs</strong> are comprehensive evidence bundles designed for CQC inspections. Each
              pack can be scoped to:
            </p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                <strong>Full Site:</strong> All quality statements across all 5 key questions
              </li>
              <li>
                <strong>Key Question:</strong> All quality statements within a single domain (e.g., "Is it Safe?")
              </li>
              <li>
                <strong>Specific Quality Statements:</strong> Custom selection of statements for targeted reviews
              </li>
            </ul>
            <p>
              Packs include executive summaries, evidence organized by quality statement and category, supporting
              documents, and complete audit trails. Download as ZIP (folder structure), PDF (report), or tree view
              (visual hierarchy).
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

export default InspectionPacksPage
