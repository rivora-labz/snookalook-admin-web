import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

const providerSpy = vi.fn<(props: Record<string, unknown>) => void>();

vi.mock("@bprogress/next/app", () => ({
  ProgressProvider: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    providerSpy(props);
    return <div data-testid="bprogress-provider">{children}</div>;
  },
}));

import { RouteProgressProvider } from "./RouteProgressProvider";

describe("RouteProgressProvider", () => {
  afterEach(() => {
    cleanup();
    providerSpy.mockReset();
  });

  it("renders ProgressProvider wrapper with children", () => {
    render(
      <RouteProgressProvider>
        <span data-testid="child">child</span>
      </RouteProgressProvider>,
    );
    expect(screen.getByTestId("bprogress-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("passes brand color #D4AF37 and 2px height", () => {
    render(
      <RouteProgressProvider>
        <span />
      </RouteProgressProvider>,
    );
    const props = providerSpy.mock.calls[0]![0];
    expect(props.color).toBe("#D4AF37");
    expect(props.height).toBe("2px");
  });

  it("disables spinner and sets trickleSpeed=120 + minimum=0.12", () => {
    render(
      <RouteProgressProvider>
        <span />
      </RouteProgressProvider>,
    );
    const props = providerSpy.mock.calls[0]![0];
    expect(props.options).toEqual({ showSpinner: false, trickleSpeed: 120, minimum: 0.12 });
  });

  it("enables shallowRouting", () => {
    render(
      <RouteProgressProvider>
        <span />
      </RouteProgressProvider>,
    );
    const props = providerSpy.mock.calls[0]![0];
    expect(props.shallowRouting).toBe(true);
  });
});
