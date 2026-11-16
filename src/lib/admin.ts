import {cookies} from 'next/headers';
import {ADMIN_SESSION_COOKIE,verifyAdminToken,sameSecret} from './adminToken';
export type AdminAccessState =
  | {
      ok: true;
      password: string;
    }
  | {
      ok: false;
      reason: "missing_config" | "unauthorized";
    };

export async function checkAdminAccess(password: string | string[] | undefined): Promise<AdminAccessState> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return {
      ok: false,
      reason: "missing_config"
    };
  }

  if(verifyAdminToken((await cookies()).get(ADMIN_SESSION_COOKIE)?.value,adminPassword))return {ok:true,password:''};

  const providedPassword = Array.isArray(password) ? password[0] : password;

  if (!providedPassword || !sameSecret(providedPassword,adminPassword)) {
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
