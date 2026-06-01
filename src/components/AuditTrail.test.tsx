import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuditTrail, { type AuditState } from "./AuditTrail";
import type { AdminAuditEntry } from "../lib/audit-action-labels";

vi.mock("../lib/audit-action-labels", () => ({
  humanizeAuditAction: (action: string) => `action:${action}`,
  summarizeMetadata: (meta: Record<string, unknown> | null) =>
    meta ? `meta:${Object.keys(meta).join(",")}` : "",
}));

vi.mock("../lib/datetime", () => ({
  formatDateTime: (input: string) => `dt:${input}`,
}));

const makeEntry = (overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry => ({
  id: "e1",
  action: "BOOKING_FORCE_CANCEL",
  actorId: "u1",
  actorDisplayName: "Alice",
  metadata: null,
  createdAt: "2026-06-01T10:00:00Z",
  ...overrides,
});

describe("AuditTrail", () => {
  it("renders loading skeleton (3 pulses) in loading state", () => {
    const { container } = render(<AuditTrail state={{ kind: "loading" }} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(3);
  });

  it("renders todo reason in todo state", () => {
    const state: AuditState = { kind: "todo", reason: "endpoint not ready" };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("Audit log endpoint coming soon")).toBeTruthy();
    expect(screen.getByText("endpoint not ready")).toBeTruthy();
  });

  it("renders error message and retry button in error state", () => {
    const onRetry = vi.fn();
    const state: AuditState = {
      kind: "error",
      message: "Failed to load",
      onRetry,
    };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("Failed to load")).toBeTruthy();
    const btn = screen.getByRole("button", { name: "Retry" });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty-state copy in ready state with no entries", () => {
    const state: AuditState = { kind: "ready", entries: [] };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("No admin actions on this booking yet.")).toBeTruthy();
  });

  it("renders one <li> per entry", () => {
    const entries = [makeEntry({ id: "e1" }), makeEntry({ id: "e2" })];
    const state: AuditState = { kind: "ready", entries };
    const { container } = render(<AuditTrail state={state} />);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders actor name and humanized action via mock", () => {
    const state: AuditState = { kind: "ready", entries: [makeEntry()] };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("action:BOOKING_FORCE_CANCEL")).toBeTruthy();
  });

  it("falls back to 'Admin' when actorDisplayName is null", () => {
    const state: AuditState = {
      kind: "ready",
      entries: [makeEntry({ actorDisplayName: null })],
    };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("passes createdAt through formatDateTime mock", () => {
    const state: AuditState = {
      kind: "ready",
      entries: [makeEntry({ createdAt: "2026-06-01T10:00:00Z" })],
    };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("dt:2026-06-01T10:00:00Z")).toBeTruthy();
  });

  it("renders metadata summary when summarizeMetadata returns non-empty", () => {
    const state: AuditState = {
      kind: "ready",
      entries: [makeEntry({ metadata: { reason: "no-show" } })],
    };
    render(<AuditTrail state={state} />);
    expect(screen.getByText("meta:reason")).toBeTruthy();
  });

  it("hides metadata row when summarizeMetadata returns empty string", () => {
    const state: AuditState = {
      kind: "ready",
      entries: [makeEntry({ metadata: null })],
    };
    const { container } = render(<AuditTrail state={state} />);
    expect(container.textContent).not.toContain("meta:");
  });

  it("shows 'Load older' button when onLoadMore is provided", () => {
    const state: AuditState = {
      kind: "ready",
      entries: [makeEntry()],
    };
    render(<AuditTrail state={state} onLoadMore={vi.fn()} />);
    expect(screen.getByRole("button", { name: /load older/i })).toBeTruthy();
  });

  it("clicking 'Load older' calls onLoadMore", () => {
    const onLoadMore = vi.fn();
    const state: AuditState = { kind: "ready", entries: [makeEntry()] };
    render(<AuditTrail state={state} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole("button", { name: /load older/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows loading pulse (not button) when loadingMore=true", () => {
    const state: AuditState = { kind: "ready", entries: [makeEntry()] };
    const { container } = render(
      <AuditTrail state={state} onLoadMore={vi.fn()} loadingMore />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /load older/i })).toBeNull();
  });

  it("hides load-more footer when onLoadMore is not provided", () => {
    const state: AuditState = { kind: "ready", entries: [makeEntry()] };
    render(<AuditTrail state={state} />);
    expect(screen.queryByRole("button", { name: /load older/i })).toBeNull();
  });
});
