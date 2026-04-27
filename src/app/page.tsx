import type { Table, TableStatus } from "@snook/shared/types";

const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: "Available",
  IN_PLAY: "In play",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

const STATUS_COLOR: Record<TableStatus, string> = {
  AVAILABLE: "text-status-success",
  IN_PLAY: "text-accent-gold",
  RESERVED: "text-status-info",
  MAINTENANCE: "text-status-error",
};

async function fetchTables(): Promise<Table[]> {
  // TODO: real fetch to backend. Returning stub so the page renders without a live API.
  return [];
}

export default async function TablesPage() {
  const tables = await fetchTables();

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl">Floor</h1>
        <p className="mt-1 text-text-secondary">Live table status</p>
      </header>

      {tables.length === 0 ? (
        <div className="rounded-card border border-white/5 bg-surface-card p-8 text-center text-text-secondary">
          No tables yet. Seed the database with{" "}
          <code className="font-mono text-text-primary">pnpm db:seed</code>.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {tables.map((t) => (
            <div
              key={t.id}
              className="rounded-card border border-white/5 bg-surface-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-text-secondary">Table</div>
                  <div className="font-mono text-2xl">{t.tableNumber}</div>
                </div>
                <div className={`text-xs ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </div>
              </div>
              <div className="mt-4 text-xs text-text-secondary">{t.type}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
