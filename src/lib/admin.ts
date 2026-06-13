export type AdminAccessState =
  | {
      ok: true;
      password: string;
    }
  | {
      ok: false;
      reason: "missing_config" | "unauthorized";
    };

export function checkAdminAccess(password: string | string[] | undefined): AdminAccessState {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return {
      ok: false,
      reason: "missing_config"
    };
  }

  const providedPassword = Array.isArray(password) ? password[0] : password;

  if (providedPassword !== adminPassword) {
    return {
      ok: false,
      reason: "unauthorized"
    };
  }

  return {
    ok: true,
    password: adminPassword
  };
}
