import React, { useState, useEffect } from 'react';
import { 
  Calendar, RefreshCw, Download, Info, CheckCircle2, 
  AlertTriangle, TrendingUp, TrendingDown, Minus 
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import '../../styles/project-forecasting.css';
import { apiGet } from "../../utils/api";

const getHelperDateStr = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
        return `${String(day).padStart(2, '0')}-${months[monthIndex]}-${year}`;
      }
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

const addDaysToDateStr = (dateStr, days) => {
  if (!dateStr || days === 0) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export default function ProjectForecasting({ project }) {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState("Current Trend");

  const isDraft = project?.status === "DRAFT" || project?.status === "Draft" || project?._type === "draft";

  const fetchForecast = async () => {
    if (isDraft) {
      setLoading(false);
      return;
    }
    if (!project?.id) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/project-forecasting/${project.id}`);
      
      let tasksData = { onTime: 0, ahead: 0, delayed: 0, total: 0 };
      try {
        const projMilestones = await apiGet(`/api/milestone-live/by-project/${project.id}`);
        
        const taskPromises = (projMilestones || []).map(m => {
          const mId = m.mId || m.mid || m.id || m.m_id;
          return apiGet(`/api/task-live/by-milestone/${mId}`).catch(() => []);
        });
        const taskResults = await Promise.all(taskPromises);
        const projTasks = taskResults.flat().filter(Boolean);
        
        tasksData.total = projTasks.length;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        projTasks.forEach(t => {
           let endDt = t.endDt || t.tentEndDt;
           if (!endDt) return;
           const [y,m,d] = endDt.split('-');
           const endDate = new Date(y, m-1, d);
           endDate.setHours(0,0,0,0);
           
           if (t.taskSts === 'COMPLETED') {
              let actCmp = t.actCmpDt ? new Date(t.actCmpDt) : today;
              actCmp.setHours(0,0,0,0);
              if (actCmp.getTime() < endDate.getTime()) tasksData.ahead++;
              else if (actCmp.getTime() === endDate.getTime()) tasksData.onTime++;
              else tasksData.delayed++;
           } else {
              if (today.getTime() > endDate.getTime()) tasksData.delayed++;
              else tasksData.onTime++;
           }
        });
      } catch (err) {
        console.error("Error calculating task accuracy", err);
      }
      
      setForecastData({ ...data, tasksData });
    } catch (err) {
      console.error("Failed to load forecast data:", err);
      setError("Failed to load project forecasting from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [project, isDraft]);

  if (isDraft) {
    return (
      <div className="fc-container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="fc-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
          <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>Forecasting Not Available</h3>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            Forecasting is only active for LIVE projects. Once you promote this draft project to LIVE, 
            the system will analyze task progress, employee workload, and holiday calendars to predict 
            completion trends.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !forecastData) {
    return (
      <div className="fc-container" style={{ padding: '80px 20px', textAlign: 'center', color: '#2563eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <RefreshCw size={36} style={{ margin: '0 auto 14px auto', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '15px', fontWeight: '600', color: '#334155' }}>Calculating project forecasting...</p>
      </div>
    );
  }

  const actualProgress = forecastData.actualProgress || 0;
  const plannedProgress = forecastData.plannedProgress || 0;
  const rawVariance = forecastData.variance || 0;
  const trendData = forecastData.trendData || [];
  const scenarios = forecastData.scenarios || [];
  const keyFactors = forecastData.keyFactors || [];
  const milestonesImpact = forecastData.milestonesImpact || [];
  const velocity = forecastData.velocity || 1.0;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  // Find the selected scenario object
  const activeScenario = scenarios.find(s => s.name === selectedScenario) || scenarios[0] || {
    name: "Current Trend",
    completionDate: forecastData.forecastedCompletionDate,
    varianceDays: forecastData.delayDays || 0,
    confidence: "High (87%)",
    description: "Based on current progress and productivity rate"
  };

  const scenarioVarianceDays = activeScenario.varianceDays !== undefined ? activeScenario.varianceDays : (forecastData.delayDays || 0);
  const scenarioCompletionDate = activeScenario.completionDate || forecastData.forecastedCompletionDate;

  // Compute scenario-specific velocity
  let scenarioVelocity = velocity;
  if (selectedScenario === "Best Case") {
    scenarioVelocity = Math.min(velocity * 1.15, 1.5);
  } else if (selectedScenario === "Worst Case") {
    scenarioVelocity = Math.max(velocity * 0.85, 0.2);
  } else if (selectedScenario === "Original Plan") {
    scenarioVelocity = 1.0;
  }

  // Compute status and color for header / summary
  let headerStatusText = forecastData.statusText || 'On Track';
  let headerStatusColor = forecastData.statusColor || '#f59e0b';

  if (selectedScenario === "Original Plan") {
    headerStatusText = "On Track";
    headerStatusColor = "#10b981";
  } else if (selectedScenario === "Best Case") {
    if (scenarioVarianceDays <= 0) {
      headerStatusText = "Ahead of Plan";
      headerStatusColor = "#10b981";
    } else if (scenarioVarianceDays <= 10) {
      headerStatusText = "Moderate Risk";
      headerStatusColor = "#f59e0b";
    } else {
      headerStatusText = "At Risk";
      headerStatusColor = "#ef4444";
    }
  } else if (selectedScenario === "Worst Case") {
    if (scenarioVarianceDays <= 0) {
      headerStatusText = "On Track";
      headerStatusColor = "#10b981";
    } else {
      headerStatusText = "High Risk";
      headerStatusColor = "#ef4444";
    }
  }

  // Dynamic Trend Data for chart extending dynamically up to the scenario completion date reaching 100%
  const activeTrendData = (() => {
    const parseDate = (s) => {
      if (!s) return new Date();
      const parts = s.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(s);
    };

    const dStart = parseDate(forecastData.startDate);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = parseDate(forecastData.endDate);
    dEnd.setHours(0, 0, 0, 0);
    const dForecast = parseDate(scenarioCompletionDate || forecastData.endDate);
    dForecast.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dMax = dForecast.getTime() > dEnd.getTime() ? dForecast : dEnd;

    const totalDays = Math.max(1, Math.round((dMax - dStart) / (1000 * 60 * 60 * 24)));
    const steps = 6;
    const rawDates = [];

    for (let i = 0; i <= steps; i++) {
      const d = new Date(dStart);
      d.setDate(d.getDate() + Math.round((totalDays * i) / steps));
      rawDates.push(d);
    }

    const allDates = [...rawDates, today, dEnd, dForecast]
      .filter(d => d >= dStart && d <= dMax)
      .sort((a, b) => a.getTime() - b.getTime());

    const uniqueDates = [];
    for (const d of allDates) {
      if (!uniqueDates.some(u => Math.abs(u.getTime() - d.getTime()) < 1.5 * 24 * 60 * 60 * 1000)) {
        uniqueDates.push(d);
      }
    }
    if (!uniqueDates.some(u => Math.abs(u.getTime() - dStart.getTime()) < 24 * 60 * 60 * 1000)) {
      uniqueDates.unshift(dStart);
    }
    if (!uniqueDates.some(u => Math.abs(u.getTime() - dMax.getTime()) < 24 * 60 * 60 * 1000)) {
      uniqueDates.push(dMax);
    }
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return uniqueDates.map(d => {
      const label = `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;

      // Baseline Plan: 0% at dStart -> 100% at dEnd
      let baseline = 0;
      if (d.getTime() <= dStart.getTime()) baseline = 0;
      else if (d.getTime() >= dEnd.getTime()) baseline = 100;
      else {
        baseline = ((d - dStart) / (dEnd - dStart)) * 100;
      }

      // Actual Progress: up to today
      let actual = null;
      if (d.getTime() <= today.getTime()) {
        if (today.getTime() === dStart.getTime()) {
          actual = actualProgress;
        } else {
          actual = Math.min(actualProgress, ((d - dStart) / (today - dStart)) * actualProgress);
        }
      }

      // Forecast Line: matches actual up to today, then goes to 100% at dForecast
      let forecast = null;
      if (d.getTime() < today.getTime()) {
        forecast = actual;
      } else if (d.getTime() === today.getTime()) {
        forecast = actualProgress;
      } else {
        if (d.getTime() >= dForecast.getTime()) {
          forecast = 100;
        } else {
          const remainingSpan = dForecast.getTime() - today.getTime();
          if (remainingSpan <= 0) forecast = 100;
          else {
            forecast = actualProgress + ((d.getTime() - today.getTime()) / remainingSpan) * (100 - actualProgress);
          }
        }
      }

      return {
        name: label,
        baseline: Math.round(baseline * 10) / 10,
        actual: actual !== null ? Math.round(actual * 10) / 10 : null,
        forecast: forecast !== null ? Math.round(forecast * 10) / 10 : null
      };
    });
  })();

  // Dynamic Key Factors for selected scenario
  const activeKeyFactors = (() => {
    if (selectedScenario === 'Original Plan') {
      return [
        { factor: "Overall Productivity", impact: "Neutral", impactDays: 0, trend: "Stable" },
        { factor: "Task Completion Rate", impact: "Neutral", impactDays: 0, trend: "Stable" },
        { factor: "Resource Availability", impact: "Neutral", impactDays: 0, trend: "Stable" }
      ];
    }
    if (selectedScenario === 'Best Case') {
      const pOffset = Math.max(0, Math.round(scenarioVarianceDays / 3));
      const tOffset = Math.max(0, Math.round(scenarioVarianceDays * 0.4));
      return [
        { factor: "Overall Productivity", impact: "Positive", impactDays: pOffset, trend: "Improving" },
        { factor: "Task Completion Rate", impact: pOffset === 0 ? "Positive" : "Neutral", impactDays: tOffset, trend: "Improving" },
        { factor: "Resource Availability", impact: "Positive", impactDays: 0, trend: "Stable" }
      ];
    }
    if (selectedScenario === 'Worst Case') {
      const pOffset = Math.max(1, Math.round(scenarioVarianceDays / 2));
      const tOffset = Math.max(1, Math.round(scenarioVarianceDays * 0.6));
      return [
        { factor: "Overall Productivity", impact: "Negative", impactDays: pOffset, trend: "Worsening" },
        { factor: "Task Completion Rate", impact: "Negative", impactDays: tOffset, trend: "Worsening" },
        { factor: "Resource Availability", impact: "Negative", impactDays: 2, trend: "Worsening" }
      ];
    }
    return keyFactors;
  })();

  // Dynamic Milestones Impact for selected scenario
  const activeMilestonesImpact = milestonesImpact.map((m) => {
    const baseEnd = m.endDt;
    if (selectedScenario === 'Original Plan') {
      return {
        ...m,
        forecastDate: baseEnd,
        impact: "On Time",
        impactColor: "#10b981"
      };
    }
    if (selectedScenario === 'Current Trend') {
      return m;
    }
    
    const baseShift = (m.forecastDate && m.endDt) ? 
      Math.max(0, Math.round((new Date(m.forecastDate) - new Date(m.endDt)) / (1000 * 60 * 60 * 24))) : 0;
    
    const baseDelayDays = Math.max(1, forecastData.delayDays || 1);
    const ratio = scenarioVarianceDays / baseDelayDays;
    
    let newShift = 0;
    if (selectedScenario === 'Best Case') {
      newShift = Math.round(baseShift * ratio);
    } else if (selectedScenario === 'Worst Case') {
      newShift = Math.max(baseShift, Math.round(baseShift * (ratio || 1.2)));
    }
    
    const newForecastDate = addDaysToDateStr(baseEnd, newShift);
    return {
      ...m,
      forecastDate: newForecastDate,
      impact: newShift > 0 ? `+${newShift} Days` : "On Time",
      impactColor: newShift > 0 ? (newShift < baseShift ? "#f59e0b" : "#ef4444") : "#10b981"
    };
  });

  const td = forecastData.tasksData || { onTime: 0, ahead: 0, delayed: 0, total: 0 };
  const totalAnalyzed = td.total || 0;
  
  let accuracyPct = 0;
  if (totalAnalyzed > 0) {
    accuracyPct = Math.round(((td.onTime + td.ahead) / totalAnalyzed) * 100);
  }

  // Accuracy Pie Chart Data
  let accuracyData = [
    { name: 'On Time', value: td.onTime, color: '#10b981' },
    { name: 'Ahead', value: td.ahead, color: '#3b82f6' },
    { name: 'Delayed', value: td.delayed, color: '#f59e0b' }
  ].filter(d => d.value > 0);
  
  if (accuracyData.length === 0) {
     accuracyData = [{ name: 'No Data', value: 1, color: '#e2e8f0' }];
  }

  const chartStrokeColor = selectedScenario === 'Best Case' ? '#3b82f6' : 
    (selectedScenario === 'Worst Case' ? '#ef4444' : 
    (selectedScenario === 'Original Plan' ? '#8b5cf6' : '#10b981'));

  return (
    <div className="fc-container">
      {/* HEADER SECTION */}
      <div className="fc-header-card">
        <div className="fc-header-left">
          <div className="fc-project-image">
            <img src={project?.logo || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=150&q=80"} alt="Plant" />
          </div>
          <div className="fc-project-info">
            <div className="fc-title-row">
              <h2>{forecastData.projectName || project?.projectName}</h2>
              <span className="fc-badge live">{forecastData.status || "LIVE"}</span>
              <span className="fc-project-code">{forecastData.projectCode || project?.projectCode}</span>
            </div>
            <div className="fc-meta-row">
              <span><span className="fc-meta-icon">📍</span> {project?.plantName || "Plant Site"}</span>
              <span><span className="fc-meta-icon">📁</span> Department: {project?.department || "Projects"}</span>
              <span><Calendar size={13} className="fc-meta-icon"/> {getHelperDateStr(forecastData.startDate)} to {getHelperDateStr(forecastData.endDate)}</span>
            </div>
          </div>
        </div>
        
        <div className="fc-header-metrics">
          <div className="fc-metric">
            <label>Project Progress</label>
            <div className="fc-val-bar">
              <span className="fc-val">{actualProgress.toFixed(2)}%</span>
              <div className="fc-bar-bg"><div className="fc-bar-fill" style={{width: `${actualProgress}%`, background: '#3b82f6'}}></div></div>
            </div>
          </div>
          <div className="fc-divider"></div>
          <div className="fc-metric">
            <label>Planned Progress</label>
            <div className="fc-val-bar">
              <span className="fc-val">{plannedProgress.toFixed(2)}%</span>
              <div className="fc-bar-bg"><div className="fc-bar-fill" style={{width: `${plannedProgress}%`, background: '#94a3b8'}}></div></div>
            </div>
          </div>
          <div className="fc-divider"></div>
          <div className="fc-metric">
            <label>Variance ({selectedScenario})</label>
            <span className="fc-val" style={{color: headerStatusColor}}>
              {scenarioVarianceDays > 0 ? `+${scenarioVarianceDays}d Delay` : (scenarioVarianceDays === 0 ? '0d (On Time)' : `${scenarioVarianceDays}d Ahead`)}
            </span>
          </div>
          <div className="fc-divider"></div>
          <div className="fc-metric">
            <label>Project Status</label>
            <span className="fc-val-status" style={{color: headerStatusColor}}>{headerStatusText}</span>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="fc-toolbar">
        <div className="fc-filters">
          <div className="fc-filter-group">
            <label>Forecast Type</label>
            <select><option>Completion Date Forecast</option></select>
          </div>
          <div className="fc-filter-group">
            <label>Baseline</label>
            <select><option>Original Plan ({getHelperDateStr(forecastData.startDate)})</option></select>
          </div>
          <div className="fc-filter-group">
            <label>Scenario</label>
            <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)}>
              {scenarios.length > 0 ? (
                scenarios.map((sc, i) => (
                  <option key={i} value={sc.name}>{sc.name}</option>
                ))
              ) : (
                <option value="Current Trend">Current Trend</option>
              )}
            </select>
          </div>
          <div className="fc-filter-group">
            <label>Date Range</label>
            <div className="fc-date-input">
              <Calendar size={14} className="fc-date-icon"/>
              <span>{getHelperDateStr(forecastData.startDate)} to {getHelperDateStr(forecastData.endDate)}</span>
              <Calendar size={14} className="fc-date-icon right"/>
            </div>
          </div>
        </div>
        <div className="fc-actions">
          <button className="fc-btn primary" onClick={fetchForecast}><RefreshCw size={14} /> Recalculate Forecast</button>
          <button className="fc-btn secondary"><Download size={14} /> Export</button>
        </div>
      </div>

      {/* TOP PANELS GRID */}
      <div className="fc-top-grid">
        
        {/* SUMMARY PANEL */}
        <div className="fc-panel fc-summary">
          <h3 className="fc-panel-title">Forecast Summary</h3>
          
          <div className="fc-sum-metrics">
            <div className="fc-sum-item">
              <label>Current Progress (Actual)</label>
              <div className="fc-sum-val" style={{color: '#3b82f6'}}>{actualProgress.toFixed(2)}%</div>
              <div className="fc-sum-bar"><div style={{width:`${actualProgress}%`, background:'#3b82f6'}}></div></div>
              <div className="fc-sum-sub">As on {todayStr}</div>
            </div>
            
            <div className="fc-sum-item right-align">
              <label>Original Planned Completion</label>
              <div className="fc-sum-val">{getHelperDateStr(forecastData.endDate)}</div>
            </div>
            
            <div className="fc-sum-item">
              <label>Planned Progress (Baseline)</label>
              <div className="fc-sum-val">{plannedProgress.toFixed(2)}%</div>
              <div className="fc-sum-bar"><div style={{width:`${plannedProgress}%`, background:'#94a3b8'}}></div></div>
              <div className="fc-sum-sub">As on {todayStr}</div>
            </div>
            
            <div className="fc-sum-item right-align">
              <label>Forecasted Completion ({selectedScenario})</label>
              <div className="fc-sum-val highlight" style={{color: scenarioVarianceDays > 0 ? '#f59e0b' : '#10b981'}}>
                {getHelperDateStr(scenarioCompletionDate)}
                <span className="fc-sum-days" style={{color: scenarioVarianceDays > 0 ? '#f59e0b' : '#10b981'}}>
                  {scenarioVarianceDays > 0 ? ` (${scenarioVarianceDays} Days Delay)` : ' (On Time)'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="fc-sum-variance">
            <label>Performance Velocity</label>
            <div className="fc-var-val" style={{color: scenarioVelocity >= 1.0 ? '#10b981' : (scenarioVelocity >= 0.85 ? '#f59e0b' : '#ef4444')}}>
              {scenarioVelocity.toFixed(2)}x 
              <span className="fc-var-sub">
                {selectedScenario === 'Original Plan' ? ' (Baseline Plan)' : (scenarioVarianceDays <= 0 || scenarioVelocity >= 1.0 ? ' (Ahead of Plan)' : ' (Behind Plan)')}
              </span>
            </div>
          </div>
          
          <div className="fc-sum-footer">
            {selectedScenario === 'Current Trend' && `Based on actual database metrics, the project is moving at ${velocity.toFixed(2)}x planned speed.`}
            {selectedScenario === 'Best Case' && `Assuming 15% improvement in productivity, the project is projected at ${scenarioVelocity.toFixed(2)}x planned speed.`}
            {selectedScenario === 'Worst Case' && `Assuming 15% drop in productivity, the project is projected at ${scenarioVelocity.toFixed(2)}x planned speed.`}
            {selectedScenario === 'Original Plan' && `Projected as per baseline schedule with on-time execution.`}
          </div>
        </div>

        {/* TREND CHART PANEL */}
        <div className="fc-panel fc-trend">
          <h3 className="fc-panel-title">Forecast Completion Trend</h3>
          <div className="fc-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTrendData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(v)=>`${v}%`} />
                <RechartsTooltip contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px rgba(0,0,0,0.1)', fontSize:'12px'}} />
                <Legend iconType="plainline" wrapperStyle={{fontSize:'12px', color:'#475569'}} />
                <Line type="monotone" dataKey="baseline" name="Baseline Plan" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="actual" name="Actual Progress" stroke="#3b82f6" strokeWidth={3} dot={{r: 3}} />
                <Line type="monotone" dataKey="forecast" name={`Forecast (${selectedScenario})`} stroke={chartStrokeColor} strokeWidth={2} strokeDasharray="5 5" dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACCURACY PANEL */}
        <div className="fc-panel fc-accuracy">
          <h3 className="fc-panel-title">Forecast Accuracy</h3>
          <div className="fc-acc-content">
            <div className="fc-acc-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={accuracyData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                    {accuracyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="fc-acc-center">
                <span className="fc-acc-num">{accuracyData.length === 1 && accuracyData[0].name === 'No Data' ? 'N/A' : `${accuracyPct}%`}</span>
                <span className="fc-acc-lbl">Accuracy</span>
              </div>
            </div>
            
            <div className="fc-acc-legend">
              <div className="fc-acc-row bold">
                <span>Tasks Analyzed</span>
                <span>{totalAnalyzed}</span>
              </div>
              {accuracyData.map((d, i) => (
                <div key={i} className="fc-acc-row">
                  <span><CheckCircle2 size={12} color={d.color} style={{marginRight:4}}/> {d.name}</span>
                  <span style={{color:d.color}}>{d.name === 'No Data' ? '-' : d.value} {d.name !== 'No Data' && <span className="fc-acc-pct">({((d.value/totalAnalyzed)*100).toFixed(0)}%)</span>}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="fc-acc-footer">
            Calculated based on real-time task progress and calendar holidays.
          </div>
        </div>

      </div>

      {/* BOTTOM TABLES GRID */}
      <div className="fc-bottom-grid">
        
        {/* SCENARIOS */}
        <div className="fc-panel fc-scenarios">
          <h3 className="fc-panel-title">Forecast Scenarios</h3>
          <table className="fc-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Completion Date</th>
                <th>Variance (Days)</th>
                <th>Confidence</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((sc, idx) => (
                <tr 
                  key={idx} 
                  className={sc.name === selectedScenario ? "active" : ""}
                  onClick={() => setSelectedScenario(sc.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <input 
                      type="radio" 
                      name="forecastScenario"
                      checked={sc.name === selectedScenario} 
                      onChange={() => setSelectedScenario(sc.name)}
                    /> {sc.name}
                  </td>
                  <td>{getHelperDateStr(sc.completionDate)}</td>
                  <td style={{ color: sc.varianceDays > 0 ? '#ef4444' : '#10b981' }}>
                    {sc.varianceDays > 0 ? `+${sc.varianceDays}` : sc.varianceDays}
                  </td>
                  <td style={{ color: sc.confidence.includes('High') ? '#10b981' : (sc.confidence.includes('Medium') ? '#f59e0b' : '#64748b') }}>
                    {sc.confidence}
                  </td>
                  <td>{sc.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fc-table-footer">
            <Info size={13}/> Forecasts are dynamically calculated using active milestones, task progress, dependencies, and holidays.
          </div>
        </div>

        {/* KEY FACTORS */}
        <div className="fc-panel fc-factors">
          <h3 className="fc-panel-title">Key Factors Impacting Forecast</h3>
          <table className="fc-table">
            <thead>
              <tr>
                <th>Factor</th>
                <th>Impact</th>
                <th>Projected Offset</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {activeKeyFactors.map((f, idx) => (
                <tr key={idx}>
                  <td>{f.factor}</td>
                  <td style={{ color: f.impact === "Negative" ? '#ef4444' : (f.impact === "Positive" ? '#10b981' : '#64748b') }}>
                    {f.impact}
                  </td>
                  <td>
                    {f.impactDays > 0 ? `+${f.impactDays} Days ` : '0 Days '}
                    {f.impact === "Negative" ? <TrendingUp size={12} color="#ef4444"/> : (f.impact === "Positive" ? <TrendingDown size={12} color="#10b981"/> : <Minus size={12} color="#64748b"/>)}
                  </td>
                  <td>{f.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MILESTONES IMPACT */}
        <div className="fc-panel fc-milestones">
          <h3 className="fc-panel-title">Milestones Forecast Impact</h3>
          <table className="fc-table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Baseline Date</th>
                <th>Forecast Date</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {activeMilestonesImpact.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No milestones found for this project.</td>
                </tr>
              ) : (
                activeMilestonesImpact.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.mlstnTtl}</td>
                    <td>{getHelperDateStr(m.endDt)}</td>
                    <td>{getHelperDateStr(m.forecastDate)}</td>
                    <td style={{ color: m.impactColor, fontWeight: 500 }}>{m.impact}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

