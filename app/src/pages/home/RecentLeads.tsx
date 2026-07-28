import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import RecordCard from '@/components/RecordCard';
import { useDashboardHome } from '@/pages/home/use-dashboard';
import type { DashboardHome } from '@/pages/home/use-dashboard';
import type { Lead, LeadStage, Priority } from '@/lib/mock-data';

type DbLead = DashboardHome['recentLeads'][number];

const STAGE_MAP: Record<string, LeadStage> = {
  new_lead: 'NewLead',
  enquiry_visit: 'EnquiryVisit',
  quotation_negotiation: 'QuotationNegotiation',
  order_confirmed: 'OrderConfirmed',
};

const PRIORITY_MAP: Record<string, Priority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Adapt a DB lead row to the shared RecordCard contract. */
function toCardLead(l: DbLead): Lead {
  return {
    id: String(l.id),
    companyName: l.companyName ?? undefined,
    contactPerson: l.contactPerson ?? undefined,
    designation: l.designation ?? undefined,
    phone: l.phone ?? undefined,
    email: l.email ?? undefined,
    stage: STAGE_MAP[l.stage ?? 'new_lead'] ?? 'NewLead',
    status: l.status === 'invalid_customer' ? 'InvalidCustomer' : 'Active',
    priority: PRIORITY_MAP[l.priority ?? 'medium'] ?? 'Medium',
    source: l.source ?? undefined,
    region: l.region ?? undefined,
    city: l.city ?? undefined,
    lastActivitySummary: l.lastActivitySummary ?? undefined,
    googleMapsLocation: l.googleMapsUrl
      ? { lat: l.lat ?? 0, lng: l.lng ?? 0, link: l.googleMapsUrl }
      : undefined,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
  };
}

/** Recent Leads — 5 RecordCards, staggered, with View all link. */
export default function RecentLeads() {
  const { data } = useDashboardHome();
  const leads = (data?.recentLeads ?? []).slice(0, 5).map(toCardLead);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[22px] font-bold text-primary">Recent Leads</h3>
        <Link
          to="/leads"
          className="flex items-center gap-1 text-[13px] font-semibold text-accent transition-opacity hover:opacity-80"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {leads.map((lead, i) => (
          <RecordCard key={lead.id} lead={lead} delay={i * 0.06} />
        ))}
        {leads.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">No leads yet — create one to get started.</p>
        )}
      </div>
    </section>
  );
}
