import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useMutation, useQuery } from '@tanstack/react-query'
import { getRolesFn, updateUserRoleFn } from '@/core/functions/admin-functions' // Ensure these are exported
import { toast } from "sonner"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
    role: z.string().min(1, "Role is required"),
})

interface ChangeRoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: any
    onSuccess: () => void
}

export function ChangeRoleDialog({ open, onOpenChange, user, onSuccess }: ChangeRoleDialogProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: "",
        },
    })

    // Fetch Roles (Scoped)
    // We can reuse getRolesFn but we need tenantId. 
    // Ideally we pass tenantId from user props or context.
    // If user prop has tenantId, great. 
    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: () => getRolesFn({ data: {} }), // Static roles
        enabled: true
    });

    useEffect(() => {
        if (open && user) {
            form.reset({
                role: user.roleName || "", // Use roleName from user object (mapped from getUsersAndInvitesFn)
            })
        }
    }, [open, user, form])

    const mutation = useMutation({
        mutationFn: updateUserRoleFn,
        onSuccess: () => {
            toast.success("User role updated");
            onOpenChange(false);
            onSuccess();
        },
        onError: (err) => {
            toast.error(err.message);
        }
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) return;
        mutation.mutate({
            data: {
                userId: user.id || user.userId,
                role: values.role
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Role</DialogTitle>
                    <DialogDescription>
                        Update the role for {user?.name || user?.email}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {roles?.map((role: any) => (
                                                <SelectItem key={role.id} value={role.name}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
