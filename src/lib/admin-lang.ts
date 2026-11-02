import "server-only";
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, adminT, isAdminLang, type AdminLang } from "./admin-i18n";

export async function getAdminLang(): Promise<AdminLang> {
  const v = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  return isAdminLang(v) ? v : "sv";
}

export async function getAdminT() {
  return adminT(await getAdminLang());
}
