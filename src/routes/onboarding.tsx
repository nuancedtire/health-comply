import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    CheckCircle, Users, Shield, ArrowRight, ArrowLeft, Sparkles, Mail, Plus,
    Building, Bug, Pill, BookOpen, AlertTriangle, FileSearch, Building2, UserPlus,
    Pencil, Trash2, X
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { seedLocalControlsFn } from "@/core/functions/local-control-functions"
import { inviteUserFn, createSiteFn, createCustomRoleFn } from "@/core/functions/admin-functions"
import { ROLES, TENANT_ROLES, SITE_ROLES } from "@/lib/config/roles"
import { getRoleScopesWithColors } from "@/lib/config/permissions"
import { useSite } from "@/components/site-context"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import STARTER_PACK from "@/core/data/starter_pack_controls.json"

const onboardingSearchSchema = z.object({
    siteId: z.string().optional(),
    tenantId: z.string().optional(),
    step: z.coerce.number().min(1).max(5).optional(),
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

// ===== Role Tier Configuration =====
const ACCESS_TIERS = [
    { id: 'full',    label: 'Full',        dots: 4, baseRoleId: 'Director'     },
    { id: 'admin',   label: 'Admin',       dots: 3, baseRoleId: 'Admin'        },
    { id: 'contrib', label: 'Contributor', dots: 2, baseRoleId: 'Clinical Lead' },
    { id: 'view',    label: 'View',        dots: 1, baseRoleId: 'Practitioner' },
] as const

const ROLE_TIER: Record<string, string> = {
    'Director': 'full',
    'Admin': 'admin',
    'Compliance Officer': 'admin',
    'Site Lead': 'contrib',
    'Clinical Lead': 'contrib',
    'Safety Lead': 'contrib',
    'Practitioner': 'view',
    'Support Staff': 'view',
}

const ROLE_CAPABILITIES: Record<string, { summary: string; can: string[]; cannot: string[] }> = {
    'Director': {
        summary: 'Full control over the entire organization.',
        can: ['Manage all sites and team members', 'Invite and remove any user', 'Configure roles and settings', 'Generate and share inspection reports'],
        cannot: [],
    },
    'Admin': {
        summary: 'Administrative control across the organization.',
        can: ['Invite and manage team members', 'Create and edit compliance controls', 'Approve or reject evidence', 'Generate inspection reports'],
        cannot: ['Remove the Director or transfer ownership'],
    },
    'Compliance Officer': {
        summary: 'Focused on compliance monitoring across all sites.',
        can: ['Create and edit compliance controls', 'Monitor evidence across all sites', 'Generate inspection packs'],
        cannot: ['Invite or remove team members', 'Access billing or org settings'],
    },
    'Site Lead': {
        summary: 'Manages compliance for their assigned site.',
        can: ['View and manage site compliance', 'Upload and submit evidence for review', 'View site team roster'],
        cannot: ['Invite users', 'Access other sites or org-wide settings'],
    },
    'Clinical Lead': {
        summary: 'Lead clinician for a site, with evidence management rights.',
        can: ['Upload and edit evidence', 'Submit evidence for review', 'Manage clinical controls'],
        cannot: ['Approve their own evidence submissions', 'Manage users or org settings'],
    },
    'Safety Lead': {
        summary: 'Responsible for safety and safeguarding compliance.',
        can: ['Manage safety-related controls', 'Upload safeguarding evidence', 'Flag risks and issues'],
        cannot: ['Approve evidence', 'Manage users or org settings'],
    },
    'Practitioner': {
        summary: 'Clinical or operational staff with view and upload access.',
        can: ['View compliance status and controls', 'Upload evidence documents'],
        cannot: ['Edit controls', 'Approve evidence', 'Manage users'],
    },
    'Support Staff': {
        summary: 'Front desk or admin staff with basic view and upload access.',
        can: ['View compliance status', 'Upload evidence documents'],
        cannot: ['Edit controls', 'Approve evidence', 'Manage users'],
    },
}

function TierDots({ tierId }: { tierId: string }) {
    const tier = ACCESS_TIERS.find(t => t.id === tierId)
    const filled = tier?.dots ?? 0
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= filled ? 'bg-primary' : 'bg-border'}`} />
            ))}
        </div>
    )
}

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
    const queryClient = useQueryClient()
    const [step, setStepState] = useState(() => search.step ?? (search.siteId ? 2 : 1))
    const totalSteps = 5

    const setStep = (next: number) => {
        setStepState(next)
        navigate({ to: '/onboarding', search: (prev) => ({ ...prev, step: next }), replace: true })
    }

    // Step 1: Create Site
    const [siteName, setSiteName] = useState("")
    const [siteAddress, setSiteAddress] = useState("")
    const [createdSiteId, setCreatedSiteId] = useState<string | null>(search.siteId || null)

    // Step 2: Configure Roles
    const [customRoles, setCustomRoles] = useState<CustomRoleEntry[]>([])
    const [disabledRoleIds, setDisabledRoleIds] = useState<string[]>([])
    const [selectedRoleId, setSelectedRoleId] = useState<string>('Director')
    const [isAddingRole, setIsAddingRole] = useState(false)
    const [newRoleName, setNewRoleName] = useState("")
    const [newRoleTier, setNewRoleTier] = useState("")

    // Step 3: Seed Controls
    const [seededCount, setSeededCount] = useState(0)

    // Step 4: Invite Team
    const [invitedUsers, setInvitedUsers] = useState<{ email: string; role: string }[]>([])
    const [inviteEmail, setInviteEmail] = useState("")
    const [selectedRole, setSelectedRole] = useState<string | null>(null)
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

    // Mutations
    const createSiteMutation = useMutation({
        mutationFn: createSiteFn,
        onSuccess: (data) => {
            setCreatedSiteId(data.siteId)
            toast.success("Site created successfully!")
            queryClient.invalidateQueries({ queryKey: ['sites'] })
            setStepState(2)
            navigate({ to: '/onboarding', search: (prev) => ({ ...prev, siteId: data.siteId, step: 2 }), replace: true })
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
        if (!newRoleName || !newRoleTier) return
        const tier = ACCESS_TIERS.find(t => t.id === newRoleTier)
        if (!tier) return
        const baseRole = ROLES.find(r => r.id === tier.baseRoleId)
        if (!baseRole) return

        setCustomRoles(prev => [...prev, {
            name: newRoleName,
            baseRoleId: tier.baseRoleId,
            type: baseRole.type,
            description: baseRole.description,
            isNew: true,
        }])
        setNewRoleName("")
        setNewRoleTier("")
        setIsAddingRole(false)
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
    const STEP_LABELS = ['Create Site', 'Configure Roles', 'Starter Pack', 'Invite Team', 'Complete']

    return (
        <MainLayout title="Onboarding">
            <div className="w-full max-w-6xl mx-auto py-6 px-6">
                {/* Progress Header */}
                <div className="mb-10">
                    <div className="flex justify-between items-baseline mb-5">
                        <h1 className="text-xl font-bold text-foreground">Set Up Your Organization</h1>
                        <span className="text-xs font-medium text-muted-foreground">Step {step} of {totalSteps}</span>
                    </div>
                    <div className="relative">
                        <div className="flex items-center gap-0">
                            {STEP_LABELS.map((label, i) => {
                                const isCompleted = i + 1 < step
                                const isActive = i + 1 === step
                                return (
                                    <div key={label} className="flex items-center flex-1 last:flex-none">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-7 h-7 rounded-sm border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                                                isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                                                isActive ? 'bg-primary/10 border-primary text-primary' :
                                                'bg-background border-border text-muted-foreground'
                                            }`}>
                                                {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                                            </div>
                                            <span className={`text-[10px] font-medium whitespace-nowrap hidden sm:block ${
                                                isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>{label}</span>
                                        </div>
                                        {i < STEP_LABELS.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 transition-colors ${i + 1 < step ? 'bg-primary' : 'bg-border'}`} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-border rounded-sm overflow-hidden shadow-sm">
                                {/* Left panel - context */}
                                <div className="bg-primary/5 border-r border-border p-10 flex flex-col justify-between">
                                    <div>
                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-sm flex items-center justify-center mb-6">
                                            <Building className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-3">Create Your First Site</h2>
                                        <p className="text-muted-foreground leading-relaxed">
                                            A site represents a physical location or branch within your organization — such as a GP surgery, clinic, or care home.
                                        </p>
                                    </div>
                                    <div className="mt-10 space-y-3">
                                        {[
                                            'Each site gets its own compliance controls',
                                            'Team members can be scoped to specific sites',
                                            'You can add more sites after onboarding',
                                        ].map((item) => (
                                            <div key={item} className="flex items-start gap-2.5">
                                                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                <span className="text-sm text-muted-foreground">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Right panel - form */}
                                <div className="bg-card p-10 flex flex-col justify-center">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="site-name" className="text-sm font-semibold">Site Name</Label>
                                            <Input
                                                id="site-name"
                                                placeholder="e.g. Main Surgery, London Branch"
                                                className="h-11"
                                                value={siteName}
                                                onChange={(e) => setSiteName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && siteName && handleCreateSite()}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="site-address" className="text-sm font-semibold">
                                                Address <span className="text-muted-foreground font-normal">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="site-address"
                                                placeholder="e.g. 123 High Street, London"
                                                className="h-11"
                                                value={siteAddress}
                                                onChange={(e) => setSiteAddress(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            size="lg"
                                            className="w-full mt-2"
                                            onClick={handleCreateSite}
                                            disabled={!siteName || createSiteMutation.isPending}
                                        >
                                            {createSiteMutation.isPending ? "Creating..." : "Create Site"}
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1">Configure Roles</h2>
                                <p className="text-muted-foreground">
                                    Select which roles apply to your organization. Click any role to see what it can do.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-border rounded-sm overflow-hidden">
                                {/* LEFT: Role list */}
                                <div className="border-r border-border flex flex-col">
                                    <div className="flex-1 overflow-auto">
                                        {/* Default roles grouped */}
                                        {[
                                            { label: 'Organization', roles: TENANT_ROLES },
                                            { label: 'Site', roles: SITE_ROLES },
                                        ].map(group => (
                                            <div key={group.label}>
                                                <div className="px-4 py-2 bg-muted/40 border-b border-border">
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                                                </div>
                                                {group.roles.map((role) => {
                                                    const isActive = selectedRoleId === role.id
                                                    const isEnabled = !disabledRoleIds.includes(role.id)
                                                    return (
                                                        <button
                                                            key={role.id}
                                                            onClick={() => setSelectedRoleId(role.id)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left transition-colors ${isActive ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isEnabled}
                                                                onChange={(e) => {
                                                                    e.stopPropagation()
                                                                    setDisabledRoleIds(prev =>
                                                                        isEnabled
                                                                            ? [...prev, role.id]
                                                                            : prev.filter(id => id !== role.id)
                                                                    )
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="accent-primary shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${!isEnabled ? 'text-muted-foreground line-through' : ''}`}>{role.name}</p>
                                                            </div>
                                                            <TierDots tierId={ROLE_TIER[role.id] ?? 'view'} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ))}

                                        {/* Custom roles */}
                                        {customRoles.length > 0 && (
                                            <div>
                                                <div className="px-4 py-2 bg-muted/40 border-b border-border">
                                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom</span>
                                                </div>
                                                {customRoles.map((role, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{role.name}</p>
                                                            <p className="text-xs text-muted-foreground">Based on {role.baseRoleId}</p>
                                                        </div>
                                                        <TierDots tierId={ROLE_TIER[role.baseRoleId] ?? 'view'} />
                                                        <button
                                                            onClick={() => handleRemoveCustomRole(idx)}
                                                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add custom role — inline */}
                                    <div className="border-t border-border p-4">
                                        {!isAddingRole ? (
                                            <button
                                                onClick={() => setIsAddingRole(true)}
                                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add a custom role
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <Input
                                                    placeholder="e.g. Head of Nursing"
                                                    value={newRoleName}
                                                    onChange={(e) => setNewRoleName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomRole()}
                                                    autoFocus
                                                />
                                                <div className="flex gap-1.5">
                                                    {ACCESS_TIERS.map(tier => (
                                                        <button
                                                            key={tier.id}
                                                            onClick={() => setNewRoleTier(tier.id)}
                                                            className={`flex-1 py-1.5 text-xs font-medium rounded-sm border-2 transition-colors ${newRoleTier === tier.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-foreground/30'}`}
                                                        >
                                                            {tier.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleAddCustomRole} disabled={!newRoleName || !newRoleTier}>
                                                        Add
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => { setIsAddingRole(false); setNewRoleName(""); setNewRoleTier("") }}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT: Detail panel */}
                                {(() => {
                                    const role = ROLES.find(r => r.id === selectedRoleId)
                                    const caps = role ? ROLE_CAPABILITIES[role.id] : null
                                    const tier = role ? ACCESS_TIERS.find(t => t.id === ROLE_TIER[role.id]) : null
                                    if (!role || !caps) return <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">Select a role to see details</div>
                                    return (
                                        <div className="p-7 bg-muted/10 flex flex-col">
                                            <div className="flex items-start justify-between mb-1">
                                                <h3 className="font-bold text-lg">{role.name}</h3>
                                                {tier && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <TierDots tierId={tier.id} />
                                                        <span className="text-xs font-medium text-muted-foreground">{tier.label}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-6">{caps.summary}</p>

                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Can</p>
                                            <ul className="space-y-2.5 mb-6">
                                                {caps.can.map(item => (
                                                    <li key={item} className="flex items-start gap-2.5 text-sm">
                                                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>

                                            {caps.cannot.length > 0 && (
                                                <>
                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cannot</p>
                                                    <ul className="space-y-2.5">
                                                        {caps.cannot.map(item => (
                                                            <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                                                <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                                                                    <div className="w-3 h-px bg-muted-foreground/50" />
                                                                </div>
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <Button variant="ghost" onClick={() => setStep(1)}>
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                                <Button onClick={handleSaveRolesAndContinue} disabled={createCustomRoleMutation.isPending}>
                                    {createCustomRoleMutation.isPending ? "Saving..." : "Continue"}
                                    <ArrowRight className="w-4 h-4" />
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
                            className="space-y-6"
                        >
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-sm flex items-center justify-center">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <h2 className="text-2xl font-bold">Compliance Starter Pack</h2>
                                </div>
                                <p className="text-muted-foreground ml-11">
                                    {STARTER_PACK.length} foundational CQC compliance controls across {PACK_GROUPS.length} domains — pre-built to get you inspection-ready.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {PACK_GROUPS.map((pack) => (
                                    <div
                                        key={pack.packName}
                                        className="p-4 border-2 border-border rounded-sm bg-card space-y-3 hover:border-primary/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-primary/10 rounded-sm text-primary">
                                                {PACK_ICONS[pack.packIcon] || <Shield className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">{pack.packName}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {pack.controls.length} control{pack.controls.length > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <ul className="space-y-1.5">
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

                            <div className="flex justify-between items-center pt-4">
                                <Button variant="ghost" onClick={() => setStep(2)}>
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleSeedControls}
                                    disabled={seedMutation.isPending}
                                >
                                    {seedMutation.isPending ? "Seeding..." : "Seed Controls"}
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
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
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold mb-1">Invite Your Team</h2>
                                <p className="text-muted-foreground">
                                    Assign roles to your team members to help manage compliance.
                                </p>
                            </div>

                            {/* Organization Roles */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organization Roles</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {TENANT_ROLES.filter(r => r.id !== 'Director' && !disabledRoleIds.includes(r.id)).map((role) => (
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
                                    {SITE_ROLES.filter(r => !disabledRoleIds.includes(r.id)).map((role) => (
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

                            <div className="flex justify-between items-center pt-4">
                                <Button variant="ghost" onClick={() => setStep(3)}>
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </Button>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(5)}>Skip for Now</Button>
                                    <Button onClick={() => setStep(5)}>
                                        Continue
                                        <ArrowRight className="w-4 h-4" />
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
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 border-border rounded-sm overflow-hidden shadow-sm">
                                {/* Left - celebration panel */}
                                <div className="bg-primary p-10 flex flex-col justify-center text-primary-foreground">
                                    <div className="w-14 h-14 bg-primary-foreground/15 rounded-sm flex items-center justify-center mb-6">
                                        <CheckCircle className="w-7 h-7 text-primary-foreground" />
                                    </div>
                                    <h2 className="text-3xl font-extrabold mb-3">You're All Set!</h2>
                                    <p className="text-primary-foreground/80 leading-relaxed text-base">
                                        Your organization is configured and ready for compliance management. Head to your dashboard to start tracking quality statements.
                                    </p>
                                </div>
                                {/* Right - summary */}
                                <div className="bg-card p-10">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">Setup Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3.5 border-2 border-border rounded-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-primary/10 rounded-sm">
                                                    <Building className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">Site Created</p>
                                                    <p className="text-xs text-muted-foreground">{siteName}</p>
                                                </div>
                                            </div>
                                            <CheckCircle className="w-4 h-4 text-primary" />
                                        </div>

                                        {seededCount > 0 && (
                                            <div className="flex items-center justify-between p-3.5 border-2 border-border rounded-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-primary/10 rounded-sm">
                                                        <Shield className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{seededCount} Controls Seeded</p>
                                                        <p className="text-xs text-muted-foreground">Compliance starter pack applied</p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-4 h-4 text-primary" />
                                            </div>
                                        )}

                                        {customRoles.length > 0 && (
                                            <div className="flex items-center justify-between p-3.5 border-2 border-border rounded-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-primary/10 rounded-sm">
                                                        <Pencil className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{customRoles.length} Custom Role{customRoles.length > 1 ? 's' : ''}</p>
                                                        <p className="text-xs text-muted-foreground">Created for your organization</p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-4 h-4 text-primary" />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between p-3.5 border-2 border-border rounded-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-primary/10 rounded-sm">
                                                    <Users className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{invitedUsers.length} Team Member{invitedUsers.length !== 1 ? 's' : ''}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {invitedUsers.length > 0 ? 'Invitations sent' : 'No invitations sent yet'}
                                                    </p>
                                                </div>
                                            </div>
                                            <CheckCircle className="w-4 h-4 text-primary" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 mt-8">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => { window.location.href = '/checklist' }}
                                        >
                                            View Checklist
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={() => { window.location.href = '/dashboard' }}
                                        >
                                            Go to Dashboard
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
