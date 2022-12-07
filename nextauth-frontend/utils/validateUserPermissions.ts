type User = {
  permissions: string[];
  roles: string[];
}

type ValidateUserPermissionsParams = {
  user: User | undefined;
  permissions?: string[];
  roles?: string[];
}

export function validateUserPermissions({
  user = {} as { email: string, permissions: string[], roles: string[] },
  permissions,
  roles
}: ValidateUserPermissionsParams) {
  if (permissions?.length && permissions?.length > 0) {
    const hasAllPermissions = permissions.some(permission => {
      return user?.permissions.includes(permission);
    });

    if (!hasAllPermissions) {
      return false;
    }
  }

  if (roles?.length && roles?.length > 0) {
    const hasAllRoles = roles.some(role => {
      return user?.roles.includes(role);
    });

    if (!hasAllRoles) {
      return false;
    }
  }

  return true;
}