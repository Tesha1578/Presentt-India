export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

// ---------------------------------------------------------------------------
// SalesOS CRM shared constants (design.md §9–§12)
// Single source of truth for DB enums + frontend display labels.
// ---------------------------------------------------------------------------

/** CRM roles (design.md §12). `user` is the graft's default OAuth role. */
export const Roles = [
  "super_admin",
  "admin",
  "sales_manager",
  "sales_executive",
  "accounts",
  "user",
] as const;

export const RoleLabels: Record<(typeof Roles)[number], string> = {
  super_admin: "SuperAdmin",
  admin: "Admin",
  sales_manager: "SalesManager",
  sales_executive: "SalesExecutive",
  accounts: "Accounts",
  user: "User",
};

/** Pipeline stages (design.md §10.1, exact order). */
export const LeadStages = [
  "new_lead",
  "enquiry_visit",
  "quotation_negotiation",
  "order_confirmed",
] as const;

export const LeadStageLabels: Record<(typeof LeadStages)[number], string> = {
  new_lead: "New Lead",
  enquiry_visit: "Enquiry / Visit",
  quotation_negotiation: "Quotation / Price Negotiation",
  order_confirmed: "Order Confirmed",
};

export const LeadStatuses = ["active", "invalid_customer"] as const;

export const LeadStatusLabels: Record<(typeof LeadStatuses)[number], string> = {
  active: "Active",
  invalid_customer: "Invalid Customer",
};

export const Priorities = ["low", "medium", "high"] as const;

export const PriorityLabels: Record<(typeof Priorities)[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const LeadActivityKinds = [
  "call",
  "email",
  "visit",
  "note",
  "stage-change",
] as const;

export const CustomerCategories = ["small", "medium", "large"] as const;

export const CustomerCategoryLabels: Record<
  (typeof CustomerCategories)[number],
  string
> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const HealthGrades = ["excellent", "good", "average", "poor"] as const;

export const HealthGradeLabels: Record<(typeof HealthGrades)[number], string> =
  {
    excellent: "Excellent",
    good: "Good",
    average: "Average",
    poor: "Poor",
  };

/** Verbatim health matrix (design.md §10.7) — shown on tooltips + Settings. */
export const HealthRules = [
  "Excellent = High Sales + Regular Payments",
  "Good = High Sales + Occasional Delays",
  "Average = Moderate Sales + Regular Payments",
  "Poor = Low Sales + Poor Payment History",
] as const;

export const SalesTrends = ["increasing", "decreasing", "stable"] as const;

/** 30-day sales-monitoring buckets (design.md §10.6). */
export const SalesMonitorBuckets = [
  "regular",
  "no_sales",
  "increasing",
  "decreasing",
] as const;

export const InvoiceStatuses = [
  "paid",
  "partial",
  "overdue",
  "pending",
] as const;

export const InvoiceStatusLabels: Record<
  (typeof InvoiceStatuses)[number],
  string
> = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  pending: "Pending",
};

export const PaymentModes = [
  "upi",
  "neft",
  "rtgs",
  "cheque",
  "cash",
  "card",
] as const;

export const PaymentStatuses = ["completed", "pending", "failed"] as const;

export const QueryCategories = [
  "quality",
  "delivery",
  "price",
  "communication",
  "others",
] as const;

export const QueryCategoryLabels: Record<
  (typeof QueryCategories)[number],
  string
> = {
  quality: "Quality",
  delivery: "Delivery",
  price: "Price",
  communication: "Communication",
  others: "Others",
};

export const QueryStatuses = ["open", "in_progress", "resolved"] as const;

export const QueryStatusLabels: Record<(typeof QueryStatuses)[number], string> =
  {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
  };

export const QuotationStatuses = [
  "draft",
  "sent",
  "negotiation",
  "accepted",
  "rejected",
] as const;

export const QuotationStatusLabels: Record<
  (typeof QuotationStatuses)[number],
  string
> = {
  draft: "Draft",
  sent: "Sent",
  negotiation: "Negotiation",
  accepted: "Accepted",
  rejected: "Rejected",
};

/** Notification / toast catalog types (design.md §11, exact). */
export const NotificationTypes = [
  "customer-inactive",
  "visit-overdue",
  "sales-drop",
  "quotation-pending",
  "lead-converted",
  "payment-received",
  "discount-decline",
  "query-reminder",
  "ai-insight",
] as const;

/** Admin-editable threshold defaults (design.md §9 ThresholdConfig). */
export const DefaultThresholds = {
  discountDeclinePct: 15,
  discountWindowMonths: 3,
  visitReminderDays: 45,
  noSalesAlertDays: 30,
  classificationSmallMax: 200000, // ₹ monthly sales
  classificationMediumMax: 1000000, // ₹ monthly sales
  significantChangePct: 20,
} as const;

/** Indian sales regions used across leads/customers/visits. */
export const Regions = ["West", "North", "South", "East"] as const;
