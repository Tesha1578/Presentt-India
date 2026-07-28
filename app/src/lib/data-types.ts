/**
 * Shared output types, inferred from the data-layer functions themselves
 * (previously inferred from the tRPC AppRouter). Same shapes, zero server.
 */
import type * as data from "@/lib/data";

type R<T extends (...args: any[]) => any> = Awaited<ReturnType<T>>;

export interface RouterOutputs {
  dashboard: { home: R<typeof data.dashboardHome> };
  leads: {
    list: R<typeof data.listLeads>;
    byId: NonNullable<R<typeof data.findLeadById>>;
    funnel: R<typeof data.leadFunnel>;
    stageCounts: R<typeof data.leadStageCounts>;
    conversionStats: R<typeof data.leadConversionStats>;
  };
  customers: {
    list: R<typeof data.listCustomers>;
    byId: NonNullable<R<typeof data.findCustomerById>>;
    reports: R<typeof data.customerReports>;
    duplicatesReport: R<typeof data.duplicatesReport>;
  };
  visits: {
    regionDashboard: R<typeof data.regionDashboard>;
    cityView: R<typeof data.cityView>;
    overdue: R<typeof data.overdueVisits>;
    upcoming: R<typeof data.upcomingVisits>;
    listByCustomer: R<typeof data.listVisitsByCustomer>;
  };
  queries: {
    kanban: R<typeof data.kanbanQueries>;
    byCustomer: R<typeof data.queriesByCustomer>;
    unresolvedReminders: R<typeof data.unresolvedReminders>;
  };
  analytics: {
    kpis: R<typeof data.analyticsKpis>;
    salesMonitoring30d: R<typeof data.salesMonitoring30d>;
    healthDistribution: R<typeof data.healthDistribution>;
    monthlyComparison: R<typeof data.monthlyComparison>;
    regionPerformance: R<typeof data.regionPerformance>;
    topCustomers: R<typeof data.topCustomers>;
    inactiveCustomers: R<typeof data.inactiveCustomers>;
    discountMonitoring: R<typeof data.discountMonitoring>;
    churnRisk: R<typeof data.churnRisk>;
    paymentCollection: R<typeof data.paymentCollection>;
    trendSeries: R<typeof data.trendSeries>;
    forecastSeries: R<typeof data.forecastSeries>;
  };
  notifications: { list: R<typeof data.listNotifications> };
  thresholds: { get: R<typeof data.getThresholdConfig> };
  search: { global: R<typeof data.globalSearch> };
}
