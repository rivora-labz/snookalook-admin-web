import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const getServerSessionMock = vi.fn();
const cookiesMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: cookiesMock }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("../../lib/auth", () => ({
  getServerSession: () => getServerSessionMock(),
}));

vi.mock("../../lib/runtime-auth", () => ({
  ADMIN_ACCESS_TOKEN_COOKIE: "snl_admin_access_token",
}));

vi.mock("./MasterNav", () => ({
  default: () => <div data-testid="master-nav-stub">MasterNav</div>,
}));

vi.mock("sonner", () => ({
  Toaster: () => <div data-testid="toaster-stub" />,
}));

import MasterShell from "./MasterShell";

async function renderShell(children: React.ReactNode = <div>child-content</div>) {
  const tree = await MasterShell({ children });
  return render(tree as React.ReactElement);
}

describe("MasterShell", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    cookiesMock.mockReset();
    redirectMock.mockReset();
    cleanup();
  });

  it("renders MasterNav child", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    expect(screen.getByTestId("master-nav-stub")).toBeInTheDocument();
  });

  it("renders Toaster", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    expect(screen.getByTestId("toaster-stub")).toBeInTheDocument();
  });

  it("renders platform admin header copy", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    expect(screen.getByText("Platform admin · all centers")).toBeInTheDocument();
  });

  it("renders founder displayName from session", async () => {
    getServerSessionMock.mockResolvedValue({
      staff: { user: { displayName: "Nara Founder" } },
    });
    await renderShell();
    expect(screen.getByText("Nara Founder")).toBeInTheDocument();
  });

  it('defaults to "Founder" when session is null', async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });

  it('defaults to "Founder" when staff missing on session', async () => {
    getServerSessionMock.mockResolvedValue({});
    await renderShell();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });

  it('defaults to "Founder" when displayName missing', async () => {
    getServerSessionMock.mockResolvedValue({
      staff: { user: {} },
    });
    await renderShell();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });

  it("renders Logout button", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    const btn = screen.getByRole("button", { name: /logout/i });
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute("type")).toBe("submit");
  });

  it("renders children inside main", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { container } = await renderShell(<div data-testid="kid">kid-payload</div>);
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(main?.querySelector('[data-testid="kid"]')).not.toBeNull();
  });

  it("main has overflow-y-auto and bg classes", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { container } = await renderShell();
    const main = container.querySelector("main")!;
    expect(main.className).toContain("overflow-y-auto");
    expect(main.className).toContain("bg-th-bg");
  });

  it("header has fixed 56px height", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { container } = await renderShell();
    const header = container.querySelector("header")!;
    expect(header.className).toContain("h-[56px]");
  });

  it("logout form wraps the button", async () => {
    getServerSessionMock.mockResolvedValue(null);
    await renderShell();
    const btn = screen.getByRole("button", { name: /logout/i });
    expect(btn.closest("form")).not.toBeNull();
  });
});
