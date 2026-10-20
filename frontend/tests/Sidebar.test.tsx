

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Sidebar from "../components/Sidebar";

describe("Sidebar navigation", () => {
  it("calls the navigation handler when New Inquiry is clicked", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        activePage="dashboard"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /new inquiry/i })
    );

    expect(onNavigate).toHaveBeenCalledWith("new-inquiry");
  });

  it("calls the logout handler when Sign Out is clicked", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        activePage="dashboard"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /sign out/i })
    );

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
