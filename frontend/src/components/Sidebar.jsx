import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { House, Building, Flag, Users, Calendar, Settings, Factory, MapPinned, FolderPlus, ChevronDown, ChevronRight, ChevronLeft, LogOut, ClipboardCheck, User, X, PanelLeftOpen, PanelLeftClose, FileText, Briefcase, Lock } from "lucide-react";
import "../styles/sidebar.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token || ""}`
  };
};

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [singleItems, setSingleItems] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [hasNoAccess, setHasNoAccess] = useState(false);
  const [isRouteForbidden, setIsRouteForbidden] = useState(false);

  useEffect(() => {
    const loadSidebarMenu = async () => {
      const empId = sessionStorage.getItem("empId");
      if (!empId) return;

      try {
        const userRole = (sessionStorage.getItem("userRole") || localStorage.getItem("userRole") || "").toLowerCase();
        const isAdmin = userRole === "admin" || userRole === "super_admin";

        const hasRbacRes = await fetch(`${apiBaseUrl}/api/rbac/employees/${empId}/has-rbac`, {
          headers: getAuthHeaders()
        });
        let hasRbac = false;
        if (hasRbacRes.ok) {
          const rbacData = await hasRbacRes.json();
          hasRbac = rbacData.hasRbac;
        }

        const permsRes = await fetch(`${apiBaseUrl}/api/rbac/employees/${empId}/permissions`, {
          headers: getAuthHeaders()
        });
        if (permsRes.ok) {
          const permissions = await permsRes.json();
          sessionStorage.setItem("userPermissions", JSON.stringify(permissions));

          // If user is Admin, show all screens.
          // If user is non-Admin and hasRbac is true, filter by viewFlg.
          // If user is non-Admin and hasRbac is false (unassigned), give ZERO access!
          let allowedScreens = [];
          if (isAdmin) {
            allowedScreens = permissions;
          } else if (hasRbac) {
            allowedScreens = permissions.filter(p => p.viewFlg);
          } else {
            allowedScreens = [];
          }

          // If non-Admin user has no allowed screens -> ZERO ACCESS!
          if (!isAdmin && allowedScreens.length === 0) {
            setHasNoAccess(true);
            setIsRouteForbidden(false);
            setMenuItems([]);
            setSingleItems([]);
            return;
          }

          setHasNoAccess(false);

          // SCREEN_MAPPING with optional displayName override
          const SCREEN_MAPPING = {
            'ADMIN_DASHBOARD': { path: '/dashboard', icon: House },
            'COMPANY_CREATION': { path: '/company-creation', icon: Building },
            'PLANT_CREATION': { path: '/plant-creation', icon: Factory },
            'LAND_CREATION': { path: '/agriland-allocation', icon: MapPinned },
            'DEPARTMENT_CREATION': { path: '/department-creation', icon: Settings },
            'DEPARTMENT_MAPPING': { path: '/department-mapping', icon: Settings },
            'DESIGNATION_CREATION': { path: '/designation-creation', icon: Briefcase },
            'EMPLOYEE_CREATION': { path: '/employee-creation', icon: User },

            'PROJECT_CREATION': { path: '/project-creation', icon: FolderPlus },
            'MILESTONE_CREATION': { path: '/milestone-creation', icon: FolderPlus },
            'PROJECT_DASHBOARD': { path: '/pm-dashboard', icon: FolderPlus },

            'TASK_BOARD': { path: '/task-board', icon: FolderPlus },
            'GANTT_CHART': { path: '/all-project-gantt-chart', icon: FolderPlus },
            'ALL_PROJECT_GANTT_CHART': { path: '/all-project-gantt-chart', icon: FolderPlus },
            'ALL_PROJECT_GANTT': { path: '/all-project-gantt-chart', icon: FolderPlus },

            'USER_DASHBOARD': { path: '/user-dashboard', icon: House },
            'MY_TASK': { path: '/my-tasks', icon: ClipboardCheck },
            'MY_PROJECTS': { path: '/projects', icon: FolderPlus },
            'CALENDAR': { path: '/calendar', icon: Calendar },
            'USER_TASK_BOARD': { path: '/user-task-board', icon: ClipboardCheck, displayName: "Task Board" },

            'PUBLIC_HOLIDAYS': { path: '/public-holidays', icon: Calendar },
            'PROFILE': { path: '/profile', icon: User },
            // 🔁 Override display name for INDIVIDUAL_TASK
            'INDIVIDUAL_TASK': { path: '/assignment', icon: FileText, displayName: "Assignment" },

            'ASSIGN_ACCESS': { path: '/assign-access', icon: ClipboardCheck },
            'PROJECT_ACCESS': { path: '/project-access', icon: FolderPlus }
          };

          // Check if current route is allowed
          if (!isAdmin) {
            const allowedPaths = new Set();
            allowedScreens.forEach(s => {
              const mapped = SCREEN_MAPPING[s.screenCode];
              if (mapped) allowedPaths.add(mapped.path);
            });
            allowedPaths.add('/profile');

            const currentPath = location.pathname;
            if (!allowedPaths.has(currentPath) && currentPath !== '/') {
              setIsRouteForbidden(true);
            } else {
              setIsRouteForbidden(false);
            }
          } else {
            setIsRouteForbidden(false);
          }

          // Group screens
          const groups = {};
          const standalone = [];

          allowedScreens.forEach(screen => {
            const mapped = SCREEN_MAPPING[screen.screenCode];
            if (!mapped) return; // skip if screen code has no route mapping

            // Use displayName if provided, otherwise fallback to backend screenNm
            const displayName = mapped.displayName || screen.screenNm;

            const item = {
              name: displayName,
              path: mapped.path,
              icon: mapped.icon,
              code: screen.screenCode
            };

            const dropdownGroups = ['Company Master', 'Project', 'User'];
            if (dropdownGroups.includes(screen.groupNm)) {
              if (!groups[screen.groupNm]) {
                groups[screen.groupNm] = [];
              }
              groups[screen.groupNm].push(item);
            } else {
              standalone.push(item);
            }
          });

          // Build menuConfig
          const config = [];
          const groupIcons = {
            'Company Master': Building,
            'Project': FolderPlus,
            'User': Users
          };
          const groupKeys = {
            'Company Master': 'company',
            'Project': 'project',
            'User': 'userMaster'
          };

          const PROJECT_ORDER = [
            'PROJECT_DASHBOARD',
            'PROJECT_CREATION',
            'MILESTONE_CREATION',
            'TASK_BOARD',
            'GANTT_CHART',
            'ALL_PROJECT_GANTT_CHART',
            'ALL_PROJECT_GANTT'
          ];
          if (groups['Project']) {
            groups['Project'].sort((a, b) => {
              const indexA = PROJECT_ORDER.indexOf(a.code);
              const indexB = PROJECT_ORDER.indexOf(b.code);
              if (indexA === -1 && indexB === -1) return 0;
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            });
          }

          Object.keys(groups).forEach(groupNm => {
            config.push({
              key: groupKeys[groupNm],
              name: groupNm,
              icon: groupIcons[groupNm] || FolderPlus,
              isActive: groups[groupNm].some(sub => location.pathname === sub.path),
              subItems: groups[groupNm]
            });
          });

          setMenuItems(config);
          setSingleItems(standalone);
        }
      } catch (err) {
        console.error("Error loading sidebar menu:", err);
      }
    };

    loadSidebarMenu();
  }, [location.pathname]);

  useEffect(() => {
    if (menuItems.length > 0) {
      setOpenDropdowns(prev => {
        const next = { ...prev };
        menuItems.forEach(item => {
          const hasActiveSub = item.subItems.some(sub => location.pathname === sub.path);
          if (hasActiveSub) {
            next[item.key] = true;
          }
        });
        return next;
      });
    }
  }, [location.pathname, menuItems]);

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", "true");
    } else {
      document.body.classList.remove("sidebar-collapsed");
      localStorage.setItem("sidebarCollapsed", "false");
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  const closeMobileSidebar = () => setIsMobileOpen(false);

  const handleNavigate = (path) => {
    navigate(path);
    closeMobileSidebar();
  };

  const toggleDropdown = (key) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenDropdowns(prev => ({ ...prev, [key]: true }));
    } else {
      setOpenDropdowns(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const handleCollapseToggle = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(false);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={closeMobileSidebar}></div>}

      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Logo Section */}
        <div className="logo-section" style={{
          display: "flex",
          flexDirection: isCollapsed ? "column" : "row",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          gap: isCollapsed ? "20px" : "10px",
          width: "100%",
          padding: isCollapsed ? "8px 0" : "0 4px",
          marginBottom: isCollapsed ? "20px" : "35px"
        }}>

          {isCollapsed ? (
            <button
              className="chatgpt-style-btn"
              onClick={handleCollapseToggle}
              data-tooltip="Open sidebar"
            >
              <div className="chatgpt-btn-logo">
                <img src="/sidebar_icon.svg" alt="Logo Icon" />
              </div>
              <div className="chatgpt-btn-icon">
                <PanelLeftOpen size={20} strokeWidth={1.5} color="#ffffff" />
              </div>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px', padding: '0 4px' }}>
              <div className="logo-details"
                style={{
                  display: "flex",
                  flex: 1,
                  minWidth: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  background: "#ffffff",
                  borderRadius: "14px",
                  padding: "2px",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.15)",
                  overflow: "hidden"
                }}>
                <img
                  src="/sidebar_logo.svg"
                  alt="Logo Banner"
                  style={{
                    width: "100%",
                    maxHeight: "54px",
                    objectFit: "contain",
                    padding: "2px 8px"
                  }}
                />
              </div>
              <button
                onClick={handleCollapseToggle}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                title="Close sidebar"
              >
                <PanelLeftClose size={20} strokeWidth={1.5} />
              </button>
            </div>
          )}

          <button
            className="sidebar-mobile-close-btn"
            onClick={closeMobileSidebar}
            title="Close Menu"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="menu-list">
          {hasNoAccess ? (
            <li style={{
              padding: "20px 12px",
              textAlign: "center",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderRadius: "12px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              margin: "12px 6px"
            }}>
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px auto",
                fontWeight: "700"
              }}>
                <Lock size={22} />
              </div>
              {!isCollapsed && (
                <>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
                    Access Denied
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", lineHeight: "1.4" }}>
                    No screen permissions assigned to your account
                  </div>
                </>
              )}
            </li>
          ) : (
            <>
              {menuItems.map((item) => (
                <li
                  key={item.key}
                  className={`dropdown-container ${(item.isActive || openDropdowns[item.key]) ? "active-dropdown" : ""}`}
                >
                  <div
                    className="dropdown-header"
                    onClick={() => toggleDropdown(item.key)}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <item.icon size={20} /> <span className="m-0">{item.name}</span>
                    </div>
                    {openDropdowns[item.key] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>

                  {!isCollapsed && openDropdowns[item.key] && (
                    <ul className="submenu-list">
                      {item.subItems.map((sub, sIdx) => (
                        <li
                          key={sIdx}
                          onClick={() => handleNavigate(sub.path)}
                          className={location.pathname === sub.path ? "submenu-active" : ""}
                        >
                          {sub.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}

              {singleItems.map((m, i) => (
                <li
                  key={i}
                  onClick={() => handleNavigate(m.path)}
                  className={location.pathname === m.path ? "active-single" : ""}
                >
                  <m.icon size={20} /> <span>{m.name}</span>
                </li>
              ))}
            </>
          )}
        </ul>

        <div className="logout-button" onClick={() => setShowLogoutConfirm(true)}>
          <LogOut size={20} /> <span>Logout</span>
        </div>

        <div className="sidebar-bottom-logo" style={{
          display: "flex",
          justifyContent: isCollapsed ? "center" : "flex-start",
          alignItems: "center",
          padding: isCollapsed ? "16px 0 0 0" : "16px 12px 0 12px",
          marginTop: "auto",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          gap: "12px",
          width: "100%"
        }}>
          <img src="/logoat.png" alt="Bottom Logo" style={{ width: "40px", height: "40px", objectFit: "contain", opacity: 0.95 }} />
          {!isCollapsed && (
            <div className="bottom-logo-text-container" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: "0.5px",
                lineHeight: "1.3"
              }}>
                atirath Holding
              </span>
              <span style={{
                fontSize: "11px",
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.6)",
                letterSpacing: "0.3px",
                lineHeight: "1.2"
              }}>
                India Limited
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Access Denied / Access Ledu Full Page Screen */}
      {(hasNoAccess || isRouteForbidden) && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: isCollapsed ? "80px" : "260px",
          backgroundColor: "#F8FAFC",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          textAlign: "center",
          transition: "left 0.3s ease",
          boxSizing: "border-box"
        }}>
          <div style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            backgroundColor: "#FEE2E2",
            color: "#EF4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            marginBottom: "24px",
            boxShadow: "0 10px 15px -3px rgba(239, 68, 68, 0.2)",
            border: "2px solid #FCA5A5"
          }}>
            <Lock size={44} />
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#0F172A", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Access Denied
          </h2>
          <p style={{ fontSize: "16px", color: "#64748B", maxWidth: "520px", lineHeight: "1.6", marginBottom: "32px" }}>
            {hasNoAccess 
              ? "You do not have access permission to any screens in the system. Please contact your Administrator or Project Manager to assign screen access permissions." 
              : "You do not have permission to view this specific screen. Please contact your Administrator or Project Manager to request access."}
          </p>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              backgroundColor: "#EF4444",
              color: "white",
              border: "none",
              padding: "12px 30px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "15px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
              transition: "all 0.2s ease"
            }}
          >
            <LogOut size={18} /> Logout Account
          </button>
        </div>
      )}

      {/* Logout Confirmation Alert Popup Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 9999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "28px 24px",
            maxWidth: "380px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <LogOut size={26} />
            </div>

            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: "0 0 8px 0" }}>
                Confirm Logout
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>
                Are you sure you want to log out? You will need to log in again to access your account.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                  closeMobileSidebar();
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ef4444"}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;