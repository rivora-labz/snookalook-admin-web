import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskTooltip, { bucketFromScore } from "./RiskTooltip";

const emptyData = {
  riskScore: null,
  noShowCount: null,
  disputeCount: null,
  lateCancelCount: null,
};

describe("bucketFromScore", () => {
  it("returns null for null", () => expect(bucketFromScore(null)).toBeNull());
  it("returns null for undefined", () => expect(bucketFromScore(undefined)).toBeNull());
  it("returns null for Infinity", () => expect(bucketFromScore(Infinity)).toBeNull());
  it("returns NONE for score 0", () => expect(bucketFromScore(0)).toBe("NONE"));
  it("returns NONE for score 19", () => expect(bucketFromScore(19)).toBe("NONE"));
  it("returns LOW for score 20", () => expect(bucketFromScore(20)).toBe("LOW"));
  it("returns LOW for score 49", () => expect(bucketFromScore(49)).toBe("LOW"));
  it("returns MEDIUM for score 50", () => expect(bucketFromScore(50)).toBe("MEDIUM"));
  it("returns MEDIUM for score 79", () => expect(bucketFromScore(79)).toBe("MEDIUM"));
  it("returns HIGH for score 80", () => expect(bucketFromScore(80)).toBe("HIGH"));
  it("returns HIGH for score 100", () => expect(bucketFromScore(100)).toBe("HIGH"));
});

describe("RiskTooltip", () => {
  it("renders dash when bucket is null", () => {
    const { container } = render(<RiskTooltip bucket={null} data={emptyData} />);
    expect(container.textContent).toBe("—");
  });

  it("renders bucket label badge", () => {
    render(<RiskTooltip bucket="HIGH" data={emptyData} />);
    expect(screen.getByText("HIGH")).toBeTruthy();
  });

  it("renders tooltip with role=tooltip", () => {
    render(<RiskTooltip bucket="LOW" data={emptyData} />);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("tooltip contains Risk breakdown label", () => {
    render(<RiskTooltip bucket="MEDIUM" data={emptyData} />);
    expect(screen.getByText("Risk breakdown")).toBeTruthy();
  });

  it("tooltip shows numeric score when provided", () => {
    render(
      <RiskTooltip
        bucket="HIGH"
        data={{ riskScore: 85, noShowCount: 2, disputeCount: 1, lateCancelCount: 3 }}
      />,
    );
    expect(screen.getByRole("tooltip").textContent).toContain("85");
  });

  it("NONE bucket renders NONE badge", () => {
    render(<RiskTooltip bucket="NONE" data={emptyData} />);
    expect(screen.getByText("NONE")).toBeTruthy();
  });
});
