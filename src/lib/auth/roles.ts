export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin';
}
