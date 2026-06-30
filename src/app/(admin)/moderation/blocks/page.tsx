import ModerationBlocksClient from "./ModerationBlocksClient";

export default function ModerationBlocksPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">User Blocks</h1>
        <p className="mt-1 text-th-text-secondary">
          Read-only block list — support triage context.
        </p>
      </header>
      <ModerationBlocksClient />
    </div>
  );
}
