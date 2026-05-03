import DisputesClient from "./DisputesClient";

export default function DisputesPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">Disputes</h1>
        <p className="mt-1 text-th-text-secondary">Review and resolve match disputes</p>
      </header>
      <DisputesClient />
    </div>
  );
}
