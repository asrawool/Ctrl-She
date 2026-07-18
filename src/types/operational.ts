export interface Asset {
  id: string;
  name: string;
  type: string;
  plant: string;
  health_percentage: number;
  status: string;
  rul_days: number;
  last_inspected_at?: string;
  updated_by?: string;
  updated_at?: string;
  is_ai_modified?: boolean;
}

export interface WorkOrder {
  id: string;
  asset_id?: string;
  title: string;
  type: "preventive" | "corrective" | "predictive" | "emergency";
  priority: string;
  status: string;
  assigned_to?: string;
  created_by?: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  source_rca_id?: string;
  source_rca_action?: string;
}

export interface SparePart {
  id: string;
  name: string;
  current_quantity: number;
  min_quantity: number;
  updated_at?: string;
}

export interface RCAReport {
  id: string;
  incident_ref: string;
  asset_id?: string;
  symptoms: string;
  root_cause: string;
  corrective_actions: string;
  created_by?: string;
  created_at?: string;
}

export interface NCR {
  id: string;
  ncr_number: string;
  description: string;
  severity: string;
  status: string;
  framework_ref?: string;
  created_by?: string;
  created_at?: string;
  resolved_at?: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  current_score: number;
}

export interface Inspection {
  id: string;
  name: string;
  framework: string;
  scheduled_date: string;
  status: string;
  assigned_to?: string;
}

export interface InsurancePolicy {
  id: string;
  machine: string;
  asset_id?: string;
  provider: string;
  policy_no: string;
  start_date: string;
  expiry_date: string;
  coverage: string;
  status: string;
  created_by?: string;
  updated_at?: string;
  derivedStatus?: "Active" | "Expiring Soon" | "Expired";
}

export interface MachineLicense {
  id: string;
  kind:
    | "Equipment License"
    | "Operating Permit"
    | "Calibration Certificate"
    | "Installation Certificate"
    | "Government Approval"
    | "OEM Authorization";
  cert_no: string;
  issue_date: string;
  expiry_date: string;
  department: string;
  status: string;
  created_by?: string;
  updated_at?: string;
  derivedStatus?: "Active" | "Expiring Soon" | "Expired";
}

export interface Certification {
  id: string;
  name: string;
  category: string;
  issuer: string;
  expiry_date: string;
  version: string;
  created_by?: string;
  updated_at?: string;
  derivedStatus?: "Active" | "Expiring Soon" | "Expired";
}

export interface InventoryItem {
  id: string;
  name: string;
  item_code: string;
  category: string;
  manufacturer: string;
  model?: string;
  location: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  reorder_point: number;
  unit_cost: number;
  supplier: string;
  status: string;
  updated_by?: string;
  updated_at?: string;
  stock?: "In Stock" | "Low Stock" | "Out of Stock" | "Reserved";
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  type: "inbound" | "outbound" | "adjustment";
  quantity: number;
  reason?: string;
  created_by?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: {
    category?: "maintenance" | "compliance" | "documents" | "ai" | "system";
    priority?: "high" | "medium" | "low";
    source?: string;
  };
  created_at: string;
}
