import type { Metadata } from "next";
import { getAdminLang } from "@/lib/admin-lang";
import { AdminI18nProvider } from "@/components/admin/AdminI18n";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin | NordPrint Studio", robots: { index: false } };

export default async function Login() {
  return (
    <AdminI18nProvider lang={await getAdminLang()}>
      <LoginForm />
    </AdminI18nProvider>
  );
}
