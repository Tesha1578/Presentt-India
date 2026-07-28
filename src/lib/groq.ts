/**
 * Groq AI (Llama 3.3 70B Versatile) — called directly from the browser.
 * Every prompt is grounded in live CRM data fetched from Supabase.
 */
import { GROQ_API_KEY, GROQ_MODEL } from "@/lib/config";
import {
  findCustomerById,
  findLeadById,
  listCustomers,
  kanbanQueries,
  getThresholds,
} from "@/lib/data";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const aiConfigured = Boolean(GROQ_API_KEY);

const inr = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

async function customerContext(customerId: string) {
  const c = await findCustomerById(customerId);
  if (!c) return `Customer ${customerId} not found.`;
  const invoiced = c.invoices.reduce((a: number, i: any) => a + i.amount, 0);
  const overdue = c.invoices.filter((i: any) => i.status === "overdue").length;
  const avgDelay = c.payments.length
    ? Math.round(c.payments.reduce((a: number, p: any) => a + (p.delayDays ?? 0), 0) / c.payments.length)
    : 0;
  return [
    `Customer: ${c.name} (ID ${c.id}, GSTIN ${c.gstin})`,
    `Region/City: ${c.region ?? "—"} / ${c.city ?? "—"} · Category: ${c.category}`,
    `Health: ${c.healthGrade} (score ${c.healthScore}/100) · Sales trend: ${c.salesTrend}`,
    `Discounted account: ${c.isDiscounted ? "yes" : "no"}`,
    `Invoices: ${c.invoices.length} totalling ${inr(invoiced)} · overdue invoices: ${overdue}`,
    `Avg payment delay: ${avgDelay} days`,
    `Last purchase: ${c.lastPurchaseAt?.toISOString().slice(0, 10) ?? "—"} · Last visit: ${c.lastVisitAt?.toISOString().slice(0, 10) ?? "—"}`,
    `Open queries: ${c.openQueries.length}${c.openQueries.length ? ` (${c.openQueries.map((q: any) => `${q.category}: ${q.description}`).join(" | ")})` : ""}`,
    c.visits.length
      ? `Recent visits: ${c.visits.slice(0, 3).map((v: any) => `${v.date.toISOString().slice(0, 10)} — ${v.remarks ?? ""}`).join(" | ")}`
      : "No visits recorded.",
    c.aiSummary ? `Existing AI summary: ${c.aiSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function leadContext(leadId: number) {
  const l = await findLeadById(leadId);
  if (!l) return `Lead ${leadId} not found.`;
  return [
    `Lead: ${l.companyName ?? "Unknown company"} (contact: ${l.contactPerson ?? "—"}, ${l.designation ?? "—"})`,
    `Stage: ${l.stage} · Status: ${l.status} · Priority: ${l.priority} · Source: ${l.source ?? "—"}`,
    `Region/City: ${l.region ?? "—"} / ${l.city ?? "—"}`,
    `Email: ${l.email ?? "—"} · Phone: ${l.phone ?? "—"}`,
    `Last activity: ${l.lastActivitySummary ?? "—"}`,
    l.activities.length
      ? `Recent timeline: ${l.activities.slice(0, 5).map((a: any) => `${a.date.toISOString().slice(0, 10)} [${a.activity}] ${a.remarks ?? ""}`).join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function portfolioContext() {
  const [t, custs, board] = await Promise.all([getThresholds(), listCustomers(), kanbanQueries()]);
  const openQueries = [...board.open, ...board.in_progress];
  const declining = custs.filter((c) => c.salesTrend === "decreasing");
  const discountedDeclining = custs.filter((c) => c.isDiscounted && c.salesTrend === "decreasing");
  const poor = custs.filter((c) => c.healthGrade === "poor");
  return [
    `Thresholds: discount decline ${t.discountDeclinePct}% over ${t.discountWindowMonths} months · visit reminder ${t.visitReminderDays} days · no-sales alert ${t.noSalesAlertDays} days`,
    `Customers: ${custs.length} total · ${declining.length} with decreasing sales trend · ${poor.length} in Poor health`,
    `Discounted customers now declining: ${discountedDeclining.map((c) => c.name).join(", ") || "none"}`,
    `Open queries: ${openQueries.length} (${openQueries.map((q: any) => `${q.category} for ${q.customerId}`).slice(0, 8).join(" | ")})`,
    `Poor-health accounts: ${poor.map((c) => c.name).join(", ") || "none"}`,
  ].join("\n");
}

const MODE_INSTRUCTIONS: Record<string, string> = {
  "Customer Summary":
    "Summarise this customer in 3–4 crisp lines: sales trend, payment behaviour, open queries, and health score. End with one concrete watch-out.",
  "Meeting Summary":
    "Draft a concise meeting/visit summary from the context: key discussion points, customer sentiment, and agreed next steps. 4–6 lines.",
  "Voice Notes":
    "Turn the visit remarks in the context into clean structured notes: Customer, Date, Key points, Action items.",
  Documents:
    "List the 3–4 documents a sales rep should prepare for this account next (quotation, MoM, payment reminder…), one line each with why.",
  Goals:
    "Based on the portfolio context, suggest 3 realistic goals for this week (visits, conversions, collections), each one line and measurable.",
  "Suggested Actions":
    "Recommend the 3 next best actions, ranked, each one line starting with a verb, grounded in the data (e.g. days since last contact, open queries, thresholds breached).",
  "Sales Insights":
    "Give 3 proactive sales insights from the portfolio data. Each: bold headline + one line of reasoning. No fluff.",
  "Risk Alerts":
    "Identify the top at-risk accounts from the data (declining sales, discount-decline rule, poor payment history, long-unvisited). For each: name, the signal, and severity in one line.",
  "Email Generator":
    "Draft a short, warm, professional follow-up email appropriate to this lead/customer stage. Include subject line. Under 120 words.",
  "Proposal/Quotation Generator":
    "Draft a quotation outline for this lead: 3–5 plausible line items with indicative ₹ pricing, GST 18% note, validity 15 days, and a one-line value proposition. Mark it clearly as a draft.",
  "Meeting Minutes Generator":
    "Generate Minutes of Meeting from the context: Attendees, Date, Discussion points, Decisions, Action items with owners. Formal but compact.",
  Timeline:
    "Narrate this record's timeline as a 4–5 line story: how the relationship started, key moments, current state.",
};

export async function generateAi(input: {
  mode: string;
  entityType?: "lead" | "customer";
  entityId?: string;
  question?: string;
}) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");
  let context = "";
  if (input.entityType === "customer" && input.entityId) context = await customerContext(input.entityId);
  else if (input.entityType === "lead" && input.entityId) context = await leadContext(Number(input.entityId));
  else context = await portfolioContext();

  const instruction =
    MODE_INSTRUCTIONS[input.mode] ??
    "Answer the user's question using the CRM context. Be concise and concrete.";

  const system = [
    "You are the AI Workspace Assistant inside SalesOS, a premium B2B CRM for an Indian industrial-sales organisation.",
    "You answer ONLY from the business context provided — never invent figures. If data is missing, say so briefly.",
    "Tone: calm, precise, premium. Indian currency formatting (₹, en-IN grouping). No markdown tables; short lines or bullets.",
    `Task: ${instruction}`,
  ].join("\n");

  const user = [
    `### Business context\n${context}`,
    input.question ? `### User request\n${input.question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 700,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty completion");
  return text;
}
