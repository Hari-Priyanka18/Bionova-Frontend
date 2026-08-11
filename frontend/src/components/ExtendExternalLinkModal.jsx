import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Calendar,
  User,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Plus
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const getAuthToken = () => sessionStorage.getItem("authToken") || localStorage.getItem("token") || "";

const ExtendExternalLinkModal = ({ isOpen, onClose, taskId, taskName, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [extendDays, setExtendDays] = useState(3);
  const [customDays, setCustomDays] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTokenStatus();
      setFeedback(null);
      setCopied(false);
      setExtendDays(3);
      setCustomDays("");
      setRemarks("");
    }
  }, [isOpen, taskId]);

  const fetchTokenStatus = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/task-live/${taskId}/external-token-status`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTokenInfo(data);
      }
    } catch (e) {
      console.error("Failed to load token status:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (tokenInfo?.magicLink) {
      navigator.clipboard.writeText(tokenInfo.magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    const daysToGrant = customDays ? parseInt(customDays, 10) : extendDays;
    if (!daysToGrant || daysToGrant <= 0) {
      setFeedback({ type: "danger", message: "Please select or enter a valid number of days (> 0)." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/task-live/${taskId}/extend-external-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          extendDays: daysToGrant,
          remarks: remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "danger", message: data.message || "Failed to extend access link." });
      } else {
        setFeedback({ type: "success", message: `Link successfully extended by ${daysToGrant} day(s)! An email notification has been dispatched.` });
        fetchTokenStatus();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setFeedback({ type: "danger", message: "Network error while extending link." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    try {
      setResending(true);
      setFeedback(null);
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/task-live/${taskId}/resend-external-link`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: "Link and task email resent to employee successfully!" });
        fetchTokenStatus();
      } else {
        setFeedback({ type: "danger", message: data.message || "Failed to resend link." });
      }
    } catch (e) {
      setFeedback({ type: "danger", message: "Network error while resending link." });
    } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              Manage External Task Access
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {taskName ? `Task: ${taskName}` : `Task #${taskId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <Loader2 className="animate-spin text-primary" size={32} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Checking link status...</p>
            </div>
          ) : (
            <>
              {/* Feedback Alert */}
              {feedback && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                    backgroundColor: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
                    color: feedback.type === "success" ? "#15803d" : "#b91c1c",
                    border: `1px solid ${feedback.type === "success" ? "#86efac" : "#fca5a5"}`,
                  }}
                >
                  {feedback.message}
                </div>
              )}

              {/* Status Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Current Link Status
                  </span>
                  {tokenInfo?.isTaskClosed ? (
                    <span
                      style={{
                        background: "#f1f5f9",
                        color: "#475569",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      TASK CLOSED
                    </span>
                  ) : tokenInfo?.isExpired ? (
                    <span
                      style={{
                        background: "#fee2e2",
                        color: "#b91c1c",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      EXPIRED (DUE DATE PASSED)
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "0.85rem", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>
                    <strong>Assigned To:</strong> {tokenInfo?.extEmpNm || "External Associate"}{" "}
                    {tokenInfo?.companyNm ? `(${tokenInfo.companyNm})` : ""}
                  </div>
                  <div>
                    <strong>Email:</strong> {tokenInfo?.extEmpEmail || "—"}
                  </div>
                  <div>
                    <strong>Expires On:</strong>{" "}
                    {tokenInfo?.expiryDt ? new Date(tokenInfo.expiryDt).toLocaleString() : "Not set"}
                  </div>
                </div>

                {/* Copy Link Row */}
                {tokenInfo?.magicLink && (
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      readOnly
                      value={tokenInfo.magicLink}
                      style={{
                        flex: 1,
                        fontSize: "0.75rem",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#64748b",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        background: copied ? "#059669" : "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              {/* Extend Expiry Form */}
              <form onSubmit={handleExtend}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                    Grant Additional Days (Extension)
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {[1, 2, 3, 5, 7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setExtendDays(d);
                          setCustomDays("");
                        }}
                        style={{
                          background: !customDays && extendDays === d ? "#2563eb" : "#f1f5f9",
                          color: !customDays && extendDays === d ? "#ffffff" : "#334155",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        +{d} Day{d > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Or Custom Days:</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="e.g. 10"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      style={{
                        width: "100px",
                        padding: "6px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                    Reason / Note for Employee (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Extension granted to complete pending review feedback..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                  ></textarea>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleResendLink}
                    disabled={resending}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    {resending ? "Resending..." : "Resend Link Email"}
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: "#059669",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Extending...
                      </>
                    ) : (
                      <>
                        <Clock size={14} /> Grant Extension & Notify
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtendExternalLinkModal;
