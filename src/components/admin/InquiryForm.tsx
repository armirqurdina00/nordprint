"use client";

import { useActionState } from "react";
import type { Inquiry } from "@/lib/types";
import { updateInquiry, type FormState } from "@/app/admin/actions";
import { FormFeedback, SubmitButton } from "./ui";
import Select from "@/components/ui/Select";

export default function InquiryForm({ inquiry }: { inquiry: Inquiry }) {
  const [state, action] = useActionState<FormState, FormData>(updateInquiry, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-paper p-6 ring-1 ring-mist">
      <input type="hidden" name="id" value={inquiry.id} />
      <div>
        <label className="label" htmlFor="status">Status</label>
        <Select
          id="status"
          name="status"
          defaultValue={inquiry.status}
          options={[
            { value: "ny", label: "Ny", hint: "Inte besvarad än", dot: "#d8285a" },
            { value: "pågår", label: "Pågår", hint: "Prisförslag skickat eller under arbete", dot: "#d97706" },
            { value: "klar", label: "Klar", hint: "Levererad eller avslutad", dot: "#059669" },
            { value: "arkiverad", label: "Arkiverad", hint: "Döljs från listan Aktiva", dot: "#9aa9ae" },
          ]}
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">Egna anteckningar</label>
        <textarea className="field min-h-32" id="notes" name="notes" defaultValue={inquiry.notes} placeholder="Pris, material, vad ni kommit överens om…" />
        <p className="hint mt-1">Syns bara här i adminpanelen.</p>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Spara</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
