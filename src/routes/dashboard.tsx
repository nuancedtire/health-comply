import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { ComplianceProgress } from '@/components/dashboard/compliance-progress'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { EvidenceList } from '@/components/evidence/evidence-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, ShieldCheck, TrendingUp, Calendar, CheckCircle, AlertCircle, Upload, ClipboardList, Settings, UserPlus, Activity } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  head: () => ({ meta: [{ title: 'Dashboard' }] }),
  component: DashboardPage,
})

function DashboardPage() {
  const evidence: any[] = [
    {
      id: 'ev-001',
      siteId: 's_1',
      title: 'Hand hygiene audit - Jan 2026',
      qsId: 'safe.infection_prevention_and_control',
      evidenceCategoryId: 'peoples_experience',
      status: 'approved',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 12432,
      mimeType: 'application/pdf',
      summary: 'Audit completed across all clinical areas. Improvement actions recorded.',
      aiConfidence: 87,
      localControl: { title: 'Hand hygiene audit' },
      qs: {
        title: 'Infection prevention and control',
        keyQuestion: {
          title: 'Safe',
        },
      },
      reviewerName: 'Dr. Sarah Smith',
    },
    {
      id: 'ev-002',
      siteId: 's_1',
      title: 'Fire drill - Feb 2026',
      qsId: 'safe.safe_environments',
      evidenceCategoryId: 'staff_feedback',
      status: 'pending_review',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 8421,
      mimeType: 'application/pdf',
      summary: 'Evacuation completed in 3m20s, learning points noted.',
      aiConfidence: 74,
      localControl: { title: 'Fire drill' },
      qs: {
        title: 'Safe environments',
        keyQuestion: {
          title: 'Safe',
        },
      },
      assigneeRole: 'Practice Manager',
    },
    {
      id: 'ev-003',
      siteId: 's_1',
      title: 'Patient feedback summary - Q4 2025',
      qsId: 'caring.kindness_compassion_dignity',
      evidenceCategoryId: 'peoples_experience',
      status: 'approved',
      uploadedAt: new Date(),
      evidenceDate: new Date(),
      sizeBytes: 15234,
      mimeType: 'application/pdf',
      summary: 'Overall satisfaction score 4.7/5. Key feedback themes compiled.',
      aiConfidence: 91,
      localControl: { title: 'Patient experience monitoring' },
      qs: {
        title: 'Kindness, compassion and dignity',
        keyQuestion: {
          title: 'Caring',
        },
      },
      reviewerName: 'Charlie Nurse',
    },
  ]

  // Team activity feed
  const teamActivity = [
    {
      id: 'act-1',
      user: 'Dr. Sarah Smith',
      action: 'approved evidence',
      target: 'Hand hygiene audit - Jan 2026',
      time: '2 hours ago',
      type: 'approval',
    },
    {
      id: 'act-2',
      user: 'Charlie Nurse',
      action: 'uploaded evidence',
      target: 'Fire drill documentation',
      time: '4 hours ago',
      type: 'upload',
    },
    {
      id: 'act-3',
      user: 'Admin User',
      action: 'completed action',
      target: 'Update safeguarding policy',
      time: 'Yesterday',
      type: 'action',
    },
    {
      id: 'act-4',
      user: 'Dr. James Wilson',
      action: 'assigned control to',
      target: 'Nurse Lead',
      time: 'Yesterday',
      type: 'assignment',
    },
    {
      id: 'act-5',
      user: 'Practice Manager',
      action: 'created inspection pack',
      target: 'Q1 2026 CQC Review',
      time: '2 days ago',
      type: 'pack',
    },
  ]

  const handleSelectEvidence = (_item: any) => {
    // placeholder click handler
  }

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
            value="82%"
            description="Practice average"
            icon={ShieldCheck}
            trend="up"
            trendValue="4%"
          />

          <KPICard
            title="Evidence Uploaded"
            value="59"
            description="Last 7 days"
            icon={FileText}
            trend="neutral"
          />

          <KPICard
            title="Open Actions"
            value="7"
            description="Overdue tasks"
            icon={Users}
            trend="down"
            trendValue="2"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <ComplianceProgress />
          </div>
          <div>
            <AlertsList />
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
                  <p className="text-xs text-muted-foreground">8 of 10 statements</p>
                </div>
                <Badge variant="outline">80%</Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Evidence Examples Collected</p>
                  <p className="text-xs text-muted-foreground">23 items submitted</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Compliance Gaps Resolved</p>
                  <p className="text-xs text-muted-foreground">12 of 15 actions</p>
                </div>
                <Badge variant="outline">80%</Badge>
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
                <div className="space-y-4">
                  {teamActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p>
                          <span className="font-medium">{activity.user}</span>
                          {' '}<span className="text-muted-foreground">{activity.action}</span>{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <Link to="/evidence">
                    <Upload className="w-4 h-4" />
                    Upload Evidence
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/controls">
                    <ClipboardList className="w-4 h-4" />
                    View Controls
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link to="/actions">
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
