
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

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
  created_at: string;
};

type Staff = {
  id: number;
  username: string;
};

export default function Home() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [activePage, setActivePage] = useState<
  "dashboard" | "inquiries" | "new-inquiry">("dashboard");
  const [checkingSession, setCheckingSession] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadInquiries = useCallback(
    async (searchText = "", statusText = "") => {
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

        setInquiries(data.inquiries);
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

  async function fetchInquiries() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/inquiries`,
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

      if (!cancelled) {
        setInquiries(data.inquiries);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the server."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  fetchInquiries();

  return () => {
    cancelled = true;
  };
}, [staff]);

function handleNavigate(
  page: "dashboard" | "inquiries" | "new-inquiry"
) {
  setActivePage(page);

  const targetId =
    page === "new-inquiry"
      ? "new-inquiry"
      : page === "inquiries"
        ? "inquiries"
        : "dashboard";

  document.getElementById(targetId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setStaff(null);
        throw new Error("Your session expired. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not save inquiry.");
      }

      setCustomerName("");
      setContact("");
      setSubject("");
      setDescription("");
      setSearch("");
      setFilterStatus("");
      setMessage("Inquiry created successfully.");

      await loadInquiries("", "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save inquiry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: Status) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setStaff(null);
        throw new Error("Your session expired. Please sign in again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not update status.");
      }

      setMessage("Inquiry status updated successfully.");
      await loadInquiries(search, filterStatus);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update inquiry status."
      );
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-slate-600">Checking your session...</p>
      </main>
    );
  }

  if (!staff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">
            Coffee Ninja
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            Staff Sign In
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage customer inquiries.
          </p>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-red-100 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="mt-5 rounded-lg bg-green-100 p-3 text-sm text-green-800">
              {message}
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-cyan-700"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-cyan-700"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Authorized staff only
          </p>
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

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
        {message && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-green-100 p-3 text-green-800"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-100 p-3 text-red-800"
          >
            {error}
          </p>
        )}

        <section
          id="new-inquiry"
          className="mb-8 scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-bold">Create New Inquiry</h2>

          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <input
              required
              maxLength={100}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              aria-label="Customer name"
              className="rounded-lg border border-slate-300 p-3"
            />

            <input
              required
              maxLength={30}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact number or email"
              aria-label="Contact number or email"
              className="rounded-lg border border-slate-300 p-3"
            />

            <input
              required
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Inquiry subject"
              aria-label="Inquiry subject"
              className="rounded-lg border border-slate-300 p-3 sm:col-span-2"
            />

            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              aria-label="Short description"
              rows={3}
              className="rounded-lg border border-slate-300 p-3 sm:col-span-2"
            />

            <button
              disabled={saving}
              type="submit"
              className="rounded-lg bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50 sm:col-span-2"
            >
              {saving ? "Saving..." : "Create Inquiry"}
            </button>
          </form>
        </section>

        <section
          id="inquiries"
          className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-xl font-bold">Customer Inquiries</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadInquiries(search, filterStatus);
            }}
            className="mb-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, subject or description..."
              aria-label="Search inquiries"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border border-slate-300 p-3"
            >
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
            >
              Search
            </button>
          </form>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading inquiries...
            </p>
          ) : inquiries.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No inquiries found. Try another search or create an inquiry.
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <article
                  key={inquiry.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <h3 className="text-lg font-bold">{inquiry.subject}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {inquiry.customer_name} · {inquiry.contact}
                      </p>
                    </div>

                    <select
                      aria-label={`Status for ${inquiry.subject}`}
                      value={inquiry.status}
                      onChange={(e) =>
                        handleStatusChange(inquiry.id, e.target.value as Status)
                      }
                      className="h-fit rounded-lg border border-slate-300 p-2"
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-slate-700">
                    {inquiry.description}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Inquiry #{inquiry.id} ·{" "}
                    {new Date(inquiry.created_at).toLocaleString()}
                  </p>
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