import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
    CheckCircle, Users, Shield, ArrowRight, ArrowLeft, Sparkles, Mail, Plus,
    Building, Bug, Pill, BookOpen, AlertTriangle, FileSearch, Building2, UserPlus,
    Pencil, Trash2
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { seedLocalControlsFn } from "@/core/functions/local-control-functions"
import { inviteUserFn, createSiteFn, createCustomRoleFn, getCustomRolesFn } from "@/core/functions/admin-functions"
import { ROLES, TENANT_ROLES, SITE_ROLES } from "@/lib/config/roles"
import { getRoleScopesWithColors } from "@/lib/config/permissions"
import { useSite } from "@/components/site-context"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import STARTER_PACK from "@/core/data/starter_pack_controls.json"

const onboardingSearchSchema = z.object({
    siteId: z.string().optional(),
    tenantId: z.string().optional(),
})

export const Route = createFileRoute('/onboarding')({
    validateSearch: onboardingSearchSchema,
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({ to: '/login' })
        }
    },
    component: OnboardingPage,
})

// Pack icon mapping
const PACK_ICONS: Record<string, React.ReactNode> = {
    'Shield': <Shield className="w-5 h-5" />,
    'Bug': <Bug className="w-5 h-5" />,
    'Pill': <Pill className="w-5 h-5" />,
    'Building': <Building className="w-5 h-5" />,
    'BookOpen': <BookOpen className="w-5 h-5" />,
    'AlertTriangle': <AlertTriangle className="w-5 h-5" />,
    'FileSearch': <FileSearch className="w-5 h-5" />,
    'Building2': <Building2 className="w-5 h-5" />,
    'UserPlus': <UserPlus className="w-5 h-5" />,
}

// Group starter pack by pack name
const PACK_GROUPS = (() => {
    const groups: Record<string, { packName: string; packIcon: string; controls: typeof STARTER_PACK }> = {}
    for (const control of STARTER_PACK) {
        if (!groups[control.packId]) {
            groups[control.packId] = { packName: control.packName, packIcon: control.packIcon, controls: [] }
        }
        groups[control.packId].controls.push(control)
    }
    return Object.values(groups)
})()

type CustomRoleEntry = {
    id?: string
    name: string
    baseRoleId: string
    type: string
    description: string
    isNew?: boolean
}

function OnboardingPage() {
    const search = Route.useSearch()
    const siteContext = useSite()
    const tenantId = search.tenantId || siteContext.tenantId
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const totalSteps = 5

    // Step 1: Create Site
    const [siteName, setSiteName] = useState("")
    const [siteAddress, setSiteAddress] = useState("")
    const [createdSiteId, setCreatedSiteId] = useState<string | null>(search.siteId || null)

    // Step 2: Configure Roles
    const [customRoles, setCustomRoles] = useState<CustomRoleEntry[]>([])
    const [newRoleName, setNewRoleName] = useState("")
    const [newRoleBase, setNewRoleBase] = useState("")
    const [newRoleDesc, setNewRoleDesc] = useState("")
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false)

    // Step 3: Seed Controls
    const [seededCount, setSeededCount] = useState(0)

    // Step 4: Invite Team
    const [invitedUsers, setInvitedUsers] = useState<{ email: string; role: string }[]>([])
    const [inviteEmail, setInviteEmail] = useState("")
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

    // Fetch existing custom roles for this tenant
    const { data: existingCustomRoles } = useQuery({
        queryKey: ['custom-roles', tenantId],
        queryFn: () => getCustomRolesFn({ data: { tenantId: tenantId! } }),
        enabled: !!tenantId,
    })

    // Mutations
    const createSiteMutation = useMutation({
        mutationFn: createSiteFn,
        onSuccess: (data) => {
            setCreatedSiteId(data.siteId)
            toast.success("Site created successfully!")
            setStep(2)
        },
        onError: (err: any) => toast.error(err.message || "Failed to create site")
    })

    const createCustomRoleMutation = useMutation({
        mutationFn: createCustomRoleFn,
    })

    const seedMutation = useMutation({
        mutationFn: seedLocalControlsFn,
        onSuccess: (data) => {
            if (data?.success) {
                setSeededCount(data.seeded || 0)
                toast.success(`Successfully seeded ${data.seeded} controls!`)
                setStep(4)
            } else {
                toast.error("Failed to seed controls.")
            }
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`)
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
        onError: (err: any) => toast.error(`Error: ${err.message}`)
    })

    const handleCreateSite = () => {
        if (!siteName || !tenantId) return
        createSiteMutation.mutate({
            data: { name: siteName, address: siteAddress, tenantId }
        })
    }

    const handleAddCustomRole = () => {
        if (!newRoleName || !newRoleBase) return
        const baseRole = ROLES.find(r => r.id === newRoleBase)
        if (!baseRole) return

        setCustomRoles(prev => [...prev, {
            name: newRoleName,
            baseRoleId: newRoleBase,
            type: baseRole.type,
            description: newRoleDesc || baseRole.description,
            isNew: true,
        }])
        setNewRoleName("")
        setNewRoleBase("")
        setNewRoleDesc("")
        setIsAddRoleOpen(false)
    }

    const handleRemoveCustomRole = (index: number) => {
        setCustomRoles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSaveRolesAndContinue = async () => {
        // Save any new custom roles to the database
        for (const role of customRoles) {
            if (role.isNew && tenantId) {
                try {
                    await createCustomRoleMutation.mutateAsync({
                        data: {
                            tenantId,
                            name: role.name,
                            baseRoleId: role.baseRoleId,
                            description: role.description,
                        }
                    })
                } catch (err: any) {
                    toast.error(`Failed to create role "${role.name}": ${err.message}`)
                    return
                }
            }
        }
        setStep(3)
    }

    const handleSeedControls = () => {
        if (!createdSiteId) return
        seedMutation.mutate({ data: { siteId: createdSiteId } })
    }

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail || !selectedRole || !tenantId) return
        inviteMutation.mutate({
            data: {
                email: inviteEmail,
                tenantId,
                siteId: createdSiteId || undefined,
                role: selectedRole
            }
        })
    }

    const progress = (step / totalSteps) * 100

    const allRolesForInvite = [
        ...ROLES.map(r => ({ id: r.id, name: r.name, type: r.type, description: r.description })),
        ...customRoles.map(r => ({ id: r.name, name: r.name, type: r.type, description: r.description })),
    ]

    return (
        <MainLayout title="Onboarding">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Progress Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-primary">Set Up Your Organization</h1>
                        <span className="text-sm font-medium text-muted-foreground">Step {step} of {totalSteps}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between mt-2">
                        {['Create Site', 'Configure Roles', 'Starter Pack', 'Invite Team', 'Complete'].map((label, i) => (
                            <span
                                key={label}
                                className={`text-xs ${i + 1 <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ===== STEP 1: CREATE SITE ===== */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-2 border-primary/10 shadow-lg">
                                <CardHeader className="text-center pb-6">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Building className="w-8 h-8" />
                                    </div>
                                    <CardTitle className="text-3xl">Create Your First Site</CardTitle>
                                    <CardDescription className="text-lg">
                                        A site represents a physical location or branch within your organization.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="max-w-md mx-auto space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="site-name" className="text-base">Site Name</Label>
                                        <Input
                                            id="site-name"
                                            placeholder="e.g. Main Surgery, London Branch"
                                            className="h-12 text-base"
                                            value={siteName}
                                            onChange={(e) => setSiteName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="site-address" className="text-base">Address (Optional)</Label>
                                        <Input
                                            id="site-address"
                                            placeholder="e.g. 123 High Street, London"
                                            className="h-12 text-base"
                                            value={siteAddress}
                                            onChange={(e) => setSiteAddress(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-center pt-6">
                                    <Button
                                        size="lg"
                                        className="px-8 py-6 text-lg rounded-full"
                                        onClick={handleCreateSite}
                                        disabled={!siteName || createSiteMutation.isPending}
                                    >
                                        {createSiteMutation.isPending ? "Creating..." : "Create Site"}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}

                    {/* ===== STEP 2: CONFIGURE ROLES ===== */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold mb-2">Configure Roles</h2>
                                <p className="text-muted-foreground">
                                    Review the default roles and add custom ones for your organization.
                                </p>
                            </div>

                            {/* Default Roles */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organization Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {TENANT_ROLES.map((role) => (
                                        <Card key={role.id} className="bg-muted/30">
                                            <CardHeader className="pb-2 pt-4 px-4">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-base">{role.name}</CardTitle>
                                                    <Badge variant="outline" className="text-[10px] bg-primary/5">Org</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                <p className="text-xs text-muted-foreground">{role.description}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {getRoleScopesWithColors(role.id as any).map((scope) => (
                                                        <Badge
                                                            key={scope.id}
                                                            variant="secondary"
                                                            className="text-[9px] h-4 px-1"
                                                            style={{ backgroundColor: `${scope.color}15`, color: scope.color, border: `1px solid ${scope.color}30` }}
                                                        >
                                                            {scope.label}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Site Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {SITE_ROLES.map((role) => (
                                        <Card key={role.id} className="bg-muted/30">
                                            <CardHeader className="pb-2 pt-4 px-4">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-base">{role.name}</CardTitle>
                                                    <Badge variant="outline" className="text-[10px]">Site</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                <p className="text-xs text-muted-foreground">{role.description}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {getRoleScopesWithColors(role.id as any).map((scope) => (
                                                        <Badge
                                                            key={scope.id}
                                                            variant="secondary"
                                                            className="text-[9px] h-4 px-1"
                                                            style={{ backgroundColor: `${scope.color}15`, color: scope.color, border: `1px solid ${scope.color}30` }}
                                                        >
                                                            {scope.label}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Roles */}
                            {customRoles.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Custom Roles</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {customRoles.map((role, index) => (
                                            <Card key={index} className="bg-primary/5 border-primary/20">
                                                <CardHeader className="pb-2 pt-4 px-4">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-base">{role.name}</CardTitle>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveCustomRole(index)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-4 pb-4">
                                                    <p className="text-xs text-muted-foreground">{role.description}</p>
                                                    <Badge variant="secondary" className="text-[9px] mt-2">
                                                        Based on: {role.baseRoleId}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Custom Role */}
                            <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full border-dashed">
                                        <Plus className="mr-2 w-4 h-4" />
                                        Add Custom Role
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Custom Role</DialogTitle>
                                        <DialogDescription>
                                            Custom roles inherit permissions from a base role but use your own naming.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Role Name</Label>
                                            <Input
                                                placeholder="e.g. Head of Nursing, Clinical Lead"
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Based On (inherits permissions from)</Label>
                                            <Select value={newRoleBase} onValueChange={setNewRoleBase}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a base role..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.map(r => (
                                                        <SelectItem key={r.id} value={r.id}>
                                                            {r.name} ({r.type})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description (Optional)</Label>
                                            <Textarea
                                                placeholder="What does this role do?"
                                                value={newRoleDesc}
                                                onChange={(e) => setNewRoleDesc(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddCustomRole} disabled={!newRoleName || !newRoleBase}>
                                            Add Role
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <div className="flex justify-between items-center pt-6">
                                <Button variant="ghost" onClick={() => setStep(1)}>
                                    <ArrowLeft className="mr-2 w-4 h-4" />
                                    Back
                                </Button>
                                <Button onClick={handleSaveRolesAndContinue} disabled={createCustomRoleMutation.isPending}>
                                    {createCustomRoleMutation.isPending ? "Saving..." : "Continue"}
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== STEP 3: SEED STARTER PACK ===== */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-2 border-primary/10 shadow-lg">
                                <CardHeader className="text-center pb-6">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    <CardTitle className="text-3xl">Compliance Starter Pack</CardTitle>
                                    <CardDescription className="text-lg">
                                        We've curated {STARTER_PACK.length} foundational CQC compliance controls
                                        across {PACK_GROUPS.length} domains. These form the backbone of your compliance evidence.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {PACK_GROUPS.map((pack) => (
                                            <div
                                                key={pack.packName}
                                                className="p-4 rounded-lg border bg-muted/30 space-y-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                                        {PACK_ICONS[pack.packIcon] || <Shield className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-sm">{pack.packName}</h4>
                                                        <p className="text-xs text-muted-foreground">
                                                            {pack.controls.length} control{pack.controls.length > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ul className="space-y-1">
                                                    {pack.controls.map((control) => (
                                                        <li key={control.title} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                            <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                                            {control.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between pt-6">
                                    <Button variant="ghost" onClick={() => setStep(2)}>
                                        <ArrowLeft className="mr-2 w-4 h-4" />
                                        Back
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="px-8 py-6 text-lg rounded-full"
                                        onClick={handleSeedControls}
                                        disabled={seedMutation.isPending}
                                    >
                                        {seedMutation.isPending ? "Seeding..." : "Seed Controls"}
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}

                    {/* ===== STEP 4: INVITE TEAM ===== */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold mb-2">Invite Your Team</h2>
                                <p className="text-muted-foreground">
                                    Assign roles to your team members to help manage compliance.
                                </p>
                            </div>

                            {/* Organization Roles */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organization Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {TENANT_ROLES.filter(r => r.id !== 'Director').map((role) => (
                                        <RoleInviteCard
                                            key={role.id}
                                            role={role}
                                            badge="Org"
                                            inviteEmail={inviteEmail}
                                            setInviteEmail={setInviteEmail}
                                            selectedRole={selectedRole}
                                            setSelectedRole={setSelectedRole}
                                            isInviteDialogOpen={isInviteDialogOpen}
                                            setIsInviteDialogOpen={setIsInviteDialogOpen}
                                            handleInvite={handleInvite}
                                            inviteMutation={inviteMutation}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Site Roles */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Site Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {SITE_ROLES.map((role) => (
                                        <RoleInviteCard
                                            key={role.id}
                                            role={role}
                                            badge="Site"
                                            inviteEmail={inviteEmail}
                                            setInviteEmail={setInviteEmail}
                                            selectedRole={selectedRole}
                                            setSelectedRole={setSelectedRole}
                                            isInviteDialogOpen={isInviteDialogOpen}
                                            setIsInviteDialogOpen={setIsInviteDialogOpen}
                                            handleInvite={handleInvite}
                                            inviteMutation={inviteMutation}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Custom Roles */}
                            {customRoles.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Custom Roles</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {customRoles.map((role) => (
                                            <RoleInviteCard
                                                key={role.name}
                                                role={{ id: role.name, name: role.name, type: role.type, description: role.description }}
                                                badge="Custom"
                                                inviteEmail={inviteEmail}
                                                setInviteEmail={setInviteEmail}
                                                selectedRole={selectedRole}
                                                setSelectedRole={setSelectedRole}
                                                isInviteDialogOpen={isInviteDialogOpen}
                                                setIsInviteDialogOpen={setIsInviteDialogOpen}
                                                handleInvite={handleInvite}
                                                inviteMutation={inviteMutation}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {invitedUsers.length > 0 && (
                                <div className="mt-8 p-4 bg-muted rounded-lg border border-border">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Pending Invites ({invitedUsers.length})
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
                                <Button variant="ghost" onClick={() => setStep(3)}>
                                    <ArrowLeft className="mr-2 w-4 h-4" />
                                    Back
                                </Button>
                                <div className="space-x-4">
                                    <Button variant="outline" onClick={() => setStep(5)}>Skip for Now</Button>
                                    <Button onClick={() => setStep(5)}>
                                        Continue
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ===== STEP 5: COMPLETE ===== */}
                    {step === 5 && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="text-center"
                        >
                            <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
                                <div className="h-2 bg-primary" />
                                <CardHeader className="pt-10 pb-6">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-10 h-10" />
                                    </div>
                                    <CardTitle className="text-4xl font-extrabold">You're All Set!</CardTitle>
                                    <CardDescription className="text-xl pt-2">
                                        Your organization is ready. Here's a summary:
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="max-w-md mx-auto py-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Building className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Site Created</p>
                                                    <p className="text-xs text-muted-foreground">{siteName}</p>
                                                </div>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        </div>

                                        {seededCount > 0 && (
                                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2 bg-primary/10 rounded-lg">
                                                        <Shield className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{seededCount} Controls</p>
                                                        <p className="text-xs text-muted-foreground">Seeded into your site</p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </div>
                                        )}

                                        {customRoles.length > 0 && (
                                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className="p-2 bg-primary/10 rounded-lg">
                                                        <Pencil className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{customRoles.length} Custom Role{customRoles.length > 1 ? 's' : ''}</p>
                                                        <p className="text-xs text-muted-foreground">Created for your organization</p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{invitedUsers.length} Team Member{invitedUsers.length !== 1 ? 's' : ''}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {invitedUsers.length > 0 ? 'Invitations sent' : 'No invitations yet'}
                                                    </p>
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

// ===== Role Invite Card Component =====

function RoleInviteCard({
    role,
    badge,
    inviteEmail,
    setInviteEmail,
    selectedRole,
    setSelectedRole,
    isInviteDialogOpen,
    setIsInviteDialogOpen,
    handleInvite,
    inviteMutation,
}: {
    role: { id: string; name: string; type: string; description: string }
    badge: string
    inviteEmail: string
    setInviteEmail: (v: string) => void
    selectedRole: string | null
    setSelectedRole: (v: string | null) => void
    isInviteDialogOpen: boolean
    setIsInviteDialogOpen: (v: boolean) => void
    handleInvite: (e: React.FormEvent) => void
    inviteMutation: any
}) {
    return (
        <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <Badge variant="outline" className="bg-primary/5 text-[10px]">{badge}</Badge>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 flex-1">
                {role.type !== 'custom' && (
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
                )}
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
                                    Send an invitation email to join as {role.name}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invite-email">Email Address</Label>
                                    <Input
                                        id="invite-email"
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
    )
}
