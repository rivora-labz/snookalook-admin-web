import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: () => ({ current: null }),
}));

import NoShowDialog from "./NoShowDialog";

const solo = [{ id: "p1", displayName: "Alice", role: "host" as const }];
const multi = [
  { id: "p1", displayName: "Alice", role: "host" as const },
  { id: "p2", displayName: "Bob", role: "opponent" as const },
];

describe("NoShowDialog", () => {
  it("renders role=dialog with aria-modal=true", () => {
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("solo participant: title uses displayName", () => {
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Mark Alice as no-show?")).toBeTruthy();
  });

  it("multi participants: generic title", () => {
    render(
      <NoShowDialog
        participants={multi}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Mark a participant as no-show?")).toBeTruthy();
  });

  it("multi participants: renders radio buttons for each", () => {
    const { container } = render(
      <NoShowDialog
        participants={multi}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const radios = container.querySelectorAll("input[type='radio']");
    expect(radios.length).toBe(2);
  });

  it("Cancel button calls onCancel", () => {
    const onCancel = vi.fn();
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error={null}
        onCancel={onCancel}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Confirm No-Show button calls onSubmit with participantId and note", () => {
    const onSubmit = vi.fn();
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    const textarea = screen.getByPlaceholderText(/guest didn't show/);
    fireEvent.change(textarea, { target: { value: "test note" } });
    fireEvent.click(screen.getByText("Confirm No-Show"));
    expect(onSubmit).toHaveBeenCalledWith("p1", "test note");
  });

  it("submitting=true: confirm button shows Marking…", () => {
    render(
      <NoShowDialog
        participants={solo}
        submitting={true}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Marking…")).toBeTruthy();
  });

  it("submitting=true: buttons are disabled", () => {
    const { container } = render(
      <NoShowDialog
        participants={solo}
        submitting={true}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it("error renders role=alert with message", () => {
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error="Something went wrong"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Something went wrong");
  });

  it("no error: alert element not present", () => {
    render(
      <NoShowDialog
        participants={solo}
        submitting={false}
        error={null}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
