// Granular permission system for XRoof
// Roles: owner, admin, office_manager, sales, field_tech, viewer

export type Role = "owner" | "admin" | "office_manager" | "sales" | "field_tech" | "viewer"

export type Permission =
  | "view_dashboard"
  | "view_analytics"
  | "export_data"
  | "manage_leads"
  | "view_all_leads"
  | "view_own_leads"
  | "create_estimates"
  | "send_estimates"
  | "manage_contracts"
  | "manage_invoices"
  | "view_billing"
  | "manage_billing"
  | "manage_team"
  | "manage_settings"
  | "manage_automations"
  | "manage_work_orders"
  | "view_work_orders"
  | "use_field_mode"
  | "manage_calendar"
  | "manage_customers"
  | "view_messages"
  | "send_sms"
  | "manage_dispatch"
  | "manage_materials"
  | "request_measurements"

  | "manage_expenses"
  | "view_surveys"

// Permission matrix: role → set of allowed permissions
const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  owner: [
    "view_dashboard", "view_analytics", "export_data",
    "manage_leads", "view_all_leads", "view_own_leads",
    "create_estimates", "send_estimates",
    "manage_contracts", "manage_invoices",
    "view_billing", "manage_billing",
    "manage_team", "manage_settings",
    "manage_automations", "manage_work_orders", "view_work_orders",
    "use_field_mode", "manage_calendar",
    "manage_customers", "view_messages", "send_sms",
    "manage_dispatch", "manage_materials", "request_measurements",
"manage_expenses", "view_surveys",
  ],
  admin: [
    "view_dashboard", "view_analytics", "export_data",
    "manage_leads", "view_all_leads", "view_own_leads",
    "create_estimates", "send_estimates",
    "manage_contracts", "manage_invoices",
    "view_billing", "manage_billing",
    "manage_team", "manage_settings",
    "manage_automations", "manage_work_orders", "view_work_orders",
    "use_field_mode", "manage_calendar",
    "manage_customers", "view_messages", "send_sms",
    "manage_dispatch", "manage_materials", "request_measurements",
"manage_expenses", "view_surveys",
  ],
  office_manager: [
    "view_dashboard", "view_analytics", "export_data",
    "manage_leads", "view_all_leads", "view_own_leads",
    "create_estimates", "send_estimates",
    "manage_contracts", "manage_invoices",
    "view_billing",
    "manage_automations", "manage_work_orders", "view_work_orders",
    "manage_calendar",
    "manage_customers", "view_messages", "send_sms",
    "manage_dispatch", "manage_materials", "request_measurements",
"manage_expenses", "view_surveys",
  ],
  sales: [
    "view_dashboard",
    "manage_leads", "view_own_leads",
    "create_estimates", "send_estimates",
    "manage_contracts",
    "manage_calendar",
    "manage_customers", "view_messages", "send_sms",
    "manage_materials", "request_measurements",
"manage_expenses", "view_surveys",
  ],
  field_tech: [
    "view_dashboard",
    "view_own_leads",
    "view_work_orders",
    "use_field_mode",
    "manage_calendar",
    "manage_materials", "request_measurements",
    "manage_expenses",
  ],
  viewer: [
    "view_dashboard",
    "view_own_leads",
    "view_work_orders",
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  const perms = PERMISSION_MATRIX[role as Role]
  if (!perms) return false
  return perms.includes(permission)
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role | string): Permission[] {
  return PERMISSION_MATRIX[role as Role] || []
}

/**
 * Get human-readable description of a role
 */
export function getRoleLabel(role: Role | string): string {
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    office_manager: "Office Manager",
    sales: "Salesperson",
    field_tech: "Field Tech",
    viewer: "Viewer",
  }
  return labels[role] || role
}

/**
 * Get all available roles (for team invite UI)
 */
export function getAvailableRoles(): { value: Role; label: string; description: string }[] {
  return [
    { value: "admin", label: "Admin", description: "Full access to everything" },
    { value: "office_manager", label: "Office Manager", description: "All features except billing & team management" },
    { value: "sales", label: "Salesperson", description: "Own leads, estimates, contracts, calendar" },
    { value: "field_tech", label: "Field Tech", description: "Field mode, work orders, measurements" },
    { value: "viewer", label: "Viewer", description: "Read-only access to dashboard & leads" },
  ]
}

/**
 * Map nav items to required permissions for filtering
 */
export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/contractor/dashboard": "view_dashboard",
  "/contractor/leads": "manage_leads",
  "/contractor/customers": "manage_customers",
  "/contractor/measure": "request_measurements",
  "/contractor/report-builder": "create_estimates",
  "/contractor/calendar": "manage_calendar",
  "/contractor/pipeline": "manage_leads",
  "/contractor/team": "manage_team",
  "/contractor/work-orders": "manage_work_orders",
  "/contractor/dispatch": "manage_dispatch",
  "/contractor/materials": "manage_materials",
  "/contractor/automations": "manage_automations",
  "/contractor/messages": "view_messages",
  "/contractor/billing": "manage_billing",
  "/contractor/settings": "manage_settings",
  "/contractor/field": "use_field_mode",
  "/contractor/reports": "view_analytics",
  "/contractor/landing-pages": "manage_automations",
  "/contractor/profile": "view_dashboard", // everyone can see their own profile

  "/contractor/quick-estimate": "manage_materials",
}
