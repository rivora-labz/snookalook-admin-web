import { TablesGrid } from "../../components/TablesGrid";

export default function TablesPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl text-th-text">Floor</h1>
        <p className="mt-1 text-th-text-secondary">Live table status</p>
      </header>
      <TablesGrid />
    </div>
  );
}
