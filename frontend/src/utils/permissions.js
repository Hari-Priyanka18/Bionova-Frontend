/**
 * permissions.js — Centralized RBAC permission helper for Frontend.
 */

export const getScreenPermission = (screenCode) => {
  const userRole = (sessionStorage.getItem("userRole") || localStorage.getItem("userRole") || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "full_access";

  // Admins get full permissions across all modules
  if (isAdmin) {
    return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  }

  const raw = sessionStorage.getItem("userPermissions");
  if (!raw) {
    // If permissions not yet cached, fallback to full permissions
    return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  }

  try {
    const permissions = JSON.parse(raw);
    const screenPerm = permissions.find(p => p.screenCode === screenCode);
    if (!screenPerm) {
      return { canView: false, canCreate: false, canEdit: false, canDelete: false };
    }

    return {
      canView: !!screenPerm.viewFlg,
      canCreate: !!screenPerm.addFlg,
      canEdit: !!screenPerm.editFlg,
      canDelete: !!screenPerm.deleteFlg
    };
  } catch (e) {
    console.warn("Failed to parse userPermissions from sessionStorage:", e);
    return { canView: true, canCreate: true, canEdit: true, canDelete: true };
  }
};
