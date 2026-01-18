import { ROLES, type RoleId } from "@/lib/config/roles";
import { getRoleScopesWithColors, PERMISSION_SCOPES } from "@/lib/config/permissions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface RoleCardProps {
    roleId: RoleId;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    showDescription?: boolean;
}

export function RoleCard({
    roleId,
    selected = false,
    onClick,
    disabled = false,
    showDescription = true,
}: RoleCardProps) {
    const role = ROLES.find((r) => r.id === roleId);
    const scopes = getRoleScopesWithColors(roleId);

    if (!role) return null;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "relative w-full text-left p-4 rounded-lg border-2 transition-all",
                "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                selected
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            {/* Selection indicator */}
            {selected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                </div>
            )}

            {/* Role name and type badge */}
            <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{role.name}</h4>
                <Badge variant="outline" className="text-xs">
                    {role.type === "tenant" ? "Organization" : "Site"}
                </Badge>
            </div>

            {/* Description */}
            {showDescription && (
                <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
            )}

            {/* Permission scope badges with colors */}
            <div className="flex flex-wrap gap-1.5">
                {scopes.map((scope) => (
                    <span
                        key={scope.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: scope.color }}
                        title={scope.description}
                    >
                        {scope.label}
                    </span>
                ))}
            </div>
        </button>
    );
}

interface RoleSelectorProps {
    value?: RoleId;
    onChange: (roleId: RoleId) => void;
    filterType?: "tenant" | "site" | "all";
    disabled?: boolean;
}

export function RoleSelector({
    value,
    onChange,
    filterType = "all",
    disabled = false,
}: RoleSelectorProps) {
    const filteredRoles = ROLES.filter((role) =>
        filterType === "all" ? true : role.type === filterType
    );

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {filteredRoles.map((role) => (
                <RoleCard
                    key={role.id}
                    roleId={role.id}
                    selected={value === role.id}
                    onClick={() => onChange(role.id)}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}

/**
 * Permission scope legend for onboarding/help screens
 */
export function PermissionScopeLegend() {
    return (
        <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Permission Scopes</h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(PERMISSION_SCOPES).map((scope) => (
                    <div key={scope.id} className="flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: scope.color }}
                        />
                        <span className="text-sm">
                            <span className="font-medium">{scope.label}</span>
                            <span className="text-muted-foreground"> - {scope.description}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Compact role badge with color indicator
 */
export function RoleBadge({ roleId }: { roleId: RoleId }) {
    const role = ROLES.find((r) => r.id === roleId);
    const scopes = getRoleScopesWithColors(roleId);
    const primaryScope = scopes[0];

    if (!role) return <Badge variant="secondary">{roleId}</Badge>;

    return (
        <Badge
            variant="outline"
            className="gap-1.5"
            style={{
                borderColor: primaryScope?.color,
                backgroundColor: primaryScope ? `${primaryScope.color}10` : undefined,
            }}
        >
            {primaryScope && (
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: primaryScope.color }}
                />
            )}
            {role.name}
        </Badge>
    );
}
