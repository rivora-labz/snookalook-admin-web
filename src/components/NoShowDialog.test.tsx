import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useRef } from "react";
import NoShowDialog, { type NoShowParticipant } from "./NoShowDialog";

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => useRef<HTMLDivElement>(null),
}));

const solo: NoShowParticipant[] = [
  { id: "p1", displayName: "Alice", role: "host" },
];
const duo: NoShowParticipant[] = [
  { id: "p1", displayName: "Alice", role: "host" },
  { id: "p2", displayName: "Bob", role: "opponent" },
];

function defaultProps(overrides: Partial<Parameters<typeof NoShowDialog>[0]> = {}) {
  return {
    participants: solo,
    submitting: false,
    error: null,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("NoShowDialog", () => {
  it("renders solo title with participant name", () => {
    render(<NoShowDialog {...defaultProps()} />);
    expect(screen.getByText(/mark alice as no-show/i)).toBeDefined();
  });

  it("renders multi-participant title and radio fieldset when >1", () => {
    render(<NoShowDialog {...defaultProps({ participants: duo })} />);
    expect(screen.getByText(/mark a participant as no-show/i)).toBeDefined();
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("selects first participant by default", () => {
    render(<NoShowDialog {...defaultProps({ participants: duo })} />);
    const aliceRadio = screen
      .getAllByRole("radio")
      .find((r) => (r as HTMLInputElement).value === "p1") as HTMLInputElement;
    expect(aliceRadio.checked).toBe(true);
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(<NoShowDialog {...defaultProps({ onCancel })} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onSubmit with selected participantId + trimmed note", () => {
    const onSubmit = vi.fn();
    render(<NoShowDialog {...defaultProps({ onSubmit })} />);
    fireEvent.change(screen.getByPlaceholderText(/guest didn't show/i), {
      target: { value: "  late arrival  " },
    });
    fireEvent.click(screen.getByText(/confirm no-show/i));
    expect(onSubmit).toHaveBeenCalledWith("p1", "late arrival");
  });

  it("disables submit + cancel and shows Marking… while submitting", () => {
    render(<NoShowDialog {...defaultProps({ submitting: true })} />);
    expect(screen.getByText(/marking/i)).toBeDefined();
    expect((screen.getByText("Cancel") as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders error message in alert role when error prop set", () => {
    render(<NoShowDialog {...defaultProps({ error: "Backend rejected" })} />);
    expect(screen.getByRole("alert").textContent).toBe("Backend rejected");
  });

  it("backdrop click triggers onCancel; inner panel click does NOT", () => {
    const onCancel = vi.fn();
    render(<NoShowDialog {...defaultProps({ onCancel })} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    onCancel.mockClear();
    fireEvent.click(screen.getByText(/mark alice as no-show/i));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("backdrop click during submit is no-op", () => {
    const onCancel = vi.fn();
    render(<NoShowDialog {...defaultProps({ submitting: true, onCancel })} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("switching radio selection updates onSubmit payload", () => {
    const onSubmit = vi.fn();
    render(<NoShowDialog {...defaultProps({ participants: duo, onSubmit })} />);
    const bobRadio = screen
      .getAllByRole("radio")
      .find((r) => (r as HTMLInputElement).value === "p2") as HTMLInputElement;
    fireEvent.click(bobRadio);
    fireEvent.click(screen.getByText(/confirm no-show/i));
    expect(onSubmit).toHaveBeenCalledWith("p2", "");
  });
});
