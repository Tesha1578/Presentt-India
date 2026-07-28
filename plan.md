# Plan — SalesOS: AI-Native Premium CRM (Full-Stack)

Source: Master Context Prompt + Minutes of Meeting (5 modules).
Deliverable: Full-stack web app — React frontend (dark `#090909`, neon lime `#C6FF33`, glassmorphism, Framer Motion) + real backend (API, DB, auth).

## Stage 1 — Orchestration Setup
- Load `vibecoding-webapp-swarm` (read SKILL.md) — governs overall swarm workflow.
- Load `swarm-workspace` — shared repo + per-subagent worktrees.

## Stage 2 — Frontend Build (design-first)
- Load `webapp-building-swarm`.
- Sub-agents build screens per module:
  1. Home Dashboard ("Sales Command Center") — timeline strip, KPI cards w/ count-up, lead funnel, AI Copilot right panel, Ctrl+K command palette.
  2. Module 1 — Lead Management (pipeline stages New Lead → Enquiry/Visit → Quotation/Negotiation → Order Confirmed; Invalid; cards not tables; lead profile w/ animated timeline).
  3. Module 2 — Customer Management (GSTIN+Address matching logic, Small/Medium/Large auto-classification w/ configurable thresholds, discount monitoring 15% rule, customer profile w/ health score).
  4. Module 3 — Visit Management (45-day reminder, region/city dashboard, completion % rings, visit records).
  5. Module 4 — Query Management (Kanban Open/In Progress/Resolved, categories Quality/Delivery/Price/Communication/Others, per-query independent resolution, reminders).
  6. Module 5 — Sales Monitoring & BI (30-day sales classification, trend Increasing/Decreasing/Stable, Customer Health Excellent/Good/Average/Poor matrix, animated BI widgets).
- Design language: dark-first, 24–32px radius, soft shadows, glass overlays, Inter/Manrope, Framer Motion micro-interactions everywhere, no tables — cards only.

## Stage 3 — Backend Graft
- Load `backend-building-swarm` (tRPC + Drizzle + Hono, MySQL, JWT auth w/ roles: Admin, Sales Manager, Sales Executive, Accounts, Super Admin).
- Data model: leads, customers (GSTIN+address unique matching), visits, queries, invoices/sales/payments, thresholds config, notifications.
- Endpoints feeding every module + business-rule engines (classification, discount monitor, 30-day no-sales alerts, health model).

## Stage 4 — Validation & Integration
- Reviewer sub-agent: verify all MoM business rules present (lead stages, matching logic, thresholds, categories, statuses, notifications).
- Build + run checks; fix cycle until green.

## Stage 5 — Delivery
- `mshtools-website_version_manager` build_version (type: dynamic) → deliver preview URL/version.
