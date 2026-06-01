import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import WaitlistForm from "./WaitlistForm";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WaitlistForm", () => {
  it("renders email input and join button", () => {
    render(<WaitlistForm />);
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByText("Join Waitlist")).toBeTruthy();
  });

  it("invalid email: shows error message without calling fetch", async () => {
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Enter a valid email."));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("empty email: shows error without calling fetch", async () => {
    render(<WaitlistForm />);
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Enter a valid email."));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("submit button shows Sending… while request is in-flight", async () => {
    let resolve!: () => void;
    mockFetch.mockReturnValue(
      new Promise((res) => {
        resolve = () => res({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }),
    );
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@b.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    expect(screen.getByText("Sending…")).toBeTruthy();
    resolve();
    await waitFor(() => expect(screen.queryByText("Sending…")).toBeNull());
  });

  it("success: shows 'On the list.' message", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("On the list."),
    );
  });

  it("404 response: shows fallback message", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("locally"),
    );
  });

  it("network error: shows network fallback message", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email address").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Network unavailable"),
    );
  });
});
