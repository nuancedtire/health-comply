import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MainLayout } from '@/components/main-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ComplianceProgress } from '@/components/dashboard/compliance-progress'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { EvidenceList } from '@/components/evidence/evidence-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, ShieldCheck, TrendingUp, Calendar, CheckCircle, AlertCircle, Upload, ClipboardList, Settings, UserPlus, Activity, Building2, ArrowRight, FilePlus, FileCheck, FileX, FileClock, Trash2, PenLine, PackagePlus, PackageCheck, UserCog, UserX, KeyRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSite } from '@/components/site-context'
import { getChecklistDataFn } from '@/core/functions/checklist-functions'
import { getDashboardStatsFn } from '@/core/functions/dashboard-functions'
import { getAuditLogsFn } from '@/core/functions/audit-functions'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'Dashboard' }] }),
  component: DashboardPage,
})

const ACTIVITY_CONFIG: Record<string, { label: string; icon: LucideIcon; bg: string; color: string }> = {
  'evidence.uploaded':            { label: 'uploaded evidence',       icon: FilePlus,    bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600' },
  'evidence.submitted_for_review':{ label: 'submitted for review',    icon: FileClock,   bg: 'bg-amber-100 dark:bg-amber-900/30',  color: 'text-amber-600' },
  'evidence.approved':            { label: 'approved evidence',       icon: FileCheck,   bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600' },
  'evidence.rejected':            { label: 'rejected evidence',       icon: FileX,       bg: 'bg-rose-100 dark:bg-rose-900/30',    color: 'text-rose-600' },
  'evidence.updated':             { label: 'updated evidence',        icon: PenLine,     bg: 'bg-slate-100 dark:bg-slate-800',     color: 'text-slate-600' },
  'evidence.deleted':             { label: 'deleted evidence',        icon: Trash2,      bg: 'bg-rose-100 dark:bg-rose-900/30',    color: 'text-rose-600' },
  'control.created':              { label: 'added a control',         icon: FilePlus,    bg: 'bg-blue-100 dark:bg-blue-900/30',    color: 'text-blue-600' },
  'control.updated':              { label: 'updated a control',       icon: PenLine,     bg: 'bg-slate-100 dark:bg-slate-800',     color: 'text-slate-600' },
  'control.deleted':              { label: 'removed a control',       icon: Trash2,      bg: 'bg-rose-100 dark:bg-rose-900/30',    color: 'text-rose-600' },
  'user.invited':                 { label: 'invited',                 icon: UserPlus,    bg: 'bg-violet-100 dark:bg-violet-900/30',color: 'text-violet-600' },
  'user.role_changed':            { label: 'changed role for',        icon: UserCog,     bg: 'bg-violet-100 dark:bg-violet-900/30',color: 'text-violet-600' },
  'user.deleted':                 { label: 'removed user',            icon: UserX,       bg: 'bg-rose-100 dark:bg-rose-900/30',    color: 'text-rose-600' },
  'pack.created':                 { label: 'created an inspection pack', icon: PackagePlus, bg: 'bg-indigo-100 dark:bg-indigo-900/30',color: 'text-indigo-600' },
  'pack.downloaded':              { label: 'downloaded an inspection pack', icon: PackageCheck, bg: 'bg-indigo-100 dark:bg-indigo-900/30', color: 'text-indigo-600' },
  'pack.deleted':                 { label: 'deleted an inspection pack', icon: Trash2,      bg: 'bg-rose-100 dark:bg-rose-900/30',    color: 'text-rose-600' },
  'policy.created':               { label: 'created a policy',        icon: FilePlus,    bg: 'bg-teal-100 dark:bg-teal-900/30',    color: 'text-teal-600' },
  'policy.approved':              { label: 'approved a policy',       icon: FileCheck,   bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600' },
  'policy.published':             { label: 'published a policy',      icon: FileCheck,   bg: 'bg-teal-100 dark:bg-teal-900/30',    color: 'text-teal-600' },
  'password_reset.generated':     { label: 'reset their password',    icon: KeyRound,    bg: 'bg-slate-100 dark:bg-slate-800',     color: 'text-slate-600' },
  'site.created':                 { label: 'created site',            icon: Building2,   bg: 'bg-slate-100 dark:bg-slate-800',     color: 'text-slate-600' },
  '_default':                     { label: 'performed an action',     icon: Activity,    bg: 'bg-muted',                           color: 'text-muted-foreground' },
}

function DashboardPage() {
  const { activeSite, sites, isLoading: sitesLoading, tenantId } = useSite()
  const navigate = useNavigate()

  // Compliance/domain scores — shares cache key with UnifiedControlsHub so navigating
  // dashboard → checklist is served from cache with no extra DB queries
  const { data: checklistData, isLoading: checklistLoading } = useQuery({
    queryKey: ['checklist-data', activeSite?.id],
    queryFn: () => getChecklistDataFn({ data: { siteId: activeSite!.id } }),
    enabled: !!activeSite?.id,
  })

  // Evidence stats and overdue controls (4 queries run in parallel server-side)
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', activeSite?.id],
    queryFn: () => getDashboardStatsFn({ data: { siteId: activeSite!.id } }),
    enabled: !!activeSite?.id,
  })

  // Tenant-wide audit log — restricted to Director / Admin / Compliance Officer.
  // For other roles the query throws; leaving auditData undefined is the intended fallback.
  const { data: auditData } = useQuery({
    queryKey: ['audit-logs-dashboard', tenantId],
    queryFn: () => getAuditLogsFn({ data: { limit: 5 } }),
    enabled: !!activeSite?.id,
    retry: false,
  })

  if (!sitesLoading && sites.length === 0) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Compass</h2>
              <p className="text-muted-foreground">
                Before you can view your compliance dashboard, you need to set up your first site. Sites represent the physical locations your practice manages.
              </p>
            </div>
            <Button size="lg" className="w-full" onClick={() => navigate({ to: '/create-site' })}>
              Create Your First Site
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  // --- Derived values ---

  const complianceScore = checklistData?.overallProgress ?? null

  const totalOpenActions = checklistData?.keyQuestions.reduce(
    (sum, kq) => sum + kq.qualityStatements.reduce((s, qs) => s + qs.actionsCount, 0),
    0
  ) ?? null

  const totalQs = checklistData?.keyQuestions.reduce(
    (sum, kq) => sum + kq.qualityStatements.length, 0
  ) ?? 0

  const coveredQs = checklistData?.keyQuestions.reduce(
    (sum, kq) => sum + kq.qualityStatements.filter(qs => qs.approvedEvidenceCount > 0).length,
    0
  ) ?? 0

  const domainScores = checklistData?.keyQuestions.map(kq => ({
    name: kq.title,
    score: kq.overallProgress,
    coveredQs: kq.qualityStatements.filter(qs => qs.approvedEvidenceCount > 0).length,
    totalQs: kq.qualityStatements.length,
  }))

  const alertItems = dashboardStats?.overdueControls.map(c => ({
    id: c.id,
    title: c.title,
    due: c.nextDueAt
      ? `Overdue since ${formatDistanceToNow(new Date(c.nextDueAt), { addSuffix: true })}`
      : 'Overdue',
    type: 'critical' as const,
  }))

  // Map recentEvidence to EvidenceList's expected shape.
  // Non-rendered fields (sizeBytes, mimeType, qsId) are set to safe defaults.
  const evidence = (dashboardStats?.recentEvidence ?? []).map(item => ({
    id: item.id,
    siteId: activeSite?.id ?? '',
    title: item.title,
    qsId: '',
    evidenceCategoryId: item.evidenceCategoryId,
    status: item.status,
    uploadedAt: new Date(item.uploadedAt),
    evidenceDate: item.evidenceDate ? new Date(item.evidenceDate) : null,
    sizeBytes: 0,
    mimeType: '',
    summary: null,
    aiConfidence: null,
    localControl: item.localControlTitle ? { title: item.localControlTitle } : null,
    qs: item.qsTitle
      ? { title: item.qsTitle, keyQuestion: item.kqTitle ? { title: item.kqTitle } : null }
      : null,
    reviewerName: item.reviewerName ?? null,
    assigneeRole: item.assigneeRole ?? null,
  }))

  // Tenant-wide recent activity (PM/Admin/Compliance Officer only)
  const teamActivity = (auditData?.logs ?? []).map(log => {
    const config = ACTIVITY_CONFIG[log.action as keyof typeof ACTIVITY_CONFIG] ?? ACTIVITY_CONFIG._default
    return {
      id: log.id,
      user: log.actorName ?? 'Unknown User',
      label: config.label,
      entityName: log.entityName ?? null,
      time: formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }),
      Icon: config.icon,
      iconBg: config.bg,
      iconColor: config.color,
    }
  })

  const handleSelectEvidence = (_item: any) => {
    // placeholder — evidence detail navigation not yet wired
  }

  const qsCoveragePercent = totalQs > 0 ? Math.round((coveredQs / totalQs) * 100) : 0

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold mb-1">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor your CQC compliance progress and evidence collection status</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KPICard
            title="Compliance Score"
            value={checklistLoading ? '—' : `${complianceScore ?? 0}%`}
            description="Practice average"
            icon={ShieldCheck}
            trend="neutral"
          />

          <KPICard
            title="Evidence Uploaded"
            value={statsLoading ? '—' : String(dashboardStats?.evidenceUploadedLast7Days ?? 0)}
            description="Last 7 days"
            icon={FileText}
            trend="neutral"
          />

          <KPICard
            title="Open Actions"
            value={checklistLoading ? '—' : String(totalOpenActions ?? 0)}
            description={`${dashboardStats?.evidencePendingReview ?? 0} pending review`}
            icon={Users}
            trend="neutral"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <ComplianceProgress domains={domainScores} isLoading={checklistLoading} />
          </div>
          <div>
            <AlertsList alerts={alertItems} isLoading={statsLoading} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                This Month's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Quality Statement Coverage</p>
                  <p className="text-xs text-muted-foreground">
                    {checklistLoading ? 'Loading…' : `${coveredQs} of ${totalQs} statements`}
                  </p>
                </div>
                <Badge variant="outline">
                  {checklistLoading ? '—' : `${qsCoveragePercent}%`}
                </Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Evidence Examples Collected</p>
                  <p className="text-xs text-muted-foreground">
                    {statsLoading ? 'Loading…' : `${dashboardStats?.evidenceUploadedLast7Days ?? 0} items this week`}
                  </p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Compliance Gaps</p>
                  <p className="text-xs text-muted-foreground">
                    {checklistLoading ? 'Loading…' : `${totalOpenActions ?? 0} open actions`}
                  </p>
                </div>
                <Badge variant="outline">
                  {checklistLoading ? '—' : totalOpenActions === 0 ? 'Clear' : 'In progress'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium">Q1 Evidence Review</p>
                  <p className="text-xs text-muted-foreground">Due Feb 28, 2026</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium">Prepare Inspection Pack</p>
                  <p className="text-xs text-muted-foreground">Due Apr 15, 2026</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">Mock Inspection Review</p>
                  <p className="text-xs text-muted-foreground">Due May 1, 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Evidence Submissions</h2>
            <EvidenceList evidence={evidence} onSelect={handleSelectEvidence} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Team Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Team activity is only visible to Directors, Admins, and Compliance Officers.
                  </p>
                ) : (
                  <div className="divide-y">
                    {teamActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 text-sm py-1.5 first:pt-0 last:pb-0">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-inset ring-white/40', activity.iconBg)}>
                          <activity.Icon className={cn('w-[18px] h-[18px] drop-shadow-sm', activity.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="leading-snug truncate">
                            <span className="font-medium">{activity.user}</span>
                            {' '}<span className="text-muted-foreground">{activity.label}</span>
                            {activity.entityName && (
                              <>{' '}<span className="font-medium">{activity.entityName}</span></>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/documents">
                    <Upload className="w-4 h-4" />
                    Upload Evidence
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/checklist">
                    <ClipboardList className="w-4 h-4" />
                    View Controls
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/checklist">
                    <CheckCircle className="w-4 h-4" />
                    Manage Actions
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/admin/users">
                    <UserPlus className="w-4 h-4" />
                    Invite Team Member
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default DashboardPage
