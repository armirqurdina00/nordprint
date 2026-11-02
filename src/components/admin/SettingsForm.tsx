"use client";

import { useActionState, useState } from "react";
import type { Lang, Settings, SettingsText } from "@/lib/types";
import { saveSettings, type FormState } from "@/app/admin/actions";
import { moveFilesToBlob } from "@/lib/upload-client";
import { FormFeedback, ListEditor, SubmitButton } from "./ui";
import LangTabs from "./LangTabs";
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

export default function SettingsForm({ settings: s, direct = false }: { settings: Settings; direct?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, form) => {
    if (direct) {
      try {
        await moveFilesToBlob(form, "logoFile", "site");
      } catch (e) {
        return { error: (e as Error).message };
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
      <Section title="Logotyp" hint="Ladda upp originalfilen för att ersätta den ritade logotypen. SVG eller PNG med transparent bakgrund fungerar bäst.">
        <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-paper p-5 ring-1 ring-mist">
          <div className="grid h-20 min-w-40 place-items-center rounded-xl bg-snow px-4 text-granite">
            <Logo src={currentLogo} />
          </div>
          <div className="space-y-2">
            <label className="btn btn-ghost cursor-pointer py-2">
              Välj fil
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
                Använd den ritade logotypen igen
              </label>
            )}
            <p className="hint">Högst 2 MB.</p>
          </div>
        </div>
      </Section>

      <div className="border-t border-mist pt-8">
        <LangTabs missing={missing}>
          {(l) => (
            <div className="-mt-4">
              <Section title="Startsidan" hint="Det första besökarna ser.">
                <Input name={`${l}_announcement`} label="Meddelandefält" value={tx(l).announcement} hint="Visas överst på alla sidor. Lämna tomt för att dölja." />
                <Input name={`${l}_heroTitle`} label="Rubrik" value={tx(l).heroTitle} placeholder={l === "en" ? s.sv.heroTitle : undefined} />
                <Input name={`${l}_heroText`} label="Ingress" value={tx(l).heroText} multiline />
              </Section>
              <Section title="Tjänster" hint="Listan under produkterna på startsidan.">
                <ListEditor name={`${l}_services`} initial={tx(l).services} addLabel="Lägg till tjänst" fields={[{ key: "title", label: "Rubrik" }, { key: "text", label: "Text", multiline: true }]} />
              </Section>
              <Section title="Så funkar det" hint="Stegen visas i ordning, numrerade.">
                <ListEditor name={`${l}_steps`} initial={tx(l).steps} addLabel="Lägg till steg" fields={[{ key: "title", label: "Steg" }, { key: "text", label: "Text", multiline: true }]} />
              </Section>
              <Section title="Om oss">
                <Input name={`${l}_aboutTitle`} label="Rubrik" value={tx(l).aboutTitle} />
                <Input name={`${l}_aboutText`} label="Text" value={tx(l).aboutText} multiline />
              </Section>
              <Section title="Vanliga frågor">
                <ListEditor name={`${l}_faq`} initial={tx(l).faq} addLabel="Lägg till fråga" fields={[{ key: "q", label: "Fråga" }, { key: "a", label: "Svar", multiline: true }]} />
              </Section>
              <Section title="Köpvillkor" hint={l === "sv" ? "Visas på sidan /villkor." : "Visas på sidan /en/terms."}>
                <ListEditor name={`${l}_policies`} initial={tx(l).policies} addLabel="Lägg till avsnitt" fields={[{ key: "title", label: "Rubrik" }, { key: "text", label: "Text", multiline: true }]} />
              </Section>
            </div>
          )}
        </LangTabs>
      </div>

      <Section title="Företagsuppgifter" hint="Samma på båda språken.">
        <Input name="brandName" label="Företagsnamn" value={s.brandName} />
        <Input name="instagram" label="Instagram-länk" value={s.instagram} />
        <Input name="email" label="E-post" value={s.email} hint="Lämna tomt om kunderna bara ska kontakta er via Instagram och formuläret." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="location" label="Ort" value={s.location} />
          <Input name="orgNumber" label="Organisationsnummer" value={s.orgNumber} />
        </div>
      </Section>
      <div className="sticky bottom-0 -mx-5 flex items-center gap-4 border-t border-mist bg-snow/90 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        <SubmitButton>Spara ändringar</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
