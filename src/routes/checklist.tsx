import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { useQuery } from '@tanstack/react-query'
import { getChecklistDataFn } from '@/core/functions/checklist-functions'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, AlertCircle, FileText, AlertTriangle } from 'lucide-react'

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
    const { data, isLoading, error } = useQuery({
        queryKey: ['checklist-data'],
        queryFn: () => getChecklistDataFn(),
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
            <div className="flex flex-col gap-6">
                {/* Overall Progress Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Compliance Progress</CardTitle>
                        <CardDescription>
                            Track your progress across all CQC quality statements
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Overall Completion</span>
                                <span className="text-2xl font-bold">{overallProgress}%</span>
                            </div>
                            <Progress value={overallProgress} className="h-3" />
                        </div>
                    </CardContent>
                </Card>

                {/* Key Questions Accordion */}
                <Card>
                    <CardHeader>
                        <CardTitle>CQC Key Questions</CardTitle>
                        <CardDescription>
                            Expand each section to view quality statements and their compliance status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full">
                            {keyQuestions.map((kq: any) => (
                                <AccordionItem key={kq.id} value={kq.id}>
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-lg">{kq.title}</span>
                                                <Badge variant="outline">
                                                    {kq.qualityStatements.length} statements
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-muted-foreground">
                                                    {kq.overallProgress}%
                                                </span>
                                                <Progress
                                                    value={kq.overallProgress}
                                                    className="w-24 h-2"
                                                />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-3 pt-4">
                                            {kq.qualityStatements.map((qs: any) => (
                                                <QualityStatementCard key={qs.id} qs={qs} />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}

function QualityStatementCard({ qs }: { qs: any }) {
    const getStatusIcon = () => {
        switch (qs.status) {
            case 'complete':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />
            case 'in-progress':
                return <Circle className="h-5 w-5 text-yellow-600" />
            case 'needs-attention':
                return <AlertCircle className="h-5 w-5 text-red-600" />
            default:
                return <Circle className="h-5 w-5 text-muted-foreground" />
        }
    }

    const getStatusColor = () => {
        switch (qs.status) {
            case 'complete':
                return 'border-green-200 bg-green-50/50'
            case 'in-progress':
                return 'border-yellow-200 bg-yellow-50/50'
            case 'needs-attention':
                return 'border-red-200 bg-red-50/50'
            default:
                return 'border-muted'
        }
    }

    return (
        <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon()}
                    <div className="flex-1">
                        <h4 className="font-medium mb-1">{qs.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>
                                    {qs.approvedEvidenceCount}/{qs.evidenceCount} evidence
                                </span>
                            </div>
                            {qs.actionsCount > 0 && (
                                <div className="flex items-center gap-1 text-orange-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>{qs.actionsCount} open actions</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold">{qs.completionPercentage}%</span>
                    <Progress value={qs.completionPercentage} className="w-20 h-2" />
                </div>
            </div>
        </div>
    )
}
