import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@bprogress/next/app", () => ({
  ProgressProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "progress-provider" }, children),
}));

import { RouteProgressProvider } from "./RouteProgressProvider";

describe("RouteProgressProvider", () => {
  it("renders children", () => {
    render(
      <RouteProgressProvider>
        <span>inner</span>
      </RouteProgressProvider>,
    );
    expect(screen.getByText("inner")).toBeTruthy();
  });

  it("wraps children in ProgressProvider", () => {
    render(
      <RouteProgressProvider>
        <span>child</span>
      </RouteProgressProvider>,
    );
    expect(screen.getByTestId("progress-provider")).toBeTruthy();
  });
});
