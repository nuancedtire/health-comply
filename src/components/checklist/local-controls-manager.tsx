
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalControlsFn, seedLocalControlsFn, createLocalControlFn, updateLocalControlFn, deleteLocalControlFn, suggestLocalControlsFn } from "@/core/functions/local-control-functions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, PlayCircle, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LocalControlsManager() {
    const queryClient = useQueryClient();
    const [editControl, setEditControl] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ["local-controls"],
        queryFn: () => getLocalControlsFn(),
    });

    const seedMutation = useMutation({
        mutationFn: seedLocalControlsFn,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Successfully seeded ${res.seeded} controls!`);
                queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLocalControlFn,
        onSuccess: () => {
            toast.success("Control deleted");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
        }
    });

    const hasControls = data?.controls && data.controls.length > 0;

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (!hasControls) {
        return <EmptyState onSeed={() => seedMutation.mutate(undefined)} isSeeding={seedMutation.isPending} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Manage Controls</h3>
                    <p className="text-sm text-muted-foreground">Add, edit, or remove compliance checks.</p>
                </div>
                <div className="flex gap-2">
                    <SuggestControlsDialog />
                    <Button onClick={() => { setEditControl(null); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Control
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Quality Area</TableHead>
                            <TableHead>Control Name</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Evidence Hint</TableHead>
                            <TableHead>Reviewer</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.controls.map((control) => (
                            <TableRow key={control.id}>
                                <TableCell className="font-medium text-muted-foreground">
                                    {control.qs?.title || control.qsId}
                                </TableCell>
                                <TableCell className="font-semibold">{control.title}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{formatFrequency(control.frequencyType, control.frequencyDays)}</Badge>
                                </TableCell>
                                <TableCell className="max-w-[300px] truncate text-muted-foreground text-xs" title={control.evidenceHint || ''}>
                                    {control.evidenceHint || '-'}
                                </TableCell>
                                <TableCell>{control.defaultReviewerRole || 'Unassigned'}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setEditControl(control); setIsDialogOpen(true); }}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => deleteMutation.mutate({ data: { id: control.id } })}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <ControlDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                control={editControl}
                onClose={() => { setIsDialogOpen(false); setEditControl(null); }}
            />
        </div>
    );
}

function ControlDialog({ open, onOpenChange, control, onClose }: any) {
    const queryClient = useQueryClient();
    const isEdit = !!control;
    const [formData, setFormData] = useState({
        qsId: 'safe.infection_control',
        title: '',
        description: '',
        frequencyType: 'recurring',
        frequencyDays: 30,
        evidenceHint: '',
        defaultReviewerRole: 'Practice Manager'
    });

    // Reset or populate form when dialog opens/closes or control changes
    useEffect(() => {
        if (open && control) {
            setFormData({
                qsId: control.qsId,
                title: control.title,
                description: control.description || '',
                frequencyType: control.frequencyType,
                frequencyDays: control.frequencyDays,
                evidenceHint: control.evidenceHint || '',
                defaultReviewerRole: control.defaultReviewerRole || 'Practice Manager'
            });
        } else if (open && !control) {
            setFormData({
                qsId: 'safe.infection_control',
                title: '',
                description: '',
                frequencyType: 'recurring',
                frequencyDays: 30,
                evidenceHint: '',
                defaultReviewerRole: 'Practice Manager'
            });
        }
    }, [open, control]);

    const createMutation = useMutation({
        mutationFn: createLocalControlFn,
        onSuccess: () => {
            toast.success("Control created");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const updateMutation = useMutation({
        mutationFn: updateLocalControlFn,
        onSuccess: () => {
            toast.success("Control updated");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (!formData.title) return toast.error("Title is required");

        if (isEdit) {
            updateMutation.mutate({
                data: {
                    id: control.id,
                    title: formData.title,
                    description: formData.description,
                    frequencyType: formData.frequencyType as any,
                    frequencyDays: formData.frequencyDays,
                    evidenceHint: formData.evidenceHint,
                    defaultReviewerRole: formData.defaultReviewerRole
                }
            });
        } else {
            createMutation.mutate({
                data: {
                    qsId: formData.qsId,
                    title: formData.title,
                    description: formData.description,
                    frequencyType: formData.frequencyType as any,
                    frequencyDays: formData.frequencyDays,
                    evidenceHint: formData.evidenceHint,
                    defaultReviewerRole: formData.defaultReviewerRole
                }
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Control' : 'Add New Control'}</DialogTitle>
                    <DialogDescription>Define the requirements for this compliance check.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Hand Hygiene Audit" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional details about this control..." />
                    </div>

                    {!isEdit && (
                        <div className="grid gap-2">
                            <Label>Quality Statement ID</Label>
                            <Input value={formData.qsId} onChange={e => setFormData({ ...formData, qsId: e.target.value })} placeholder="safe.infection_control" />
                            <p className="text-xs text-muted-foreground">The technical ID of update (e.g. safe.medicines)</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Frequency (Days)</Label>
                            <Input type="number" value={formData.frequencyDays} onChange={e => setFormData({ ...formData, frequencyDays: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Reviewer Role</Label>
                            <Select value={formData.defaultReviewerRole} onValueChange={v => setFormData({ ...formData, defaultReviewerRole: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Practice Manager">Practice Manager</SelectItem>
                                    <SelectItem value="Nurse Lead">Nurse Lead</SelectItem>
                                    <SelectItem value="GP Partner">GP Partner</SelectItem>
                                    <SelectItem value="Trainee">Trainee</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Evidence Hint</Label>
                        <Textarea value={formData.evidenceHint} onChange={e => setFormData({ ...formData, evidenceHint: e.target.value })} placeholder="What should be uploaded?" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function EmptyState({ onSeed, isSeeding }: { onSeed: () => void, isSeeding: boolean }) {
    return (
        <Card className="border-dashed">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <Wand2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>No Controls Set Up Yet</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2">
                    Start by using our "Starter Pack" to instantly create ~20 standard CQC controls, or add them manually.
                </CardDescription>
                <div className="mt-6 flex justify-center gap-4">
                    <Button size="lg" onClick={onSeed} disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Apply Starter Pack
                    </Button>
                </div>
            </CardHeader>
        </Card>
    );
}

function SuggestControlsDialog() {
    const [qsId, setQsId] = useState("safe.infection_control");
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const qsOptions = [
        { id: "safe.infection_control", label: "Safe: Infection Control" },
        { id: "safe.safeguarding", label: "Safe: Safeguarding" },
        { id: "safe.medicines", label: "Safe: Medicines" },
        { id: "effective.evidence_based", label: "Effective: Evidence Based" },
        { id: "well_led.governance", label: "Well Led: Governance" },
    ];

    const suggestMutation = useMutation({
        mutationFn: suggestLocalControlsFn,
    });

    const createMutation = useMutation({
        mutationFn: createLocalControlFn,
        onSuccess: () => {
            toast.success("Control added from suggestion");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                    <Wand2 className="mr-2 h-4 w-4" /> AI Suggestions
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>AI Control Suggestions</DialogTitle>
                    <DialogDescription>
                        Select a Quality Statement area and let AI suggest missing controls.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Area of Focus</Label>
                        <Select value={qsId} onValueChange={setQsId}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {qsOptions.map(qs => (
                                    <SelectItem key={qs.id} value={qs.id}>{qs.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={() => suggestMutation.mutate({ data: { qsId } })}
                        disabled={suggestMutation.isPending}
                    >
                        {suggestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Suggestions
                    </Button>

                    {suggestMutation.data && (
                        <div className="space-y-4 mt-4 max-h-[300px] overflow-y-auto">
                            {suggestMutation.data.error ? (
                                <div className="text-red-500 text-sm">{suggestMutation.data.error}</div>
                            ) : (
                                suggestMutation.data.suggestions.map((s: any, i: number) => (
                                    <div key={i} className="border p-3 rounded-md text-sm space-y-2 flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="font-semibold">{s.title}</div>
                                            <div className="text-muted-foreground">{s.description}</div>
                                            <div className="text-xs bg-muted p-1 rounded inline-block">
                                                Hint: {s.evidenceHint}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => createMutation.mutate({
                                            data: {
                                                qsId,
                                                title: s.title,
                                                description: s.description,
                                                frequencyType: 'recurring',
                                                frequencyDays: s.frequencyDays || 30,
                                                evidenceHint: s.evidenceHint,
                                                defaultReviewerRole: s.defaultReviewerRole
                                            }
                                        })}>
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </div>
                                ))
                            )}
                            {suggestMutation.data.suggestions?.length === 0 && !suggestMutation.data.error && (
                                <div className="text-sm text-muted-foreground">No suggestions found.</div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
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
