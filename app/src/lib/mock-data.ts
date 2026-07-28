/**
 * SalesOS mock data layer.
 * Entity shapes mirror design.md §9 exactly — page agents should import
 * these types + helpers. Real tRPC wiring replaces the arrays later.
 */

// ---------------------------------------------------------------------------
// Entity types (design.md §9)
// ---------------------------------------------------------------------------

export type Role = 'Admin' | 'SalesManager' | 'SalesExecutive' | 'Accounts' | 'SuperAdmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  region: string;
  avatar?: string;
  active: boolean;
}

export type LeadStage =
  | 'NewLead'
  | 'EnquiryVisit'
  | 'QuotationNegotiation'
  | 'OrderConfirmed';
export type LeadStatus = 'Active' | 'InvalidCustomer';
export type Priority = 'Low' | 'Medium' | 'High';

export interface Lead {
  id: string;
  companyName?: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
  companyAddress?: string;
  googleMapsLocation?: { lat: number; lng: number; link: string };
  stage: LeadStage;
  status: LeadStatus;
  priority: Priority;
  source?: string;
  region?: string;
  city?: string;
  ownerId?: string;
  lastActivityAt?: string;
  lastActivitySummary?: string;
  lastUpdatedById?: string;
  lastUpdatedAt?: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  date: string;
  activity: 'call' | 'email' | 'visit' | 'note' | 'stage-change';
  remarks: string;
  updatedById: string;
}

export type CustomerCategory = 'Small' | 'Medium' | 'Large';
export type HealthGrade = 'Excellent' | 'Good' | 'Average' | 'Poor';
export type SalesTrend = 'Increasing' | 'Decreasing' | 'Stable' | 'NoSales';

export interface Customer {
  id: string;
  name: string;
  gstin: string;
  companyAddress: string;
  region: string;
  city: string;
  category: CustomerCategory;
  ownerId: string;
  healthScore: number;
  healthGrade: HealthGrade;
  salesTrend: SalesTrend;
  lastVisitAt?: string;
  lastPurchaseAt?: string;
  isDiscounted: boolean;
  aiSummary?: string;
  syncedAt: string;
}

export type InvoiceStatus = 'Paid' | 'Partial' | 'Overdue' | 'Pending';

export interface Invoice {
  id: string;
  customerId: string;
  number: string;
  date: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
}

export interface Payment {
  id: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  mode: string;
  status: string;
  delayDays: number;
}

export interface Visit {
  id: string;
  customerId: string;
  date: string;
  salesRepId: string;
  remarks?: string;
  photos: string[];
  voiceNotes: string[];
  outcome?: string;
  nextVisitAt?: string;
}

export type QueryCategory = 'Quality' | 'Delivery' | 'Price' | 'Communication' | 'Others';
export type QueryStatus = 'Open' | 'InProgress' | 'Resolved';

export interface Query {
  id: string;
  customerId: string;
  category: QueryCategory;
  description: string;
  dateRaised: string;
  raisedById: string;
  status: QueryStatus;
  priority: Priority;
  assignedToId?: string;
  dueDate?: string;
  aiSuggestedSolution?: string;
  resolvedAt?: string;
}

export interface QueryComment {
  id: string;
  queryId: string;
  authorId: string;
  body: string;
  attachments: string[];
  createdAt: string;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Negotiation' | 'Accepted' | 'Rejected';

export interface Quotation {
  id: string;
  leadId: string;
  number: string;
  items: { name: string; qty: number; rate: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  validUntil: string;
  createdById: string;
  aiGenerated: boolean;
}

export interface Meeting {
  id: string;
  leadId?: string;
  customerId?: string;
  date: string;
  attendees: string[];
  rawNotes: string;
  voiceNoteUrl?: string;
  aiMinutes?: { summary: string; decisions: string[]; actionItems: string[] };
}

export type NotificationType =
  | 'customer-inactive'
  | 'visit-overdue'
  | 'sales-drop'
  | 'quotation-pending'
  | 'lead-converted'
  | 'payment-received'
  | 'discount-decline'
  | 'query-reminder'
  | 'ai-insight';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityRef?: string;
  read: boolean;
  createdAt: string;
}

export interface ThresholdConfig {
  discountDeclinePct: number;
  discountWindowMonths: number;
  visitReminderDays: number;
  noSalesAlertDays: number;
  classificationLimits: { smallMax: number; mediumMax: number };
  significantChangePct: number;
}

// ---------------------------------------------------------------------------
// Thresholds (defaults from MoM)
// ---------------------------------------------------------------------------

export const thresholds: ThresholdConfig = {
  discountDeclinePct: 15,
  discountWindowMonths: 3,
  visitReminderDays: 45,
  noSalesAlertDays: 30,
  classificationLimits: { smallMax: 200000, mediumMax: 1000000 },
  significantChangePct: 20,
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users: User[] = [
  { id: 'u1', name: 'Arjun Mehta', email: 'arjun@salesos.io', role: 'SalesManager', region: 'West', avatar: '/avatar-1.png', active: true },
  { id: 'u2', name: 'Priya Sharma', email: 'priya@salesos.io', role: 'SalesExecutive', region: 'West', avatar: '/avatar-2.png', active: true },
  { id: 'u3', name: 'Rohit Verma', email: 'rohit@salesos.io', role: 'Admin', region: 'North', avatar: '/avatar-3.png', active: true },
  { id: 'u4', name: 'Sneha Kulkarni', email: 'sneha@salesos.io', role: 'Accounts', region: 'South', avatar: '/avatar-4.png', active: true },
];

export const currentUser = users[0];

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const leads: Lead[] = [
  {
    id: 'L-1042', companyName: 'Nexus Polymers', contactPerson: 'Kiran Deshpande', designation: 'Purchase Head',
    phone: '+91 98220 44510', email: 'kiran@nexuspolymers.in', stage: 'NewLead', status: 'Active', priority: 'High',
    source: 'Referral', region: 'West', city: 'Pune', ownerId: 'u2',
    lastActivityAt: '2025-05-14T09:30:00', lastActivitySummary: 'Call · 2h ago', createdAt: '2025-05-12',
  },
  {
    id: 'L-1041', companyName: 'Trident Auto Components', contactPerson: 'Manish Jain', designation: 'Director',
    phone: '+91 99450 11223', email: 'manish@tridentauto.com', stage: 'EnquiryVisit', status: 'Active', priority: 'High',
    source: 'Website', region: 'South', city: 'Bengaluru', ownerId: 'u1',
    lastActivityAt: '2025-05-14T08:10:00', lastActivitySummary: 'Visit scheduled · 4h ago', createdAt: '2025-05-08',
  },
  {
    id: 'L-1039', companyName: 'Shakti Packaging', contactPerson: 'Aarti Bhandari', designation: 'GM Procurement',
    phone: '+91 98600 77889', email: 'aarti@shaktipkg.in', stage: 'QuotationNegotiation', status: 'Active', priority: 'Medium',
    source: 'Exhibition', region: 'West', city: 'Mumbai', ownerId: 'u1',
    lastActivityAt: '2025-05-13T17:45:00', lastActivitySummary: 'Quotation #Q-2218 sent · 1d ago', createdAt: '2025-04-29',
  },
  {
    id: 'L-1036', companyName: 'Orbit Electricals', contactPerson: 'Devang Trivedi', designation: 'Owner',
    phone: '+91 97240 33445', email: 'devang@orbitel.co', stage: 'NewLead', status: 'Active', priority: 'Low',
    source: 'Cold Call', region: 'West', city: 'Ahmedabad', ownerId: 'u2',
    lastActivityAt: '2025-05-13T12:00:00', lastActivitySummary: 'Note added · 1d ago', createdAt: '2025-05-10',
  },
  {
    id: 'L-1033', companyName: 'Meridian Foods', contactPerson: 'Farhan Qureshi', designation: 'Supply Chain Lead',
    phone: '+91 90040 55667', email: 'farhan@meridianfoods.in', stage: 'OrderConfirmed', status: 'Active', priority: 'High',
    source: 'Referral', region: 'North', city: 'Delhi', ownerId: 'u1',
    lastActivityAt: '2025-05-12T15:20:00', lastActivitySummary: 'Order confirmed · 2d ago', createdAt: '2025-04-15',
  },
  {
    id: 'L-1031', companyName: 'Kaveri Textiles', contactPerson: 'Lakshmi Narayan', designation: 'MD',
    stage: 'EnquiryVisit', status: 'Active', priority: 'Medium', source: 'Website', region: 'South', city: 'Coimbatore',
    ownerId: 'u2', lastActivityAt: '2025-05-11T11:00:00', lastActivitySummary: 'Email · 3d ago', createdAt: '2025-05-02',
  },
  {
    id: 'L-1027', companyName: 'Bluestone Ceramics', contactPerson: 'Harsh Vora', designation: 'Partner',
    stage: 'QuotationNegotiation', status: 'InvalidCustomer', priority: 'Low', source: 'Exhibition', region: 'West',
    city: 'Morbi', ownerId: 'u1', lastActivityAt: '2025-05-06T10:00:00', lastActivitySummary: 'Marked invalid · 8d ago', createdAt: '2025-04-20',
  },
];

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customers: Customer[] = [
  {
    id: 'C-2017', name: 'Shree Ganesh Traders', gstin: '27AAHCS4821F1Z5', companyAddress: 'Plot 14, MIDC Bhosari, Pune 411026',
    region: 'West', city: 'Pune', category: 'Large', ownerId: 'u1', healthScore: 42, healthGrade: 'Poor',
    salesTrend: 'Decreasing', lastVisitAt: '2025-03-23', lastPurchaseAt: '2025-04-28', isDiscounted: true,
    aiSummary: 'Discounted customer declining −18% over 3 months while discounts continue. Payment delays averaging 22 days.',
    syncedAt: '2025-05-14T06:00:00',
  },
  {
    id: 'C-2044', name: 'Kulkarni Enterprises', gstin: '27AAKFK1190P1ZR', companyAddress: 'Gat 88, Chakan Phase II, Pune 410501',
    region: 'West', city: 'Pune', category: 'Large', ownerId: 'u2', healthScore: 88, healthGrade: 'Excellent',
    salesTrend: 'Increasing', lastVisitAt: '2025-05-12', lastPurchaseAt: '2025-05-10', isDiscounted: false,
    aiSummary: 'High sales + regular payments. Q3 pricing discussion in progress — strong upsell candidate.',
    syncedAt: '2025-05-14T06:00:00',
  },
  {
    id: 'C-2078', name: 'Anand Steel Works', gstin: '24AAQFA7720M1ZB', companyAddress: 'GIDC Estate, Vatva, Ahmedabad 382445',
    region: 'West', city: 'Ahmedabad', category: 'Medium', ownerId: 'u1', healthScore: 71, healthGrade: 'Good',
    salesTrend: 'Stable', lastVisitAt: '2025-04-30', lastPurchaseAt: '2025-05-06', isDiscounted: true,
    syncedAt: '2025-05-14T06:00:00',
  },
  {
    id: 'C-2103', name: 'Deccan Polymers', gstin: '36AAVCD3320K1Z9', companyAddress: 'IDA Jeedimetla, Hyderabad 500055',
    region: 'South', city: 'Hyderabad', category: 'Medium', ownerId: 'u2', healthScore: 63, healthGrade: 'Average',
    salesTrend: 'Stable', lastVisitAt: '2025-04-18', lastPurchaseAt: '2025-04-25', isDiscounted: false,
    syncedAt: '2025-05-14T06:00:00',
  },
  {
    id: 'C-2130', name: 'Rajdhani Distributors', gstin: '07AAWFR5510D1Z2', companyAddress: 'Bawana Industrial Area, Delhi 110039',
    region: 'North', city: 'Delhi', category: 'Small', ownerId: 'u3', healthScore: 35, healthGrade: 'Poor',
    salesTrend: 'NoSales', lastVisitAt: '2025-03-30', lastPurchaseAt: '2025-04-05', isDiscounted: false,
    syncedAt: '2025-05-14T06:00:00',
  },
  {
    id: 'C-2155', name: 'Eastern Agro Products', gstin: '19AACCE8840R1Z6', companyAddress: 'Liluah, Howrah 711204',
    region: 'East', city: 'Kolkata', category: 'Small', ownerId: 'u3', healthScore: 78, healthGrade: 'Good',
    salesTrend: 'Increasing', lastVisitAt: '2025-05-08', lastPurchaseAt: '2025-05-11', isDiscounted: false,
    syncedAt: '2025-05-14T06:00:00',
  },
];

// ---------------------------------------------------------------------------
// Visits / Tasks / Timeline
// ---------------------------------------------------------------------------

export interface TimelineEvent {
  id: string;
  time: string;
  type: 'visit' | 'call' | 'meeting' | 'task';
  title: string;
  person: string;
  state: 'done' | 'now' | 'upcoming';
}

export const todayTimeline: TimelineEvent[] = [
  { id: 't1', time: '09:00', type: 'call', title: 'Follow-up call', person: 'Nexus Polymers', state: 'done' },
  { id: 't2', time: '10:30', type: 'visit', title: 'Plant visit', person: 'Kulkarni Enterprises', state: 'done' },
  { id: 't3', time: '12:00', type: 'meeting', title: 'Pricing review', person: 'Internal · West team', state: 'now' },
  { id: 't4', time: '14:30', type: 'visit', title: 'Recovery meeting', person: 'Shree Ganesh Traders', state: 'upcoming' },
  { id: 't5', time: '16:00', type: 'call', title: 'Quotation follow-up', person: 'Shakti Packaging', state: 'upcoming' },
  { id: 't6', time: '17:30', type: 'task', title: 'Send MoM to Trident', person: 'Trident Auto Components', state: 'upcoming' },
];

export interface Task {
  id: string;
  title: string;
  entityName: string;
  entityHref: string;
  dueTime: string;
  priority: Priority;
  done: boolean;
  overdue?: boolean;
}

export const todayTasks: Task[] = [
  { id: 'task1', title: 'Send revised quotation #Q-2218', entityName: 'Shakti Packaging', entityHref: '/leads/L-1039', dueTime: '13:00', priority: 'High', done: false },
  { id: 'task2', title: 'Draft recovery email for declining account', entityName: 'Shree Ganesh Traders', entityHref: '/customers/C-2017', dueTime: '14:00', priority: 'High', done: false, overdue: false },
  { id: 'task3', title: 'Log MoM from plant visit', entityName: 'Kulkarni Enterprises', entityHref: '/customers/C-2044', dueTime: '15:30', priority: 'Medium', done: false },
  { id: 'task4', title: 'Confirm Friday route with Priya', entityName: 'West region', entityHref: '/visits', dueTime: '17:00', priority: 'Low', done: false },
  { id: 'task5', title: 'Chase payment on INV-2841', entityName: 'Shree Ganesh Traders', entityHref: '/customers/C-2017', dueTime: 'Yesterday', priority: 'High', done: false, overdue: true },
  { id: 'task6', title: 'Update GSTIN for re-sync', entityName: 'Rajdhani Distributors', entityHref: '/customers/C-2130', dueTime: 'Yesterday', priority: 'Medium', done: false, overdue: true },
];

export interface UpcomingVisit {
  id: string;
  day: string;
  month: string;
  customerName: string;
  customerId: string;
  city: string;
  region: string;
  repAvatar?: string;
  overdueDays?: number;
}

export const upcomingVisits: UpcomingVisit[] = [
  { id: 'v1', day: '14', month: 'MAY', customerName: 'Shree Ganesh Traders', customerId: 'C-2017', city: 'Pune', region: 'West', repAvatar: '/avatar-1.png', overdueDays: 52 },
  { id: 'v2', day: '15', month: 'MAY', customerName: 'Anand Steel Works', customerId: 'C-2078', city: 'Ahmedabad', region: 'West', repAvatar: '/avatar-2.png' },
  { id: 'v3', day: '16', month: 'MAY', customerName: 'Deccan Polymers', customerId: 'C-2103', city: 'Hyderabad', region: 'South', repAvatar: '/avatar-4.png' },
  { id: 'v4', day: '19', month: 'MAY', customerName: 'Eastern Agro Products', customerId: 'C-2155', city: 'Kolkata', region: 'East', repAvatar: '/avatar-3.png' },
];

// ---------------------------------------------------------------------------
// Home: KPIs, funnel, charts, activity feed
// ---------------------------------------------------------------------------

export interface KpiDatum {
  id: string;
  label: string;
  value: number;
  format: 'int' | 'percent';
  delta?: { value: string; positive: boolean };
  spark: number[];
}

export const homeKpis: KpiDatum[] = [
  { id: 'deals', label: 'Total Deals', value: 142, format: 'int', spark: [98, 104, 99, 112, 118, 110, 124, 131, 127, 136, 140, 142] },
  { id: 'won', label: 'Won', value: 58, format: 'int', delta: { value: '12%', positive: true }, spark: [31, 34, 33, 39, 41, 40, 46, 49, 51, 53, 56, 58] },
  { id: 'lost', label: 'Lost', value: 19, format: 'int', delta: { value: '4%', positive: false }, spark: [22, 21, 24, 22, 20, 23, 21, 22, 20, 21, 19, 19] },
  { id: 'conv', label: 'Conversion Rate', value: 40.8, format: 'percent', delta: { value: '2.4 pts', positive: true }, spark: [34, 35, 33, 36, 38, 37, 39, 38, 40, 39, 41, 40.8] },
];

export interface FunnelStage {
  stage: string;
  count: number;
  color: string;
  connectorPct?: number;
}

export const leadFunnel: FunnelStage[] = [
  { stage: 'New Lead', count: 86, color: '#6AB8FF' },
  { stage: 'Enquiry / Visit', count: 54, color: '#FFB224', connectorPct: 63 },
  { stage: 'Quotation / Price Negotiation', count: 31, color: '#C6FF33', connectorPct: 57 },
  { stage: 'Order Confirmed', count: 22, color: '#4ADE80', connectorPct: 71 },
  { stage: 'Invalid', count: 12, color: '#FF5C5C' },
];

export const funnelStats = { avgConversionDays: 18.4, conversionRate: 25.6 };

export const salesGrowth = [
  { m: 'Jun', cur: 28.4, prev: 24.1 }, { m: 'Jul', cur: 31.2, prev: 26.0 },
  { m: 'Aug', cur: 29.8, prev: 27.3 }, { m: 'Sep', cur: 34.6, prev: 28.1 },
  { m: 'Oct', cur: 38.1, prev: 30.4 }, { m: 'Nov', cur: 36.4, prev: 31.2 },
  { m: 'Dec', cur: 41.9, prev: 33.0 }, { m: 'Jan', cur: 39.5, prev: 34.6 },
  { m: 'Feb', cur: 43.2, prev: 35.1 }, { m: 'Mar', cur: 47.8, prev: 36.8 },
  { m: 'Apr', cur: 46.1, prev: 38.2 }, { m: 'May', cur: 52.4, prev: 40.0 },
];

export const customerTrends = [
  { m: 'Dec', increasing: 18, stable: 42, decreasing: 12, nosales: 8 },
  { m: 'Jan', increasing: 21, stable: 40, decreasing: 13, nosales: 9 },
  { m: 'Feb', increasing: 24, stable: 39, decreasing: 11, nosales: 10 },
  { m: 'Mar', increasing: 27, stable: 38, decreasing: 12, nosales: 7 },
  { m: 'Apr', increasing: 29, stable: 37, decreasing: 14, nosales: 9 },
  { m: 'May', increasing: 33, stable: 36, decreasing: 13, nosales: 6 },
];

export const regionPerformance = [
  { region: 'West', value: 48.2, delta: 14 },
  { region: 'South', value: 36.9, delta: 8 },
  { region: 'North', value: 29.4, delta: -3 },
  { region: 'East', value: 15.1, delta: 5 },
];

export interface ActivityItem {
  id: string;
  actorName: string;
  actorAvatar?: string;
  verb: string;
  entityName: string;
  entityHref: string;
  detail?: string;
  amount?: number;
  timestamp: string;
  kind: 'lead' | 'customer' | 'visit' | 'payment';
}

export const activityFeed: ActivityItem[] = [
  { id: 'a1', actorName: 'Priya Sharma', actorAvatar: '/avatar-2.png', verb: 'logged a visit to', entityName: 'Kulkarni Enterprises', entityHref: '/customers/C-2044', detail: 'Discussed Q3 pricing', timestamp: '24 min ago', kind: 'visit' },
  { id: 'a2', actorName: 'Sneha Kulkarni', actorAvatar: '/avatar-4.png', verb: 'recorded a payment from', entityName: 'Eastern Agro Products', entityHref: '/customers/C-2155', amount: 284000, timestamp: '1h ago', kind: 'payment' },
  { id: 'a3', actorName: 'Arjun Mehta', actorAvatar: '/avatar-1.png', verb: 'moved lead to Quotation / Negotiation:', entityName: 'Shakti Packaging', entityHref: '/leads/L-1039', timestamp: '2h ago', kind: 'lead' },
  { id: 'a4', actorName: 'Rohit Verma', actorAvatar: '/avatar-3.png', verb: 'created lead', entityName: 'Nexus Polymers', entityHref: '/leads/L-1042', detail: 'Source: Referral', timestamp: '3h ago', kind: 'lead' },
  { id: 'a5', actorName: 'Priya Sharma', actorAvatar: '/avatar-2.png', verb: 'resolved a query for', entityName: 'Deccan Polymers', entityHref: '/customers/C-2103', detail: 'Delivery · resolved in 4 days', timestamp: '5h ago', kind: 'customer' },
  { id: 'a6', actorName: 'Arjun Mehta', actorAvatar: '/avatar-1.png', verb: 'converted', entityName: 'Meridian Foods', entityHref: '/leads/L-1033', detail: 'Order Confirmed', timestamp: '2d ago', kind: 'lead' },
  { id: 'a7', actorName: 'Sneha Kulkarni', actorAvatar: '/avatar-4.png', verb: 'recorded a payment from', entityName: 'Kulkarni Enterprises', entityHref: '/customers/C-2044', amount: 512000, timestamp: '2d ago', kind: 'payment' },
  { id: 'a8', actorName: 'Rohit Verma', actorAvatar: '/avatar-3.png', verb: 'flagged declining sales at', entityName: 'Shree Ganesh Traders', entityHref: '/customers/C-2017', detail: '−18% over 3 months', timestamp: '3d ago', kind: 'customer' },
];

// ---------------------------------------------------------------------------
// Notifications (shell bell seeds, toast catalog §11)
// ---------------------------------------------------------------------------

export const notifications: AppNotification[] = [
  { id: 'n1', userId: 'u1', type: 'discount-decline', title: 'Discount-decline alert', body: 'Discounted customer Shree Ganesh Traders declining beyond 15% / 3 mo', entityRef: '/customers/C-2017', read: false, createdAt: '2025-05-14T08:00:00' },
  { id: 'n2', userId: 'u1', type: 'visit-overdue', title: 'Visit overdue', body: 'Shree Ganesh Traders not visited in 52 days (limit 45)', entityRef: '/visits', read: false, createdAt: '2025-05-14T07:30:00' },
  { id: 'n3', userId: 'u1', type: 'payment-received', title: 'Payment received', body: '₹2,84,000 received from Eastern Agro Products', entityRef: '/customers/C-2155', read: false, createdAt: '2025-05-14T09:10:00' },
  { id: 'n4', userId: 'u1', type: 'ai-insight', title: 'New AI insight', body: 'New AI insight available for West region conversion', entityRef: '/analytics', read: false, createdAt: '2025-05-14T09:40:00' },
];

// ---------------------------------------------------------------------------
// Command palette index
// ---------------------------------------------------------------------------

export interface PaletteEntry {
  id: string;
  group: 'Leads' | 'Customers' | 'Invoices' | 'Visits' | 'Queries' | 'Actions';
  title: string;
  meta: string;
  href: string;
}

export const paletteIndex: PaletteEntry[] = [
  ...leads.map((l) => ({
    id: `p-${l.id}`, group: 'Leads' as const, title: l.companyName ?? l.id,
    meta: `${stageLabel(l.stage)} · ${l.city ?? '—'}`, href: `/leads/${l.id}`,
  })),
  ...customers.map((c) => ({
    id: `p-${c.id}`, group: 'Customers' as const, title: c.name,
    meta: `${c.gstin} · ${c.city}`, href: `/customers/${c.id}`,
  })),
  { id: 'p-inv1', group: 'Invoices', title: 'INV-2841', meta: '₹4,12,000 · Overdue', href: '/customers/C-2017' },
  { id: 'p-inv2', group: 'Invoices', title: 'INV-2839', meta: '₹2,84,000 · Paid', href: '/customers/C-2155' },
  { id: 'p-vis1', group: 'Visits', title: 'Plant visit — Kulkarni Enterprises', meta: 'Today · 10:30', href: '/visits' },
  { id: 'p-qry1', group: 'Queries', title: 'Query #QRY-118 — Delivery', meta: 'Shree Ganesh Traders · Open 9 days', href: '/queries' },
  { id: 'p-act1', group: 'Actions', title: 'Create lead', meta: 'Quick action', href: '/leads?new=1' },
  { id: 'p-act2', group: 'Actions', title: 'Log visit', meta: 'Quick action', href: '/visits?new=1' },
  { id: 'p-act3', group: 'Actions', title: 'New query', meta: 'Quick action', href: '/queries?new=1' },
  { id: 'p-act4', group: 'Actions', title: 'Generate quotation', meta: 'Quick action · AI', href: '/leads?quotation=1' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function stageLabel(stage: LeadStage): string {
  switch (stage) {
    case 'NewLead': return 'New Lead';
    case 'EnquiryVisit': return 'Enquiry / Visit';
    case 'QuotationNegotiation': return 'Quotation / Negotiation';
    case 'OrderConfirmed': return 'Order Confirmed';
  }
}

export function stageColor(stage: LeadStage): string {
  switch (stage) {
    case 'NewLead': return '#6AB8FF';
    case 'EnquiryVisit': return '#FFB224';
    case 'QuotationNegotiation': return '#C6FF33';
    case 'OrderConfirmed': return '#4ADE80';
  }
}

export function healthColor(grade: HealthGrade): string {
  switch (grade) {
    case 'Excellent': return '#4ADE80';
    case 'Good': return '#C6FF33';
    case 'Average': return '#FFB224';
    case 'Poor': return '#FF5C5C';
  }
}

/** Indian-grouped currency: ₹12,40,000 · compact ₹12.4L at ≥ ₹10L */
export function formatINR(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (compact && Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
  const s = Math.round(Math.abs(n)).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${n < 0 ? '-' : ''}₹${grouped}`;
}
