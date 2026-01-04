import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateUserFn } from "@/core/functions/admin-functions"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

export function ChangeEmailDialog({ open, onOpenChange, user, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, user: any, onSuccess: () => void }) {
    const [newEmail, setNewEmail] = useState('');
    const updateMutation = useMutation({
        mutationFn: updateUserFn,
        onSuccess: () => {
            toast.success("Email updated successfully");
            onOpenChange(false);
            onSuccess();
        },
        onError: (err) => toast.error(err.message)
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Email Address</DialogTitle>
                    <DialogDescription>
                        Update email address for {user?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>New Email</Label>
                        <Input
                            placeholder={user?.email}
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => updateMutation.mutate({ data: { userId: user.id, email: newEmail } })}
                        disabled={updateMutation.isPending || !newEmail || newEmail === user?.email}
                    >
                        {updateMutation.isPending ? "Updating..." : "Update Email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
