import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import DashboardKpiRow from "./DashboardKpiRow";
import { ThemeProvider } from "../lib/ThemeContext";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

describe("DashboardKpiRow a11y", () => {
  it("loaded state has no detectable axe violations", async () => {
    const { container } = render(
      <ThemeProvider>
        <DashboardKpiRow
          kpis={{
            revenueToday: "AED 1,234",
            tablesInUse: "3 / 8",
            activeBookings: "12",
            newPlayersThisWeek: "5",
          }}
          loading={false}
        />
      </ThemeProvider>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("error state has no detectable axe violations", async () => {
    const { container } = render(
      <ThemeProvider>
        <DashboardKpiRow kpis={null} loading={false} error onRetry={() => {}} />
      </ThemeProvider>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
