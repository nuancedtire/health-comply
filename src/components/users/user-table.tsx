import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Mail, Link as LinkIcon, KeyRound, ArrowUpDown, ArrowUp, ArrowDown, Shield } from "lucide-react"
import { toast } from "sonner"

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface UserTableProps {
    items: any[];
    actions: {
        onDelete?: (item: any) => void;
        onRevoke?: (item: any) => void;
        onChangeEmail?: (item: any) => void;
        onChangeRole?: (item: any) => void;
        onResetPwd?: (item: any) => void;
    };
    sortConfig?: SortConfig | null;
    onSort?: (key: string) => void;
    type?: 'user' | 'invite' | 'mixed';
    showTenant?: boolean;
}

export function UserTable({ items, actions, sortConfig, onSort, type, showTenant = false }: UserTableProps) {
    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (!sortConfig || !onSort) return null;
        if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-2 h-3 w-3 text-primary" />
            : <ArrowDown className="ml-2 h-3 w-3 text-primary" />;
    };

    const handleSort = (key: string) => {
        if (onSort) onSort(key);
    }

    return (
        <table className="w-full text-sm text-left">
            <thead className="bg-muted/20 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                    <th className={`p-3 font-medium ${onSort ? 'cursor-pointer hover:bg-muted/40 transition-colors group' : ''}`} onClick={() => handleSort('name')}>
                        <div className="flex items-center">
                            {type === 'invite' ? 'Email' : 'Name / Email'}
                            <SortIcon columnKey="name" />
                        </div>
                    </th>
                    {showTenant && (
                        <th className={`p-3 font-medium ${onSort ? 'cursor-pointer hover:bg-muted/40 transition-colors group' : ''}`} onClick={() => handleSort('tenantName')}>
                            <div className="flex items-center">
                                Tenant
                                <SortIcon columnKey="tenantName" />
                            </div>
                        </th>
                    )}
                    <th className={`p-3 font-medium ${onSort ? 'cursor-pointer hover:bg-muted/40 transition-colors group' : ''} w-[200px]`} onClick={() => handleSort('siteName')}>
                        <div className="flex items-center">
                            Site
                            <SortIcon columnKey="siteName" />
                        </div>
                    </th>
                    <th className={`p-3 font-medium ${onSort ? 'cursor-pointer hover:bg-muted/40 transition-colors group' : ''} w-[180px]`} onClick={() => handleSort('roleName')}>
                        <div className="flex items-center">
                            Role
                            <SortIcon columnKey="roleName" />
                        </div>
                    </th>
                    <th className="p-3 w-[80px]"></th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {items.map((item: any) => (
                    <UserRow
                        key={item.id}
                        item={item}
                        showTenant={showTenant}
                        onDelete={actions.onDelete ? () => actions.onDelete!(item) : undefined}
                        onRevoke={actions.onRevoke ? () => actions.onRevoke!(item) : undefined}
                        onChangeEmail={actions.onChangeEmail ? () => actions.onChangeEmail!(item) : undefined}
                        onChangeRole={actions.onChangeRole ? () => actions.onChangeRole!(item) : undefined}
                        onResetPwd={actions.onResetPwd ? () => actions.onResetPwd!(item) : undefined}
                    />
                ))}
            </tbody>
        </table>
    );
}

function UserRow({ item, onDelete, onRevoke, onChangeEmail, onChangeRole, onResetPwd, showTenant }: {
    item: any,
    onDelete?: () => void,
    onRevoke?: () => void,
    onChangeEmail?: () => void,
    onChangeRole?: () => void,
    onResetPwd?: () => void,
    showTenant: boolean
}) {
    const isInvite = item.type === 'invitation';

    const copyInviteLink = () => {
        const link = `${window.location.origin}/signup?token=${item.token}`;
        navigator.clipboard.writeText(link);
        toast.success("Invite link copied to clipboard");
    }

    // If no actions available (except copy link which is always safe if you can see invite?), hide menu trigger?
    // Actually copy link is fine. But if no mod actions, maybe we check.
    // Let's just render what we have.

    return (
        <tr className="hover:bg-muted/30 transition-colors group text-sm">
            <td className="p-3 pl-4">
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.name || item.email}</span>
                    {!isInvite && item.name && item.email && <span className="text-xs text-muted-foreground">{item.email}</span>}
                    {isInvite && <Badge variant="secondary" className="w-fit mt-1 text-[10px] px-1 py-0 h-4">Pending</Badge>}
                </div>
            </td>
            {showTenant && (
                <td className="p-3 text-muted-foreground">{item.tenantName || <span className="text-muted-foreground/50 italic text-xs">No Tenant</span>}</td>
            )}
            <td className="p-3 text-muted-foreground">{item.siteName || <span className="text-muted-foreground/50 italic text-xs">All Sites</span>}</td>
            <td className="p-3">
                <Badge variant="outline" className="font-normal text-xs py-0 h-5">
                    {item.roleName}
                </Badge>
            </td>
            <td className="p-3 text-right pr-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {isInvite ? (
                            <>
                                <DropdownMenuItem onClick={copyInviteLink}>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                </DropdownMenuItem>
                                {onRevoke && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => onRevoke()}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Revoke Invitation
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {onChangeEmail && (
                                    <DropdownMenuItem onClick={() => onChangeEmail()}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Change Email
                                    </DropdownMenuItem>
                                )}

                                {onChangeRole && (
                                    <DropdownMenuItem onClick={() => onChangeRole()}>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Change Role
                                    </DropdownMenuItem>
                                )}

                                {onResetPwd && (
                                    <DropdownMenuItem onClick={() => onResetPwd()}>
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        Reset Password
                                    </DropdownMenuItem>
                                )}

                                {onDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => onDelete()}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete User
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
        </tr>
    )
}
