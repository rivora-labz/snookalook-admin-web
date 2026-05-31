import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskTooltip, { bucketFromScore } from "./RiskTooltip";

describe("bucketFromScore", () => {
  it("returns null for null/undefined/NaN", () => {
    expect(bucketFromScore(null)).toBeNull();
    expect(bucketFromScore(undefined)).toBeNull();
    expect(bucketFromScore(Number.NaN)).toBeNull();
  });

  it("classifies NONE for [0, 20)", () => {
    expect(bucketFromScore(0)).toBe("NONE");
    expect(bucketFromScore(19)).toBe("NONE");
  });

  it("classifies LOW for [20, 50)", () => {
    expect(bucketFromScore(20)).toBe("LOW");
    expect(bucketFromScore(49)).toBe("LOW");
  });

  it("classifies MEDIUM for [50, 80)", () => {
    expect(bucketFromScore(50)).toBe("MEDIUM");
    expect(bucketFromScore(79)).toBe("MEDIUM");
  });

  it("classifies HIGH for [80, ∞)", () => {
    expect(bucketFromScore(80)).toBe("HIGH");
    expect(bucketFromScore(100)).toBe("HIGH");
  });
});

describe("RiskTooltip", () => {
  const data = {
    riskScore: 42,
    noShowCount: 1,
    disputeCount: 0,
    lateCancelCount: 2,
  };

  it("renders em dash when bucket is null", () => {
    const { container } = render(<RiskTooltip bucket={null} data={data} />);
    expect(container.textContent).toContain("\u2014");
  });

  it("renders bucket label and tooltip metrics", () => {
    render(<RiskTooltip bucket="MEDIUM" data={data} />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("42");
    expect(tooltip.textContent).toContain("Risk breakdown");
  });

  it("renders em dash placeholder for null/undefined metric values", () => {
    render(
      <RiskTooltip
        bucket="HIGH"
        data={{ riskScore: null, noShowCount: undefined, disputeCount: 0, lateCancelCount: 0 }}
      />
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("\u2014");
  });
});
