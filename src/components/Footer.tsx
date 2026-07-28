/** Minimal app footer — sits at the bottom of the Layout content slot. */
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-5 w-5 opacity-70" />
          <span className="text-[12px] font-semibold text-muted">SalesOS · AI-native CRM</span>
        </div>
        <p className="text-[11px] text-muted">
          Synced from accounting · thresholds: 15% discount decline · 45-day visit reminders · 30-day sales windows
        </p>
      </div>
    </footer>
  );
}
