import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BriefDrawer from "./BriefDrawer";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BriefDrawer", () => {
  it("renders Compose Brief heading with agent name", () => {
    render(<BriefDrawer agent="backend" onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByText(/Compose Brief/)).toBeTruthy();
    expect(screen.getByText("backend")).toBeTruthy();
  });

  it("textarea is present with correct placeholder", () => {
    render(<BriefDrawer agent="mobile" onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Brief for mobile/)).toBeTruthy();
  });

  it("shows 0 bytes initially", () => {
    render(<BriefDrawer agent="mobile" onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByText("0 bytes")).toBeTruthy();
  });

  it("shows 'inline' for content <= 1500 chars", () => {
    render(<BriefDrawer agent="mobile" onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByText("inline")).toBeTruthy();
  });

  it("shows '→ pointer' when content > 1500 chars", () => {
    render(<BriefDrawer agent="mobile" onClose={vi.fn()} onSent={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(/Brief for mobile/);
    fireEvent.change(textarea, { target: { value: "x".repeat(1501) } });
    expect(screen.getByText("→ pointer")).toBeTruthy();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(<BriefDrawer agent="backend" onClose={onClose} onSent={vi.fn()} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("close (✕) button calls onClose", () => {
    const onClose = vi.fn();
    render(<BriefDrawer agent="backend" onClose={onClose} onSent={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Send button disabled when content is empty", () => {
    const { container } = render(
      <BriefDrawer agent="backend" onClose={vi.fn()} onSent={vi.fn()} />,
    );
    const sendBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Send",
    ) as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it("success: shows result path and calls onSent", async () => {
    const onSent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mode: "inline", path: "agents/inbox/brief.md" }),
    });
    render(<BriefDrawer agent="qa-mobile" onClose={vi.fn()} onSent={onSent} />);
    fireEvent.change(screen.getByPlaceholderText(/Brief for qa-mobile/), {
      target: { value: "test content" },
    });
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Wrote agents\/inbox\/brief\.md/)).toBeTruthy();
  });

  it("pointer mode: result shows Pointer message", async () => {
    const onSent = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mode: "pointer", briefPath: "agents/briefs/qa-mobile-123.md" }),
    });
    render(<BriefDrawer agent="qa-mobile" onClose={vi.fn()} onSent={onSent} />);
    fireEvent.change(screen.getByPlaceholderText(/Brief for qa-mobile/), {
      target: { value: "test content" },
    });
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() =>
      expect(screen.getByText(/Pointer → agents\/briefs\/qa-mobile-123\.md/)).toBeTruthy(),
    );
  });

  it("error: shows error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "internal error" }),
    });
    render(<BriefDrawer agent="backend" onClose={vi.fn()} onSent={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Brief for backend/), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() => expect(screen.getByText("internal error")).toBeTruthy());
  });
});
