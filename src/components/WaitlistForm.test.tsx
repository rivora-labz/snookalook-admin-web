import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import WaitlistForm from "./WaitlistForm";

vi.mock("../lib/api-base", () => ({ API_BASE: "https://api.test" }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function typeEmail(value: string) {
  const input = screen.getByLabelText("Email address") as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("WaitlistForm", () => {
  it("renders email input and submit button", () => {
    render(<WaitlistForm />);
    expect(screen.getByLabelText("Email address")).toBeDefined();
    expect(screen.getByRole("button", { name: /join waitlist/i })).toBeDefined();
  });

  it("rejects invalid email with error message", () => {
    render(<WaitlistForm />);
    typeEmail("not-an-email");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    expect(screen.getByRole("status").textContent).toMatch(/valid email/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /waitlist with json body on valid email", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    render(<WaitlistForm />);
    typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe("https://api.test/waitlist");
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({ email: "a@b.co" });
  });

  it("shows success message and clears input on ok response", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    render(<WaitlistForm />);
    const input = typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/on the list/i));
    expect(input.value).toBe("");
  });

  it("shows fallback message on 404", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    render(<WaitlistForm />);
    typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/captured locally/i),
    );
  });

  it("shows fallback on network error (fetch throws)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<WaitlistForm />);
    typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/network unavailable/i),
    );
  });

  it("shows fallback (not error) on non-404 non-OK response (eg 500)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    render(<WaitlistForm />);
    typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() => {
      const text = screen.getByRole("status").textContent ?? "";
      expect(text.length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("status").textContent).toMatch(/network unavailable/i);
  });

  it("button shows Sending… while in-flight then resets to Join Waitlist", async () => {
    let resolveFetch: (v: { ok: boolean; status: number }) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((res) => {
          resolveFetch = res;
        }),
    );
    render(<WaitlistForm />);
    typeEmail("a@b.co");
    fireEvent.submit(screen.getByRole("button").closest("form")!);
    await waitFor(() =>
      expect(screen.getByRole("button").textContent).toMatch(/sending/i),
    );
    resolveFetch!({ ok: true, status: 200 });
    await waitFor(() =>
      expect(screen.getByRole("button").textContent).toMatch(/join waitlist/i),
    );
  });
});
