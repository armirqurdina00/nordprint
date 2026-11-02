"use client";

import { useActionState, useState } from "react";
import type { Lang, Settings, SettingsText } from "@/lib/types";
import { saveSettings, type FormState } from "@/app/admin/actions";
import { moveFilesToBlob } from "@/lib/upload-client";
import type { BlobMode } from "@/lib/upload-rules";
import { FormFeedback, ListEditor, SubmitButton } from "./ui";
import LangTabs from "./LangTabs";
import { useAdminT } from "./AdminI18n";
import { uploadErrorMessage } from "@/lib/admin-i18n";
import { UploadError } from "@/lib/upload-rules";
import Logo from "@/components/site/Logo";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-mist py-8 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="font-sans text-lg font-semibold tracking-normal">{title}</h2>
        {hint && <p className="hint mt-1">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Input({ name, label, value, multiline, hint, placeholder }: { name: string; label: string; value: string; multiline?: boolean; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {multiline ? (
        <textarea className="field min-h-28" id={name} name={name} defaultValue={value} placeholder={placeholder} />
      ) : (
        <input className="field" id={name} name={name} defaultValue={value} placeholder={placeholder} />
      )}
      {hint && <p className="hint mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsForm({ settings: s, direct = null }: { settings: Settings; direct?: BlobMode }) {
  const { t } = useAdminT();
  const c = t.content;
  const [state, action] = useActionState<FormState, FormData>(async (prev, form) => {
    if (direct) {
      try {
        await moveFilesToBlob(form, "logoFile", "site", direct);
      } catch (e) {
        return { error: e instanceof UploadError ? uploadErrorMessage(t, e) : (e as Error).message };
      }
    }
    return saveSettings(prev, form);
  }, {});
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const tx = (l: Lang): SettingsText => s[l];
  const missing = { en: !s.en.heroTitle };
  const currentLogo = removeLogo ? "" : logoPreview || s.logo;

  return (
    <form action={action}>
      <Section title={c.logo} hint={c.logoHint}>
        <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-paper p-5 ring-1 ring-mist">
          <div className="grid h-20 min-w-40 place-items-center rounded-xl bg-snow px-4 text-granite">
            <Logo src={currentLogo} />
          </div>
          <div className="space-y-2">
            <label className="btn btn-ghost cursor-pointer py-2">
              {c.chooseFile}
              <input
                type="file"
                name="logoFile"
                accept="image/svg+xml,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setLogoPreview(f ? URL.createObjectURL(f) : "");
                  setRemoveLogo(false);
                }}
              />
            </label>
            {(s.logo || logoPreview) && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeLogo" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} className="accent-hallon" />
                {c.useDrawnLogo}
              </label>
            )}
            <p className="hint">{c.max2mb}</p>
          </div>
        </div>
      </Section>

      <div className="border-t border-mist pt-8">
        <LangTabs missing={missing}>
          {(l) => (
            <div className="-mt-4">
              <Section title={c.home} hint={c.homeHint}>
                <Input name={`${l}_announcement`} label={c.announcement} value={tx(l).announcement} hint={c.announcementHint} />
                <Input name={`${l}_heroTitle`} label={c.heading} value={tx(l).heroTitle} placeholder={l === "en" ? s.sv.heroTitle : undefined} />
                <Input name={`${l}_heroText`} label={c.intro2} value={tx(l).heroText} multiline />
              </Section>
              <Section title={c.services} hint={c.servicesHint}>
                <ListEditor name={`${l}_services`} initial={tx(l).services} addLabel={c.addService} fields={[{ key: "title", label: c.heading }, { key: "text", label: c.text, multiline: true }]} />
              </Section>
              <Section title={c.steps} hint={c.stepsHint}>
                <ListEditor name={`${l}_steps`} initial={tx(l).steps} addLabel={c.addStep} fields={[{ key: "title", label: c.step }, { key: "text", label: c.text, multiline: true }]} />
              </Section>
              <Section title={c.about}>
                <Input name={`${l}_aboutTitle`} label={c.heading} value={tx(l).aboutTitle} />
                <Input name={`${l}_aboutText`} label={c.text} value={tx(l).aboutText} multiline />
              </Section>
              <Section title={c.faq}>
                <ListEditor name={`${l}_faq`} initial={tx(l).faq} addLabel={c.addQuestion} fields={[{ key: "q", label: c.question }, { key: "a", label: c.answer, multiline: true }]} />
              </Section>
              <Section title={c.terms} hint={c.termsHint(l === "sv" ? "/villkor" : "/en/terms")}>
                <ListEditor name={`${l}_policies`} initial={tx(l).policies} addLabel={c.addSection} fields={[{ key: "title", label: c.heading }, { key: "text", label: c.text, multiline: true }]} />
              </Section>
            </div>
          )}
        </LangTabs>
      </div>

      <Section title={c.company} hint={c.companyHint}>
        <Input name="brandName" label={c.brandName} value={s.brandName} />
        <Input name="instagram" label={c.instagram} value={s.instagram} />
        <Input name="email" label={c.email} value={s.email} hint={c.emailHint} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="location" label={c.location} value={s.location} />
          <Input name="orgNumber" label={c.orgNumber} value={s.orgNumber} />
        </div>
      </Section>
      <div className="sticky bottom-0 -mx-5 flex items-center gap-4 border-t border-mist bg-snow/90 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        <SubmitButton>{t.common.saveChanges}</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
