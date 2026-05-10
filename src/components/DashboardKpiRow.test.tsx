import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardKpiRow from "./DashboardKpiRow";
import { ThemeProvider } from "../lib/ThemeContext";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

function renderRow(props: Parameters<typeof DashboardKpiRow>[0]) {
  return render(
    <ThemeProvider>
      <DashboardKpiRow {...props} />
    </ThemeProvider>,
  );
}

describe("DashboardKpiRow", () => {
  it("shows skeleton row when loading and no kpis", () => {
    renderRow({ kpis: null, loading: true });
    const skeletonContainer = screen.getByLabelText("Loading KPIs");
    expect(skeletonContainer).toHaveAttribute("aria-busy", "true");
  });

  it("renders kpi values when data present", () => {
    renderRow({
      kpis: {
        revenueToday: "AED 1,234",
        tablesInUse: "3 / 8",
        activeBookings: "12",
        newPlayersThisWeek: "5",
      },
      loading: false,
    });
    expect(screen.getByText("AED 1,234")).toBeInTheDocument();
    expect(screen.getByText("3 / 8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows error alert with retry CTA + invokes onRetry", async () => {
    const onRetry = vi.fn();
    renderRow({ kpis: null, loading: false, error: true, onRetry });
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText(/Failed to load KPIs/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /retry loading kpis/i });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
