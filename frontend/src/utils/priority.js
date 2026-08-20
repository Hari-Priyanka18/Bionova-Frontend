/**
 * Utility functions for calculating dynamic project priority.
 * 
 * Database Priority Mapping:
 * 1: LOW
 * 2: NORMAL
 * 3: MEDIUM
 * 4: HIGH
 * 5: CRITICAL
 * 6: ATMOST CRITICAL
 * 
 * Rules:
 * - Base priorities progress towards HIGH as due date approaches:
 *   - LOW (1): 4 stages before due date (stepDays = totalDays / 4) -> LOW, NORMAL, MEDIUM, HIGH
 *   - NORMAL (2): 3 stages before due date (stepDays = totalDays / 3) -> NORMAL, MEDIUM, HIGH
 *   - MEDIUM (3): 2 stages before due date (stepDays = totalDays / 2) -> MEDIUM, HIGH
 *   - HIGH (4): 1 stage before due date -> HIGH
 * - When Due Date passes (Overdue):
 *   - Up to 1 stepDays overdue -> CRITICAL (5)
 *   - After 1 stepDays overdue -> ATMOST CRITICAL (6)
 */

export const getPriorityMetadata = (name, id = null) => {
  const norm = String(name || 'LOW').toUpperCase().trim();
  switch (norm) {
    case 'LOW':
      return {
        priority: 'LOW',
        priorityId: id || 1,
        color: '#22C55E',
        bgColor: '#f0fdf4',
        borderColor: '#22c55e40',
        badgeClass: 'low'
      };
    case 'NORMAL':
      return {
        priority: 'NORMAL',
        priorityId: id || 2,
        color: '#3B82F6',
        bgColor: '#eff6ff',
        borderColor: '#3b82f640',
        badgeClass: 'normal'
      };
    case 'MEDIUM':
      return {
        priority: 'MEDIUM',
        priorityId: id || 3,
        color: '#F59E0B',
        bgColor: '#fff7ed',
        borderColor: '#f59e0b40',
        badgeClass: 'medium'
      };
    case 'HIGH':
      return {
        priority: 'HIGH',
        priorityId: id || 4,
        color: '#EF4444',
        bgColor: '#fef2f2',
        borderColor: '#ef444440',
        badgeClass: 'high'
      };
    case 'CRITICAL':
      return {
        priority: 'CRITICAL',
        priorityId: id || 5,
        color: '#FFFFFF',
        bgColor: '#B91C1C',
        borderColor: '#b91c1c',
        badgeClass: 'critical'
      };
    case 'ATMOST CRITICAL':
    case 'ATMOST_CRITICAL':
      return {
        priority: 'ATMOST CRITICAL',
        priorityId: id || 6,
        color: '#FFFFFF',
        bgColor: '#7F1D1D',
        borderColor: '#7f1d1d',
        badgeClass: 'atmost-critical'
      };
    default:
      return {
        priority: norm,
        priorityId: id || 1,
        color: '#64748b',
        bgColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        badgeClass: 'default'
      };
  }
};

export const calculateDynamicPriority = (basePriority, startDateStr, endDateStr, customTotalDays = null) => {
  // Normalize base priority string or ID
  let baseP = String(basePriority || 'LOW').trim().toUpperCase();
  let baseId = 1;
  if (baseP === '1' || baseP === 'LOW') { baseId = 1; baseP = 'LOW'; }
  else if (baseP === '2' || baseP === 'NORMAL') { baseId = 2; baseP = 'NORMAL'; }
  else if (baseP === '3' || baseP === 'MEDIUM') { baseId = 3; baseP = 'MEDIUM'; }
  else if (baseP === '4' || baseP === 'HIGH') { baseId = 4; baseP = 'HIGH'; }
  else if (baseP === '5' || baseP === 'CRITICAL') { baseId = 5; baseP = 'CRITICAL'; }
  else if (baseP === '6' || baseP === 'ATMOST CRITICAL' || baseP === 'ATMOST_CRITICAL') { baseId = 6; baseP = 'ATMOST CRITICAL'; }
  else { baseId = 1; baseP = 'LOW'; }

  // If already manually set to overdue tiers in DB
  if (baseId >= 5) {
    return getPriorityMetadata(baseP, baseId);
  }

  // Return base metadata if no end date
  if (!endDateStr) {
    return getPriorityMetadata(baseP, baseId);
  }

  const endD = new Date(endDateStr);
  if (isNaN(endD.getTime())) {
    return getPriorityMetadata(baseP, baseId);
  }

  let startD = startDateStr ? new Date(startDateStr) : null;
  if (startD && isNaN(startD.getTime())) startD = null;
  if (startD) startD.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(endDateStr);
  endOfDay.setHours(0, 0, 0, 0);

  // Total Duration in Days
  let totalDays = 8;
  if (customTotalDays && !isNaN(Number(customTotalDays)) && Number(customTotalDays) > 0) {
    totalDays = Number(customTotalDays);
  } else if (startD && endD) {
    const diffMs = endOfDay.getTime() - startD.getTime();
    totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Number of stages remaining before due date
  const stagesLeft = Math.max(1, 5 - baseId); // 4 for LOW, 3 for NORMAL, 2 for MEDIUM, 1 for HIGH
  const stepDays = Math.max(0.5, totalDays / stagesLeft);

  // Overdue Check
  if (today > endOfDay) {
    const overdueDays = Math.max(1, Math.ceil((today.getTime() - endOfDay.getTime()) / (1000 * 60 * 60 * 24)));
    if (overdueDays <= stepDays) {
      return getPriorityMetadata('CRITICAL', 5);
    } else {
      return getPriorityMetadata('ATMOST CRITICAL', 6);
    }
  }

  // Pre-due: Elapsed Days calculation
  let elapsedDays = 0;
  if (startD) {
    const diffStart = today.getTime() - startD.getTime();
    elapsedDays = Math.max(0, Math.floor(diffStart / (1000 * 60 * 60 * 24)));
  } else {
    const remainingDays = Math.max(0, Math.ceil((endOfDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    elapsedDays = Math.max(0, totalDays - remainingDays);
  }

  // Calculate current stage
  const currentStageIndex = Math.min(stagesLeft - 1, Math.floor(elapsedDays / stepDays));
  const currentPriorityId = baseId + currentStageIndex;

  const priorityNames = {
    1: 'LOW',
    2: 'NORMAL',
    3: 'MEDIUM',
    4: 'HIGH',
    5: 'CRITICAL',
    6: 'ATMOST CRITICAL'
  };

  const finalName = priorityNames[currentPriorityId] || 'HIGH';
  return getPriorityMetadata(finalName, currentPriorityId);
};
