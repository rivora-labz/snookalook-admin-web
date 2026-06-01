import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useRef } from "react";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

const apiFetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();

vi.mock("../lib/use-focus-trap", () => ({
  useFocusTrap: <T extends HTMLElement>() => useRef<T>(null),
}));

vi.mock("../lib/api", async () => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  }
  return {
    apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
    ApiError,
  };
});

import EditTableModal, { type EditableTable } from "./EditTableModal";
import { ApiError } from "../lib/api";

const sampleTable: EditableTable = {
  id: "tbl-1",
  tableNumber: 4,
  type: "SNOOKER",
  pricePerHourFils: 6000,
};

const defaultProps = () => ({
  open: true,
  table: sampleTable,
  onClose: vi.fn(),
  onSaved: vi.fn(),
});

const numberInput = () =>
  screen.getByText("Table number").parentElement!.querySelector("input")! as HTMLInputElement;
const priceInput = () =>
  screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")! as HTMLInputElement;
const typeSelect = () =>
  screen.getByText("Type").parentElement!.querySelector("select")! as HTMLSelectElement;

describe("EditTableModal", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(<EditTableModal {...defaultProps()} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when table=null", () => {
    const { container } = render(<EditTableModal {...defaultProps()} table={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title + prefilled form from table prop", () => {
    render(<EditTableModal {...defaultProps()} />);
    expect(screen.getByText("Edit Table #4")).toBeInTheDocument();
    expect(numberInput().value).toBe("4");
    expect(typeSelect().value).toBe("SNOOKER");
    expect(priceInput().value).toBe("60.00");
  });

  it("Cancel button calls onClose", () => {
    const props = defaultProps();
    render(<EditTableModal {...props} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("× close button calls onClose", () => {
    const props = defaultProps();
    render(<EditTableModal {...props} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const props = defaultProps();
    render(<EditTableModal {...props} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("invalid table number (zero) → error message + no apiFetch", () => {
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.change(numberInput(), { target: { value: "0" } });
    const form = numberInput().closest("form")!;
    fireEvent.submit(form);
    expect(screen.getByText("Table number must be a positive integer.")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("invalid price (zero) → error message + no apiFetch", () => {
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.change(priceInput(), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Save"));
    expect(screen.getByText("Price must be a positive AED amount.")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("valid submit PATCHes /admin/tables/:id with body { tableNumber, type, pricePerHourFils }", async () => {
    apiFetchMock.mockResolvedValue({});
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.change(numberInput(), { target: { value: "9" } });
    fireEvent.change(typeSelect(), { target: { value: "BILLIARDS" } });
    fireEvent.change(priceInput(), { target: { value: "82.25" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const call = apiFetchMock.mock.calls[0]!;
    expect(call[0]).toBe("/admin/tables/tbl-1");
    expect(call[1]?.method).toBe("PATCH");
    expect(JSON.parse(call[1]!.body as string)).toEqual({
      tableNumber: 9,
      type: "BILLIARDS",
      pricePerHourFils: 8225,
    });
  });

  it("success → onSaved + onClose called", async () => {
    apiFetchMock.mockResolvedValue({});
    const props = defaultProps();
    render(<EditTableModal {...props} />);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();
  });

  it("404 ApiError on PATCH → editGap banner shown", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(404, "NOT_FOUND", "missing"));
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(screen.getByText(/Backend PATCH/)).toBeInTheDocument());
  });

  it("generic PATCH error → renders error message", async () => {
    apiFetchMock.mockRejectedValue(new Error("save boom"));
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(screen.getByText("save boom")).toBeInTheDocument());
  });

  it("Delete button opens confirm overlay", () => {
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete table #4?")).toBeInTheDocument();
  });

  const clickConfirmDelete = () => {
    const heading = screen.getByText("Delete table #4?");
    const overlay = heading.parentElement!;
    const buttons = Array.from(overlay.querySelectorAll("button")) as HTMLButtonElement[];
    const confirm = buttons.find((b) => b.textContent?.trim() === "Delete");
    fireEvent.click(confirm!);
  };

  it("confirm Delete → DELETE call + onSaved + onClose", async () => {
    apiFetchMock.mockResolvedValue({});
    const props = defaultProps();
    render(<EditTableModal {...props} />);
    fireEvent.click(screen.getByText("Delete"));
    clickConfirmDelete();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const call = apiFetchMock.mock.calls[0]!;
    expect(call[0]).toBe("/admin/tables/tbl-1");
    expect(call[1]?.method).toBe("DELETE");
    await waitFor(() => expect(props.onSaved).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();
  });

  it("404 ApiError on DELETE → deleteGap banner shown", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(404, "NOT_FOUND", "missing"));
    render(<EditTableModal {...defaultProps()} />);
    fireEvent.click(screen.getByText("Delete"));
    clickConfirmDelete();
    await waitFor(() => expect(screen.getByText(/Backend DELETE/)).toBeInTheDocument());
  });
});
