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
  maintenance_manager: ALL,
  digital_transformation: ALL,
  industry_40: ALL,
  maintenance_engineer: [...BASE, "maintenance", "analytics", "inventory"],
  reliability_engineer: [
    ...BASE,
    "maintenance",
    "analytics",
    "insurance",
    "inventory",
  ],
  plant_ops: [
    ...BASE,
    "maintenance",
    "quality",
    "analytics",
    "insurance",
    "inventory",
  ],
  production_engineer: [...BASE, "maintenance", "analytics", "inventory"],
  quality_engineer: [...BASE, "quality", "analytics", "insurance"],
  qa_manager: [...BASE, "quality", "analytics", "insurance"],
  safety_officer: [...BASE, "quality", "analytics", "insurance"],
  hse_engineer: [...BASE, "quality", "analytics", "insurance"],
  document_controller: [...BASE, "analytics", "insurance", "inventory"],
  other: BASE,
};

export function canAccess(role: Role | null, module: ModuleKey): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(module) ?? false;
}

export function allowedModules(role: Role | null): ModuleKey[] {
  if (!role) return [];
  return PERMISSIONS[role] ?? [];
}
