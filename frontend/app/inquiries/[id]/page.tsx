"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

const API_URL = "http://localhost:5000/api";

type Status = "New" | "In Progress" | "Resolved";

type InquiryDetail = {
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

type StaffMember = {
  id: number;
  username: string;
  full_name: string;
  active_count?: number;
};

export default function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const inquiryId = resolvedParams.id;

  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState(false);

  async function fetchInquiryDetail() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries/${inquiryId}`, {
        credentials: "include",
      });

      if (response.status === 401) {
        setAuthError(true);
        throw new Error("You must be logged in to view this inquiry.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load inquiry.");
      }

      setInquiry(data.inquiry);
      setAuthError(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to server.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStaffList() {
    try {
      const response = await fetch(`${API_URL}/staff`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStaffList(data.staff || []);
      }
    } catch {
      // Non-critical, staff assignment list fallback
    }
  }

  useEffect(() => {
    fetchInquiryDetail();
    fetchStaffList();
  }, [inquiryId]);

  async function handleStatusTransition(newStatus: Status) {
    if (!inquiry) return;

    if (inquiry.status === "Resolved" && newStatus === "In Progress") {
      const confirmed = window.confirm("Are you sure you want to reopen this resolved inquiry?");
      if (!confirmed) return;
    }

    setUpdating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries/${inquiry.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          expected_updated_at: inquiry.updated_at,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        throw new Error(
          data.message || "Conflict: This inquiry was modified in another session. Please refresh."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to update status.");
      }

      setMessage(`Status successfully updated to '${newStatus}'.`);
      await fetchInquiryDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssigneeChange(staffId: number | null) {
    if (!inquiry) return;
    setUpdating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/inquiries/${inquiry.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assigned_to_id: staffId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reassign inquiry.");
      }

      setMessage("Inquiry assignment updated successfully.");
      await fetchInquiryDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign inquiry.");
    } finally {
      setUpdating(false);
    }
  }

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "In Progress":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cyan-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading inquiry details...</p>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 text-sm mb-6">
            Direct access to inquiries requires an active staff session. Backend security prevented unauthorized viewing.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 px-4 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-lg transition"
          >
            Go to Staff Sign-In
          </Link>
        </div>
      </main>
    );
  }

  if (!inquiry) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Inquiry Not Found</h1>
          <p className="text-slate-600 text-sm mb-6">
            Inquiry #{inquiryId} does not exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-widest text-cyan-700 uppercase bg-cyan-50 px-2.5 py-1 rounded">
              Coffee Ninja
            </span>
            <span className="text-slate-400">/</span>
            <span className="font-semibold text-sm text-slate-700">
              Inquiry #{inquiry.id}
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-cyan-700 transition flex items-center gap-1.5"
          >
            ← Back to All Inquiries
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        {message && (
          <div role="status" className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm font-medium flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage("")} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-900">✕</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card Top Banner */}
          <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/60">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                    inquiry.status
                  )}`}
                >
                  {inquiry.status}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Direct Link ID: #{inquiry.id}
                </span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
                {inquiry.subject}
              </h1>
            </div>

            <button
              onClick={fetchInquiryDetail}
              disabled={loading || updating}
              className="text-xs bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium px-3.5 py-2 rounded-lg transition"
              title="Reload from server"
            >
              ↻ Refresh Data
            </button>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 grid gap-8 md:grid-cols-3">
            {/* Left 2 Cols: Details & Description */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Customer Description
                </h3>
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {inquiry.description}
                </div>
              </div>

              {/* Status Lifecycle Actions */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Lifecycle State Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  {inquiry.status === "New" && (
                    <>
                      <button
                        onClick={() => handleStatusTransition("In Progress")}
                        disabled={updating}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      >
                        Start Processing (→ In Progress)
                      </button>
                      <button
                        onClick={() => handleStatusTransition("Resolved")}
                        disabled={updating}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      >
                        Mark as Resolved
                      </button>
                    </>
                  )}

                  {inquiry.status === "In Progress" && (
                    <>
                      <button
                        onClick={() => handleStatusTransition("Resolved")}
                        disabled={updating}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      >
                        Mark as Resolved (✓)
                      </button>
                      <button
                        onClick={() => handleStatusTransition("New")}
                        disabled={updating}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      >
                        Revert to New
                      </button>
                    </>
                  )}

                  {inquiry.status === "Resolved" && (
                    <button
                      onClick={() => handleStatusTransition("In Progress")}
                      disabled={updating}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                      Reopen Inquiry (→ In Progress)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Metadata, Contact & Assigned Staff */}
            <div className="space-y-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200 h-fit">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer
                </h4>
                <p className="font-semibold text-slate-900">{inquiry.customer_name}</p>
                <p className="text-sm text-cyan-700 font-mono mt-0.5 break-all">
                  {inquiry.contact}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label
                  htmlFor="assignee-select"
                  className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                >
                  Handling Staff Member
                </label>
                <select
                  id="assignee-select"
                  value={inquiry.assigned_to_id || ""}
                  onChange={(e) =>
                    handleAssigneeChange(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={updating}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-medium text-slate-800 outline-none focus:border-cyan-700"
                >
                  <option value="">Unassigned</option>
                  {staffList.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} (@{member.username}) — {member.active_count ?? 0} active {member.active_count === 1 ? "task" : "tasks"}
                    </option>
                  ))}
                </select>
                {inquiry.assigned_full_name && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Currently handled by: {inquiry.assigned_full_name}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-500">
                <div>
                  <span className="font-medium text-slate-600">Created: </span>
                  {new Date(inquiry.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium text-slate-600">Last Modified: </span>
                  {new Date(inquiry.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
