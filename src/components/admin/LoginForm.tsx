"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/admin/actions";
import Logo from "@/components/site/Logo";
import { AdminLangSwitch, useAdminT } from "./AdminI18n";

export default function LoginForm() {
  const { t } = useAdminT();
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <main className="print-layers grid min-h-screen place-items-center px-5">
      <form action={action} className="w-full max-w-sm rounded-[22px] bg-paper p-8 shadow-xl ring-1 ring-mist">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <AdminLangSwitch tone="light" />
        </div>
        <h1 className="mt-6 font-sans text-2xl font-semibold tracking-normal">{t.login.title}</h1>
        <label className="label mt-6" htmlFor="password">{t.login.password}</label>
        <input className="field" id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
        {state.error && <p role="alert" className="mt-3 font-medium text-hallon-dark">{state.error}</p>}
        <button className="btn btn-primary mt-6 w-full" disabled={pending}>{pending ? t.login.submitting : t.login.submit}</button>
      </form>
    </main>
  );
}
