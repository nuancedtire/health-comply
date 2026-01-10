
import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { useQuery } from '@tanstack/react-query'
import { getChecklistDataFn } from '@/core/functions/checklist-functions'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CheckCircle2, AlertCircle, ChevronRight, Upload, Clock, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useSite } from '@/components/site-context'
import { UploadModal } from '@/components/evidence/upload-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LocalControlsManager } from '@/components/checklist/local-controls-manager'

export const Route = createFileRoute('/checklist')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: ChecklistPage,
})

function ChecklistPage() {
    const { activeSite } = useSite()

    const { data, isLoading, error } = useQuery({
        queryKey: ['checklist-data', activeSite?.id],
        queryFn: () => getChecklistDataFn({ data: { siteId: activeSite?.id } }),
    })

    if (isLoading) {
        return (
            <MainLayout title="Compliance Checklist">
                <div className="flex items-center justify-center p-8">
                    <p className="text-muted-foreground">Loading checklist...</p>
                </div>
            </MainLayout>
        )
    }

    if (error) {
        return (
            <MainLayout title="Compliance Checklist">
                <div className="flex items-center justify-center p-8">
                    <p className="text-destructive">Error loading checklist: {error.message}</p>
                </div>
            </MainLayout>
        )
    }

    const { keyQuestions, overallProgress } = data || { keyQuestions: [], overallProgress: 0 }

    return (
        <MainLayout title="Compliance Checklist">
            <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="manage">Manage Controls</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    {/* Header Stats */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold tracking-tight">Compliance Status</h2>
                            <p className="text-sm text-muted-foreground">Tracking against CQC Quality Statements</p>
                        </div>
                        <div className="flex items-center gap-4 min-w-[300px]">
                            <div className="flex-1 space-y-1 text-right">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Total Compliance</span>
                                    <span className="font-bold">{overallProgress}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-2" />
                            </div>
                        </div>
                    </div>

                    {/* Key Questions List */}
                    <div className="space-y-8">
                        {keyQuestions.map((kq: any) => (
                            <div key={kq.id} className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold tracking-tight text-xl text-slate-800 uppercase">
                                        {kq.title.replace(/_/g, ' ')}
                                    </h3>
                                    <div className="h-px bg-slate-200 flex-1 ml-4" />
                                </div>

                                <div className="grid gap-2">
                                    {kq.qualityStatements.map((qs: any) => (
                                        <QualityStatementRow key={qs.id} qs={qs} siteId={activeSite?.id || ''} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="manage">
                    <LocalControlsManager />
                </TabsContent>
            </Tabs>
        </MainLayout>
    )
}

function QualityStatementRow({ qs, siteId }: { qs: any, siteId: string }) {
    const [isOpen, setIsOpen] = useState(false)

    const statusColors = {
        'complete': 'border-l-emerald-500 bg-white hover:bg-slate-50',
        'in-progress': 'border-l-amber-500 bg-white hover:bg-slate-50',
        'needs-attention': 'border-l-rose-500 bg-white hover:bg-slate-50'
    }

    const statusBadge = {
        'complete': <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none">Met</Badge>,
        'in-progress': <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>,
        'needs-attention': <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-none">Not Met</Badge>
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("border border-slate-200 rounded-md overflow-hidden transition-all duration-200 border-l-4", statusColors[qs.status as keyof typeof statusColors])}>
            <CollapsibleTrigger className="w-full">
                <div className="flex items-center p-3 gap-4">
                    <ChevronRight className={cn("w-5 h-5 text-slate-400 transition-transform", isOpen && "rotate-90")} />

                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">{qs.title}</span>
                        </div>
                    </div>

                    {/* Compact Metrics */}
                    <div className="hidden sm:flex items-center gap-6 mr-6 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5" title="Controls Met">
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            <span>{qs.controlsMet}/{qs.totalControls} Controls</span>
                        </div>
                        {qs.actionsCount > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-600" title="Open Actions">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{qs.actionsCount} Actions</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 min-w-[140px] justify-end">
                        {statusBadge[qs.status as keyof typeof statusBadge]}
                        <span className="text-sm font-medium w-8 text-right">{qs.completionPercentage}%</span>
                    </div>
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    {/* Controls Table */}
                    <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-2 px-4 text-left font-medium text-slate-500 w-[40%]">Control Requirement</th>
                                    <th className="py-2 px-4 text-left font-medium text-slate-500">Frequency</th>
                                    <th className="py-2 px-4 text-left font-medium text-slate-500">Last Evidence</th>
                                    <th className="py-2 px-4 text-right font-medium text-slate-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {qs.localControls?.map((control: any) => {
                                    const hasEvidence = control.lastEvidenceAt !== null;
                                    const isOverdue = control.nextDueAt && new Date(control.nextDueAt) < new Date();

                                    return (
                                        <tr key={control.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-2 px-4 md:py-3">
                                                <div className="flex items-start gap-2">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                                        hasEvidence ? "bg-emerald-500" : (control.hasPendingEvidence ? "bg-orange-400" : "bg-slate-300")
                                                    )} />
                                                    <span className="text-slate-700 font-medium">{control.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 text-slate-500">
                                                <Badge variant="outline" className="text-[10px] font-normal h-5 border-slate-200 bg-slate-50 text-slate-600">
                                                    {formatFrequency(control.frequencyType, control.frequencyDays)}
                                                </Badge>
                                            </td>
                                            <td className="py-2 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-xs">
                                                        {control.lastEvidenceAt
                                                            ? new Date(control.lastEvidenceAt).toLocaleDateString()
                                                            : 'Never'}
                                                    </span>
                                                    {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500 ml-1" />}
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <div className="flex justify-end">
                                                    <UploadModal
                                                        siteId={siteId}
                                                        initialQsId={qs.id}
                                                        initialControlId={control.id}
                                                        trigger={
                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600">
                                                                <Upload className="w-3.5 h-3.5" />
                                                            </Button>
                                                        }
                                                        onSuccess={() => {
                                                            // Optional: invalidate queries if needed, but react-query should handle invalidation
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {(!qs.localControls || qs.localControls.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-muted-foreground text-xs italic">
                                            No local controls defined for this Quality Statement yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

function formatFrequency(type: string, days?: number | null) {
    if (type !== 'recurring' || !days) return type.charAt(0).toUpperCase() + type.slice(1);

    if (days === 7) return 'Weekly';
    if (days === 30 || days === 31) return 'Monthly';
    if (days === 90 || days === 91 || days === 92) return 'Quarterly';
    if (days === 180 || days === 182 || days === 183) return 'Bi-Annually';
    if (days === 365 || days === 366) return 'Annually';
    if (days === 730 || days === 731) return 'Every 2 Years';

    // Fallback for custom days
    if (days % 365 === 0) return `Every ${days / 365} Years`;
    if (days % 30 === 0) return `Every ${days / 30} Months`;

    return `Every ${days} Days`;
}
