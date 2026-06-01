import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

const replaceMock = vi.fn<(path: string) => void>();
const apiFetchMock = vi.fn<(path: string) => Promise<unknown>>();
let mockPathname: string | null = "/master/overview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => mockPathname,
}));

vi.mock("../lib/api", () => ({
  apiFetch: (path: string) => apiFetchMock(path),
}));

import OnboardingRedirect from "./OnboardingRedirect";

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const storageMap = new Map<string, string>();
const storageStub = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storageMap.set(k, String(v));
  },
  removeItem: (k: string) => {
    storageMap.delete(k);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (i: number) => Array.from(storageMap.keys())[i] ?? null,
  get length() {
    return storageMap.size;
  },
};

describe("OnboardingRedirect", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    apiFetchMock.mockReset();
    mockPathname = "/master/overview";
    storageMap.clear();
    vi.stubGlobal("localStorage", storageStub);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders nothing (null component)", () => {
    apiFetchMock.mockResolvedValue({ items: [] });
    const { container } = render(<OnboardingRedirect />);
    expect(container.firstChild).toBeNull();
  });

  it("skips apiFetch when on /onboarding-hub", async () => {
    mockPathname = "/onboarding-hub";
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("skips apiFetch when on /login", async () => {
    mockPathname = "/login";
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("skips apiFetch when on /forbidden", async () => {
    mockPathname = "/forbidden";
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("skips apiFetch when localStorage dismissed=true", async () => {
    localStorage.setItem("onboardingDismissed", "true");
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /onboarding-hub when tables AND bookings both empty", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/admin/tables") return Promise.resolve({ items: [] });
      return Promise.resolve({ items: [], total: 0 });
    });
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(replaceMock).toHaveBeenCalledWith("/onboarding-hub");
  });

  it("does NOT redirect when tables populated", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/admin/tables") return Promise.resolve({ items: [{ id: "t1" }] });
      return Promise.resolve({ items: [], total: 0 });
    });
    render(<OnboardingRedirect />);
    await flush();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does NOT redirect when bookings total > 0 even if items empty", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/admin/tables") return Promise.resolve({ items: [] });
      return Promise.resolve({ items: [], total: 5 });
    });
    render(<OnboardingRedirect />);
    await flush();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does NOT redirect when bookings items populated (no total field)", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/admin/tables") return Promise.resolve({ items: [] });
      return Promise.resolve({ items: [{ id: "b1" }] });
    });
    render(<OnboardingRedirect />);
    await flush();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("silently swallows apiFetch rejection — no redirect, no throw", async () => {
    apiFetchMock.mockRejectedValue(new Error("network"));
    render(<OnboardingRedirect />);
    await flush();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does nothing when pathname is null", async () => {
    mockPathname = null;
    render(<OnboardingRedirect />);
    await flush();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
