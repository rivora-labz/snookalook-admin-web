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

import AddTableModal from "./AddTableModal";
import { ApiError } from "../lib/api";

const defaultProps = () => ({
  open: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
});

describe("AddTableModal", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(<AddTableModal {...defaultProps()} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title + form when open=true", () => {
    render(<AddTableModal {...defaultProps()} />);
    expect(screen.getByText("Add Table")).toBeInTheDocument();
    expect(screen.getByText("Table number")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Price per hour (AED)")).toBeInTheDocument();
  });

  it("Cancel button calls onClose", () => {
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("× close button calls onClose", () => {
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("inner panel click does NOT call onClose (stopPropagation)", () => {
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    const title = screen.getByText("Add Table");
    fireEvent.click(title);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("invalid table number (zero) → error message + no apiFetch", () => {
    render(<AddTableModal {...defaultProps()} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "0" } });
    fireEvent.change(priceInput, { target: { value: "50" } });
    const form = numInput.closest("form")!;
    fireEvent.submit(form);
    expect(screen.getByText("Table number must be a positive integer.")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("invalid price (zero) → error message + no apiFetch", () => {
    render(<AddTableModal {...defaultProps()} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "5" } });
    fireEvent.change(priceInput, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Create"));
    expect(screen.getByText("Price must be a positive AED amount.")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("valid submit POSTs to /admin/tables with body { tableNumber, type, pricePerHourFils }", async () => {
    apiFetchMock.mockResolvedValue({});
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "7" } });
    fireEvent.change(priceInput, { target: { value: "75.50" } });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const call = apiFetchMock.mock.calls[0]!;
    expect(call[0]).toBe("/admin/tables");
    expect(call[1]?.method).toBe("POST");
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toEqual({ tableNumber: 7, type: "SNOOKER", pricePerHourFils: 7550 });
  });

  it("success → onCreated + onClose called", async () => {
    apiFetchMock.mockResolvedValue({});
    const props = defaultProps();
    render(<AddTableModal {...props} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "3" } });
    fireEvent.change(priceInput, { target: { value: "60" } });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();
  });

  it("type select switches to POOL", () => {
    render(<AddTableModal {...defaultProps()} />);
    const select = screen.getByText("Type").parentElement!.querySelector("select")! as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "POOL" } });
    expect(select.value).toBe("POOL");
  });

  it("404 ApiError → backendGap banner replaces form", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(404, "NOT_FOUND", "missing"));
    render(<AddTableModal {...defaultProps()} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "1" } });
    fireEvent.change(priceInput, { target: { value: "50" } });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() =>
      expect(screen.getByText(/Backend POST/)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Create")).not.toBeInTheDocument();
  });

  it("generic error → renders error message", async () => {
    apiFetchMock.mockRejectedValue(new Error("server boom"));
    render(<AddTableModal {...defaultProps()} />);
    const numInput = screen.getByText("Table number").parentElement!.querySelector("input")!;
    const priceInput = screen.getByText("Price per hour (AED)").parentElement!.querySelector("input")!;
    fireEvent.change(numInput, { target: { value: "1" } });
    fireEvent.change(priceInput, { target: { value: "50" } });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByText("server boom")).toBeInTheDocument());
  });
});
