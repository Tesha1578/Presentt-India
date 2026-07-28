import type {
  Roles,
  LeadStages,
  LeadStatuses,
  Priorities,
  LeadActivityKinds,
  CustomerCategories,
  HealthGrades,
  SalesTrends,
  SalesMonitorBuckets,
  InvoiceStatuses,
  PaymentModes,
  PaymentStatuses,
  QueryCategories,
  QueryStatuses,
  QuotationStatuses,
  NotificationTypes,
} from "./constants";

export * from "./errors";

// ---------------------------------------------------------------------------
// Row shapes (previously inferred from db/schema via drizzle; now explicit
// since the app talks to Supabase directly)
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  unionId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: Role;
  region: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date;
}

export interface Lead {
  id: number;
  companyName: string | null;
  contactPerson: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  companyAddress: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  stage: LeadStage | null;
  status: LeadStatus;
  priority: Priority;
  source: string | null;
  region: string | null;
  city: string | null;
  ownerId: number | null;
  lastActivityAt: Date | null;
  lastActivitySummary: string | null;
  lastUpdatedById: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  date: Date;
  activity: LeadActivityKind;
  remarks: string | null;
  updatedById: number;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  gstin: string;
  companyAddress: string;
  region: string | null;
  city: string | null;
  category: CustomerCategory | null;
  ownerId: number | null;
  healthScore: number;
  healthGrade: HealthGrade | null;
  salesTrend: SalesTrend | null;
  lastVisitAt: Date | null;
  lastPurchaseAt: Date | null;
  isDiscounted: boolean;
  aiSummary: string | null;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: number;
  customerId: string;
  number: string;
  date: Date;
  amount: number;
  status: InvoiceStatus;
  dueDate: Date | null;
  createdAt: Date;
}

export interface Payment {
  id: number;
  customerId: string;
  invoiceId: number | null;
  date: Date;
  amount: number;
  mode: PaymentMode | null;
  status: PaymentStatus;
  delayDays: number;
  createdAt: Date;
}

export interface Visit {
  id: number;
  customerId: string;
  date: Date;
  salesRepId: number | null;
  remarks: string | null;
  photos: string[];
  voiceNotes: string[];
  outcome: string | null;
  nextVisitAt: Date | null;
  createdAt: Date;
}

export interface CustomerQuery {
  id: number;
  customerId: string;
  category: QueryCategory;
  description: string;
  dateRaised: Date;
  raisedById: number | null;
  status: QueryStatus;
  priority: Priority;
  assignedToId: number | null;
  dueDate: Date | null;
  aiSuggestedSolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryComment {
  id: number;
  queryId: number;
  authorId: number;
  body: string;
  attachments: string[];
  createdAt: Date;
}

export interface Quotation {
  id: number;
  leadId: number;
  number: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  validUntil: Date | null;
  createdById: number | null;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Meeting {
  id: number;
  leadId: number | null;
  customerId: string | null;
  date: Date;
  attendees: string[];
  rawNotes: string | null;
  voiceNoteUrl: string | null;
  aiSummary: string | null;
  decisions: string[];
  actionItems: MeetingActionItem[];
  createdAt: Date;
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  entityRef: string | null;
  read: boolean;
  createdAt: Date;
}

export interface ThresholdConfigRow extends ThresholdSettings {
  id: number;
  updatedById: number | null;
  updatedAt: Date;
}

// Enum unions shared between frontend and backend (design.md §9–§12)
export type Role = (typeof Roles)[number];
export type LeadStage = (typeof LeadStages)[number];
export type LeadStatus = (typeof LeadStatuses)[number];
export type Priority = (typeof Priorities)[number];
export type LeadActivityKind = (typeof LeadActivityKinds)[number];
export type CustomerCategory = (typeof CustomerCategories)[number];
export type HealthGrade = (typeof HealthGrades)[number];
export type SalesTrend = (typeof SalesTrends)[number];
export type SalesMonitorBucket = (typeof SalesMonitorBuckets)[number];
export type InvoiceStatus = (typeof InvoiceStatuses)[number];
export type PaymentMode = (typeof PaymentModes)[number];
export type PaymentStatus = (typeof PaymentStatuses)[number];
export type QueryCategory = (typeof QueryCategories)[number];
export type QueryStatus = (typeof QueryStatuses)[number];
export type QuotationStatus = (typeof QuotationStatuses)[number];
export type NotificationType = (typeof NotificationTypes)[number];

// JSON column shapes
export type QuotationItem = { name: string; qty: number; rate: number };
export type MeetingActionItem = {
  text: string;
  owner?: string;
  dueDate?: string;
};

// Admin-editable threshold config (design.md §9)
export type ThresholdSettings = {
  discountDeclinePct: number;
  discountWindowMonths: number;
  visitReminderDays: number;
  noSalesAlertDays: number;
  classificationSmallMax: number;
  classificationMediumMax: number;
  significantChangePct: number;
};
