import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { House, Building, Flag, Users, Calendar, Settings, Factory, MapPinned, FolderPlus, ChevronDown, ChevronRight, ChevronLeft, LogOut, ClipboardCheck, User, X, PanelLeftOpen, PanelLeftClose, FileText } from "lucide-react";
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

  const [menuItems, setMenuItems] = useState([]);
  const [singleItems, setSingleItems] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState({});

  useEffect(() => {
    const loadSidebarMenu = async () => {
      const empId = sessionStorage.getItem("empId");
      if (!empId) return;

      try {
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

          // Filter screens (if hasRbac is false, show all screens)
          const allowedScreens = permissions.filter(p => !hasRbac || p.viewFlg);

          // SCREEN_MAPPING with optional displayName override
          const SCREEN_MAPPING = {
            'ADMIN_DASHBOARD': { path: '/dashboard', icon: House },
            'COMPANY_CREATION': { path: '/company-creation', icon: Building },
            'PLANT_CREATION': { path: '/plant-creation', icon: Factory },
            'LAND_CREATION': { path: '/agriland-allocation', icon: MapPinned },
            'DEPARTMENT_CREATION': { path: '/department-creation', icon: Settings },
            'DEPARTMENT_MAPPING': { path: '/department-mapping', icon: Settings },
            'EMPLOYEE_CREATION': { path: '/employee-creation', icon: User },

            'PROJECT_CREATION': { path: '/project-creation', icon: FolderPlus },
            'MILESTONE_CREATION': { path: '/milestone-creation', icon: FolderPlus },
            'PROJECT_DASHBOARD': { path: '/pm-dashboard', icon: FolderPlus },
            'LIVE_PROJECT_LIST': { path: '/project-list', icon: FolderPlus },
            'TASK_BOARD': { path: '/task-board', icon: FolderPlus },
            'GANTT_CHART': { path: '/all-project-gantt-chart', icon: FolderPlus },
            'ALL_PROJECT_GANTT_CHART': { path: '/all-project-gantt-chart', icon: FolderPlus },
            'ALL_PROJECT_GANTT': { path: '/all-project-gantt-chart', icon: FolderPlus },

            'USER_DASHBOARD': { path: '/user-dashboard', icon: House },
            'MY_TASK': { path: '/my-tasks', icon: ClipboardCheck },
            'MY_PROJECTS': { path: '/projects', icon: FolderPlus },
            'CALENDAR': { path: '/calendar', icon: Calendar },
            'USER_TASK_BOARD': { path: '/user-task-board', icon: ClipboardCheck },

            'PUBLIC_HOLIDAYS': { path: '/public-holidays', icon: Calendar },
            'PROFILE': { path: '/profile', icon: User },
            // 🔁 Override display name for INDIVIDUAL_TASK
            'INDIVIDUAL_TASK': { path: '/assignment', icon: FileText, displayName: "Assignment" },

            'ASSIGN_ACCESS': { path: '/assign-access', icon: ClipboardCheck },
            'PROJECT_ACCESS': { path: '/project-access', icon: FolderPlus }
          };

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
            'LIVE_PROJECT_LIST',
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
        </ul>

        <div className="logout-button" onClick={() => { onLogout(); closeMobileSidebar(); }}>
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
    </>
  );
};

export default Sidebar;