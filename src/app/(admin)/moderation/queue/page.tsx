import ModerationQueueClient from "./ModerationQueueClient";

export default function ModerationQueuePage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-th-text">Moderation Queue</h1>
        <p className="mt-1 text-th-text-secondary">
          Pending UGC reports — 24h SLA. Rows highlighted red after 22h.
        </p>
      </header>
      <ModerationQueueClient />
    </div>
  );
}
