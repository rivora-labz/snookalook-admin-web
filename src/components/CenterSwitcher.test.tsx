import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CenterSwitcher from "./CenterSwitcher";
import type { StaffMembership } from "../lib/active-center";

const membershipsMock = vi.fn<() => StaffMembership[] | null>();
const activeMock = vi.fn<() => string | null>();
const persistMock = vi.fn();

vi.mock("../lib/active-center", () => ({
  useStaffMemberships: () => ({ memberships: membershipsMock(), loading: false }),
  useActiveCenterId: () => activeMock(),
  persistActiveCenterId: (id: string) => persistMock(id),
  ACTIVE_CENTER_PARAM: "centerId",
}));

const mkMembership = (id: string, name: string): StaffMembership =>
  ({
    centerId: id,
    centerName: name,
  }) as StaffMembership;

describe("CenterSwitcher", () => {
  beforeEach(() => {
    persistMock.mockClear();
  });

  it("renders nothing when memberships is null", () => {
    membershipsMock.mockReturnValue(null);
    activeMock.mockReturnValue(null);
    const { container } = render(<CenterSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when only one membership", () => {
    membershipsMock.mockReturnValue([mkMembership("c1", "Pilot")]);
    activeMock.mockReturnValue("c1");
    const { container } = render(<CenterSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it("renders label + select with all memberships when >1", () => {
    membershipsMock.mockReturnValue([
      mkMembership("c1", "Dubai"),
      mkMembership("c2", "Abu Dhabi"),
    ]);
    activeMock.mockReturnValue("c1");
    render(<CenterSwitcher />);
    expect(screen.getByText(/active center/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dubai" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Abu Dhabi" })).toBeInTheDocument();
  });

  it("select value reflects active center id", () => {
    membershipsMock.mockReturnValue([
      mkMembership("c1", "Dubai"),
      mkMembership("c2", "Abu Dhabi"),
    ]);
    activeMock.mockReturnValue("c2");
    render(<CenterSwitcher />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("c2");
  });

  it("onChange invokes persistActiveCenterId with new id", async () => {
    membershipsMock.mockReturnValue([
      mkMembership("c1", "Dubai"),
      mkMembership("c2", "Abu Dhabi"),
    ]);
    activeMock.mockReturnValue("c1");

    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy, pathname: "/master", search: "" },
    });

    const user = userEvent.setup();
    render(<CenterSwitcher />);
    await user.selectOptions(screen.getByRole("combobox"), "c2");
    expect(persistMock).toHaveBeenCalledWith("c2");
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });
});
