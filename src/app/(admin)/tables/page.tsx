import TablesIndexClient from "./TablesIndexClient";

export default function TablesIndexPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">Tables</h1>
        <p className="mt-1 text-th-text-secondary">Manage your table inventory</p>
      </header>
      <TablesIndexClient />
    </div>
  );
}
