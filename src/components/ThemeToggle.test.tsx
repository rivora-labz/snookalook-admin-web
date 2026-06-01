import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";
import { ThemeProvider } from "../lib/ThemeContext";

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    try { localStorage.removeItem("snook-admin-theme"); } catch {}
    document.documentElement.className = "";
  });

  it("renders a button", () => {
    renderWithProvider();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("defaults to light theme title (Switch to dark mode)", () => {
    renderWithProvider();
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Switch to dark mode"
    );
  });

  it("toggles to dark theme title on click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "title",
      "Switch to light mode"
    );
  });

  it("toggles theme-dark class on documentElement after click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole("button"));
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
  });

  it("toggles back to light after second click", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    const btn = screen.getByRole("button");
    await user.click(btn);
    await user.click(btn);
    expect(btn).toHaveAttribute("title", "Switch to dark mode");
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
  });
});
