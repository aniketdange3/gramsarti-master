export const hasAccess = (user: any, featureId: string, allowedRoles?: string[]) => {
  return hasModulePermission(user, featureId, 'view', allowedRoles);
};

export const hasModulePermission = (user: any, featureId: string, action: 'view' | 'add' | 'edit' | 'delete' | 'any' | 'filter', allowedRoles?: string[]) => {
  if (!user) return false;
  const isAdminRole = user.role === 'super_admin' || user.role === 'gram_sachiv' || user.role === 'gram_sevak';
  if (isAdminRole) return true;

  if (allowedRoles && !allowedRoles.includes(user.role)) return false;

  const allowedModules = user.allowed_modules || 'dashboard';

  // If new JSON based permissions
  if (allowedModules.startsWith('{')) {
    try {
      const perms = JSON.parse(allowedModules);
      if (!perms[featureId]) return false;
      if (action === 'any') return Object.values(perms[featureId]).some(v => v);
      return !!perms[featureId][action];
    } catch (e) {
      console.error("Invalid permissions JSON", e);
      return false;
    }
  }

  // Legacy fallback (comma separated list string)
  const modulesList = allowedModules.split(',');
  if (!modulesList.includes(featureId)) return false;

  if (action === 'any' || action === 'view') {
    return user.can_view !== undefined ? !!user.can_view : true;
  }
  if (action === 'add') return !!user.can_add;
  if (action === 'edit') return !!user.can_edit;
  if (action === 'delete') return !!user.can_delete;

  return true;
};
