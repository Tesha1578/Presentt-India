/**
 * trpc-shaped facade over the Supabase data layer.
 *
 * The entire UI was built against `trpc.<router>.<proc>.useQuery/useMutation`
 * (React Query under the hood). This module preserves that exact call shape —
 * including `trpc.useUtils().<router>.<proc>.invalidate()` and
 * `trpc.useQueries(...)` — so pages work unchanged, just pointed here
 * instead of the deleted server provider.
 */
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as data from "@/lib/data";
import { generateAi, aiConfigured } from "@/lib/groq";
import { getSessionUser, setSessionUser } from "@/lib/session";

type AnyFn = (input?: any) => Promise<any>;

function queryKey(router: string, proc: string, input?: unknown) {
  return ["salesos", router, proc, input ?? null];
}

function makeQuery(router: string, proc: string, fn: AnyFn) {
  return {
    useQuery: (input?: any, opts?: any) =>
      useQuery({
        queryKey: queryKey(router, proc, input),
        queryFn: () => fn(input),
        ...(opts ?? {}),
      }),
  };
}

function makeMutation(_router: string, _proc: string, fn: AnyFn) {
  return {
    useMutation: (opts?: any) =>
      useMutation({ mutationFn: (input: any) => fn(input), ...(opts ?? {}) }),
  };
}

function makeProc(router: string, proc: string, fn: AnyFn, kind: "query" | "mutation" = "query") {
  return kind === "query" ? makeQuery(router, proc, fn) : makeMutation(router, proc, fn);
}

const sessionUserId = () => getSessionUser()?.id;

const _trpc = {
  dashboard: {
    home: makeProc("dashboard", "home", () => data.dashboardHome()),
    recentSummaries: makeProc("dashboard", "recentSummaries", () => data.recentSummaries()),
  },

  leads: {
    list: makeProc("leads", "list", (input) => data.listLeads(input ?? {})),
    byId: makeProc("leads", "byId", (input) => data.findLeadById(input.id)),
    create: makeProc("leads", "create", (input) => data.createLead(input), "mutation"),
    update: makeProc(
      "leads",
      "update",
      (input) => {
        const { id, ...patch } = input ?? {};
        return data.updateLead(id, patch, sessionUserId());
      },
      "mutation",
    ),
    addActivity: makeProc(
      "leads",
      "addActivity",
      (input) => data.addLeadActivity({ ...input, updatedById: sessionUserId()! }),
      "mutation",
    ),
    stageCounts: makeProc("leads", "stageCounts", () => data.leadStageCounts()),
    funnel: makeProc("leads", "funnel", () => data.leadFunnel()),
    conversionStats: makeProc("leads", "conversionStats", () => data.leadConversionStats()),
  },

  customers: {
    list: makeProc("customers", "list", (input) => data.listCustomers(input ?? {})),
    byId: makeProc("customers", "byId", (input) => data.findCustomerById(input.id)),
    classificationRecompute: makeProc(
      "customers",
      "classificationRecompute",
      () => data.recomputeClassification(sessionUserId()),
      "mutation",
    ),
    reports: makeProc("customers", "reports", () => data.customerReports()),
    duplicatesReport: makeProc("customers", "duplicatesReport", () => data.duplicatesReport()),
  },

  visits: {
    regionDashboard: makeProc("visits", "regionDashboard", () => data.regionDashboard()),
    cityView: makeProc("visits", "cityView", () => data.cityView()),
    overdue: makeProc("visits", "overdue", () => data.overdueVisits()),
    upcoming: makeProc("visits", "upcoming", () => data.upcomingVisits()),
    listByCustomer: makeProc("visits", "listByCustomer", (input) => data.listVisitsByCustomer(input.customerId)),
    create: makeProc(
      "visits",
      "create",
      (input) => data.createVisit({ ...input, salesRepId: input.salesRepId ?? sessionUserId() }),
      "mutation",
    ),
  },

  queries: {
    kanban: makeProc("queries", "kanban", () => data.kanbanQueries()),
    byCustomer: makeProc("queries", "byCustomer", (input) => data.queriesByCustomer(input.customerId)),
    create: makeProc(
      "queries",
      "create",
      (input) => data.createQuery({ ...input, raisedById: sessionUserId() }),
      "mutation",
    ),
    updateStatus: makeProc(
      "queries",
      "updateStatus",
      (input) => data.updateQueryStatus(input.id, input.status, sessionUserId()),
      "mutation",
    ),
    addComment: makeProc(
      "queries",
      "addComment",
      (input) => data.addQueryComment({ ...input, authorId: sessionUserId()! }),
      "mutation",
    ),
    unresolvedReminders: makeProc("queries", "unresolvedReminders", (input) =>
      data.unresolvedReminders(input?.minAgeDays),
    ),
  },

  analytics: {
    kpis: makeProc("analytics", "kpis", () => data.analyticsKpis()),
    salesMonitoring30d: makeProc("analytics", "salesMonitoring30d", () => data.salesMonitoring30d()),
    healthDistribution: makeProc("analytics", "healthDistribution", () => data.healthDistribution()),
    monthlyComparison: makeProc("analytics", "monthlyComparison", () => data.monthlyComparison()),
    regionPerformance: makeProc("analytics", "regionPerformance", () => data.regionPerformance()),
    topCustomers: makeProc("analytics", "topCustomers", (input) => data.topCustomers(input?.limit)),
    inactiveCustomers: makeProc("analytics", "inactiveCustomers", () => data.inactiveCustomers()),
    discountMonitoring: makeProc("analytics", "discountMonitoring", () => data.discountMonitoring()),
    churnRisk: makeProc("analytics", "churnRisk", () => data.churnRisk()),
    paymentCollection: makeProc("analytics", "paymentCollection", () => data.paymentCollection()),
    trendSeries: makeProc("analytics", "trendSeries", (input) => data.trendSeries(input?.months)),
    forecastSeries: makeProc("analytics", "forecastSeries", (input) => data.forecastSeries(input?.months)),
  },

  notifications: {
    list: makeProc("notifications", "list", (input) =>
      data.listNotifications(sessionUserId(), input?.limit),
    ),
    unreadCount: makeProc("notifications", "unreadCount", () =>
      data.unreadNotificationCount(sessionUserId()),
    ),
    markRead: makeProc("notifications", "markRead", (input) => data.markNotificationRead(input.id), "mutation"),
    markAllRead: makeProc(
      "notifications",
      "markAllRead",
      () => data.markAllNotificationsRead(sessionUserId()!),
      "mutation",
    ),
  },

  thresholds: {
    get: makeProc("thresholds", "get", () => data.getThresholdConfig()),
    update: makeProc(
      "thresholds",
      "update",
      (input) => data.updateThresholds(input, sessionUserId()),
      "mutation",
    ),
  },

  quotations: {
    create: makeProc(
      "quotations",
      "create",
      (input) => data.createQuotation({ ...input, createdById: sessionUserId() }),
      "mutation",
    ),
  },

  search: {
    global: makeProc("search", "global", (input) => data.globalSearch(input.q, input.limit)),
  },

  ai: {
    configured: makeProc("ai", "configured", async () => ({ configured: aiConfigured })),
    generate: makeProc("ai", "generate", (input) => generateAi(input).then((text) => ({ text })), "mutation"),
  },

  auth: {
    me: makeProc("auth", "me", async () => getSessionUser()),
    logout: makeProc(
      "auth",
      "logout",
      async () => {
        setSessionUser(null);
        return { success: true };
      },
      "mutation",
    ),
  },

  /**
   * Invalidation facade — mirrors trpc.useUtils(): returns an object where
   * `utils.<router>.<proc>.invalidate(input?)` clears the matching React
   * Query cache entries. Also supports a blanket `utils.invalidate()`.
   */
  useUtils() {
    const qc = useQueryClient();
    const handler: ProxyHandler<object> = {
      get: (_t, routerProp: string) =>
        new Proxy(
          {},
          {
            get: (_t2, procProp: string) => ({
              // No input ⇒ prefix-invalidate every variant of the procedure
              // (e.g. leads.byId for all ids); with input ⇒ exact key.
              invalidate: (input?: unknown) =>
                qc.invalidateQueries({
                  queryKey:
                    input === undefined
                      ? ["salesos", routerProp, procProp]
                      : queryKey(routerProp, procProp, input),
                }),
            }),
          },
        ),
    };
    const base = {
      invalidate: () => qc.invalidateQueries(),
    };
    return new Proxy(base, handler) as any;
  },

  /**
   * Mirrors trpc.useQueries((t) => [...]) — the callback receives a proxy
   * that records (<router>, <proc>, input, opts) tuples.
   */
  useQueries(builder: (t: any) => { input?: any; opts?: any }[] | any[]) {
    const recorder = new Proxy(
      {},
      {
        get: (_t, routerProp: string) =>
          new Proxy(
            {},
            {
              get: (_t2, procProp: string) => (input?: any, opts?: any) => ({
                __router: routerProp,
                __proc: procProp,
                input,
                opts,
              }),
            },
          ),
      },
    ) as any;
    const specs = builder(recorder) as { __router: string; __proc: string; input?: any; opts?: any }[];
    return useQueries({
      queries: specs.map((s) => ({
        queryKey: queryKey(s.__router, s.__proc, s.input),
        queryFn: () => resolveProc(s.__router, s.__proc)(s.input),
        ...(s.opts ?? {}),
      })),
    });
  },
};

/** Resolve a (router, proc) pair to its data function for useQueries. */
function resolveProc(router: string, proc: string): AnyFn {
  const fn = registry.get(`${router}.${proc}`);
  if (!fn) throw new Error(`Unknown procedure ${router}.${proc}`);
  return fn;
}

// Explicit registry for procedures consumed through trpc.useQueries(...)
const registry = new Map<string, AnyFn>();
registry.set("visits.listByCustomer", (input) => data.listVisitsByCustomer(input.customerId));
registry.set("customers.list", (input) => data.listCustomers(input ?? {}));
registry.set("leads.list", (input) => data.listLeads(input ?? {}));

/**
 * The facade is intentionally `any`-typed: pages were written against the
 * tRPC client's inferred types; with the data layer the same runtime shapes
 * are returned, and `any` keeps the shim transparent at the type level.
 */
export const trpc: any = _trpc;
