import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditTrail, { type AuditState } from "./AuditTrail";
import type { AdminAuditEntry } from "../lib/audit-action-labels";

const baseEntry = (overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry => ({
  id: "e1",
  action: "BOOKING_NO_SHOW",
  actorId: "a1",
  actorDisplayName: "Jane Admin",
  metadata: null,
  createdAt: "2026-06-01T12:00:00Z",
  ...overrides,
});

describe("AuditTrail", () => {
  it("renders header", () => {
    render(<AuditTrail state={{ kind: "loading" } satisfies AuditState} />);
    expect(screen.getByText(/audit trail/i)).toBeInTheDocument();
  });

  it("renders 3 skeleton placeholders in loading state", () => {
    const { container } = render(<AuditTrail state={{ kind: "loading" }} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("renders todo reason text", () => {
    render(<AuditTrail state={{ kind: "todo", reason: "endpoint pending" }} />);
    expect(screen.getByText(/endpoint coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/endpoint pending/)).toBeInTheDocument();
  });

  it("renders error message + retry calls handler", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<AuditTrail state={{ kind: "error", message: "Network down", onRetry }} />);
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty-state copy when ready with no entries", () => {
    render(<AuditTrail state={{ kind: "ready", entries: [] }} />);
    expect(screen.getByText(/no admin actions on this booking yet/i)).toBeInTheDocument();
  });

  it("renders entry actor + humanized action when ready", () => {
    render(
      <AuditTrail state={{ kind: "ready", entries: [baseEntry()] }} />
    );
    expect(screen.getByText("Jane Admin")).toBeInTheDocument();
    expect(screen.getByText(/marked as no-show/i)).toBeInTheDocument();
  });

  it("falls back to 'Admin' when actorDisplayName is null", () => {
    render(
      <AuditTrail
        state={{
          kind: "ready",
          entries: [baseEntry({ id: "e2", actorDisplayName: null })],
        }}
      />
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders metadata summary when present", () => {
    render(
      <AuditTrail
        state={{
          kind: "ready",
          entries: [baseEntry({ id: "e3", metadata: { reason: "policy breach" } })],
        }}
      />
    );
    expect(screen.getByText(/reason: policy breach/i)).toBeInTheDocument();
  });

  it("renders 'Load older ↓' when onLoadMore provided and triggers handler", async () => {
    const onLoadMore = vi.fn();
    const user = userEvent.setup();
    render(
      <AuditTrail
        state={{ kind: "ready", entries: [baseEntry()] }}
        onLoadMore={onLoadMore}
      />
    );
    const btn = screen.getByRole("button", { name: /load older/i });
    await user.click(btn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows loading-more skeleton instead of Load older button when loadingMore=true", () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <AuditTrail
        state={{ kind: "ready", entries: [baseEntry()] }}
        onLoadMore={onLoadMore}
        loadingMore
      />
    );
    expect(screen.queryByRole("button", { name: /load older/i })).not.toBeInTheDocument();
    const skel = container.querySelector(".border-t .animate-pulse");
    expect(skel).toBeTruthy();
  });
});
