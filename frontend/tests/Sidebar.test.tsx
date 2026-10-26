

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
        role="admin"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /new inquiry/i })
    );

    expect(onNavigate).toHaveBeenCalledWith("new-inquiry");
  });

  it("calls the navigation handler when Team Profiles is clicked", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        activePage="dashboard"
        role="admin"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /team profiles/i })
    );

    expect(onNavigate).toHaveBeenCalledWith("team");
  });

  it("does not show Team Profiles to employees", () => {
    render(
      <Sidebar
        activePage="dashboard"
        role="employee"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: /team profiles/i })
    ).not.toBeInTheDocument();
  });

  it("labels the employee inquiry list as their queue", () => {
    render(
      <Sidebar
        activePage="inquiries"
        role="employee"
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /my queue/i })
    ).toBeInTheDocument();
  });

  it("calls the logout handler when Sign Out is clicked", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();

    render(
      <Sidebar
        activePage="dashboard"
        role="admin"
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
