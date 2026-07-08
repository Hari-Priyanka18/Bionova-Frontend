import { useState, useEffect, useRef } from "react";
import Sidebar from "../Sidebar";
import Header from "../Header";
import { 
  User, 
  Camera, 
  ShieldCheck, 
  EyeOff, 
  Eye, 
  Lock,
  ChevronRight,
  Home,
  IdCard,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Heart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Monitor,
  Smartphone,
  Globe,
  ArrowRight,
  HelpCircle,
  Headphones,
  FileCode,
  Info
} from "lucide-react";
import "../../styles/profile.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL) + "/api";

const authHeaders = () => {
  const token = sessionStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
};

const Profile = ({ userRole, onLogout }) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login Activity Mock Data (will be replaced with real API data later)
  const loginActivity = [
    { id: 1, device: "Chrome - Windows", time: "29-May-2025 09:00 AM", location: "Kolkata, India", status: "Active", type: "desktop" },
    { id: 2, device: "Android App", time: "28-May-2025 06:30 PM", location: "Kolkata, India", status: "Logged Out", type: "mobile" },
    { id: 3, device: "Chrome - Windows", time: "27-May-2025 08:15 AM", location: "Kolkata, India", status: "Logged Out", type: "desktop" },
    { id: 4, device: "Edge - Windows", time: "26-May-2025 07:45 PM", location: "Kolkata, India", status: "Logged Out", type: "desktop" }
  ];

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'desktop': return <Monitor size={18} />;
      case 'mobile': return <Smartphone size={18} />;
      default: return <Globe size={18} />;
    }
  };

  const getDeviceColor = (type) => {
    switch (type) {
      case 'desktop': return '#ea4335'; // Red for Chrome
      case 'mobile': return '#34a853'; // Green for Android
      default: return '#4285f4'; // Blue for Edge/Globe
    }
  };

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Profile data states
  const [profile, setProfile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null); // displayed URL
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // ── Photo Upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image size should be less than 2MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      setPhotoError("Only JPG, PNG or GIF images are allowed.");
      return;
    }

    setPhotoError("");
    setPhotoUploading(true);

    try {
      // 1. Upload to Supabase storage
      const formData = new FormData();
      formData.append("file", file);

      const token = sessionStorage.getItem("authToken");
      const uploadRes = await fetch(`${API_BASE}/storage/upload/employee-photo`, {
        method: "POST",
        headers: { "Authorization": token ? `Bearer ${token}` : "" },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.message || "Upload failed.");
      }

      const { url } = await uploadRes.json();

      // 2. Update profile photo URL in employee record
      if (profile && profile.empId) {
        await fetch(`${API_BASE}/employees/${profile.empId}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ ...profile, photoUrl: url }),
        });
        setProfile((prev) => ({ ...prev, photoUrl: url }));
      }

      // 3. Show preview
      setProfilePhoto(url);
    } catch (err) {
      console.error("Photo upload error:", err);
      setPhotoError(err.message || "Failed to upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Password Change ───────────────────────────────────────────────────────
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const isNewPassValid     = newPassword ? passwordRegex.test(newPassword) : null;
  const isSameAsCurrent    = currentPassword && newPassword && currentPassword === newPassword;
  const isConfirmMatch     = confirmPassword && newPassword ? newPassword === confirmPassword : null;
  const canSubmit =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    isNewPassValid &&
    !isSameAsCurrent &&
    isConfirmMatch;

  const handleUpdatePassword = async () => {
    setError("");
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required.");
      return;
    }
    if (isSameAsCurrent) {
      setError("New password cannot be the same as the current password.");
      return;
    }
    if (!isNewPassValid) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number and special character.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees/change-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Password updated successfully! Logging out...");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          if (onLogout) onLogout();
        }, 2000);
      } else {
        setError(data.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Error updating password:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Profile Data ────────────────────────────────────────────────────
  const fetchProfileData = async () => {
    const headers = authHeaders();

    try {
      const res = await fetch(`${API_BASE}/companies`, { headers });
      if (res.ok) setCompanies(await res.json());
    } catch (err) { console.error("Error fetching companies:", err); }

    try {
      const res = await fetch(`${API_BASE}/plants`, { headers });
      if (res.ok) setPlants(await res.json());
    } catch (err) { console.error("Error fetching plants:", err); }

    try {
      const res = await fetch(`${API_BASE}/departments`, { headers });
      if (res.ok) setDepartments(await res.json());
    } catch (err) { console.error("Error fetching departments:", err); }

    try {
      const res = await fetch(`${API_BASE}/employees`, { headers });
      if (res.ok) {
        const empData = await res.json();
        setEmployees(empData);
        const loggedInEmail = sessionStorage.getItem("userEmail") || localStorage.getItem("userEmail");
        if (loggedInEmail) {
          const matchedProfile = empData.find(
            (emp) => emp.email && emp.email.toLowerCase().trim() === loggedInEmail.toLowerCase().trim()
          );
          if (matchedProfile) {
            setProfile(matchedProfile);
            // Load existing photo from DB
            if (matchedProfile.photoUrl) {
              setProfilePhoto(matchedProfile.photoUrl);
            }
          }
        }
      }
    } catch (err) { console.error("Error fetching employees:", err); }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // ── Lookup Helpers ────────────────────────────────────────────────────────
  const getDeptName = (id) => {
    const d = departments.find(dept => dept.deptId === id);
    return d ? d.deptNm : `Department ID: ${id}`;
  };

  const getManagerName = (id) => {
    if (!id) return "None";
    const mgr = employees.find(emp => emp.empId === id);
    return mgr ? `${mgr.fstNm || ""} ${mgr.lstNm || ""}`.trim() : `Manager ID: ${id}`;
  };

  const getCompanyName = (id) => {
    const c = companies.find(comp => String(comp.coyId) === String(id));
    return c ? c.coyNm : `Company ID: ${id}`;
  };

  const getPlantName = (id) => {
    const p = plants.find(pl => String(pl.pltId) === String(id));
    return p ? p.pltNm : `Plant ID: ${id}`;
  };

  const profileDetails = profile ? {
    employeeCode: profile.empCode || "N/A",
    employeeName: `${profile.fstNm || ""} ${profile.lstNm || ""}`.trim() || "N/A",
    email: profile.email || "N/A",
    mobileNumber: profile.mobNum || "N/A",
    // Show plant name if plant exists, else company name
    companyName: profile.pltId 
      ? getPlantName(profile.pltId) 
      : (profile.coyId ? getCompanyName(profile.coyId) : "N/A"),
    department: profile.deptId ? getDeptName(profile.deptId) : "N/A",
    role: profile.role || "N/A",
    bloodGroup: profile.bldGrp || profile.bloodGroup || "N/A",
    reportingManager: profile.repManId ? getManagerName(profile.repManId) : "None",
    workLocation: profile.wLoc || "N/A",
    dateOfJoining: profile.doj || "N/A",
    status: profile.sts === true || profile.sts === "ACTIVE" ? "Active" : "Inactive"
  } : {
    employeeCode: "Loading...",
    employeeName: "Loading...",
    email: "Loading...",
    mobileNumber: "Loading...",
    companyName: "Loading...",
    department: "Loading...",
    role: "Loading...",
    bloodGroup: "Loading...",
    reportingManager: "Loading...",
    workLocation: "Loading...",
    dateOfJoining: "Loading...",
    status: "Loading..."
  };

  // Determine organization label based on profile
  const orgLabel = profile?.pltId ? "Plant" : "Company";

  return (
    <div className="pf-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />

      <div className="pf-shell">
        <Header 
          title="My Profile" 
          showSearch={false} 
          userName={profileDetails.employeeName} 
          userRole={profileDetails.role} 
          initials={profile ? `${profile.fstNm?.[0] || profile.firstName?.[0] || ""}${profile.lstNm?.[0] || profile.lastName?.[0] || ""}`.toUpperCase() || "RK" : "RK"} 
        />

        <main className="pf-main">
          <div className="pf-content">
            
            {/* Left Card: Profile Information */}
            <div className="pf-card pf-profile-card">
              <div className="pf-card-header">
                <User className="pf-card-icon" size={24} />
                <div className="pf-card-title-wrap">
                  <h2>Profile Information</h2>
                  <p>View your personal and professional details</p>
                </div>
              </div>

              <div className="pf-info-layout">
                {/* Avatar Section */}
                <div className="pf-avatar-section">
                  <div className="pf-avatar-wrapper">
                    {photoUploading ? (
                      <div className="pf-avatar-uploading">
                        <div className="pf-upload-spinner" />
                      </div>
                    ) : profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="pf-avatar-image" />
                    ) : (
                      <User size={80} color="#94a3b8" strokeWidth={1.5} />
                    )}
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    id="photo-upload-input" 
                    accept="image/jpeg, image/png, image/gif" 
                    style={{ display: 'none' }} 
                    onChange={handlePhotoUpload}
                  />
                  <button 
                    className="pf-change-photo-btn"
                    disabled={photoUploading}
                    onClick={() => document.getElementById('photo-upload-input').click()}
                  >
                    <Camera size={16} />
                    {photoUploading ? "Uploading..." : "Change Photo"}
                  </button>
                  <span className="pf-avatar-hint">JPG, PNG or GIF. Max size of 2MB</span>
                  {photoError && (
                    <p className="pf-photo-error">
                      <XCircle size={13} style={{ marginRight: 4 }} />
                      {photoError}
                    </p>
                  )}
                </div>

                {/* Details List */}
                <div className="pf-details-list">
                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><IdCard size={16} />Employee Code</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.employeeCode}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><User size={16} />Employee Name</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.employeeName}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Mail size={16} />Email</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.email}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Phone size={16} />Mobile Number</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.mobileNumber}</div>
                  </div>

                  {/* ─── Dynamic label for Company/Plant ─── */}
                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Building size={16} />{orgLabel}</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.companyName}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Briefcase size={16} />Department</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.department}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><ShieldCheck size={16} />Designation</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.role}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Heart size={16} />Blood Group</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.bloodGroup}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><User size={16} />Reporting Manager</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.reportingManager}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><MapPin size={16} />Work Location</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.workLocation}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Calendar size={16} />Date of Joining</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">{profileDetails.dateOfJoining}</div>
                  </div>

                  <div className="pf-detail-row">
                    <div className="pf-detail-label"><Clock size={16} />Status</div>
                    <span className="pf-detail-separator">:</span>
                    <div className="pf-detail-value">
                      <span className="pf-status-badge">
                        <span className="pf-status-dot"></span>
                        {profileDetails.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Account & Security */}
            <div className="pf-card pf-security-card">
              <div className="pf-card-header">
                <ShieldCheck className="pf-card-icon" size={24} />
                <div className="pf-card-title-wrap">
                  <h2>Account &amp; Security</h2>
                  <p>Update your account password</p>
                </div>
              </div>

              <div className="pf-security-form">
                {/* Current Password */}
                <div className="pf-form-group">
                  <label>Current Password <span>*</span></label>
                  <div className="pf-input-wrapper">
                    <input 
                      type={showCurrentPassword ? "text" : "password"} 
                      placeholder="Enter current password" 
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setError("");
                      }}
                    />
                    {showCurrentPassword ? (
                      <Eye className="pf-input-icon" size={18} onClick={() => setShowCurrentPassword(false)} />
                    ) : (
                      <EyeOff className="pf-input-icon" size={18} onClick={() => setShowCurrentPassword(true)} />
                    )}
                  </div>
                </div>

                {/* New Password */}
                <div className="pf-form-group">
                  <label>New Password <span>*</span></label>
                  <div className="pf-input-wrapper">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      placeholder="Enter new password" 
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError("");
                      }}
                    />
                    {showNewPassword ? (
                      <Eye className="pf-input-icon" size={18} onClick={() => setShowNewPassword(false)} />
                    ) : (
                      <EyeOff className="pf-input-icon" size={18} onClick={() => setShowNewPassword(true)} />
                    )}
                  </div>

                  {/* Password strength hint — turns red when invalid, green when valid */}
                  {newPassword && (
                    <p className="pf-password-hint" style={{ color: isNewPassValid ? '#16a34a' : '#ef4444' }}>
                      {isNewPassValid
                        ? "✓ Password strength: Good"
                        : "Must be 8+ chars with uppercase, lowercase, number & special character (@$!%*?&)."}
                    </p>
                  )}

                  {/* Same-as-current error */}
                  {isSameAsCurrent && (
                    <p className="pf-password-hint pf-error-hint">
                      <XCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      New password cannot be the same as the current password.
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="pf-form-group">
                  <label>Confirm New Password <span>*</span></label>
                  <div className="pf-input-wrapper">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Re-enter new password" 
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                    />
                    {showConfirmPassword ? (
                      <Eye className="pf-input-icon" size={18} onClick={() => setShowConfirmPassword(false)} />
                    ) : (
                      <EyeOff className="pf-input-icon" size={18} onClick={() => setShowConfirmPassword(true)} />
                    )}
                  </div>

                  {/* Real-time mismatch / match feedback */}
                  {confirmPassword && newPassword && (
                    <p className="pf-password-hint" style={{ color: isConfirmMatch ? '#16a34a' : '#ef4444' }}>
                      {isConfirmMatch ? (
                        <><CheckCircle2 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Passwords match.</>
                      ) : (
                        <><XCircle size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Passwords do not match.</>
                      )}
                    </p>
                  )}
                </div>

                {/* API error / success banners */}
                {error && (
                  <div className="pf-alert pf-alert-error">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
                {message && (
                  <div className="pf-alert pf-alert-success">
                    <CheckCircle2 size={16} />
                    {message}
                  </div>
                )}

                <button 
                  className="pf-update-btn" 
                  onClick={handleUpdatePassword}
                  disabled={loading || !canSubmit}
                  style={{
                    backgroundColor: canSubmit && !loading ? "#1d4ed8" : "#94a3b8",
                    cursor: canSubmit && !loading ? "pointer" : "not-allowed"
                  }}
                >
                  <Lock size={16} />
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
            
            {/* Login Activity Card */}
            <div className="pf-card">
              <div className="pf-card-header">
                <Monitor className="pf-card-icon" size={24} />
                <div className="pf-card-title-wrap">
                  <h2>Login Activity</h2>
                  <p>Review your recent login activity and devices.</p>
                </div>
              </div>

              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Login Time</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginActivity.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="pf-device-cell">
                          <span style={{ color: getDeviceColor(log.type) }}>
                            {getDeviceIcon(log.type)}
                          </span>
                          {log.device}
                        </div>
                      </td>
                      <td>{log.time}</td>
                      <td>{log.location}</td>
                      <td>
                        <span className={`pf-status-badge-sm ${log.status === 'Active' ? 'active' : 'logged-out'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <button className="pf-link" style={{ marginTop: "16px" }}>
                View full login activity <ArrowRight size={14} />
              </button>
            </div>

            {/* Support Items */}
            <div className="pf-card">
              <div className="pf-support-list">
                <div className="pf-support-item">
                  <div className="pf-support-item-left">
                    <div className="pf-support-item-icon">
                      <HelpCircle size={18} />
                    </div>
                    <div className="pf-support-item-text">
                      <h3>Help Center</h3>
                      <p>Get help, view FAQs and guides.</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="pf-support-item-right" />
                </div>

                <div className="pf-support-item">
                  <div className="pf-support-item-left">
                    <div className="pf-support-item-icon">
                      <Headphones size={18} />
                    </div>
                    <div className="pf-support-item-text">
                      <h3>Contact Administrator</h3>
                      <p>Reach out to system administrator</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="pf-support-item-right" />
                </div>

                <div className="pf-support-item">
                  <div className="pf-support-item-left">
                    <div className="pf-support-item-icon">
                      <FileCode size={18} />
                    </div>
                    <div className="pf-support-item-text">
                      <h3>User Guide</h3>
                      <p>View user manual and documentation.</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="pf-support-item-right" />
                </div>

                <div className="pf-support-item">
                  <div className="pf-support-item-left">
                    <div className="pf-support-item-icon gray">
                      <Info size={18} />
                    </div>
                    <div className="pf-support-item-text">
                      <h3>Application Version</h3>
                      <p>You are using the latest version.</p>
                    </div>
                  </div>
                  <span className="pf-version">Version 1.0.0</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;