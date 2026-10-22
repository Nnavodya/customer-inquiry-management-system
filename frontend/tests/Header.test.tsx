import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import Header from "../components/Header";

describe("Header component", () => {
  it("renders signed-in staff username and initial avatar", () => {
    const onLogout = vi.fn();

    render(<Header username="staff1" onLogout={onLogout} />);

    expect(screen.getByText("staff1")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("calls onLogout handler when Sign Out button is clicked", () => {
    const onLogout = vi.fn();

    render(<Header username="staff1" onLogout={onLogout} />);

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
