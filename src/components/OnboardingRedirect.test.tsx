import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";

let pathnameMock = "/dashboard";
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));
const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock,
  useRouter: () => routerMock,
}));

vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
}));

import OnboardingRedirect from "./OnboardingRedirect";

const emptyResponse = { items: [], total: 0 };
const nonEmptyResponse = { items: [{}], total: 1 };

beforeEach(() => {
  routerMock.replace.mockClear();
  apiFetchMock.mockClear();
  try { localStorage.clear(); } catch { /* jsdom may not have it */ }
});

describe("OnboardingRedirect", () => {
  it("renders null", () => {
    apiFetchMock.mockResolvedValue(nonEmptyResponse);
    const { container } = render(<OnboardingRedirect />);
    expect(container.firstChild).toBeNull();
  });

  it("redirects when both tables and bookings are empty", async () => {
    pathnameMock = "/dashboard";
    apiFetchMock.mockResolvedValue(emptyResponse);
    render(<OnboardingRedirect />);
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/onboarding-hub"));
  });

  it("does not redirect when tables are non-empty", async () => {
    pathnameMock = "/dashboard";
    apiFetchMock
      .mockResolvedValueOnce(nonEmptyResponse)
      .mockResolvedValueOnce(emptyResponse);
    render(<OnboardingRedirect />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when bookings are non-empty", async () => {
    pathnameMock = "/dashboard";
    apiFetchMock
      .mockResolvedValueOnce(emptyResponse)
      .mockResolvedValueOnce(nonEmptyResponse);
    render(<OnboardingRedirect />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("skips fetch when pathname starts with /onboarding-hub", async () => {
    pathnameMock = "/onboarding-hub";
    render(<OnboardingRedirect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("skips fetch when pathname starts with /login", async () => {
    pathnameMock = "/login";
    render(<OnboardingRedirect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("skips fetch when pathname starts with /forbidden", async () => {
    pathnameMock = "/forbidden";
    render(<OnboardingRedirect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("skips redirect when localStorage DISMISS_KEY is true", async () => {
    pathnameMock = "/dashboard";
    try { localStorage.setItem("onboardingDismissed", "true"); } catch { return; }
    apiFetchMock.mockResolvedValue(emptyResponse);
    render(<OnboardingRedirect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("does not redirect on apiFetch error", async () => {
    pathnameMock = "/dashboard";
    apiFetchMock.mockRejectedValue(new Error("network error"));
    render(<OnboardingRedirect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
