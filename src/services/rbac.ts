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
  | "help";

const ALL: ModuleKey[] = [
  "dashboard","copilot","knowledge","documents","graph",
  "maintenance","quality","lessons","analytics","notifications","settings","help",
];

const BASE: ModuleKey[] = ["dashboard","copilot","knowledge","documents","graph","lessons","notifications","settings","help"];

const PERMISSIONS: Record<Role, ModuleKey[]> = {
  plant_manager: ALL,
  maintenance_manager: ALL,
  digital_transformation: ALL,
  industry_40: ALL,
  maintenance_engineer: [...BASE, "maintenance","analytics"],
  reliability_engineer: [...BASE, "maintenance","analytics"],
  plant_ops: [...BASE, "maintenance","quality","analytics"],
  production_engineer: [...BASE, "maintenance","analytics"],
  quality_engineer: [...BASE, "quality","analytics"],
  qa_manager: [...BASE, "quality","analytics"],
  safety_officer: [...BASE, "quality","analytics"],
  hse_engineer: [...BASE, "quality","analytics"],
  document_controller: [...BASE, "analytics"],
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
