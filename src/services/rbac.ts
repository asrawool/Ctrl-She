import type { Role } from "@/store/auth";

export type ModuleKey =
  | "dashboard"
  | "copilot"
  | "knowledge"
  | "documents"
  | "graph"
  | "maintenance"
  | "quality"
  | "lessons"
  | "analytics"
  | "notifications"
  | "settings"
  | "help"
  | "insurance"
  | "inventory";

const ALL: ModuleKey[] = [
  "dashboard",
  "copilot",
  "knowledge",
  "documents",
  "graph",
  "maintenance",
  "quality",
  "lessons",
  "analytics",
  "notifications",
  "settings",
  "help",
  "insurance",
  "inventory",
];

const BASE: ModuleKey[] = [
  "dashboard",
  "copilot",
  "knowledge",
  "documents",
  "graph",
  "lessons",
  "notifications",
  "settings",
  "help",
];

const PERMISSIONS: Record<Role, ModuleKey[]> = {
  plant_manager: ALL,
  digital_transformation: ALL,
  maintenance_engineer: [...BASE, "maintenance", "analytics", "inventory"],
  reliability_engineer: [...BASE, "maintenance", "analytics", "inventory"],
  plant_ops: [...BASE, "maintenance", "quality", "analytics"],
  quality_engineer: [...BASE, "quality", "analytics", "insurance"],
  safety_officer: [...BASE, "quality", "analytics", "insurance"],
  document_controller: ALL,
  other: BASE,
};

export type OperationalAction =
  | "create:assets"
  | "update:assets"
  | "create:work_orders"
  | "update:work_orders"
  | "create:rca_reports"
  | "update:rca_reports"
  | "create:spare_parts"
  | "update:spare_parts"
  | "create:inventory_items"
  | "update:inventory_items"
  | "create:inventory_movements"
  | "create:ncrs"
  | "update:ncrs"
  | "create:inspections"
  | "update:inspections"
  | "create:compliance_frameworks"
  | "update:compliance_frameworks"
  | "create:insurance_policies"
  | "update:insurance_policies"
  | "create:machine_licenses"
  | "update:machine_licenses"
  | "create:certifications"
  | "update:certifications"
  | "manage:documents";

const WRITE_PERMISSIONS: Record<Role, Set<OperationalAction>> = {
  plant_manager: new Set([
    "create:assets",
    "update:assets",
    "create:work_orders",
    "update:work_orders",
    "create:rca_reports",
    "update:rca_reports",
    "create:spare_parts",
    "update:spare_parts",
    "create:inventory_items",
    "update:inventory_items",
    "create:inventory_movements",
    "create:ncrs",
    "update:ncrs",
    "create:inspections",
    "update:inspections",
    "create:compliance_frameworks",
    "update:compliance_frameworks",
    "create:insurance_policies",
    "update:insurance_policies",
    "create:machine_licenses",
    "update:machine_licenses",
    "create:certifications",
    "update:certifications",
    "manage:documents",
  ]),
  maintenance_engineer: new Set([
    "create:assets",
    "update:assets",
    "create:work_orders",
    "update:work_orders",
    "create:rca_reports",
    "update:rca_reports",
    "create:spare_parts",
    "update:spare_parts",
    "create:inventory_items",
    "update:inventory_items",
    "create:inventory_movements",
  ]),
  plant_ops: new Set([
    "create:work_orders",
    "update:work_orders",
    "create:ncrs",
    "update:ncrs",
  ]),
  reliability_engineer: new Set([
    "create:assets",
    "update:assets",
    "create:work_orders",
    "update:work_orders",
    "create:rca_reports",
    "update:rca_reports",
  ]),
  quality_engineer: new Set([
    "create:ncrs",
    "update:ncrs",
    "create:inspections",
    "update:inspections",
    "create:compliance_frameworks",
    "update:compliance_frameworks",
    "create:certifications",
    "update:certifications",
  ]),
  safety_officer: new Set([
    "create:ncrs",
    "update:ncrs",
    "create:inspections",
    "update:inspections",
    "create:insurance_policies",
    "update:insurance_policies",
    "create:machine_licenses",
    "update:machine_licenses",
  ]),
  document_controller: new Set(["manage:documents"]),
  digital_transformation: new Set([]),
  other: new Set([]),
};

export function canAccess(role: Role | null, module: ModuleKey): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(module) ?? false;
}

export function allowedModules(role: Role | null): ModuleKey[] {
  if (!role) return [];
  return PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: Role | null,
  action: OperationalAction,
): boolean {
  if (!role) return false;
  return WRITE_PERMISSIONS[role]?.has(action) ?? false;
}

export function getActionRequiredRolesLabel(action: OperationalAction): string {
  const allowed: string[] = [];
  (Object.keys(WRITE_PERMISSIONS) as Role[]).forEach((r) => {
    if (WRITE_PERMISSIONS[r].has(action)) {
      const labels: Record<Role, string> = {
        plant_manager: "Plant Manager",
        maintenance_engineer: "Maintenance Engineer",
        plant_ops: "Plant Operations",
        reliability_engineer: "Reliability Engineer",
        quality_engineer: "Quality Engineer",
        safety_officer: "Safety Officer",
        document_controller: "Document Controller",
        digital_transformation: "Digital Transformation",
        other: "Other",
      };
      allowed.push(labels[r]);
    }
  });
  return allowed.join(", ");
}
