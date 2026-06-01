import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const toggleThemeMock = vi.fn();
let themeMock = "dark";

vi.mock("../lib/ThemeContext", () => ({
  useTheme: () => ({ theme: themeMock, toggleTheme: toggleThemeMock }),
}));

import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("dark theme: button title is 'Switch to light mode'", () => {
    themeMock = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button").getAttribute("title")).toBe("Switch to light mode");
  });

  it("light theme: button title is 'Switch to dark mode'", () => {
    themeMock = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button").getAttribute("title")).toBe("Switch to dark mode");
  });

  it("clicking the button calls toggleTheme", () => {
    themeMock = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
});
