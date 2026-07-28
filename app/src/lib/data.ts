/**
 * SalesOS data layer — every query the UI needs, implemented directly on
 * Supabase (PostgREST via supabase-js). Mirrors the business semantics of the
 * former backend routers 1:1; date columns are parsed back into Date objects
 * so components behave exactly as before.
 */
import { supabase, unwrap } from "@/lib/supabase";
import {
  avgMonthlySales,
  classifyCustomer,
  daysBetween,
  discountDecline,
  formatINR,
  monthKey,
  monthlySales,
  salesMonitorBucket,
  trailingMonthKeys,
} from "@/lib/rules";
import {
  LeadStageLabels,
  LeadStages,
  QueryCategoryLabels,
  HealthGrades,
  DefaultThresholds,
} from "@contracts/constants";
import type {
  HealthGrade,
  LeadStage,
  LeadStatus,
  QueryStatus,
  SalesMonitorBucket,
  ThresholdSettings,
} from "@contracts/types";

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

function parseDates(row: any, fields: string[]): any {
  if (!row) return row;
  const out: Row = { ...row };
  for (const f of fields) {
    const v = out[f];
    if (typeof v === "string" && v) out[f] = new Date(v);
  }
  return out;
}

const DATES: Record<string, string[]> = {
  users: ["createdAt", "updatedAt", "lastSignInAt"],
  leads: ["lastActivityAt", "createdAt", "updatedAt"],
  lead_activities: ["date", "createdAt"],
  customers: ["lastVisitAt", "lastPurchaseAt", "syncedAt", "createdAt", "updatedAt"],
  invoices: ["date", "dueDate", "createdAt"],
  payments: ["date", "createdAt"],
  visits: ["date", "nextVisitAt", "createdAt"],
  queries: ["dateRaised", "dueDate", "resolvedAt", "createdAt", "updatedAt"],
  query_comments: ["createdAt"],
  quotations: ["validUntil", "createdAt", "updatedAt"],
  meetings: ["date", "createdAt"],
  notifications: ["createdAt"],
  threshold_config: ["updatedAt"],
};

const mapRows = (table: string) => (rows: Row[] | null) =>
  (rows ?? []).map((r) => parseDates(r, DATES[table] ?? []));

async function selectAll(table: string, orderBy?: { col: string; asc?: boolean }[]) {
  let q = supabase.from(table).select("*");
  for (const o of orderBy ?? []) q = q.order(o.col, { ascending: o.asc ?? true });
  return mapRows(table)(unwrap(await q));
}

async function usersByIds(ids: (number | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is number => typeof x === "number"))];
  if (unique.length === 0) return new Map<number, Row>();
  const rows = mapRows("users")(
    unwrap(await supabase.from("users").select("*").in("id", unique)),
  );
  return new Map(rows.map((u) => [u.id as number, u]));
}

export async function listUsers() {
  return selectAll("users", [{ col: "id" }]);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export type LeadFilters = {
  search?: string;
  region?: string;
  stage?: LeadStage;
  status?: LeadStatus;
};

export async function listLeads(filters: LeadFilters = {}) {
  const rows = await selectAll("leads", [
    { col: "lastActivityAt", asc: false },
    { col: "createdAt", asc: false },
  ]);
  const q = filters.search?.trim().toLowerCase();
  return rows.filter((l) => {
    if (q) {
      const hay = `${l.companyName ?? ""} ${l.contactPerson ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.region && l.region !== filters.region) return false;
    if (filters.stage && l.stage !== filters.stage) return false;
    if (filters.status && l.status !== filters.status) return false;
    return true;
  });
}

export async function findLeadById(id: number) {
  const lead = parseDates(
    unwrap(await supabase.from("leads").select("*").eq("id", id).maybeSingle()),
    DATES.leads,
  );
  if (!lead) return undefined;
  const [activities, quotationsList, meetingsList, users] = await Promise.all([
    supabase
      .from("lead_activities")
      .select("*")
      .eq("leadId", id)
      .order("date", { ascending: false })
      .then((r) => mapRows("lead_activities")(unwrap(r))),
    supabase
      .from("quotations")
      .select("*")
      .eq("leadId", id)
      .then((r) => mapRows("quotations")(unwrap(r))),
    supabase
      .from("meetings")
      .select("*")
      .eq("leadId", id)
      .then((r) => mapRows("meetings")(unwrap(r))),
    usersByIds([
      lead.ownerId,
      lead.lastUpdatedById,
      ...((unwrap(
        await supabase.from("lead_activities").select("updatedById").eq("leadId", id),
      ) ?? []) as Row[]).map((a) => a.updatedById as number),
    ]),
  ]);
  return {
    ...lead,
    owner: users.get(lead.ownerId) ?? null,
    activities: activities.map((a) => ({
      ...a,
      updatedBy: users.get(a.updatedById) ?? null,
    })),
    quotations: quotationsList,
    meetings: meetingsList,
  };
}

export type InsertLead = {
  companyName?: string | null;
  contactPerson?: string | null;
  designation?: string | null;
  phone?: string | null;
  email?: string | null;
  companyAddress?: string | null;
  googleMapsUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  stage?: LeadStage;
  status?: LeadStatus;
  priority?: string;
  source?: string | null;
  region?: string | null;
  city?: string | null;
  ownerId?: number | null;
};

export async function createLead(data: InsertLead) {
  const row = parseDates(
    unwrap(await supabase.from("leads").insert(data).select().single()),
    DATES.leads,
  );
  return row;
}

export async function updateLead(
  id: number,
  patch: Partial<InsertLead>,
  updatedById?: number,
) {
  const existing = parseDates(
    unwrap(await supabase.from("leads").select("*").eq("id", id).maybeSingle()),
    DATES.leads,
  );
  if (!existing) return undefined;

  const stageChanged = patch.stage !== undefined && patch.stage !== existing.stage;

  unwrap(
    await supabase
      .from("leads")
      .update({ ...patch, lastUpdatedById: updatedById ?? existing.lastUpdatedById })
      .eq("id", id),
  );

  const actorId = updatedById ?? existing.ownerId;
  if (stageChanged && patch.stage && actorId) {
    const summary = `Stage changed to ${LeadStageLabels[patch.stage]}`;
    unwrap(
      await supabase.from("lead_activities").insert({
        leadId: id,
        date: new Date().toISOString(),
        activity: "stage-change",
        remarks: summary,
        updatedById: actorId,
      }),
    );
    unwrap(
      await supabase
        .from("leads")
        .update({ lastActivityAt: new Date().toISOString(), lastActivitySummary: summary })
        .eq("id", id),
    );
  }

  return parseDates(
    unwrap(await supabase.from("leads").select("*").eq("id", id).single()),
    DATES.leads,
  );
}

export async function addLeadActivity(data: {
  leadId: number;
  activity: "call" | "email" | "visit" | "note" | "stage-change";
  remarks?: string;
  updatedById: number;
  date?: Date;
}) {
  const date = data.date ?? new Date();
  const row = parseDates(
    unwrap(
      await supabase
        .from("lead_activities")
        .insert({
          leadId: data.leadId,
          date: date.toISOString(),
          activity: data.activity,
          remarks: data.remarks ?? null,
          updatedById: data.updatedById,
        })
        .select()
        .single(),
    ),
    DATES.lead_activities,
  );
  unwrap(
    await supabase
      .from("leads")
      .update({
        lastActivityAt: date.toISOString(),
        lastActivitySummary: data.remarks ?? `${data.activity} logged`,
        lastUpdatedById: data.updatedById,
      })
      .eq("id", data.leadId),
  );
  return row;
}

export async function leadStageCounts() {
  const rows = await selectAll("leads");
  const counts: Record<LeadStage, number> = {
    new_lead: 0,
    enquiry_visit: 0,
    quotation_negotiation: 0,
    order_confirmed: 0,
  };
  let invalid = 0;
  for (const lead of rows) {
    if (lead.status === "invalid_customer") {
      invalid += 1;
      continue;
    }
    if (lead.stage) counts[lead.stage as LeadStage] += 1;
  }
  return { counts, invalidCustomer: invalid, total: rows.length };
}

export async function leadFunnel() {
  const { counts, invalidCustomer, total } = await leadStageCounts();
  const stageCounts = LeadStages.map((s) => counts[s]);
  return {
    stages: LeadStages.map((stage, i) => ({
      stage,
      label: LeadStageLabels[stage],
      count: stageCounts[i],
      connectorPct:
        i > 0 && stageCounts[i - 1] > 0
          ? Math.round((stageCounts[i] / stageCounts[i - 1]) * 100)
          : undefined,
    })),
    invalid: invalidCustomer,
    total,
  };
}

export async function leadConversionStats() {
  const [rows, activities] = await Promise.all([
    selectAll("leads"),
    selectAll("lead_activities"),
  ]);
  const converted = rows.filter(
    (l) => l.stage === "order_confirmed" && l.status !== "invalid_customer",
  );
  const invalid = rows.filter((l) => l.status === "invalid_customer");
  const durations: number[] = [];
  for (const lead of converted) {
    const confirmation = activities
      .filter(
        (a) =>
          a.leadId === lead.id &&
          a.activity === "stage-change" &&
          a.remarks?.includes(LeadStageLabels.order_confirmed),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    const end = confirmation?.date ?? lead.lastActivityAt ?? lead.updatedAt;
    durations.push(daysBetween(lead.createdAt, end));
  }
  const avgConversionDays =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0;
  const decided = converted.length + invalid.length;
  return {
    total: rows.length,
    converted: converted.length,
    invalid: invalid.length,
    avgConversionDays,
    conversionRate:
      rows.length > 0 ? Math.round((converted.length / rows.length) * 1000) / 10 : 0,
    decidedRate:
      decided > 0 ? Math.round((converted.length / decided) * 1000) / 10 : 0,
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export type CustomerFilters = {
  search?: string;
  region?: string;
  category?: string;
  salesTrend?: string;
};

export async function listCustomers(filters: CustomerFilters = {}) {
  const rows = await selectAll("customers", [{ col: "updatedAt", asc: false }]);
  const q = filters.search?.trim().toLowerCase();
  return rows.filter((c) => {
    if (q) {
      const hay = `${c.id} ${c.name} ${c.gstin}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.region && c.region !== filters.region) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.salesTrend && c.salesTrend !== filters.salesTrend) return false;
    return true;
  });
}

export async function findCustomerById(id: string) {
  const customer = parseDates(
    unwrap(await supabase.from("customers").select("*").eq("id", id).maybeSingle()),
    DATES.customers,
  );
  if (!customer) return undefined;

  const [invs, pays, vis, qs, meets] = await Promise.all([
    supabase.from("invoices").select("*").eq("customerId", id).order("date", { ascending: false }).then((r) => mapRows("invoices")(unwrap(r))),
    supabase.from("payments").select("*").eq("customerId", id).order("date", { ascending: false }).then((r) => mapRows("payments")(unwrap(r))),
    supabase.from("visits").select("*").eq("customerId", id).order("date", { ascending: false }).then((r) => mapRows("visits")(unwrap(r))),
    supabase.from("queries").select("*").eq("customerId", id).order("dateRaised", { ascending: false }).then((r) => mapRows("queries")(unwrap(r))),
    supabase.from("meetings").select("*").eq("customerId", id).order("date", { ascending: false }).then((r) => mapRows("meetings")(unwrap(r))),
  ]);

  const queryIds = qs.map((q) => q.id as number);
  const comments = queryIds.length
    ? mapRows("query_comments")(
        unwrap(await supabase.from("query_comments").select("*").in("queryId", queryIds)),
      )
    : [];
  const users = await usersByIds([
    customer.ownerId,
    ...vis.map((v) => v.salesRepId as number),
    ...comments.map((c) => c.authorId as number),
  ]);

  const queriesWith = qs.map((q) => ({
    ...q,
    comments: comments
      .filter((c) => c.queryId === q.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => ({ ...c, author: users.get(c.authorId) ?? null })),
  }));

  return {
    ...customer,
    owner: users.get(customer.ownerId) ?? null,
    invoices: invs,
    payments: pays,
    visits: vis.map((v) => ({ ...v, salesRep: users.get(v.salesRepId) ?? null })),
    queries: queriesWith,
    openQueries: queriesWith.filter((q: Row) => q.status !== "resolved"),
    meetings: meets,
  };
}

/** §10.3 — auto-classification vs admin limits; returns changed customers. */
export async function recomputeClassification(updatedById?: number) {
  const t = await getThresholds();
  const [allCustomers, allInvoices] = await Promise.all([
    selectAll("customers"),
    selectAll("invoices"),
  ]);
  const byCustomer = new Map<string, Row[]>();
  for (const inv of allInvoices) {
    const list = byCustomer.get(inv.customerId) ?? [];
    list.push(inv);
    byCustomer.set(inv.customerId, list);
  }
  const changed: { id: string; name: string; from: string | null; to: string }[] = [];
  for (const c of allCustomers) {
    const avg = avgMonthlySales((byCustomer.get(c.id) ?? []) as any, 3);
    const next = classifyCustomer(avg, t);
    if (next !== c.category) {
      unwrap(await supabase.from("customers").update({ category: next }).eq("id", c.id));
      changed.push({ id: c.id, name: c.name, from: c.category, to: next });
    }
  }
  return { updatedById: updatedById ?? null, changed };
}

/** MoM reports: regular purchasing, no-purchase, monthly comparison, growth/decline. */
export async function customerReports() {
  const t = await getThresholds();
  const [allCustomers, allInvoices] = await Promise.all([
    selectAll("customers"),
    selectAll("invoices"),
  ]);
  const byCustomer = new Map<string, Row[]>();
  for (const inv of allInvoices) {
    const list = byCustomer.get(inv.customerId) ?? [];
    list.push(inv);
    byCustomer.set(inv.customerId, list);
  }

  const regularPurchasing: string[] = [];
  const noPurchases: string[] = [];
  const growth: { id: string; name: string; pct: number; window: string }[] = [];
  const decline: { id: string; name: string; pct: number; window: string }[] = [];
  const windows = [
    { label: "monthly", months: 1 },
    { label: "3m", months: 3 },
    { label: "6m", months: 6 },
  ];

  for (const c of allCustomers) {
    const inv = byCustomer.get(c.id) ?? [];
    const totals = monthlySales(inv as any);
    const lastMonth = trailingMonthKeys(1)[0];
    const cur = totals.get(lastMonth) ?? 0;
    const lastPurchaseAt = inv.map((i) => i.date as Date).sort((a, b) => b.getTime() - a.getTime())[0];
    const idleDays = lastPurchaseAt ? daysBetween(lastPurchaseAt) : null;
    if (cur > 0 && idleDays !== null && idleDays <= t.noSalesAlertDays) {
      regularPurchasing.push(c.id);
    } else {
      noPurchases.push(c.id);
    }
    for (const w of windows) {
      const keys = trailingMonthKeys(w.months * 2);
      const prev = keys.slice(0, w.months).reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
      const recent = keys.slice(w.months).reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
      if (prev <= 0) continue;
      const pct = Math.round(((recent - prev) / prev) * 1000) / 10;
      if (pct > t.significantChangePct) growth.push({ id: c.id, name: c.name, pct, window: w.label });
      else if (pct < -t.significantChangePct) decline.push({ id: c.id, name: c.name, pct, window: w.label });
    }
  }

  const monthlyComparison = trailingMonthKeys(6).map((k) => ({
    month: k,
    total: allInvoices
      .filter((i) => monthKey(i.date) === k)
      .reduce((acc, i) => acc + (i.amount as number), 0),
  }));

  return { regularPurchasing, noPurchases, monthlyComparison, growth, decline };
}

/** §10.2 — same name + different GSTIN/address = separate customers. */
export async function duplicatesReport() {
  const rows = await selectAll("customers");
  const byName = new Map<string, Row[]>();
  for (const c of rows) {
    const key = (c.name as string).trim().toLowerCase();
    const list = byName.get(key) ?? [];
    list.push(c);
    byName.set(key, list);
  }
  return [...byName.values()]
    .filter((group) => {
      if (group.length < 2) return false;
      const keys = new Set(group.map((c) => `${c.gstin}|${c.companyAddress}`));
      return keys.size > 1;
    })
    .map((group) => ({
      name: group[0].name as string,
      matchKey: "GSTIN + Company Address",
      customers: group.map((c) => ({
        id: c.id as string,
        gstin: c.gstin as string,
        companyAddress: c.companyAddress as string,
        region: c.region as string | null,
        city: c.city as string | null,
      })),
    }));
}

export async function outstandingInvoices() {
  return mapRows("invoices")(
    unwrap(
      await supabase.from("invoices").select("*").neq("status", "paid").order("date", { ascending: false }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Visits
// ---------------------------------------------------------------------------

function lastVisitMap(allVisits: Row[]) {
  const lastVisit = new Map<string, Date>();
  for (const v of allVisits) {
    const prev = lastVisit.get(v.customerId);
    if (!prev || (v.date as Date) > prev) lastVisit.set(v.customerId, v.date);
  }
  return lastVisit;
}

export async function regionDashboard() {
  const t = await getThresholds();
  const [allCustomers, allVisits] = await Promise.all([
    selectAll("customers"),
    selectAll("visits"),
  ]);
  const lastVisit = lastVisitMap(allVisits);
  const regions = new Map<string, { region: string; total: number; visited: number; pending: number }>();
  for (const c of allCustomers) {
    const region = (c.region as string) ?? "Unassigned";
    const entry = regions.get(region) ?? { region, total: 0, visited: 0, pending: 0 };
    entry.total += 1;
    const last = lastVisit.get(c.id) ?? (c.lastVisitAt as Date | null) ?? undefined;
    const idle = last ? daysBetween(last) : Number.POSITIVE_INFINITY;
    if (idle <= t.visitReminderDays) entry.visited += 1;
    else entry.pending += 1;
    regions.set(region, entry);
  }
  return [...regions.values()].map((r) => ({
    ...r,
    completionPct: r.total > 0 ? Math.round((r.visited / r.total) * 1000) / 10 : 0,
  }));
}

export async function cityView() {
  const t = await getThresholds();
  const [allCustomers, allVisits] = await Promise.all([
    selectAll("customers"),
    selectAll("visits"),
  ]);
  const cities = new Map<string, { city: string; region: string; customers: number; recentVisits: number; pending: number }>();
  const lastVisit = lastVisitMap(allVisits);
  for (const c of allCustomers) {
    const city = (c.city as string) ?? "Unknown";
    const entry = cities.get(city) ?? { city, region: (c.region as string) ?? "Unassigned", customers: 0, recentVisits: 0, pending: 0 };
    entry.customers += 1;
    const last = lastVisit.get(c.id) ?? (c.lastVisitAt as Date | null) ?? undefined;
    if (!last || daysBetween(last) > t.visitReminderDays) entry.pending += 1;
    cities.set(city, entry);
  }
  for (const v of allVisits) {
    if (daysBetween(v.date) <= t.visitReminderDays) {
      const customer = allCustomers.find((c) => c.id === v.customerId);
      const entry = cities.get((customer?.city as string) ?? "Unknown");
      if (entry) entry.recentVisits += 1;
    }
  }
  return [...cities.values()].sort((a, b) => b.customers - a.customers);
}

export async function overdueVisits() {
  const t = await getThresholds();
  const [allCustomers, allVisits] = await Promise.all([
    selectAll("customers"),
    selectAll("visits"),
  ]);
  const lastVisit = lastVisitMap(allVisits);
  return allCustomers
    .map((c) => {
      const last = lastVisit.get(c.id) ?? (c.lastVisitAt as Date | null) ?? undefined;
      const pendingDays = last ? daysBetween(last) : daysBetween(c.createdAt);
      return {
        customerId: c.id as string,
        name: c.name as string,
        region: c.region as string | null,
        city: c.city as string | null,
        lastVisitDate: last ?? null,
        pendingDays,
        overdue: pendingDays > t.visitReminderDays,
      };
    })
    .filter((r) => r.overdue)
    .sort((a, b) => b.pendingDays - a.pendingDays);
}

export type InsertVisit = {
  customerId: string;
  date: Date;
  salesRepId?: number | null;
  remarks?: string | null;
  photos?: string[];
  voiceNotes?: string[];
  outcome?: string | null;
  nextVisitAt?: Date | null;
};

export async function createVisit(data: InsertVisit) {
  const row = parseDates(
    unwrap(
      await supabase
        .from("visits")
        .insert({
          customerId: data.customerId,
          date: data.date.toISOString(),
          salesRepId: data.salesRepId ?? null,
          remarks: data.remarks ?? null,
          photos: data.photos ?? [],
          voiceNotes: data.voiceNotes ?? [],
          outcome: data.outcome ?? null,
          nextVisitAt: data.nextVisitAt ? data.nextVisitAt.toISOString() : null,
        })
        .select()
        .single(),
    ),
    DATES.visits,
  );
  unwrap(await supabase.from("customers").update({ lastVisitAt: data.date.toISOString() }).eq("id", data.customerId));
  return row;
}

export async function listVisitsByCustomer(customerId: string) {
  const rows = mapRows("visits")(
    unwrap(
      await supabase.from("visits").select("*").eq("customerId", customerId).order("date", { ascending: false }),
    ),
  );
  const users = await usersByIds(rows.map((v) => v.salesRepId as number));
  return rows.map((v) => ({ ...v, salesRep: users.get(v.salesRepId) ?? null }));
}

export async function upcomingVisits() {
  const rows = await selectAll("visits", [{ col: "date", asc: false }]);
  const now = new Date();
  const customers = await selectAll("customers");
  const custById = new Map(customers.map((c) => [c.id as string, c]));
  const users = await usersByIds(rows.map((v) => v.salesRepId as number));
  return rows
    .filter((v) => v.nextVisitAt && (v.nextVisitAt as Date) > now)
    .map((v) => {
      const c = custById.get(v.customerId);
      return {
        id: v.id as number,
        customerId: v.customerId as string,
        customerName: (c?.name as string) ?? (v.customerId as string),
        city: (c?.city as string | null) ?? null,
        region: (c?.region as string | null) ?? null,
        date: v.nextVisitAt as Date,
        repAvatar: (users.get(v.salesRepId)?.avatar as string | null) ?? null,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ---------------------------------------------------------------------------
// Customer queries (support)
// ---------------------------------------------------------------------------

async function stitchQueryRelations(rows: Row[]): Promise<any[]> {
  const ids = rows.map((q) => q.id as number);
  const comments = ids.length
    ? mapRows("query_comments")(
        unwrap(await supabase.from("query_comments").select("*").in("queryId", ids)),
      )
    : [];
  const customers = await selectAll("customers");
  const custById = new Map(customers.map((c) => [c.id as string, c]));
  const users = await usersByIds([
    ...rows.map((q) => q.assignedToId as number),
    ...rows.map((q) => q.raisedById as number),
    ...comments.map((c) => c.authorId as number),
  ]);
  return rows.map((q) => ({
    ...q,
    customer: custById.get(q.customerId) ?? null,
    assignedTo: users.get(q.assignedToId) ?? null,
    raisedBy: users.get(q.raisedById) ?? null,
    comments: comments
      .filter((c) => c.queryId === q.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => ({ ...c, author: users.get(c.authorId) ?? null })),
  }));
}

export async function kanbanQueries() {
  const rows = mapRows("queries")(
    unwrap(await supabase.from("queries").select("*").order("dateRaised", { ascending: false })),
  );
  const withRel = await stitchQueryRelations(rows);
  const board: Record<QueryStatus, any[]> = { open: [], in_progress: [], resolved: [] };
  for (const q of withRel) board[q.status as QueryStatus].push(q);
  return board;
}

export async function queriesByCustomer(customerId: string) {
  const rows = mapRows("queries")(
    unwrap(
      await supabase.from("queries").select("*").eq("customerId", customerId).order("dateRaised", { ascending: false }),
    ),
  );
  return stitchQueryRelations(rows);
}

export type InsertQuery = {
  customerId: string;
  category: string;
  description: string;
  priority?: string;
  assignedToId?: number | null;
  dueDate?: Date | null;
  aiSuggestedSolution?: string | null;
  raisedById?: number | null;
};

export async function createQuery(data: InsertQuery) {
  const row = parseDates(
    unwrap(
      await supabase
        .from("queries")
        .insert({
          customerId: data.customerId,
          category: data.category,
          description: data.description,
          priority: data.priority ?? "medium",
          assignedToId: data.assignedToId ?? null,
          dueDate: data.dueDate ? data.dueDate.toISOString() : null,
          aiSuggestedSolution: data.aiSuggestedSolution ?? null,
          raisedById: data.raisedById ?? null,
        })
        .select()
        .single(),
    ),
    DATES.queries,
  );
  const customers = await selectAll("customers");
  return { ...row, customer: customers.find((c) => c.id === row.customerId) ?? null, comments: [] };
}

export async function updateQueryStatus(id: number, status: QueryStatus, actorId?: number) {
  unwrap(
    await supabase
      .from("queries")
      .update({ status, resolvedAt: status === "resolved" ? new Date().toISOString() : null })
      .eq("id", id),
  );
  if (actorId) {
    unwrap(
      await supabase.from("query_comments").insert({
        queryId: id,
        authorId: actorId,
        body: `Status changed to ${status.replace("_", " ")}`,
        attachments: [],
      }),
    );
  }
  const row = parseDates(
    unwrap(await supabase.from("queries").select("*").eq("id", id).single()),
    DATES.queries,
  );
  const comments = mapRows("query_comments")(
    unwrap(await supabase.from("query_comments").select("*").eq("queryId", id)),
  );
  return { ...row, comments };
}

export async function addQueryComment(data: {
  queryId: number;
  authorId: number;
  body: string;
  attachments?: string[];
}) {
  const row = parseDates(
    unwrap(
      await supabase
        .from("query_comments")
        .insert({
          queryId: data.queryId,
          authorId: data.authorId,
          body: data.body,
          attachments: data.attachments ?? [],
        })
        .select()
        .single(),
    ),
    DATES.query_comments,
  );
  const users = await usersByIds([row.authorId as number]);
  return { ...row, author: users.get(row.authorId) ?? null };
}

export async function unresolvedReminders(minAgeDays = 3) {
  const rows = mapRows("queries")(
    unwrap(await supabase.from("queries").select("*").neq("status", "resolved").order("dateRaised", { ascending: false })),
  );
  const withRel = await stitchQueryRelations(rows);
  return withRel
    .map((q) => ({
      id: q.id as number,
      customerId: q.customerId as string,
      customerName: (q.customer?.name as string) ?? (q.customerId as string),
      category: q.category as string,
      status: q.status as string,
      priority: q.priority as "low" | "medium" | "high",
      assignedTo: (q.assignedTo?.name as string) ?? null,
      dateRaised: q.dateRaised as Date,
      unresolvedDays: daysBetween(q.dateRaised),
    }))
    .filter((r) => r.unresolvedDays >= minAgeDays)
    .sort((a, b) => b.unresolvedDays - a.unresolvedDays);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

async function loadAll() {
  const [allCustomers, allInvoices, allPayments, allLeads, allVisits] = await Promise.all([
    selectAll("customers"),
    selectAll("invoices"),
    selectAll("payments"),
    selectAll("leads"),
    selectAll("visits"),
  ]);
  const invByCustomer = new Map<string, Row[]>();
  const payByCustomer = new Map<string, Row[]>();
  for (const i of allInvoices) {
    const l = invByCustomer.get(i.customerId) ?? [];
    l.push(i);
    invByCustomer.set(i.customerId, l);
  }
  for (const p of allPayments) {
    const l = payByCustomer.get(p.customerId) ?? [];
    l.push(p);
    payByCustomer.set(p.customerId, l);
  }
  return { allCustomers, allInvoices, allPayments, allLeads, allVisits, invByCustomer, payByCustomer };
}

export async function analyticsKpis() {
  const t = await getThresholds();
  const { allCustomers, allInvoices, allPayments, allLeads } = await loadAll();
  const [openQueryRows, pipelineQuotationRows] = await Promise.all([
    supabase.from("queries").select("id").neq("status", "resolved").then((r) => unwrap(r) ?? []),
    supabase.from("quotations").select("total,status").in("status", ["draft", "sent", "negotiation"]).then((r) => unwrap(r) ?? []),
  ]);
  const lastMonth = trailingMonthKeys(1)[0];
  const totals = monthlySales(allInvoices as any);
  const monthlyRevenue = totals.get(lastMonth) ?? 0;
  const activeLeads = allLeads.filter((l) => l.status !== "invalid_customer").length;
  const converted = allLeads.filter((l) => l.stage === "order_confirmed" && l.status !== "invalid_customer").length;
  const invoiced = allInvoices.reduce((a, i) => a + (i.amount as number), 0);
  const collected = allPayments.filter((p) => p.status === "completed").reduce((a, p) => a + (p.amount as number), 0);
  const overdueCount = allInvoices.filter((i) => i.status === "overdue").length;
  return {
    totalCustomers: allCustomers.length,
    activeLeads,
    convertedLeads: converted,
    monthlyRevenue,
    totalInvoiced: invoiced,
    totalCollected: collected,
    collectionPct: invoiced > 0 ? Math.round((collected / invoiced) * 1000) / 10 : 0,
    overdueInvoices: overdueCount,
    openQueries: openQueryRows.length,
    pipelineValue: pipelineQuotationRows.reduce((a: number, q: any) => a + (q.total as number), 0),
    thresholds: t,
  };
}

export async function salesMonitoring30d() {
  const t = await getThresholds();
  const { allCustomers, invByCustomer } = await loadAll();
  const buckets: Record<SalesMonitorBucket, { id: string; name: string; region: string | null; city: string | null; amount30d: number }[]> = {
    regular: [],
    no_sales: [],
    increasing: [],
    decreasing: [],
  };
  for (const c of allCustomers) {
    const inv = invByCustomer.get(c.id) ?? [];
    const bucket = salesMonitorBucket(inv as any, t);
    const amount30d = inv.filter((i) => daysBetween(i.date) < 30).reduce((a, i) => a + (i.amount as number), 0);
    buckets[bucket].push({ id: c.id, name: c.name, region: c.region, city: c.city, amount30d });
  }
  return buckets;
}

export async function healthDistribution() {
  const { allCustomers } = await loadAll();
  const dist = Object.fromEntries(HealthGrades.map((g) => [g, 0])) as Record<HealthGrade, number>;
  for (const c of allCustomers) if (c.healthGrade) dist[c.healthGrade as HealthGrade] += 1;
  return HealthGrades.map((grade) => ({ grade, count: dist[grade] }));
}

export async function monthlyComparison() {
  const { allInvoices } = await loadAll();
  const totals = monthlySales(allInvoices as any);
  const keys = trailingMonthKeys(6);
  return keys.map((k, i) => {
    const total = totals.get(k) ?? 0;
    const prev = i > 0 ? totals.get(keys[i - 1]) ?? 0 : 0;
    return {
      month: k,
      total,
      invoices: allInvoices.filter((inv) => monthKey(inv.date) === k).length,
      momPct: prev > 0 ? Math.round(((total - prev) / prev) * 1000) / 10 : null,
    };
  });
}

export async function regionPerformance() {
  const { allCustomers, invByCustomer } = await loadAll();
  const totalsByRegion = new Map<string, { cur: number; prev: number }>();
  const keys = trailingMonthKeys(6);
  for (const c of allCustomers) {
    const region = (c.region as string) ?? "Unassigned";
    const totals = monthlySales((invByCustomer.get(c.id) ?? []) as any);
    const entry = totalsByRegion.get(region) ?? { cur: 0, prev: 0 };
    entry.prev += keys.slice(0, 3).reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
    entry.cur += keys.slice(3).reduce((acc, k) => acc + (totals.get(k) ?? 0), 0);
    totalsByRegion.set(region, entry);
  }
  return [...totalsByRegion.entries()]
    .map(([region, v]) => ({
      region,
      value: v.cur,
      delta: v.prev > 0 ? Math.round(((v.cur - v.prev) / v.prev) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.value - a.value);
}

export async function topCustomers(limit = 5) {
  const { allCustomers, invByCustomer } = await loadAll();
  const keys = new Set(trailingMonthKeys(6));
  return allCustomers
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      region: c.region as string | null,
      city: c.city as string | null,
      category: c.category as string | null,
      healthGrade: c.healthGrade as string | null,
      revenue6m: (invByCustomer.get(c.id) ?? [])
        .filter((i) => keys.has(monthKey(i.date)))
        .reduce((a, i) => a + (i.amount as number), 0),
    }))
    .sort((a, b) => b.revenue6m - a.revenue6m)
    .slice(0, limit);
}

export async function inactiveCustomers() {
  const t = await getThresholds();
  const { allCustomers, invByCustomer } = await loadAll();
  return allCustomers
    .map((c) => {
      const inv = invByCustomer.get(c.id) ?? [];
      const last = inv.map((i) => i.date as Date).sort((a, b) => b.getTime() - a.getTime())[0];
      const idleDays = last ? daysBetween(last) : daysBetween(c.createdAt);
      return {
        id: c.id as string,
        name: c.name as string,
        region: c.region as string | null,
        city: c.city as string | null,
        lastPurchaseAt: (last as Date | undefined) ?? null,
        idleDays,
      };
    })
    .filter((r) => r.idleDays > t.noSalesAlertDays)
    .sort((a, b) => b.idleDays - a.idleDays);
}

export async function discountMonitoring() {
  const t = await getThresholds();
  const { allCustomers, invByCustomer } = await loadAll();
  return allCustomers
    .filter((c) => c.isDiscounted)
    .map((c) => {
      const result = discountDecline((invByCustomer.get(c.id) ?? []) as any, t);
      return {
        id: c.id as string,
        name: c.name as string,
        region: c.region as string | null,
        city: c.city as string | null,
        dropPct: result.dropPct,
        currentWindowSales: result.current,
        previousWindowSales: result.previous,
        declining: result.declining,
        thresholdPct: t.discountDeclinePct,
        windowMonths: t.discountWindowMonths,
      };
    })
    .sort((a, b) => b.dropPct - a.dropPct);
}

export async function churnRisk() {
  const t = await getThresholds();
  const { allCustomers, invByCustomer, allVisits } = await loadAll();
  const lastVisit = lastVisitMap(allVisits);
  return allCustomers
    .map((c) => {
      const inv = invByCustomer.get(c.id) ?? [];
      const lastPurchase = inv.map((i) => i.date as Date).sort((a, b) => b.getTime() - a.getTime())[0];
      const salesIdle = lastPurchase ? daysBetween(lastPurchase) : daysBetween(c.createdAt);
      const lv = lastVisit.get(c.id) ?? (c.lastVisitAt as Date | null) ?? undefined;
      const visitIdle = lv ? daysBetween(lv) : null;
      let score = 0;
      if (salesIdle > t.noSalesAlertDays) score += 40;
      if (visitIdle === null || visitIdle > t.visitReminderDays) score += 30;
      if (c.healthGrade === "poor") score += 30;
      else if (c.healthGrade === "average") score += 15;
      return {
        id: c.id as string,
        name: c.name as string,
        region: c.region as string | null,
        city: c.city as string | null,
        healthGrade: c.healthGrade as string | null,
        salesIdleDays: salesIdle,
        visitIdleDays: visitIdle,
        riskScore: Math.min(score, 100),
      };
    })
    .filter((r) => r.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export async function paymentCollection() {
  const { allInvoices, allPayments } = await loadAll();
  const invoiced = allInvoices.reduce((a, i) => a + (i.amount as number), 0);
  const completed = allPayments.filter((p) => p.status === "completed");
  const collected = completed.reduce((a, p) => a + (p.amount as number), 0);
  const overdueAmount = allInvoices.filter((i) => i.status === "overdue").reduce((a, i) => a + (i.amount as number), 0);
  const avgDelayDays =
    completed.length > 0
      ? Math.round((completed.reduce((a, p) => a + (p.delayDays as number), 0) / completed.length) * 10) / 10
      : 0;
  const byMode = new Map<string, number>();
  for (const p of completed) byMode.set(p.mode ?? "other", (byMode.get(p.mode ?? "other") ?? 0) + (p.amount as number));
  return {
    totalInvoiced: invoiced,
    totalCollected: collected,
    outstanding: Math.max(invoiced - collected, 0),
    overdueAmount,
    collectionPct: invoiced > 0 ? Math.round((collected / invoiced) * 1000) / 10 : 0,
    avgDelayDays,
    byMode: [...byMode.entries()].map(([mode, amount]) => ({ mode, amount })),
  };
}

export async function trendSeries(months = 12) {
  const { allInvoices } = await loadAll();
  const totals = monthlySales(allInvoices as any);
  return trailingMonthKeys(months).map((k) => ({ month: k, total: totals.get(k) ?? 0 }));
}

export async function forecastSeries(months = 3) {
  const series = await trendSeries(6);
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((s) => s.total);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0);
  const den = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0) || 1;
  const slope = num / den;
  const lastKey = series[n - 1]?.month ?? monthKey(new Date());
  const [y, m] = lastKey.split("-").map(Number);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(y, m - 1 + i + 1, 1);
    return { month: monthKey(d), projected: Math.max(0, Math.round(yMean + slope * (n + i - xMean))) };
  });
}

// ---------------------------------------------------------------------------
// Dashboard (Sales Command Center aggregate)
// ---------------------------------------------------------------------------

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function todayTimeline() {
  const today = startOfToday().toISOString();
  const [visitRows, meetingRows, activityRows] = await Promise.all([
    supabase.from("visits").select("*").gte("date", today).order("date", { ascending: false }).then((r) => mapRows("visits")(unwrap(r))),
    supabase.from("meetings").select("*").gte("date", today).order("date", { ascending: false }).then((r) => mapRows("meetings")(unwrap(r))),
    supabase.from("lead_activities").select("*").gte("date", today).order("date", { ascending: false }).then((r) => mapRows("lead_activities")(unwrap(r))),
  ]);
  const customers = await selectAll("customers");
  const custById = new Map(customers.map((c) => [c.id as string, c]));
  const leadRows = await selectAll("leads");
  const leadById = new Map(leadRows.map((l) => [l.id as number, l]));

  const now = Date.now();
  const stateOf = (d: Date) =>
    d.getTime() < now - 30 * 60 * 1000 ? ("done" as const) : d.getTime() <= now + 30 * 60 * 1000 ? ("now" as const) : ("upcoming" as const);

  return [
    ...visitRows.map((v) => ({
      id: `visit-${v.id}`,
      time: (v.date as Date).toISOString(),
      type: "visit" as const,
      title: (v.outcome as string) ?? "Customer visit",
      person: (custById.get(v.customerId)?.name as string) ?? (v.customerId as string),
      state: stateOf(v.date),
    })),
    ...meetingRows.map((m) => ({
      id: `meeting-${m.id}`,
      time: (m.date as Date).toISOString(),
      type: "meeting" as const,
      title: (m.aiSummary as string)?.slice(0, 48) ?? "Meeting",
      person:
        (custById.get(m.customerId)?.name as string) ??
        (leadById.get(m.leadId)?.companyName as string) ??
        "Internal",
      state: stateOf(m.date),
    })),
    ...activityRows.map((a) => ({
      id: `activity-${a.id}`,
      time: (a.date as Date).toISOString(),
      type: "call" as const,
      title: (a.remarks as string)?.slice(0, 48) ?? (a.activity as string),
      person: (leadById.get(a.leadId)?.companyName as string) ?? `Lead #${a.leadId}`,
      state: stateOf(a.date),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));
}

async function todayTasks() {
  const [overdueInv, reminders, overdue, pendingQuotations, leadRows] = await Promise.all([
    outstandingInvoices(),
    unresolvedReminders(3),
    overdueVisits(),
    supabase.from("quotations").select("*").in("status", ["sent", "negotiation"]).then((r) => mapRows("quotations")(unwrap(r))),
    selectAll("leads"),
  ]);
  const leadById = new Map(leadRows.map((l) => [l.id as number, l]));
  const tasks: { id: string; title: string; entityName: string; entityHref: string; due: string; priority: "low" | "medium" | "high"; overdue: boolean }[] = [];
  for (const inv of overdueInv.slice(0, 5)) {
    const late = inv.dueDate ? daysBetween(inv.dueDate) : 0;
    tasks.push({
      id: `inv-${inv.id}`,
      title: `Chase payment on ${inv.number} (${formatINR(inv.amount)})`,
      entityName: inv.customerId,
      entityHref: `/customers/${inv.customerId}`,
      due: inv.dueDate?.toISOString() ?? "—",
      priority: late > 15 ? "high" : "medium",
      overdue: late > 0,
    });
  }
  for (const q of reminders.slice(0, 5)) {
    tasks.push({
      id: `qry-${q.id}`,
      title: `Resolve ${QueryCategoryLabels[q.category as keyof typeof QueryCategoryLabels]} query #${q.id} (open ${q.unresolvedDays}d)`,
      entityName: q.customerName,
      entityHref: "/queries",
      due: q.dateRaised.toISOString(),
      priority: q.priority,
      overdue: q.unresolvedDays > 7,
    });
  }
  for (const v of overdue.slice(0, 3)) {
    tasks.push({
      id: `visit-${v.customerId}`,
      title: `Schedule visit — not visited in ${v.pendingDays} days`,
      entityName: v.name,
      entityHref: `/customers/${v.customerId}`,
      due: v.lastVisitDate?.toISOString() ?? "never",
      priority: v.pendingDays > 60 ? "high" : "medium",
      overdue: true,
    });
  }
  for (const qt of pendingQuotations.slice(0, 3)) {
    tasks.push({
      id: `quote-${qt.id}`,
      title: `Follow up quotation ${qt.number} (${formatINR(qt.total)})`,
      entityName: (leadById.get(qt.leadId)?.companyName as string) ?? `Lead #${qt.leadId}`,
      entityHref: `/leads/${qt.leadId}`,
      due: qt.validUntil?.toISOString() ?? "—",
      priority: "medium",
      overdue: qt.validUntil ? (qt.validUntil as Date) < new Date() : false,
    });
  }
  return tasks;
}

async function activityFeed(limit = 12) {
  const [activityRows, paymentRows, visitRows, leadRows, customers, users] = await Promise.all([
    supabase.from("lead_activities").select("*").order("date", { ascending: false }).limit(limit).then((r) => mapRows("lead_activities")(unwrap(r))),
    supabase.from("payments").select("*").order("date", { ascending: false }).limit(limit).then((r) => mapRows("payments")(unwrap(r))),
    supabase.from("visits").select("*").order("date", { ascending: false }).limit(limit).then((r) => mapRows("visits")(unwrap(r))),
    selectAll("leads"),
    selectAll("customers"),
    listUsers(),
  ]);
  const leadById = new Map(leadRows.map((l) => [l.id as number, l]));
  const custById = new Map(customers.map((c) => [c.id as string, c]));
  const userById = new Map(users.map((u) => [u.id as number, u]));

  const items = [
    ...activityRows.map((a) => ({
      id: `la-${a.id}`,
      actorName: (userById.get(a.updatedById)?.name as string) ?? "System",
      actorAvatar: (userById.get(a.updatedById)?.avatar as string | null) ?? null,
      verb: a.activity === "stage-change" ? "updated lead stage:" : `logged a ${a.activity} on`,
      entityName: (leadById.get(a.leadId)?.companyName as string) ?? `Lead #${a.leadId}`,
      entityHref: `/leads/${a.leadId}`,
      detail: (a.remarks as string) ?? undefined,
      timestamp: a.date as Date,
      kind: "lead" as const,
    })),
    ...paymentRows.map((p) => ({
      id: `pay-${p.id}`,
      actorName: "Accounts",
      actorAvatar: null,
      verb: "recorded a payment from",
      entityName: (custById.get(p.customerId)?.name as string) ?? (p.customerId as string),
      entityHref: `/customers/${p.customerId}`,
      amount: p.amount as number,
      timestamp: p.date as Date,
      kind: "payment" as const,
    })),
    ...visitRows.map((v) => ({
      id: `vis-${v.id}`,
      actorName: (userById.get(v.salesRepId)?.name as string) ?? "Sales",
      actorAvatar: (userById.get(v.salesRepId)?.avatar as string | null) ?? null,
      verb: "logged a visit to",
      entityName: (custById.get(v.customerId)?.name as string) ?? (v.customerId as string),
      entityHref: `/customers/${v.customerId}`,
      detail: (v.remarks as string) ?? undefined,
      timestamp: v.date as Date,
      kind: "visit" as const,
    })),
  ];
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

export async function dashboardHome() {
  const [kpis, funnel, stageCounts, timeline, tasks, upcoming, salesChart, regions, feed, recentLeadsRaw] =
    await Promise.all([
      analyticsKpis(),
      leadFunnel(),
      leadStageCounts(),
      todayTimeline(),
      todayTasks(),
      upcomingVisits(),
      trendSeries(12),
      regionPerformance(),
      activityFeed(),
      supabase.from("leads").select("*").order("createdAt", { ascending: false }).limit(6).then((r) => mapRows("leads")(unwrap(r))),
    ]);
  const users = await usersByIds(recentLeadsRaw.map((l) => l.ownerId as number));
  return {
    kpis,
    funnel,
    stageCounts,
    timeline,
    tasks,
    upcomingVisits: upcoming,
    salesChart,
    regionPerformance: regions,
    activityFeed: feed,
    recentLeads: recentLeadsRaw.map((l) => ({ ...l, owner: users.get(l.ownerId) ?? null })),
  };
}

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

export type InsertQuotation = {
  leadId: number;
  number: string;
  items: unknown[];
  subtotal: number;
  tax: number;
  total: number;
  status?: string;
  validUntil?: Date | null;
  createdById?: number | null;
  aiGenerated?: boolean;
};

export async function createQuotation(data: InsertQuotation) {
  const row = parseDates(
    unwrap(
      await supabase
        .from("quotations")
        .insert({
          leadId: data.leadId,
          number: data.number,
          items: data.items,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          status: data.status ?? "draft",
          validUntil: data.validUntil ? data.validUntil.toISOString() : null,
          createdById: data.createdById ?? null,
          aiGenerated: data.aiGenerated ?? false,
        })
        .select()
        .single(),
    ),
    DATES.quotations,
  );
  return row;
}

// ---------------------------------------------------------------------------
// Recent AI summaries (Copilot home stack)
// ---------------------------------------------------------------------------

export async function recentSummaries() {
  const [meetingsRows, customerRows] = await Promise.all([
    supabase.from("meetings").select("*").order("date", { ascending: false }).limit(3).then((r) => mapRows("meetings")(unwrap(r))),
    supabase.from("customers").select("id,name,healthGrade,aiSummary").not("aiSummary", "is", null).order("updatedAt", { ascending: false }).limit(2).then((r) => unwrap(r) ?? []),
  ]);
  const customers = await selectAll("customers");
  const custById = new Map(customers.map((c) => [c.id as string, c]));
  const leadRows = await selectAll("leads");
  const leadById = new Map(leadRows.map((l) => [l.id as number, l]));
  return [
    ...meetingsRows.map((m) => ({
      title: `Meeting minutes — ${(custById.get(m.customerId)?.name as string) ?? (leadById.get(m.leadId)?.companyName as string) ?? "Internal"}`,
      meta: `${(m.date as Date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${(m.decisions as any[]).length} decisions, ${(m.actionItems as any[]).length} action items`,
      href: m.customerId ? `/customers/${m.customerId}` : m.leadId ? `/leads/${m.leadId}` : "/",
    })),
    ...(customerRows as any[]).map((c) => ({
      title: `Customer summary — ${c.name}`,
      meta: `Health ${c.healthGrade ?? "—"}`,
      href: `/customers/${c.id}`,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Global search (⌘K)
// ---------------------------------------------------------------------------

export type SearchResult = {
  id: string;
  group: "Leads" | "Customers" | "Invoices" | "Visits" | "Queries";
  title: string;
  meta: string;
  href: string;
};

export async function globalSearch(q: string, limit = 8): Promise<SearchResult[]> {
  const term = `%${q}%`;
  const [leadRows, customerRows, invoiceRows, visitRows, queryRows] = await Promise.all([
    supabase.from("leads").select("*").or(`companyName.ilike.${term},contactPerson.ilike.${term}`).limit(limit).then((r) => mapRows("leads")(unwrap(r))),
    supabase.from("customers").select("*").or(`name.ilike.${term},gstin.ilike.${term},id.ilike.${term}`).limit(limit).then((r) => mapRows("customers")(unwrap(r))),
    supabase.from("invoices").select("*").ilike("number", term).limit(limit).then((r) => mapRows("invoices")(unwrap(r))),
    supabase.from("visits").select("*").ilike("remarks", term).limit(limit).then((r) => mapRows("visits")(unwrap(r))),
    supabase.from("queries").select("*").ilike("description", term).limit(limit).then((r) => mapRows("queries")(unwrap(r))),
  ]);
  const allCustomers = await selectAll("customers");
  const customerName = new Map(allCustomers.map((c) => [c.id as string, c.name as string]));
  return [
    ...leadRows.map((l) => ({
      id: `lead-${l.id}`,
      group: "Leads" as const,
      title: (l.companyName ?? l.contactPerson ?? `Lead #${l.id}`) as string,
      meta: `${l.stage ? LeadStageLabels[l.stage as LeadStage] : "—"} · ${l.city ?? "—"}`,
      href: `/leads/${l.id}`,
    })),
    ...customerRows.map((c) => ({
      id: `customer-${c.id}`,
      group: "Customers" as const,
      title: c.name as string,
      meta: `${c.gstin} · ${c.city ?? "—"}`,
      href: `/customers/${c.id}`,
    })),
    ...invoiceRows.map((i) => ({
      id: `invoice-${i.id}`,
      group: "Invoices" as const,
      title: i.number as string,
      meta: `${formatINR(i.amount)} · ${i.status}`,
      href: `/customers/${i.customerId}`,
    })),
    ...visitRows.map((v) => ({
      id: `visit-${v.id}`,
      group: "Visits" as const,
      title: `Visit — ${customerName.get(v.customerId) ?? v.customerId}`,
      meta: (v.remarks as string)?.slice(0, 60) ?? "Visit log",
      href: "/visits",
    })),
    ...queryRows.map((qr) => ({
      id: `query-${qr.id}`,
      group: "Queries" as const,
      title: `Query #${qr.id} — ${QueryCategoryLabels[qr.category as keyof typeof QueryCategoryLabels]}`,
      meta: `${customerName.get(qr.customerId) ?? qr.customerId} · ${qr.status}`,
      href: "/queries",
    })),
  ];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId?: number, limit = 50) {
  let q = supabase.from("notifications").select("*").order("createdAt", { ascending: false }).limit(limit);
  if (userId) q = q.eq("userId", userId);
  return mapRows("notifications")(unwrap(await q));
}

export async function unreadNotificationCount(userId?: number) {
  let q = supabase.from("notifications").select("id").eq("read", false);
  if (userId) q = q.eq("userId", userId);
  const rows = unwrap(await q);
  return { count: rows?.length ?? 0 };
}

export async function markNotificationRead(id: number) {
  unwrap(await supabase.from("notifications").update({ read: true }).eq("id", id));
  return parseDates(
    unwrap(await supabase.from("notifications").select("*").eq("id", id).single()),
    DATES.notifications,
  );
}

export async function markAllNotificationsRead(userId: number) {
  unwrap(await supabase.from("notifications").update({ read: true }).eq("userId", userId).eq("read", false));
  return { success: true };
}

// ---------------------------------------------------------------------------
// Threshold configuration
// ---------------------------------------------------------------------------

export async function getThresholdConfig() {
  const rows = mapRows("threshold_config")(
    unwrap(await supabase.from("threshold_config").select("*").order("id").limit(1)),
  );
  if (rows[0]) return rows[0];
  const row = parseDates(
    unwrap(await supabase.from("threshold_config").insert({ ...DefaultThresholds }).select().single()),
    DATES.threshold_config,
  );
  return row;
}

export async function getThresholds(): Promise<ThresholdSettings> {
  const row = await getThresholdConfig();
  return {
    discountDeclinePct: row.discountDeclinePct,
    discountWindowMonths: row.discountWindowMonths,
    visitReminderDays: row.visitReminderDays,
    noSalesAlertDays: row.noSalesAlertDays,
    classificationSmallMax: row.classificationSmallMax,
    classificationMediumMax: row.classificationMediumMax,
    significantChangePct: row.significantChangePct,
  };
}

export async function updateThresholds(patch: Partial<ThresholdSettings>, updatedById?: number) {
  const current = await getThresholdConfig();
  unwrap(
    await supabase
      .from("threshold_config")
      .update({ ...patch, updatedById: updatedById ?? current.updatedById })
      .eq("id", current.id),
  );
  return getThresholdConfig();
}
