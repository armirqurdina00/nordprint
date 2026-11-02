"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";
import Logo from "@/components/site/Logo";

export default function Login() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <main className="print-layers grid min-h-screen place-items-center px-5">
      <form action={action} className="w-full max-w-sm rounded-[22px] bg-paper p-8 shadow-xl ring-1 ring-mist">
        <Logo />
        <h1 className="mt-6 font-sans text-2xl font-semibold tracking-normal">Logga in i adminpanelen</h1>
        <label className="label mt-6" htmlFor="password">Lösenord</label>
        <input className="field" id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
        {state.error && <p role="alert" className="mt-3 font-medium text-hallon-dark">{state.error}</p>}
        <button className="btn btn-primary mt-6 w-full" disabled={pending}>{pending ? "Loggar in…" : "Logga in"}</button>
      </form>
    </main>
  );
}
