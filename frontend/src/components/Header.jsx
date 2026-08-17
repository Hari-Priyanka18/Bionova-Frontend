import React, { useState, useEffect, useCallback } from "react";
import { Menu, Search, Bell, User, ExternalLink, X, FolderOpen, CheckSquare, Flag, Trash2, CheckCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const STATUS_COLORS = {
  'Closed':      { bar: '#10b981', bg: '#d1fae5' },
  'Completed':   { bar: '#10b981', bg: '#d1fae5' },
  'In Progress': { bar: '#3b82f6', bg: '#dbeafe' },
  'Not Started': { bar: '#f59e0b', bg: '#fef3c7' },
  'Overdue':     { bar: '#ef4444', bg: '#fee2e2' },
};

const getNotifPriorityInfo = (notif) => {
  if (!notif) return { label: 'NORMAL', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  const priority = (notif.priority || '').toUpperCase();
  const text = `${notif.title || ''} ${notif.message || ''}`.toUpperCase();

  if (priority === 'CRITICAL' || text.includes('CRITICAL') || text.includes('OVERDUE') || text.includes('DEADLINE') || text.includes('IMMEDIATELY')) {
    return { label: 'CRITICAL', bg: '#ffe4e6', color: '#e11d48', border: '#fecdd3' };
  }
  if (priority === 'HIGH' || text.includes('HIGH') || text.includes('URGENT') || text.includes('DELAY')) {
    return { label: 'HIGH', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
  }
  if (priority === 'MEDIUM' || text.includes('MEDIUM') || text.includes('MILESTONE') || text.includes('UPDATE')) {
    return { label: 'MEDIUM', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (priority === 'LOW' || text.includes('LOW')) {
    return { label: 'LOW', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  }
  return { label: 'NORMAL', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
};

const Header = ({ title, subtitle, showSearch = false, statusBadge, progressPercent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("Role");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("U");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [companyLogo, setCompanyLogo] = useState(sessionStorage.getItem("companyLogo") || null);
  const [toastNotif, setToastNotif] = useState(location.state?.showToastNotif || null);
  const [toastExiting, setToastExiting] = useState(false);
  const [userAccountStatus, setUserAccountStatus] = useState(sessionStorage.getItem("userAccountStatus") || "Active");

  useEffect(() => {
    // Fetch details dynamically from sessionStorage
    let storedName = sessionStorage.getItem("userName");
    const email = sessionStorage.getItem("userEmail") || "";
    let storedRole = sessionStorage.getItem("userDesignation") || sessionStorage.getItem("userRole") || "Super Admin";
    let storedPhoto = sessionStorage.getItem("userPhoto");
    let storedStatus = sessionStorage.getItem("userAccountStatus");
    
    setUserEmail(email);

    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);
    if (storedPhoto) setPhotoUrl(storedPhoto);
    if (storedStatus) setUserAccountStatus(storedStatus);

    const updateInitials = (nameStr) => {
      if (!nameStr) return;
      const nameParts = nameStr.trim().split(" ");
      let init = "U";
      if (nameParts.length >= 2) {
        init = nameParts[0][0] + nameParts[nameParts.length - 1][0];
      } else if (nameParts.length === 1 && nameParts[0]) {
        init = nameParts[0][0];
      }
      setInitials(init.toUpperCase());
    };

    if (storedName) updateInitials(storedName);

    // Fetch notifications from backend
    fetchNotifications();

    // Fetch latest profile info from API to get designation and photo if not fully cached
    const fetchProfile = async () => {
      if (!email) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
          }
        });
        if (res.ok) {
          const me = await res.json();
          if (me) {
            const fullName = `${me.fstNm || me.firstName || ""} ${me.lstNm || me.lastName || ""}`.trim();
            const designation = me.designation || me.role || "User";
            const photo = me.photoUrl || null;

            const isInactive = me.sts === false || me.sts === "INACTIVE" || me.sts === 0 || me.sts === "false" || me.status === "Inactive" || me.status === false;
            const statusStr = isInactive ? "Inactive" : "Active";

            setUserName(fullName);
            setUserRole(designation);
            setUserAccountStatus(statusStr);
            setPhotoUrl(photo);
            updateInitials(fullName);

            sessionStorage.setItem("userName", fullName);
            localStorage.setItem("userName", fullName);
            sessionStorage.setItem("userDesignation", designation);
            sessionStorage.setItem("userAccountStatus", statusStr);
            if (photo) sessionStorage.setItem("userPhoto", photo);

            // Fetch logo using pltId or coyId
            (async () => {
              let logoUrl = null;
              if (me.pltId) {
                try {
                  const pltRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/plants/${me.pltId}`, {
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
                    }
                  });
                  if (pltRes.ok) {
                    const pltData = await pltRes.json();
                    if (pltData.logo) {
                      logoUrl = pltData.logo;
                    }
                  }
                } catch (err) {
                  console.error("Failed to fetch plant logo", err);
                }
              }

              if (!logoUrl && me.coyId) {
                try {
                  const coyRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/companies/${me.coyId}`, {
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
                    }
                  });
                  if (coyRes.ok) {
                    const coyData = await coyRes.json();
                    if (coyData.logo) {
                      logoUrl = coyData.logo;
                    }
                  }
                } catch (err) {
                  console.error("Failed to fetch company logo", err);
                }
              }

              if (logoUrl) {
                setCompanyLogo(logoUrl);
                sessionStorage.setItem("companyLogo", logoUrl);
              }
            })();
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile for header", err);
      }
    };
    
    // Only fetch if we are missing designation or name to save network calls
    fetchProfile();

    // Show Welcome Animation if user just logged in
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      sessionStorage.setItem("hasSeenWelcome", "true");

      // Hide the message after 4.5 seconds
      setTimeout(() => {
        setShowWelcome(false);
      }, 4500);
    }
  }, []);

  useEffect(() => {
    if (location.state?.showToastNotif) {
      setToastNotif(location.state.showToastNotif);
      setToastExiting(false);
      // Clean up the state so refreshing the page doesn't show it again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (toastNotif && !toastExiting) {
      const timer = setTimeout(() => {
        setToastExiting(true);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastNotif, toastExiting]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionStorage.getItem("authToken") || ""}`
  });

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out notifications that were cleared locally
        const hiddenIds = JSON.parse(localStorage.getItem("hiddenNotifIds") || "[]");
        setNotifications(data.filter(n => !hiddenIds.includes(n.id)));
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const clearAllNotifications = async () => {
    const readNotifs = notifications.filter(n => n.isRead);
    if (readNotifs.length === 0) return;

    try {
      // 1. Store the cleared IDs in localStorage so they remain hidden on re-login
      const hiddenIds = JSON.parse(localStorage.getItem("hiddenNotifIds") || "[]");
      const newHiddenIds = [...new Set([...hiddenIds, ...readNotifs.map(n => n.id)])];
      localStorage.setItem("hiddenNotifIds", JSON.stringify(newHiddenIds));

      // 2. Attempt to delete each read notification from the backend
      await Promise.all(
        readNotifs.map(notif => 
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/${notif.id}`, {
            method: "DELETE",
            headers: authHeaders()
          }).catch(() => {})
        )
      );
      // Remove read notifications from the UI state
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err) {
      console.error("Failed to clear read notifications", err);
    }
  };

  const markOneAsRead = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const formatNotifTime = (createdAt) => {
    if (!createdAt) return '';
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 0 && hr < 12) return "Good Morning";
    if (hr >= 12 && hr < 16) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInFadeOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
          }
          .welcome-toast {
            position: absolute;
            top: 75px;
            right: 28px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 10px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            animation: slideInFadeOut 4.5s ease-in-out forwards;
            pointer-events: none;
            z-index: 50;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          }
          .profile-hover-card {
            animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .notif-dropdown {
            animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .notif-item {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
            transition: background 0.2s;
            cursor: pointer;
          }
          .notif-item:hover {
            background: #f8fafc;
          }
          .notif-item:last-child {
            border-bottom: none;
          }
          .notif-item-clickable:hover {
            transform: translateX(3px);
          }
          .notif-unread {
            background: #f0f9ff;
          }
          .notif-unread:hover {
            background: #e0f2fe;
          }
          @keyframes toastSlideIn {
            0% { opacity: 0; transform: translateX(100%); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes toastSlideOut {
            0% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(100%); }
          }
          @keyframes toastProgress {
            0% { width: 100%; }
            100% { width: 0%; }
          }
          .notif-toast {
            animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .notif-toast-exit {
            animation: toastSlideOut 0.3s ease-in forwards;
          }
          .notif-toast:hover .toast-progress-bar {
            animation-play-state: paused;
          }
        `}
      </style>

      <header className="main-header" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 28px",
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        position: "fixed",
        top: 0,
        zIndex: 1000,
        boxSizing: "border-box"
      }}>
        {/* Left Side: Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="mobile-menu-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "4px"
            }}
          >
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: "20px", color: "#1e293b", fontWeight: "700", lineHeight: "1.2" }}>
                {title}
              </h1>
              {statusBadge && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: STATUS_COLORS[statusBadge]?.bg || '#f1f5f9',
                  color: STATUS_COLORS[statusBadge]?.bar || '#64748b',
                  border: `1px solid ${STATUS_COLORS[statusBadge]?.bar || '#94a3b8'}22`,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.3px'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: STATUS_COLORS[statusBadge]?.bar || '#94a3b8',
                    flexShrink: 0
                  }}></span>
                  {statusBadge}
                </span>
              )}
              {progressPercent !== undefined && progressPercent !== null && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: progressPercent >= 100 ? '#d1fae5' : progressPercent > 0 ? '#dbeafe' : '#f1f5f9',
                  color: progressPercent >= 100 ? '#059669' : progressPercent > 0 ? '#2563eb' : '#64748b',
                  border: `1px solid ${progressPercent >= 100 ? '#10b98133' : progressPercent > 0 ? '#3b82f633' : '#94a3b822'}`,
                  whiteSpace: 'nowrap'
                }}>
                  <svg width="14" height="14" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none"
                      stroke={progressPercent >= 100 ? '#10b981' : progressPercent > 0 ? '#3b82f6' : '#94a3b8'}
                      strokeWidth="3"
                      strokeDasharray={`${(progressPercent / 100) * 97.4} 97.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  {progressPercent}%
                </span>
              )}
            </div>
            {subtitle && (
              <span style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Search, Bell & Profile Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

          {showSearch && (
            <div className="header-desktop-items" style={{ display: "flex", alignItems: "center", background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px", gap: "8px" }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search anything..."
                style={{ background: "none", border: "none", outline: "none", fontSize: "14px", width: "200px" }}
              />
            </div>
          )}

          {/* Company Logo */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={companyLogo || "/logoat.png"}
              alt="Company Logo"
              style={{
                width: "44px",
                height: "44px",
                objectFit: "contain",
                borderRadius: "4px"
              }}
              onError={(e) => { e.target.src = "/logoat.png"; }}
            />
          </div>

          {/* Notifications Bell */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Bell size={20} color="#64748b" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{
                  position: "absolute",
                  top: "1px",
                  right: "1px",
                  background: "#ef4444",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: "700",
                  borderRadius: "10px",
                  padding: "1px 5px",
                  minWidth: "16px",
                  height: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)",
                  lineHeight: 1
                }}>
                  {notifications.filter(n => !n.isRead).length > 9 ? '9+' : notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown (Queue) */}
            {showNotifications && (
              <div 
                className="notif-dropdown"
                style={{
                  position: "absolute",
                  top: "44px",
                  right: "-20px",
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  width: "360px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: notifications.filter(n => !n.isRead).length > 0 ? "8px" : "0px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Notifications</h4>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <span style={{ fontSize: "11px", background: "#e0e7ff", color: "#4338ca", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                          {notifications.filter(n => !n.isRead).length} Unread
                        </span>
                      )}
                    </div>
                    {notifications.filter(n => n.isRead).length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearAllNotifications(); }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          color: "#dc2626",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer"
                        }}
                        title="Clear read notifications"
                      >
                        <Trash2 size={13} /> Clear Seen
                      </button>
                    )}
                  </div>
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <span 
                        style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }} 
                        onClick={markAllAsRead}
                      >
                        <CheckCheck size={14} /> Mark all as read
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Scrollable Queue Area */}
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`notif-item notif-item-clickable ${!notif.isRead ? 'notif-unread' : ''}`}
                        onClick={() => {
                          // Show toast on the left side
                          setToastExiting(false);
                          setToastNotif(notif);
                          setShowNotifications(false);
                          // Mark as read
                          if (!notif.isRead) markOneAsRead(notif.id);

                          // Immediately navigate based on entity type
                          const typ = (notif.entityTyp || '').toUpperCase();
                          const id = notif.entityId;
                          
                          // We pass the notification object in state so the next page's Header can show the toast
                          const navState = { showToastNotif: notif };

                          if (typ === 'PROJECT' && id) {
                            navigate(`/project-details/${id}`, { state: { ...navState, viewMode: 'full', projectType: 'live' } });
                          } else if (typ === 'TASK') {
                            navigate('/my-tasks', { state: navState });
                          } else if (typ === 'MILESTONE') {
                            navigate('/milestone-creation', { state: navState });
                          } else {
                            navigate('/pm-dashboard', { state: navState });
                          }
                        }}
                        style={{ transition: 'transform 0.15s ease, background 0.2s' }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "flex-start" }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, paddingRight: '8px' }}>
                            {notif.entityTyp === 'PROJECT' && <FolderOpen size={13} color="#3b82f6" />}
                            {notif.entityTyp === 'TASK' && <CheckSquare size={13} color="#10b981" />}
                            {notif.entityTyp === 'MILESTONE' && <Flag size={13} color="#f59e0b" />}
                            <span style={{ fontSize: "13px", fontWeight: !notif.isRead ? "700" : "600", color: "#0f172a" }}>{notif.title}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: "9px",
                              fontWeight: "800",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              letterSpacing: "0.5px",
                              background: getNotifPriorityInfo(notif).bg,
                              color: getNotifPriorityInfo(notif).color,
                              border: `1px solid ${getNotifPriorityInfo(notif).border}`
                            }}>
                              {getNotifPriorityInfo(notif).label}
                            </span>
                            <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap" }}>{formatNotifTime(notif.createdAt)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.4", marginBottom: "6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {notif.message}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Click to view details text removed per request */}
                          {!notif.isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markOneAsRead(notif.id); }}
                              style={{
                                fontSize: "11px", color: "#3b82f6", background: "none", border: "1px solid #bfdbfe",
                                borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontWeight: "600"
                              }}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      No new notifications
                    </div>
                  )}
                </div>
                
                <div style={{ padding: "12px", borderTop: "1px solid #e2e8f0", textAlign: "center", cursor: "pointer", fontSize: "12px", color: "#64748b", fontWeight: "600" }} onClick={() => setShowNotifications(false)}>
                  Close
                </div>
              </div>
            )}
          </div>

          {/* User Profile Area (Avatar with Hover Card) */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setIsProfileHovered(true)}
            onMouseLeave={() => setIsProfileHovered(false)}
          >
            {/* Avatar Circle */}
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#2563eb",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "14px",
              letterSpacing: "1px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
              transition: "transform 0.2s ease",
              overflow: "hidden"
            }}
            >
              {photoUrl ? <img src={photoUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
            </div>

            {/* Profile Popover Hover Card */}
            {isProfileHovered && (
              <div
                className="profile-hover-card"
                style={{
                  position: "absolute",
                  top: "44px",
                  right: 0,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  padding: "20px",
                  minWidth: "250px",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{userName}</h4>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{userRole}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <small style={{ fontSize: "10px", textTransform: "uppercase", color: "#94a3b8", fontWeight: "600", letterSpacing: "0.5px" }}>Email</small>
                    <span style={{ fontSize: "13px", color: "#334155", wordBreak: "break-all" }}>{userEmail || "admin@atirath.com"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span style={{
                      width: "8px",
                      height: "8px",
                      background: userAccountStatus === "Inactive" ? "#ef4444" : "#10b981",
                      borderRadius: "50%"
                    }}></span>
                    <span style={{
                      fontSize: "12px",
                      color: userAccountStatus === "Inactive" ? "#ef4444" : "#10b981",
                      fontWeight: "600"
                    }}>
                      {userAccountStatus === "Inactive" ? "Inactive Status" : "Active Status"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Animated Welcome Message (Shows only once after login) */}
        {showWelcome && (
          <div className="welcome-toast">
            <span>🎉 {getGreeting()}, <strong style={{ fontWeight: '700' }}>{userName}</strong>!</span>
          </div>
        )}
      </header>
      {/* Spacer so content doesn't hide under the fixed header */}
      <div style={{ height: "73px", flexShrink: 0 }} />

      {/* ── Toast Notification (Bottom-Left) ── */}
      {toastNotif && (
        <div
          className={`notif-toast ${toastExiting ? 'notif-toast-exit' : ''}`}
          style={{
            position: 'fixed',
            top: '80px',
            right: '28px',
            width: '370px',
            background: 'white',
            borderRadius: '14px',
            boxShadow: '0 20px 60px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
            zIndex: 9999,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onAnimationEnd={() => {
            if (toastExiting) setToastNotif(null);
          }}
        >
          {/* Top colored accent bar based on entity type */}
          <div style={{
            height: '4px',
            background: toastNotif.entityTyp === 'PROJECT' ? 'linear-gradient(90deg, #3b82f6, #6366f1)' :
                         toastNotif.entityTyp === 'TASK' ? 'linear-gradient(90deg, #10b981, #34d399)' :
                         toastNotif.entityTyp === 'MILESTONE' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                         'linear-gradient(90deg, #64748b, #94a3b8)'
          }} />

          {/* Toast Content */}
          <div 
            style={{ padding: '14px 16px' }}
            onClick={() => {
              // Navigate based on entity type
              const typ = (toastNotif.entityTyp || '').toUpperCase();
              const id = toastNotif.entityId;
              if (typ === 'PROJECT' && id) {
                navigate(`/project-details/${id}`);
              } else if (typ === 'TASK') {
                navigate('/my-tasks');
              } else if (typ === 'MILESTONE') {
                navigate('/milestone-creation');
              } else {
                navigate('/pm-dashboard');
              }
              setToastExiting(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: toastNotif.entityTyp === 'PROJECT' ? '#dbeafe' :
                               toastNotif.entityTyp === 'TASK' ? '#d1fae5' :
                               toastNotif.entityTyp === 'MILESTONE' ? '#fef3c7' : '#f1f5f9'
                }}>
                  {toastNotif.entityTyp === 'PROJECT' && <FolderOpen size={16} color="#3b82f6" />}
                  {toastNotif.entityTyp === 'TASK' && <CheckSquare size={16} color="#10b981" />}
                  {toastNotif.entityTyp === 'MILESTONE' && <Flag size={16} color="#f59e0b" />}
                  {!toastNotif.entityTyp && <Bell size={16} color="#64748b" />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
                      {toastNotif.title}
                    </div>
                    <span style={{
                      fontSize: "9px",
                      fontWeight: "800",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      letterSpacing: "0.5px",
                      background: getNotifPriorityInfo(toastNotif).bg,
                      color: getNotifPriorityInfo(toastNotif).color,
                      border: `1px solid ${getNotifPriorityInfo(toastNotif).border}`
                    }}>
                      {getNotifPriorityInfo(toastNotif).label}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginTop: '1px' }}>
                    {toastNotif.entityTyp === 'PROJECT' ? 'Project Update' :
                     toastNotif.entityTyp === 'TASK' ? 'Task Update' :
                     toastNotif.entityTyp === 'MILESTONE' ? 'Milestone Update' : 'Notification'}
                    {' · '}{formatNotifTime(toastNotif.createdAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setToastExiting(true); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                  color: '#94a3b8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color 0.15s, background 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', marginBottom: '10px', padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid ' + (
              toastNotif.entityTyp === 'PROJECT' ? '#3b82f6' :
              toastNotif.entityTyp === 'TASK' ? '#10b981' :
              toastNotif.entityTyp === 'MILESTONE' ? '#f59e0b' : '#94a3b8'
            ) }}>
              {toastNotif.message}
            </div>

            {/* Click to view details text removed per request */}
          </div>

          {/* Auto-dismiss progress bar */}
          <div style={{ height: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
            <div
              className="toast-progress-bar"
              style={{
                height: '100%',
                background: toastNotif.entityTyp === 'PROJECT' ? '#3b82f6' :
                             toastNotif.entityTyp === 'TASK' ? '#10b981' :
                             toastNotif.entityTyp === 'MILESTONE' ? '#f59e0b' : '#94a3b8',
                animation: 'toastProgress 6s linear forwards',
              }}
              onAnimationEnd={() => setToastExiting(true)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
