import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  ChevronDown,
  FileArchive,
  Users,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createInspectionPackFn,
  getInspectionPacksFn,
  getInspectionPackDetailFn,
  deleteInspectionPackFn,
  downloadPackOutputFn,
  getKeyQuestionsForPackFn,
} from '@/core/functions/inspection-pack-functions'
import { getUserSitesFn } from '@/core/functions/evidence'
import type { PackScopeType, InspectionPackDetail, EvidenceGap, KeyQuestionSummary, QualityStatementSummary } from '@/types/inspection-pack'

export const Route = createFileRoute('/presentation')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'CQC Inspection Packs' }] }),
  component: InspectionPacksPage,
})

const KEY_QUESTION_COLORS: Record<string, string> = {
  safe: 'bg-red-100 text-red-800 border-red-200',
  effective: 'bg-blue-100 text-blue-800 border-blue-200',
  caring: 'bg-purple-100 text-purple-800 border-purple-200',
  responsive: 'bg-green-100 text-green-800 border-green-200',
  well_led: 'bg-amber-100 text-amber-800 border-amber-200',
}

function InspectionPacksPage() {
  const queryClient = useQueryClient()
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [packToDelete, setPackToDelete] = useState<string | null>(null)

  // Fetch sites
  const { data: sites = [] } = useQuery({
    queryKey: ['user-sites'],
    queryFn: () => getUserSitesFn(),
  })

  // Auto-select first site
  const effectiveSiteId = selectedSiteId || sites[0]?.id || null

  // Fetch packs for site
  const { data: packs = [], isLoading: packsLoading, refetch: refetchPacks } = useQuery({
    queryKey: ['inspection-packs', effectiveSiteId],
    queryFn: () => effectiveSiteId ? getInspectionPacksFn({ data: { siteId: effectiveSiteId } }) : Promise.resolve([]),
    enabled: !!effectiveSiteId,
  })

  // Auto-select first pack
  const effectivePackId = selectedPackId || packs[0]?.id || null

  // Fetch pack detail with polling for building status
  const { data: packDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['inspection-pack-detail', effectivePackId],
    queryFn: () => effectivePackId ? getInspectionPackDetailFn({ data: { packId: effectivePackId } }) : Promise.resolve(null),
    enabled: !!effectivePackId,
    refetchInterval: (query) => {
      const data = query.state.data as InspectionPackDetail | null
      return data?.status === 'building' ? 3000 : false
    },
  })

  // Create pack mutation
  const createMutation = useMutation({
    mutationFn: createInspectionPackFn,
    onSuccess: (result: { id: string; status: string }) => {
      toast.success('Inspection pack creation started')
      setCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['inspection-packs', effectiveSiteId] })
      setSelectedPackId(result.id)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pack: ${error.message}`)
    },
  })

  // Delete pack mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInspectionPackFn,
    onSuccess: () => {
      toast.success('Inspection pack deleted')
      setDeleteDialogOpen(false)
      setPackToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['inspection-packs', effectiveSiteId] })
      if (selectedPackId === packToDelete) {
        setSelectedPackId(null)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete pack: ${error.message}`)
    },
  })

  const handleDownload = async (kind: 'zip' | 'pdf') => {
    if (!effectivePackId) return

    try {
      toast.info(`Preparing ${kind.toUpperCase()} download...`)
      const response = await downloadPackOutputFn({ data: { packId: effectivePackId, kind } })

      // Handle the Response object
      if (response instanceof Response) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = kind === 'zip' ? `inspection-pack-${effectivePackId}.zip` : `inspection-pack-${effectivePackId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`${kind.toUpperCase()} downloaded successfully`)
      }
    } catch (error: any) {
      toast.error(`Failed to download: ${error.message}`)
    }
  }

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
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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

  const getScopeLabel = (scopeType: PackScopeType) => {
    switch (scopeType) {
      case 'full_site':
        return 'Full Site'
      case 'key_question':
        return 'Key Question'
      case 'quality_statements':
        return 'Quality Statements'
      default:
        return scopeType
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
          <div className="flex items-center gap-3">
            {sites.length > 1 && (
              <Select value={effectiveSiteId || ''} onValueChange={setSelectedSiteId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <CreatePackDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              siteId={effectiveSiteId}
              onSubmit={(inputData) => createMutation.mutate({ data: inputData })}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pack List Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Your Inspection Packs</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => refetchPacks()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {packsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : packs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No inspection packs yet</p>
                    <p className="text-xs mt-1">Create your first pack to get started</p>
                  </div>
                ) : (
                  packs.map((pack: { id: string; scopeType: PackScopeType; status: string; createdAt: Date; createdByName?: string }) => (
                    <button
                      key={pack.id}
                      onClick={() => setSelectedPackId(pack.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        effectivePackId === pack.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-muted-foreground/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Package className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium text-sm truncate">
                            {getScopeLabel(pack.scopeType)} Pack
                          </span>
                        </div>
                        {getStatusBadge(pack.status)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pack.createdAt).toLocaleDateString()}
                        </div>
                        {pack.createdByName && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {pack.createdByName}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pack Detail View */}
          <div className="lg:col-span-2">
            {detailLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : packDetail ? (
              <div className="space-y-4">
                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5" />
                          <CardTitle className="text-xl">
                            {getScopeLabel(packDetail.scopeType)} Inspection Pack
                          </CardTitle>
                        </div>
                        <CardDescription>
                          Created by {packDetail.createdByName || 'Unknown'} on{' '}
                          {new Date(packDetail.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(packDetail.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setPackToDelete(packDetail.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Evidence Items</p>
                        <p className="text-2xl font-bold">{packDetail.totalEvidenceCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Controls</p>
                        <p className="text-2xl font-bold">{packDetail.totalControlsCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Gaps</p>
                        <p className="text-2xl font-bold text-amber-600">{packDetail.totalGapsCount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Coverage</p>
                        <p className="text-2xl font-bold text-green-600">{packDetail.coveragePercentage}%</p>
                      </div>
                    </div>

                    {/* Coverage Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Evidence Coverage</span>
                        <span className="font-medium">{packDetail.coveragePercentage}%</span>
                      </div>
                      <Progress value={packDetail.coveragePercentage} className="h-2" />
                    </div>

                    {/* Executive Summary */}
                    {packDetail.executiveSummary && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-sm font-semibold text-primary">AI Executive Summary</h4>
                        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-lg">
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {packDetail.executiveSummary}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Download Section */}
                    {packDetail.status === 'ready' && (
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-semibold mb-3">Download Pack</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="gap-2" onClick={() => handleDownload('zip')}>
                            <FileArchive className="w-4 h-4" />
                            ZIP Archive
                          </Button>
                          <Button variant="outline" className="gap-2" onClick={() => handleDownload('pdf')}>
                            <FileText className="w-4 h-4" />
                            PDF Report
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Downloads include: Executive summary, evidence index organized by quality statement, all
                          supporting documents, and a complete audit trail.
                        </p>
                      </div>
                    )}

                    {/* Building Status */}
                    {packDetail.status === 'building' && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <div>
                            <p className="font-medium text-blue-900">Pack Generation in Progress</p>
                            <p className="text-sm text-blue-700">
                              Collecting evidence, generating AI summaries, and compiling documents...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Status */}
                    {packDetail.status === 'error' && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="font-medium text-red-900">Pack Generation Failed</p>
                            <p className="text-sm text-red-700">
                              There was an error generating this pack. Please try creating a new one.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gap Analysis Card */}
                {packDetail.gaps.length > 0 && (
                  <GapAnalysisCard gaps={packDetail.gaps} />
                )}

                {/* Key Questions Breakdown */}
                {packDetail.status === 'ready' && packDetail.keyQuestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Evidence by Key Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {packDetail.keyQuestions.map((kq: KeyQuestionSummary) => (
                        <KeyQuestionSection key={kq.id} keyQuestion={kq} />
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Package className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">No pack selected</p>
                  <p className="text-sm">Select a pack from the list or create a new one</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* About Section */}
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
              Packs include AI-generated executive summaries, evidence organized by quality statement and category,
              supporting documents, gap analysis, and complete audit trails. Download as ZIP (folder structure) or PDF
              (report format).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inspection Pack?</DialogTitle>
            <DialogDescription>
              This will permanently delete the inspection pack and all associated files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => packToDelete && deleteMutation.mutate({ data: { packId: packToDelete } })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}

// Create Pack Dialog Component
function CreatePackDialog({
  open,
  onOpenChange,
  siteId,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string | null
  onSubmit: (data: { siteId: string; scopeType: PackScopeType; scopeData?: string[] | null }) => void
  isLoading: boolean
}) {
  const [scopeType, setScopeType] = useState<PackScopeType>('full_site')
  const [selectedKeyQuestion, setSelectedKeyQuestion] = useState<string>('')
  const [selectedQualityStatements, setSelectedQualityStatements] = useState<string[]>([])

  const { data: referenceData } = useQuery({
    queryKey: ['key-questions-for-pack'],
    queryFn: () => getKeyQuestionsForPackFn(),
    enabled: open,
  })

  const handleSubmit = () => {
    if (!siteId) return

    let scopeData: string[] | null = null
    if (scopeType === 'key_question' && selectedKeyQuestion) {
      scopeData = [selectedKeyQuestion]
    } else if (scopeType === 'quality_statements' && selectedQualityStatements.length > 0) {
      scopeData = selectedQualityStatements
    }

    onSubmit({ siteId, scopeType, scopeData })
  }

  // Used for scope validation - filter quality statements based on scope
  useMemo(() => {
    if (!referenceData?.qualityStatements) return []
    if (scopeType === 'key_question' && selectedKeyQuestion) {
      return referenceData.qualityStatements.filter((qs: { keyQuestionId: string }) => qs.keyQuestionId === selectedKeyQuestion)
    }
    return referenceData.qualityStatements
  }, [referenceData, scopeType, selectedKeyQuestion])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Pack
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Inspection Pack</DialogTitle>
          <DialogDescription>
            Choose the scope of your inspection pack. Full site includes all evidence, or select specific areas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Scope Type</Label>
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as PackScopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_site">Full Site (All Key Questions)</SelectItem>
                <SelectItem value="key_question">Single Key Question</SelectItem>
                <SelectItem value="quality_statements">Specific Quality Statements</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'key_question' && (
            <div className="space-y-2">
              <Label>Key Question</Label>
              <Select value={selectedKeyQuestion} onValueChange={setSelectedKeyQuestion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a key question" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData?.keyQuestions.map((kq) => (
                    <SelectItem key={kq.id} value={kq.id}>
                      {kq.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeType === 'quality_statements' && (
            <div className="space-y-2">
              <Label>Quality Statements</Label>
              <ScrollArea className="h-[200px] border rounded-md p-3">
                <div className="space-y-2">
                  {referenceData?.keyQuestions.map((kq) => {
                    const kqStatements = referenceData.qualityStatements.filter(
                      (qs) => qs.keyQuestionId === kq.id
                    )
                    if (kqStatements.length === 0) return null

                    return (
                      <div key={kq.id} className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">{kq.title}</p>
                        {kqStatements.map((qs) => (
                          <label
                            key={qs.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1"
                          >
                            <Checkbox
                              checked={selectedQualityStatements.includes(qs.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedQualityStatements((prev) => [...prev, qs.id])
                                } else {
                                  setSelectedQualityStatements((prev) => prev.filter((id) => id !== qs.id))
                                }
                              }}
                            />
                            <span className="truncate">{qs.title}</span>
                          </label>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedQualityStatements.length} selected
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !siteId ||
              (scopeType === 'key_question' && !selectedKeyQuestion) ||
              (scopeType === 'quality_statements' && selectedQualityStatements.length === 0)
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Pack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Gap Analysis Card Component
function GapAnalysisCard({ gaps }: { gaps: EvidenceGap[] }) {
  const [expanded, setExpanded] = useState(false)

  const missingCount = gaps.filter((g) => g.gapType === 'missing').length
  const outdatedCount = gaps.filter((g) => g.gapType === 'outdated').length
  const expiringCount = gaps.filter((g) => g.gapType === 'expiring_soon').length

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Gap Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {missingCount > 0 && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                {missingCount} Missing
              </Badge>
            )}
            {outdatedCount > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                {outdatedCount} Outdated
              </Badge>
            )}
            {expiringCount > 0 && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {expiringCount} Expiring
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>View {gaps.length} gaps</span>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[200px] mt-3">
              <div className="space-y-2">
                {gaps.map((gap, idx) => (
                  <div
                    key={`${gap.controlId}-${idx}`}
                    className="flex items-start gap-3 p-2 bg-white rounded border text-sm"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {gap.gapType === 'missing' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {gap.gapType === 'outdated' && <Clock className="h-4 w-4 text-amber-500" />}
                      {gap.gapType === 'expiring_soon' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{gap.controlTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{gap.qsTitle || gap.qsId}</p>
                      {gap.daysOverdue && (
                        <p className="text-xs text-red-600">{gap.daysOverdue} days overdue</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// Key Question Section Component
function KeyQuestionSection({ keyQuestion }: { keyQuestion: KeyQuestionSummary }) {
  const [expanded, setExpanded] = useState(false)
  const colorClass = KEY_QUESTION_COLORS[keyQuestion.id] || 'bg-gray-100 text-gray-800'

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={colorClass}>
              {keyQuestion.title}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {keyQuestion.totalEvidence} evidence items
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Progress value={keyQuestion.coveragePercentage} className="w-20 h-2" />
              <span className="text-muted-foreground w-10 text-right">
                {keyQuestion.coveragePercentage}%
              </span>
            </div>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 pt-2 space-y-2">
          {keyQuestion.qualityStatements.map((qs: QualityStatementSummary) => (
            <div key={qs.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FolderTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{qs.title}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{qs.evidenceCount} items</span>
                {qs.gapCount > 0 && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    {qs.gapCount} gaps
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {keyQuestion.aiSummary && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mt-3">
              <p className="text-xs font-medium text-blue-800 mb-1">AI Summary</p>
              <p className="text-sm text-blue-700">{keyQuestion.aiSummary}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default InspectionPacksPage
