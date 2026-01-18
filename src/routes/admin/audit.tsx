import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getAuditLogsFn, getAuditLogFilterOptionsFn, getTenantsListFn } from "@/core/functions/audit-functions";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Clock, User, FileText, Shield, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/audit")({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({ to: "/login" });
        }
    },
    component: AuditLogPage,
});

const ACTION_COLORS: Record<string, string> = {
    "evidence.uploaded": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "evidence.approved": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "evidence.rejected": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "evidence.deleted": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    "evidence.updated": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "evidence.submitted_for_review": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "control.created": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "control.updated": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "control.deleted": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    "user.invited": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    "user.role_changed": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
    evidence: <FileText className="h-4 w-4" />,
    local_control: <Shield className="h-4 w-4" />,
    user: <User className="h-4 w-4" />,
};

const AuditDetailsRenderer = ({ log }: { log: any }) => {
    const details = log.details || {};
    const { action } = log;

    // Helper for common patterns
    const StatusChange = () => (
        details.previousStatus && details.newStatus ? (
            <div className="flex items-center gap-1 text-muted-foreground">
                <span>Status:</span>
                <span className="font-medium text-foreground">{details.previousStatus}</span>
                <span>→</span>
                <span className="font-medium text-foreground">{details.newStatus}</span>
            </div>
        ) : null
    );

    const RoleChange = () => (
        details.previousRole && details.newRole ? (
            <div className="flex items-center gap-1 text-muted-foreground">
                <span>Role:</span>
                <span className="font-medium text-foreground">{details.previousRole}</span>
                <span>→</span>
                <span className="font-medium text-foreground">{details.newRole}</span>
            </div>
        ) : null
    );

    switch (action) {
        case "user.invited":
            return (
                <div className="space-y-1">
                    <div>
                        Invited <span className="font-medium">{details.targetUserEmail || "user"}</span>
                    </div>
                    {details.newRole && (
                        <div className="text-muted-foreground">
                            Role: <span className="font-medium text-foreground">{details.newRole}</span>
                        </div>
                    )}
                </div>
            );

        case "user.role_changed":
            return (
                <div className="space-y-1">
                    <RoleChange />
                    {details.targetUserEmail && (
                        <div className="text-muted-foreground">
                            User: {details.targetUserEmail}
                        </div>
                    )}
                </div>
            );

        case "evidence.uploaded":
            return (
                <div className="space-y-1">
                    <div>
                        Uploaded <span className="font-medium">"{details.fileName || "file"}"</span>
                    </div>
                    {details.controlTitle && (
                        <div className="text-muted-foreground text-xs">
                            Control: {details.controlTitle}
                        </div>
                    )}
                </div>
            );

        case "evidence.approved":
        case "evidence.rejected":
        case "evidence.submitted_for_review":
            return (
                <div className="space-y-1">
                    <StatusChange />
                    {details.reviewNotes && (
                        <div className="text-muted-foreground italic">
                            "{details.reviewNotes}"
                        </div>
                    )}
                </div>
            );
        
        case "control.created":
        case "control.updated":
             return (
                <div className="space-y-1">
                     {details.controlTitle && (
                        <div>
                            Control: <span className="font-medium">{details.controlTitle}</span>
                        </div>
                     )}
                     {details.changes && (
                         <div className="text-xs text-muted-foreground">
                             Changes: {JSON.stringify(details.changes)}
                         </div>
                     )}
                </div>
             );

        default:
            // Fallback generic renderer
            return (
                <div className="space-y-1">
                    {details.fileName && <div>File: {details.fileName}</div>}
                    <StatusChange />
                    <RoleChange />
                    {details.reviewNotes && <div className="italic">"{details.reviewNotes}"</div>}
                    {details.targetUserEmail && <div>User: {details.targetUserEmail}</div>}
                    
                    {/* If practically empty details, show ID */}
                    {!details.fileName && !details.previousStatus && !details.newRole && !details.targetUserEmail && (
                        <span className="text-xs font-mono text-muted-foreground">
                            ID: {log.entityId}
                        </span>
                    )}
                </div>
            );
    }
};

function AuditLogPage() {
    const { user } = Route.useRouteContext();
    const isSystemAdmin = (user as any).isSystemAdmin;

    const [filters, setFilters] = useState<{
        entityType?: string;
        action?: string;
        actorUserId?: string;
        tenantId?: string;
    }>({});
    const [page, setPage] = useState(0);
    const [tenantOpen, setTenantOpen] = useState(false);
    const pageSize = 50;

    const { data: tenants } = useSuspenseQuery({
        queryKey: ["audit-tenants-list"],
        queryFn: () => getTenantsListFn(),
    });

    const { data: filterOptions } = useSuspenseQuery({
        queryKey: ["audit-filter-options", filters.tenantId],
        queryFn: () => getAuditLogFilterOptionsFn({ data: { tenantId: filters.tenantId } }),
    });

    const { data: auditData, isLoading } = useSuspenseQuery({
        queryKey: ["audit-logs", filters, page],
        queryFn: () =>
            getAuditLogsFn({
                data: {
                    ...filters,
                    limit: pageSize,
                    offset: page * pageSize,
                },
            }),
    });

    const logs = auditData?.logs || [];
    const totalCount = auditData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const formatActionName = (action: string) => {
        return action.split(".").pop()?.replace(/_/g, " ") || action;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
                <p className="text-muted-foreground">
                    Track all changes and actions across your organization
                </p>
            </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    {isSystemAdmin && (
                        <Popover open={tenantOpen} onOpenChange={setTenantOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={tenantOpen}
                                    className="w-[200px] justify-between"
                                >
                                    {filters.tenantId
                                        ? tenants?.find((tenant) => tenant.id === filters.tenantId)?.name
                                        : "All Tenants"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search tenant..." />
                                    <CommandList>
                                        <CommandEmpty>No tenant found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="all"
                                                onSelect={() => {
                                                    setFilters((f) => ({ ...f, tenantId: undefined }));
                                                    setTenantOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        !filters.tenantId ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                All Tenants
                                            </CommandItem>
                                            {tenants?.map((tenant) => (
                                                <CommandItem
                                                    key={tenant.id}
                                                    value={tenant.name}
                                                    onSelect={() => {
                                                        setFilters((f) => ({ ...f, tenantId: tenant.id }));
                                                        setTenantOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            filters.tenantId === tenant.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {tenant.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    )}

                    <Select
                        value={filters.entityType || "all"}
                        onValueChange={(v) =>
                            setFilters((f) => ({ ...f, entityType: v === "all" ? undefined : v }))
                        }
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Entity Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            {filterOptions?.entityTypes?.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type.replace(/_/g, " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.action || "all"}
                        onValueChange={(v) =>
                            setFilters((f) => ({ ...f, action: v === "all" ? undefined : v }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {filterOptions?.actions?.map((action) => (
                                <SelectItem key={action} value={action}>
                                    {formatActionName(action)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.actorUserId || "all"}
                        onValueChange={(v) =>
                            setFilters((f) => ({ ...f, actorUserId: v === "all" ? undefined : v }))
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="User" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {filterOptions?.actors?.map((actor) => (
                                <SelectItem key={actor.id} value={actor.id!}>
                                    {actor.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(filters.entityType || filters.action || filters.actorUserId || filters.tenantId) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({})}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>

                {/* Table */}
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">User</TableHead>
                                <TableHead className="w-[140px]">Action</TableHead>
                                <TableHead className="w-[120px]">Entity</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Loading audit logs...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No audit logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                    {log.actorName?.charAt(0) || "?"}
                                                </div>
                                                <span className="text-sm truncate max-w-[100px]">
                                                    {log.actorName || "System"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={ACTION_COLORS[log.action] || ""}
                                            >
                                                {formatActionName(log.action)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {ENTITY_ICONS[log.entityType] || <FileText className="h-4 w-4" />}
                                                <span className="text-sm text-muted-foreground">
                                                    {log.entityType.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <AuditDetailsRenderer log={log} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
    );
}
