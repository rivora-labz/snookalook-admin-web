import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const persistMock = vi.hoisted(() => vi.fn());
let membershipsMock: { centerId: string; centerName: string }[] | undefined = [];
let activeMock: string | null = null;

vi.mock("../lib/active-center", () => ({
  useStaffMemberships: () => ({ memberships: membershipsMock }),
  useActiveCenterId: () => activeMock,
  persistActiveCenterId: persistMock,
  ACTIVE_CENTER_PARAM: "centerId",
}));

import CenterSwitcher from "./CenterSwitcher";

describe("CenterSwitcher", () => {
  beforeEach(() => {
    persistMock.mockClear();
    vi.stubGlobal("location", {
      search: "",
      pathname: "/",
      reload: vi.fn(),
    });
    vi.stubGlobal("history", { replaceState: vi.fn() });
  });

  it("renders null when memberships is undefined", () => {
    membershipsMock = undefined;
    const { container } = render(<CenterSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when memberships.length === 0", () => {
    membershipsMock = [];
    const { container } = render(<CenterSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when memberships.length === 1", () => {
    membershipsMock = [{ centerId: "c1", centerName: "Club A" }];
    const { container } = render(<CenterSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders select when memberships.length > 1", () => {
    membershipsMock = [
      { centerId: "c1", centerName: "Club A" },
      { centerId: "c2", centerName: "Club B" },
    ];
    const { container } = render(<CenterSwitcher />);
    expect(container.querySelector("select")).toBeTruthy();
  });

  it("renders correct option labels and values", () => {
    membershipsMock = [
      { centerId: "c1", centerName: "Club A" },
      { centerId: "c2", centerName: "Club B" },
    ];
    activeMock = "c1";
    const { container } = render(<CenterSwitcher />);
    const options = Array.from(container.querySelectorAll("option")) as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(["c1", "c2"]);
    expect(options.map((o) => o.textContent)).toEqual(["Club A", "Club B"]);
  });

  it("renders 'Active center' label", () => {
    membershipsMock = [
      { centerId: "c1", centerName: "Club A" },
      { centerId: "c2", centerName: "Club B" },
    ];
    render(<CenterSwitcher />);
    expect(screen.getByText("Active center")).toBeTruthy();
  });

  it("changing select calls persistActiveCenterId with new centerId", () => {
    membershipsMock = [
      { centerId: "c1", centerName: "Club A" },
      { centerId: "c2", centerName: "Club B" },
    ];
    activeMock = "c1";
    const { container } = render(<CenterSwitcher />);
    const select = container.querySelector("select")!;
    fireEvent.change(select, { target: { value: "c2" } });
    expect(persistMock).toHaveBeenCalledWith("c2");
  });
});
