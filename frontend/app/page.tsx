"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

const API_URL = "http://localhost:5000/api";

type Status = "New" | "In Progress" | "Resolved";

type Inquiry = {
  id: number;
  customer_name: string;
  contact: string;
  subject: string;
  description: string;
  status: Status;
  assigned_to_id: number | null;
  assigned_username?: string;
  assigned_full_name?: string;
  created_at: string;
  updated_at: string;
};

type Staff = {
  id: number;
  username: string;
  full_name?: string;
  active_count?: number;
  resolved_count?: number;
  total_assigned?: number;
};

export default function Home() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activePage, setActivePage] = useState<
    "dashboard" | "inquiries" | "new-inquiry" | "team"
  >("dashboard");
  const [checkingSession, setCheckingSession] = useState(true);

  // Auth form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Inquiries data
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignedStaff, setFilterAssignedStaff] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [contactError, setContactError] = useState("");

  const loadInquiries = useCallback(
    async (searchText = "", statusText = "", assignedText = "") => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (searchText.trim()) {
          params.set("search", searchText.trim());
        }

        if (statusText) {
          params.set("status", statusText);
        }

        if (assignedText) {
          params.set("assigned_to", assignedText);
        }

        const response = await fetch(
          `${API_URL}/inquiries?${params.toString()}`,
          { credentials: "include" }
        );

        const data = await response.json();

        if (response.status === 401) {
          setStaff(null);
          throw new Error("Your session expired. Please sign in again.");
        }

        if (!response.ok) {
          throw new Error(data.message || "Could not load inquiries.");
        }

        setInquiries(data.inquiries || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the server."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchStaffMembers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/staff`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const list: Staff[] = data.staff || [];
        setStaffList(list);
        if (list.length > 0) {
          setAssignedToId((prev) => (prev ? prev : String(list[0].id)));
        }
      }
    } catch {
      // Non-fatal, staff list fallback
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          setStaff(null);
          return;
        }

        const data = await response.json();
        setStaff(data.staff);
      } catch {
        setError("Could not connect to the backend server.");
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!staff) return;

    let cancelled = false;

    async function initializeDashboard() {
      await loadInquiries();
      if (!cancelled) {
        await fetchStaffMembers();
      }
    }

    initializeDashboard();

    return () => {
      cancelled = true;
    };
  }, [staff, loadInquiries, fetchStaffMembers]);

  function handleNavigate(
    page: "dashboard" | "inquiries" | "new-inquiry" | "team"
  ) {
    setActivePage(page);

    const targetId =
      page === "new-inquiry"
        ? "new-inquiry"
        : page === "inquiries"
        ? "inquiries"
        : page === "team"
        ? "team"
        : "dashboard";

    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleFilterByStaff(staffId: string) {
    const nextVal = filterAssignedStaff === staffId ? "" : staffId;
    setFilterAssignedStaff(nextVal);
    loadInquiries(search, filterStatus, nextVal);
    document.getElementById("inquiries")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setStaff(data.staff);
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Please try again."
      );
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      setStaff(null);
      setInquiries([]);
      setUsername("");
      setPassword("");
      setMessage("You have signed out successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not sign out."
      );
    }
  }

  function validateContact(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setContactError("Contact information is required.");
      return false;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^[\d\s+\-()]{7,25}$/.test(trimmed);
    if (!isEmail && !isPhone) {
      setContactError("Please enter a valid email address or phone number (e.g. name@domain.com or +94 77 123 4567).");
      return false;
    }
    setContactError("");
    return true;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateContact(contact)) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_name: customerName,
          contact,
          subject,
          description,
          assigned_to_id: assignedToId ? Number(assignedToId) : null,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setStaff(null);
        throw new Error("Your session expired. Please sign in again.");
      }

      if (response.status === 409) {
        throw new Error(data.message || "Duplicate inquiry detected.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not save inquiry.");
      }

      setCustomerName("");
      setContact("");
      setSubject("");
      setDescription("");
      setAssignedToId("");
      setMessage("Inquiry created successfully.");

      await loadInquiries(search, filterStatus, filterAssignedStaff);
      await fetchStaffMembers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save inquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    inquiryItem: Inquiry,
    newStatus: Status
  ) {
    if (inquiryItem.status === newStatus) return;

    if (inquiryItem.status === "Resolved" && newStatus === "In Progress") {
      const confirmed = window.confirm(
        "Are you sure you want to reopen this resolved inquiry?"
      );
      if (!confirmed) return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries/${inquiryItem.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          expected_updated_at: inquiryItem.updated_at,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setStaff(null);
        throw new Error("Your session expired. Please sign in again.");
      }

      if (response.status === 409) {
        // Stale data detected
        setError(
          data.message ||
            "Stale data detected: This inquiry was modified in another session. Refreshed with latest data."
        );
        await loadInquiries(search, filterStatus, filterAssignedStaff);
        await fetchStaffMembers();
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not update status.");
      }

      setMessage(`Inquiry #${inquiryItem.id} status changed to '${newStatus}'.`);
      await loadInquiries(search, filterStatus, filterAssignedStaff);
      await fetchStaffMembers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update inquiry status."
      );
    }
  }

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm font-medium">Checking session...</p>
        </div>
      </main>
    );
  }

  if (!staff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-800 bg-cyan-100/80 px-2.5 py-1 rounded">
              Coffee Ninja
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Staff Workspace Sign-In
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to track, manage, and resolve customer inquiries.
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-800 font-medium">
              {error}
            </div>
          )}

          {message && (
            <div role="status" className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800 font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Staff Username
              </label>
              <input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                placeholder="e.g. staff1"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-xl bg-cyan-700 py-3 px-4 font-semibold text-white shadow-sm hover:bg-cyan-800 transition disabled:opacity-50 text-sm"
            >
              {loggingIn ? "Authenticating..." : "Sign In to Workspace"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            <span className="font-semibold block text-slate-700 mb-1">Seeded Test Credentials:</span>
            <span>Username: <strong className="font-mono text-slate-800">staff1</strong> | Password: <strong className="font-mono text-slate-800">Password123!</strong></span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      id="dashboard"
      className="min-h-screen bg-slate-100 text-slate-900 md:flex"
    >
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Header username={staff.username} onLogout={handleLogout} />

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          {message && (
            <div
              role="status"
              className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 font-medium text-sm flex items-center justify-between"
            >
              <span>{message}</span>
              <button onClick={() => setMessage("")} className="text-emerald-600 hover:text-emerald-900">✕</button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 font-medium text-sm flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">✕</button>
            </div>
          )}

          {/* New Inquiry Form Section */}
          <section
            id="new-inquiry"
            className="mb-8 scroll-mt-6 rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Record New Customer Inquiry</h2>
                <p className="text-xs text-slate-500 mt-1">Capture details to move the request through its lifecycle.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Staff Workflow
              </span>
            </div>

            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  required
                  maxLength={100}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kasun Fernando"
                  aria-label="Customer name"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Contact Method (Email / Phone) *
                </label>
                <input
                  required
                  maxLength={50}
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (contactError) validateContact(e.target.value);
                  }}
                  onBlur={() => validateContact(contact)}
                  placeholder="e.g. customer@example.com or +94 77 123 4567"
                  aria-label="Contact number or email"
                  className={`w-full rounded-xl border p-3 text-sm outline-none focus:ring-1 ${
                    contactError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-400"
                      : "border-slate-300 focus:border-cyan-700 focus:ring-cyan-700"
                  }`}
                />
                {contactError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{contactError}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Inquiry Subject *
                </label>
                <input
                  required
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Broken Grinder Repair / Monthly Bean Delivery"
                  aria-label="Inquiry subject"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Short Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail what the customer requested, reported, or asked about..."
                  aria-label="Short description"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assign Handling Staff
                  </label>
                  <span className="text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                    ★ Fair Load Suggestion
                  </span>
                </div>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  aria-label="Assign handling staff"
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none bg-white focus:border-cyan-700"
                >
                  <option value="">Leave Unassigned</option>
                  {staffList.map((m, index) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.username} — {m.active_count ?? 0} active {m.active_count === 1 ? "task" : "tasks"}
                      {index === 0 ? " (★ Least Loaded)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically suggests the team member with the lowest active workload to prevent overload.
                </p>
              </div>

              <div className="flex items-end">
                <button
                  disabled={saving}
                  type="submit"
                  className="w-full rounded-xl bg-cyan-700 py-3 px-5 font-semibold text-white shadow-sm hover:bg-cyan-800 transition disabled:opacity-50 text-sm"
                >
                  {saving ? "Saving Inquiry..." : "Record Inquiry"}
                </button>
              </div>
            </form>
          </section>

          {/* Staff Team Profiles Section */}
          <section
            id="team"
            className="mb-8 scroll-mt-6 rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 bg-cyan-100/80 px-2.5 py-0.5 rounded">
                    Staff Team Profiles
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {staffList.length} Team Members
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Team Workloads & Performance Profiles
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  View individual staff assignment queues, active workloads, and resolution stats.
                </p>
              </div>

              {filterAssignedStaff && (
                <button
                  onClick={() => handleFilterByStaff("")}
                  className="text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 self-start sm:self-auto"
                >
                  ✕ Clear Staff Filter
                </button>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {staffList.map((member, index) => {
                const isFiltered = filterAssignedStaff === String(member.id);
                const isUserSarah = member.username === "staff1";

                return (
                  <div
                    key={member.id}
                    className={`rounded-2xl border p-5 sm:p-6 transition relative overflow-hidden ${
                      isFiltered
                        ? "border-cyan-600 bg-cyan-50/30 ring-2 ring-cyan-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-sm ${
                            isUserSarah
                              ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                              : "bg-gradient-to-br from-teal-500 to-emerald-700"
                          }`}
                        >
                          {(member.full_name || member.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-slate-900">
                              {member.full_name || member.username}
                            </h3>
                            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              @{member.username}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Support team member
                          </p>
                        </div>
                      </div>

                      {index === 0 && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          ★ Least Loaded
                        </span>
                      )}
                    </div>

                    {/* Workload Metric Counters */}
                    <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                          Active Tasks
                        </p>
                        <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                          {member.active_count ?? 0}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Resolved
                        </p>
                        <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                          {member.resolved_count ?? 0}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                          Total Handled
                        </p>
                        <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                          {member.total_assigned ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* Filter Button */}
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleFilterByStaff(String(member.id))}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                          isFiltered
                            ? "bg-cyan-700 text-white hover:bg-cyan-800 shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        }`}
                      >
                        {isFiltered ? (
                          <>✓ Viewing {member.full_name}&apos;s Queue (Active)</>
                        ) : (
                          <>View {member.full_name}&apos;s Inquiries →</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Inquiry Overview List Section */}
          <section
            id="inquiries"
            className="scroll-mt-6 rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Inquiry Overview & Tracking</h2>
                <p className="text-xs text-slate-500 mt-1">
                  View, filter, and progress customer requests through their lifecycle.
                </p>
              </div>

              <button
                onClick={() => {
                  loadInquiries(search, filterStatus, filterAssignedStaff);
                  fetchStaffMembers();
                }}
                disabled={loading}
                className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-2 rounded-lg transition flex items-center gap-1.5 self-start sm:self-auto"
                title="Reload latest inquiries to catch changes from other tabs"
              >
                ↻ Refresh List
              </button>
            </div>

            {/* Filter and Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadInquiries(search, filterStatus, filterAssignedStaff);
              }}
              className="mb-6 flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, contact, subject, or description..."
                aria-label="Search inquiries"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-cyan-700"
              />

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  loadInquiries(search, e.target.value, filterAssignedStaff);
                }}
                aria-label="Filter by status"
                className="rounded-xl border border-slate-300 p-3 text-sm bg-white outline-none focus:border-cyan-700"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={filterAssignedStaff}
                onChange={(e) => {
                  setFilterAssignedStaff(e.target.value);
                  loadInquiries(search, filterStatus, e.target.value);
                }}
                aria-label="Filter by assigned staff"
                className="rounded-xl border border-slate-300 p-3 text-sm bg-white outline-none focus:border-cyan-700"
              >
                <option value="">All Staff Members</option>
                {staffList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.username}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 transition text-sm"
              >
                Search
              </button>
            </form>

            {loading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-500 text-sm font-medium">Loading inquiries...</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <p className="font-semibold text-slate-700">No customer inquiries found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No inquiries match the current search or status filter. Try clearing filters or record a new inquiry above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inquiries.map((inquiry) => (
                  <article
                    key={inquiry.id}
                    className="rounded-xl border border-slate-200/90 p-5 hover:border-slate-300 transition bg-white shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(
                              inquiry.status
                            )}`}
                          >
                            {inquiry.status}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            #{inquiry.id}
                          </span>
                          {inquiry.assigned_full_name ? (
                            <button
                              type="button"
                              onClick={() => handleFilterByStaff(String(inquiry.assigned_to_id))}
                              title={`Filter inquiries assigned to ${inquiry.assigned_full_name}`}
                              className="text-xs text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2.5 py-0.5 rounded font-medium transition"
                            >
                              👤 {inquiry.assigned_full_name}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mt-2">
                          {inquiry.subject}
                        </h3>

                        <p className="text-xs text-slate-600 mt-1">
                          Customer: <strong className="font-semibold text-slate-800">{inquiry.customer_name}</strong> · <span className="font-mono text-cyan-800">{inquiry.contact}</span>
                        </p>
                      </div>

                      {/* Status Action Dropdown */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <label htmlFor={`status-${inquiry.id}`} className="text-xs font-semibold text-slate-500">
                          Status:
                        </label>
                        <select
                          id={`status-${inquiry.id}`}
                          aria-label={`Status for ${inquiry.subject}`}
                          value={inquiry.status}
                          onChange={(e) =>
                            handleStatusChange(inquiry, e.target.value as Status)
                          }
                          className="rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 bg-white outline-none focus:border-cyan-700"
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      {inquiry.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                      <span>
                        Recorded: {new Date(inquiry.created_at).toLocaleString()}
                        {inquiry.updated_at && inquiry.updated_at !== inquiry.created_at && (
                          <span className="ml-2 italic text-slate-400">
                            (Updated: {new Date(inquiry.updated_at).toLocaleTimeString()})
                          </span>
                        )}
                      </span>

                      {/* Direct Link Anchor */}
                      <Link
                        href={`/inquiries/${inquiry.id}`}
                        className="font-semibold text-cyan-700 hover:text-cyan-900 transition flex items-center gap-1"
                      >
                        Open Direct Record View →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}