import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Users, Shield, ArrowRight, ArrowLeft, Sparkles, Mail, Plus } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { seedLocalControlsFn } from "@/core/functions/local-control-functions"
import { inviteUserFn, getSitesFn } from "@/core/functions/admin-functions"
import { SITE_ROLES } from "@/lib/config/roles"
import { getRoleScopesWithColors } from "@/lib/config/permissions"
import { useSite } from "@/components/site-context"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"

const onboardingSearchSchema = z.object({
    siteId: z.string()
})

export const Route = createFileRoute('/onboarding')({
    validateSearch: onboardingSearchSchema,
    beforeLoad: ({ context, search }) => {
        if (!context.user) {
            throw redirect({ to: '/login' })
        }
        if (!search.siteId) {
            throw redirect({ to: '/dashboard' })
        }
    },
    component: OnboardingPage,
})

function OnboardingPage() {
    const { siteId } = Route.useSearch()
    const { tenantId } = useSite()
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [seededCount, setSeededCount] = useState(0)
    const [invitedUsers, setInvitedUsers] = useState<{ email: string, role: string }[]>([])
    const [inviteEmail, setInviteEmail] = useState("")
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

    const { data: sites } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => getSitesFn({ data: { tenantId: tenantId! } }),
        enabled: !!tenantId,
    })

    const currentSite = sites?.find(s => s.id === siteId)

    const seedMutation = useMutation({
        mutationFn: seedLocalControlsFn,
        onSuccess: (data) => {
            if (data?.success) {
                setSeededCount(data.seeded || 0)
                toast.success(`Successfully seeded ${data.seeded} controls!`)
                setStep(2)
            } else {
                toast.error("Failed to seed controls.")
            }
        },
        onError: (error: any) => {
            toast.error(`Error seeding controls: ${error.message}`)
        }
    })

    const inviteMutation = useMutation({
        mutationFn: inviteUserFn,
        onSuccess: () => {
            if (selectedRole) {
                setInvitedUsers(prev => [...prev, { email: inviteEmail, role: selectedRole }])
                toast.success(`Invite sent to ${inviteEmail}`)
                setInviteEmail("")
                setSelectedRole(null)
                setIsInviteDialogOpen(false)
            }
        },
        onError: (error: any) => {
            toast.error(`Error sending invite: ${error.message}`)
        }
    })

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail || !selectedRole || !tenantId) return
        inviteMutation.mutate({
            data: {
                email: inviteEmail,
                tenantId,
                siteId,
                role: selectedRole
            }
        })
    }

    const progress = (step / 3) * 100

    return (
        <MainLayout title="Onboarding">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Progress Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-primary">Onboarding Wizard</h1>
                        <span className="text-sm font-medium text-muted-foreground">Step {step} of 3</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-2 border-primary/10 shadow-lg">
                                <CardHeader className="text-center pb-8">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-8 h-8" />
                                    </div>
                                    <CardTitle className="text-3xl">Set Up Your Site</CardTitle>
                                    <CardDescription className="text-lg">
                                        Welcome to <span className="font-semibold text-foreground">{currentSite?.name || 'your new site'}</span>.
                                        Let's get you started with the essential CQC compliance controls.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-muted/50 rounded-lg p-6 border border-border">
                                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            What are Compliance Controls?
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            We've curated a "Starter Pack" of foundational CQC compliance controls.
                                            Seeding these will create a set of recurring audits, risk assessments, and checks
                                            specifically tailored for GP practices. These will form the backbone of your
                                            compliance evidence.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-center pt-6">
                                    <Button
                                        size="lg"
                                        className="px-8 py-6 text-lg rounded-full"
                                        onClick={() => seedMutation.mutate({ data: { siteId } })}
                                        disabled={seedMutation.isPending}
                                    >
                                        {seedMutation.isPending ? "Seeding..." : "Seed Controls"}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold mb-2">Invite Your Team</h2>
                                <p className="text-muted-foreground">Assign roles to your team members to help manage compliance.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {SITE_ROLES.map((role) => (
                                    <Card key={role.id} className="relative overflow-hidden group hover:border-primary/50 transition-colors flex flex-col">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg">{role.name}</CardTitle>
                                                <Badge variant="outline" className="bg-primary/5">Site Role</Badge>
                                            </div>
                                            <CardDescription className="line-clamp-2 min-h-[40px]">{role.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-4 flex-1">
                                            <div className="flex flex-wrap gap-1">
                                                {getRoleScopesWithColors(role.id as any).map((scope) => (
                                                    <Badge
                                                        key={scope.id}
                                                        variant="secondary"
                                                        className="text-[10px] h-5 px-1.5"
                                                        style={{ backgroundColor: `${scope.color}15`, color: scope.color, border: `1px solid ${scope.color}30` }}
                                                    >
                                                        {scope.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Dialog open={isInviteDialogOpen && selectedRole === role.id} onOpenChange={(open) => {
                                                setIsInviteDialogOpen(open)
                                                if (!open) setSelectedRole(null)
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                                                        onClick={() => setSelectedRole(role.id)}
                                                    >
                                                        <Plus className="mr-2 w-4 h-4" />
                                                        Invite {role.name}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <form onSubmit={handleInvite}>
                                                        <DialogHeader>
                                                            <DialogTitle>Invite {role.name}</DialogTitle>
                                                            <DialogDescription>
                                                                Send an invitation email to join the practice as a {role.name}.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4 space-y-4">
                                                            <div className="space-y-2">
                                                                <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                                                                <Input
                                                                    id="email"
                                                                    type="email"
                                                                    placeholder="team-member@practice.com"
                                                                    required
                                                                    value={inviteEmail}
                                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button type="submit" disabled={inviteMutation.isPending}>
                                                                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>

                            {invitedUsers.length > 0 && (
                                <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Pending Invites
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {invitedUsers.map((user, i) => (
                                            <Badge key={i} variant="secondary" className="px-3 py-1 bg-background flex gap-2 items-center border border-border">
                                                <Mail className="w-3 h-3 text-muted-foreground" />
                                                {user.email}
                                                <span className="text-muted-foreground text-[10px] font-normal uppercase tracking-wider">{user.role}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-8">
                                <Button variant="ghost" onClick={() => setStep(1)}>
                                    <ArrowLeft className="mr-2 w-4 h-4" />
                                    Back
                                </Button>
                                <div className="space-x-4">
                                    <Button variant="outline" onClick={() => setStep(3)}>Skip for Now</Button>
                                    <Button onClick={() => setStep(3)}>
                                        Continue
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="text-center"
                        >
                            <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                                <div className="h-2 bg-primary" />
                                <CardHeader className="pt-10 pb-6">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10" />
                                    </div>
                                    <CardTitle className="text-4xl font-extrabold flex items-center justify-center gap-2">
                                        You're All Set! <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                                    </CardTitle>
                                    <CardDescription className="text-xl pt-2">
                                        Your site onboarding is complete. Here's a summary of what we've set up:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="max-w-md mx-auto py-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Shield className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{seededCount} Controls</p>
                                                    <p className="text-xs text-muted-foreground">Seeded into your site library</p>
                                                </div>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{invitedUsers.length} Team Members</p>
                                                    <p className="text-xs text-muted-foreground">Invitations sent</p>
                                                </div>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center pb-12 pt-4 px-10">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full sm:w-auto px-10 py-7 text-lg"
                                        onClick={() => navigate({ to: '/checklist' })}
                                    >
                                        View Checklist
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="w-full sm:w-auto px-10 py-7 text-lg shadow-lg shadow-primary/20"
                                        onClick={() => navigate({ to: '/dashboard' })}
                                    >
                                        Go to Dashboard
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </MainLayout>
    )
}
