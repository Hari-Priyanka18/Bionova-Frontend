import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from "../Sidebar.jsx";
import Header from "../Header.jsx";
import AlertModal from "../AlertModal.jsx";
import { useNavigate } from 'react-router-dom';
import '../../styles/PublicHoliday.css';
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import { getScreenPermission } from "../../utils/permissions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const mapBackendHoliday = (h, employees = [], companies = [], plants = []) => {
  const addedByEmp = employees.find(e => String(e.empId) === String(h.addedBy));
  const addedByName = addedByEmp ? `${addedByEmp.fstNm || ''} ${addedByEmp.lstNm || ''}`.trim() : "System Admin";
  const coy = companies.find(c => String(c.coyId) === String(h.coyId));
  const plt = plants.find(p => String(p.pltId) === String(h.pltId));

  // Day name calculation
  let dayName = "";
  if (h.calDt) {
    const d = new Date(h.calDt + "T12:00:00Z");
    dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }

  // Generate description based on scope
  let scopeDesc = "Public Holiday";
  if (h.calType === "COMPANY" && coy) {
    scopeDesc = `Company Holiday (${coy.coyNm})`;
  } else if (h.calType === "PLANT" && plt) {
    scopeDesc = `Plant Holiday (${plt.pltNm})`;
  } else if (h.calType === "EXTERNAL") {
    scopeDesc = "External Business Holiday";
  }

  return {
    id: h.clId,
    date: h.calDt,
    day: dayName,
    name: h.holidayNm,
    desc: scopeDesc,
    addedBy: addedByName,
    addedByEmpId: h.addedBy,
    addedOn: "N/A",
    time: "",
    mandatory: h.holTyp === "MANDATORY",
    repeat: false,
    coyId: h.coyId || "",
    pltId: h.pltId || "",
    calType: h.calType || "",
    raw: h
  };
};

const PublicHoliday = ({ userRole, onLogout }) => {
  const screenPerm = getScreenPermission('PUBLIC_HOLIDAYS');
  const [holidays, setHolidays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [profile, setProfile] = useState(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [editId, setEditId] = useState(null);
  const datePickerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "",
    cancelText: ""
  });

  const triggerAlert = (type, title, message, onConfirm = null, confirmText = "", cancelText = "") => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm, confirmText, cancelText });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    calType: "", // "", "COMPANY", "PLANT", "EXTERNAL"
    coyId: "",
    pltId: "",
    mandatory: true,
    isRegular: false
  });

  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [holidaysData, employeesData, companiesData, plantsData, profileRes] = await Promise.all([
        apiGet("/api/calendar"),
        apiGet("/api/employees").catch(() => []),
        apiGet("/api/companies").catch(() => []),
        apiGet("/api/plants").catch(() => []),
        apiGet("/api/profile").catch(() => null)
      ]);

      setEmployees(employeesData || []);
      setCompanies(companiesData || []);
      setPlants(plantsData || []);
      setProfile(profileRes);

      const allEmps = employeesData || [];
      if (profileRes && !allEmps.find(e => e.empId === profileRes.empId)) {
        allEmps.push(profileRes);
      }

      const mapped = (holidaysData || []).map(h => 
        mapBackendHoliday(h, allEmps, companiesData || [], plantsData || [])
      );
      setHolidays(mapped);
    } catch (err) {
      console.error("Error fetching holidays data:", err);
      triggerAlert("error", "Error", "Failed to fetch holidays data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const currentYear = new Date().getFullYear();

  const filteredHolidays = holidays.filter(h => {
    const matchQuery = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (h.desc && h.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    const year = h.date ? h.date.split('-')[0] : "";
    
    // Hide future years completely from the UI until the year changes
    if (year && parseInt(year, 10) > currentYear) return false;

    const matchYear = selectedYear === "All Years" || year === selectedYear;

    return matchQuery && matchYear;
  }).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const allAvailableYears = [...new Set(holidays.map(h => h.date ? h.date.split('-')[0] : null).filter(Boolean))];
  const validYears = allAvailableYears.filter(y => parseInt(y, 10) <= currentYear).sort((a, b) => b - a);
  const yearsList = ["All Years", ...validYears];

  // Pagination calculations
  const totalPages = Math.ceil(filteredHolidays.length / rowsPerPage) || 1;
  const paginatedHolidays = filteredHolidays.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const openAddDrawer = () => {
    setEditId(null);
    setFormData({ 
      date: "", 
      name: "", 
      calType: "", 
      coyId: "", 
      pltId: "", 
      mandatory: true,
      isRegular: false
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (holiday) => {
    setEditId(holiday.id);
    setFormData({
      date: holiday.date,
      name: holiday.name,
      calType: holiday.calType || "",
      coyId: holiday.coyId || "",
      pltId: holiday.pltId || "",
      mandatory: holiday.mandatory,
      isRegular: false
    });
    setDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    triggerAlert(
      "warning",
      "Confirm Delete",
      "Are you sure you want to delete this holiday?",
      async () => {
        try {
          await apiDelete(`/api/calendar/${id}`);
          await fetchData();
          triggerAlert("success", "Success", "Holiday deleted successfully.");
        } catch (err) {
          console.error("Error deleting holiday:", err);
          triggerAlert("error", "Error", "Failed to delete holiday: " + err.message);
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      triggerAlert("error", "Validation Error", "Please fill in the required fields (Holiday Date and Name).");
      return;
    }

    const isDuplicate = holidays.some(h => (!editId || h.id !== editId) && h.date === formData.date);
    if (isDuplicate) {
      triggerAlert("error", "Error", "Already Holiday Exists On This Day");
      return;
    }

    const payload = {
      calDt: formData.date,
      holidayNm: formData.name,
      holTyp: formData.mandatory ? "MANDATORY" : "OPTIONAL",
      calType: formData.mandatory ? null : (formData.calType || null),
      coyId: (!formData.mandatory && (formData.calType === "COMPANY" || formData.calType === "PLANT") && formData.coyId) ? parseInt(formData.coyId, 10) : null,
      pltId: (!formData.mandatory && formData.calType === "PLANT" && formData.pltId) ? parseInt(formData.pltId, 10) : null,
      addedBy: profile?.empId || null,
      isRegular: formData.isRegular
    };

    try {
      if (editId) {
        await apiPut(`/api/calendar/${editId}`, payload);
        await fetchData();
        setDrawerOpen(false);
        triggerAlert("success", "Success", "Holiday updated successfully.");
      } else {
        await apiPost("/api/calendar", payload);
        await fetchData();
        setDrawerOpen(false);
        triggerAlert("success", "Success", "Holiday created successfully.");
      }
    } catch (err) {
      console.error("Error saving holiday:", err);
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate") || msg.includes("400")) {
        triggerAlert("error", "Error", "Already Holiday Exists On This Day");
      } else {
        triggerAlert("error", "Error", "Failed to save holiday: " + err.message);
      }
    }
  };

  // Filter plants based on selected company
  const filteredPlants = formData.coyId 
    ? plants.filter(p => String(p.coyId) === String(formData.coyId))
    : plants;

  return (
    <div className="ph-shell-container">
      <Sidebar userRole={userRole} onLogout={onLogout} />
      
      <div className="ph-shell">
        <Header 
          title="Define Public Holidays" 
          subtitle="Add, edit or delete public holidays. These holidays will be used during project live for calendar integration."
          showSearch={false} 
        />
        
        <main className="ph-main" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div className="ph-container">
            {/* Header Actions */}
            {screenPerm.canCreate && (
              <div className="ph-header-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <div className="ph-header-actions">
                  <button className="ph-btn-primary" onClick={openAddDrawer}>
                    <Plus size={16} /> Add Holiday
                  </button>
                </div>
              </div>
            )}

            {/* Main Card */}
            <div className="ph-card" style={{ marginTop: '0' }}>
              <div className="ph-filters">
                <div className="ph-year-select">
                  <span>Select Year</span>
                  <select 
                    className="ph-select" 
                    value={selectedYear} 
                    onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                  >
                    {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="ph-search">
                  <Search className="ph-search-icon" size={16} />
                  <input 
                    type="text" 
                    className="ph-search-input" 
                    placeholder="Search holiday..." 
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
              </div>

              <div className="ph-table-wrapper">
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Holiday Name</th>
                      <th>Scope / Description</th>
                      <th>Added By</th>
                      <th>Mandatory <Info size={12} color="#64748b" style={{marginLeft: 4, verticalAlign: 'middle'}}/></th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading holidays...</td>
                      </tr>
                    ) : paginatedHolidays.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No holidays found.</td>
                      </tr>
                    ) : paginatedHolidays.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <div className="ph-td-date">{formatDateDisplay(h.date)}</div>
                          <span className="ph-td-day">({h.day})</span>
                        </td>
                        <td><div className="ph-td-name">{h.name}</div></td>
                        <td><div className="ph-td-desc">{h.desc || "-"}</div></td>
                        <td><div className="ph-td-added">{h.addedBy}</div></td>
                        <td>
                          <span className={`ph-badge ${h.mandatory ? 'yes' : 'no'}`}>
                            {h.mandatory ? 'Yes' : 'No'}
                          </span>
                          <span className="ph-mandatory-hint">
                            ({h.mandatory ? 'Mandatory Holiday' : 'Optional Holiday'})
                          </span>
                        </td>
                        <td>
                          <div className="ph-actions">
                            {screenPerm.canEdit ? (
                              <button className="ph-action-btn edit" onClick={() => openEditDrawer(h)}><Edit2 size={14} /></button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>View Only</span>
                            )}
                            {screenPerm.canDelete && (
                              <button className="ph-action-btn delete" onClick={() => handleDelete(h.id)}><Trash2 size={14} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section - Only shown when total holidays > 10 */}
              {filteredHolidays.length > 10 && (
                <div className="ph-pagination">
                  <div className="ph-pag-left">
                    Total Holidays: <span>{filteredHolidays.length}</span>
                  </div>
                  <div className="ph-pag-right">
                    <span>{Math.min((currentPage - 1) * rowsPerPage + 1, filteredHolidays.length)} to {Math.min(currentPage * rowsPerPage, filteredHolidays.length)} of {filteredHolidays.length}</span>
                    <div className="ph-pag-controls">
                      <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="ph-pag-btn"
                        title="Previous Page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="ph-pag-num">{currentPage}</span>
                      <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="ph-pag-btn"
                        title="Next Page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="ph-note">
                <Info className="ph-note-icon" size={20} />
                <div>
                  <p>Note</p>
                  <span>Mandatory holidays are compulsory for all projects. Optional holidays depend on company management to declare as holiday.</span>
                </div>
              </div>
            </div>

            {/* Slide Drawer for Adding/Editing Holiday */}
            <div className={`ph-drawer-overlay ${drawerOpen ? 'open' : ''}`}>
              <div className="ph-drawer">
                <div className="ph-drawer-header">
                  <div>
                    <h3>{editId ? 'Edit Holiday' : 'Add Holiday'}</h3>
                    <p>{editId ? 'Update holiday details below.' : 'Enter holiday details in the fields below.'}</p>
                  </div>
                  <button className="ph-drawer-close" onClick={() => setDrawerOpen(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="ph-drawer-body">
                  <div className="ph-form-group">
                    <label>Holiday Date <span>*</span></label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                      <DatePicker
                        ref={datePickerRef}
                        selected={formData.date ? new Date(formData.date + "T00:00:00") : null}
                        onChange={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setFormData({ ...formData, date: `${year}-${month}-${day}` });
                          } else {
                            setFormData({ ...formData, date: "" });
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        className="ph-input"
                        wrapperClassName="ph-datepicker-wrapper"
                      />
                      <Calendar
                        size={18}
                        onClick={() => {
                          if (datePickerRef.current) {
                            datePickerRef.current.setOpen(true);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          color: '#64748b',
                          cursor: 'pointer',
                          zIndex: 2
                        }}
                      />
                    </div>
                  </div>

                  <div className="ph-form-group">
                    <label>Holiday Name <span>*</span></label>
                    <input 
                      type="text" 
                      className="ph-input" 
                      placeholder="Enter holiday name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="ph-toggle-row">
                    <div className="ph-toggle-label">
                      <strong>Mandatory Holiday <Info size={14} color="#64748b" /></strong>
                      <span>If enabled, this holiday will be compulsory for all projects.</span>
                    </div>
                    <label className="ph-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.mandatory}
                        onChange={(e) => {
                          const isMandatory = e.target.checked;
                          setFormData({
                            ...formData,
                            mandatory: isMandatory,
                            calType: isMandatory ? "" : formData.calType,
                            coyId: isMandatory ? "" : formData.coyId,
                            pltId: isMandatory ? "" : formData.pltId
                          });
                        }}
                      />
                      <span className="ph-slider"></span>
                    </label>
                  </div>

                  {!editId && (
                    <div className="ph-toggle-row" style={{ marginTop: '12px' }}>
                      <div className="ph-toggle-label">
                        <strong>Regular Holiday <Info size={14} color="#64748b" /></strong>
                        <span>If enabled, this holiday will automatically recur next year.</span>
                      </div>
                      <label className="ph-switch">
                        <input 
                          type="checkbox" 
                          checked={formData.isRegular}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              isRegular: e.target.checked
                            });
                          }}
                        />
                        <span className="ph-slider"></span>
                      </label>
                    </div>
                  )}
                  
                  {!formData.mandatory && (
                    <>
                      <div className="ph-form-group" style={{ marginTop: '12px' }}>
                        <label>Scope Type <span>*</span></label>
                        <select 
                          className="ph-select" 
                          style={{ width: '100%' }}
                          value={formData.calType}
                          onChange={(e) => setFormData({
                            ...formData, 
                            calType: e.target.value,
                            coyId: e.target.value === "" ? "" : formData.coyId,
                            pltId: e.target.value !== "PLANT" ? "" : formData.pltId
                          })}
                        >
                          <option value="">Public / National</option>
                          <option value="COMPANY">Company-wide</option>
                          <option value="PLANT">Plant-specific</option>
                          <option value="EXTERNAL">External Business</option>
                        </select>
                      </div>

                      {(formData.calType === "COMPANY" || formData.calType === "PLANT") && (
                        <div className="ph-form-group" style={{ marginTop: '12px' }}>
                          <label>Company <span>*</span></label>
                          <select 
                            className="ph-select" 
                            style={{ width: '100%' }}
                            value={formData.coyId}
                            onChange={(e) => setFormData({
                              ...formData, 
                              coyId: e.target.value,
                              pltId: "" // Reset plant on company change
                            })}
                          >
                            <option value="">Select Company</option>
                            {companies.map(c => (
                              <option key={c.coyId} value={c.coyId}>{c.coyNm}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formData.calType === "PLANT" && (
                        <div className="ph-form-group" style={{ marginTop: '12px' }}>
                          <label>Plant <span>*</span></label>
                          <select 
                            className="ph-select" 
                            style={{ width: '100%' }}
                            value={formData.pltId}
                            onChange={(e) => setFormData({...formData, pltId: e.target.value})}
                          >
                            <option value="">Select Plant</option>
                            {filteredPlants.map(p => (
                              <option key={p.pltId} value={p.pltId}>{p.pltNm}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  <div className="ph-alert-info" style={{ marginTop: '16px' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    {formData.mandatory 
                      ? "Mandatory holidays are compulsory for all plants and projects."
                      : "Optional/Scoped holidays will only apply to the selected Scope."
                    }
                  </div>
                </div>

                <div className="ph-drawer-footer">
                  <button className="ph-btn-cancel" onClick={() => setDrawerOpen(false)}>Cancel</button>
                  <button className="ph-btn-save" onClick={handleSave}>{editId ? 'Update Holiday' : 'Save Holiday'}</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <AlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false, onConfirm: null }))}
        onConfirm={alertConfig.onConfirm}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />
    </div>
  );
};

export default PublicHoliday;
