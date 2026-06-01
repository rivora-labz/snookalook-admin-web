import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const pathnameMock = vi.fn<() => string>();
const useStaffSessionMock = vi.fn();
const getRuntimeAuthModeMock = vi.fn<() => "supabase" | "dev">();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={src} alt={alt} />
  ),
}));
vi.mock("../lib/use-staff-session", () => ({
  useStaffSession: () => useStaffSessionMock(),
}));
vi.mock("../lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}));
vi.mock("../lib/runtime-auth", () => ({
  getRuntimeAuthMode: () => getRuntimeAuthModeMock(),
  clearAdminAccessTokenCookie: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  pathnameMock.mockReset();
  useStaffSessionMock.mockReset();
  getRuntimeAuthModeMock.mockReset();
  getRuntimeAuthModeMock.mockReturnValue("dev");
  useStaffSessionMock.mockReturnValue({
    session: {
      centerName: "Dubai Snooker",
      userDisplayName: "Naya",
      role: "OWNER",
    },
  });
  cleanup();
});

async function renderNav(pathname: string) {
  pathnameMock.mockReturnValue(pathname);
  const mod = await import("./AdminNav");
  const AdminNav = mod.default;
  return render(<AdminNav />);
}

describe("AdminNav", () => {
  it("renders all 8 nav items with hrefs", async () => {
    await renderNav("/dashboard");
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Tables")).toBeDefined();
    expect(screen.getByText("Bookings")).toBeDefined();
    expect(screen.getByText("Players")).toBeDefined();
    expect(screen.getByText("Analytics")).toBeDefined();
    expect(screen.getByText("Leaderboard")).toBeDefined();
    expect(screen.getByText("Payments")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders center + operator from session", async () => {
    await renderNav("/dashboard");
    expect(screen.getByText("Dubai Snooker")).toBeDefined();
    expect(screen.getByText("Naya")).toBeDefined();
    expect(screen.getByText("OWNER")).toBeDefined();
  });

  it("falls back to defaults when session null", async () => {
    useStaffSessionMock.mockReturnValue({ session: null });
    await renderNav("/dashboard");
    expect(screen.getByText("Center")).toBeDefined();
    expect(screen.getByText("Staff")).toBeDefined();
    expect(screen.getByText("STAFF")).toBeDefined();
  });

  it("marks Dashboard active on exact /dashboard (end:true)", async () => {
    await renderNav("/dashboard");
    const link = screen.getByText("Dashboard").closest("a");
    expect(link?.className).toContain("#D4AF37");
  });

  it("Tables exact-match does NOT activate when pathname is sub-route", async () => {
    await renderNav("/bookings/123");
    const tablesLink = screen.getByText("Tables").closest("a");
    expect(tablesLink?.className).not.toContain("#D4AF37");
    const bookingsLink = screen.getByText("Bookings").closest("a");
    expect(bookingsLink?.className).toContain("#D4AF37");
  });

  it("Bookings activates via startsWith on /bookings/123", async () => {
    await renderNav("/bookings/abc");
    const link = screen.getByText("Bookings").closest("a");
    expect(link?.className).toContain("#D4AF37");
  });

  it("hrefs match NAV_ITEMS map", async () => {
    await renderNav("/dashboard");
    expect(screen.getByText("Dashboard").closest("a")?.getAttribute("href")).toBe("/dashboard");
    expect(screen.getByText("Bookings").closest("a")?.getAttribute("href")).toBe("/bookings");
    expect(screen.getByText("Settings").closest("a")?.getAttribute("href")).toBe("/settings");
  });

  it("renders Sign out button (dev mode)", async () => {
    await renderNav("/dashboard");
    expect(screen.getByTitle("Sign out")).toBeDefined();
  });
});
