"use client";

import { useActionState } from "react";
import type { Inquiry } from "@/lib/types";
import { updateInquiry, type FormState } from "@/app/admin/actions";
import { FormFeedback, SubmitButton } from "./ui";
import Select from "@/components/ui/Select";
import { useAdminT } from "./AdminI18n";

export default function InquiryForm({ inquiry }: { inquiry: Inquiry }) {
  const { t } = useAdminT();
  const [state, action] = useActionState<FormState, FormData>(updateInquiry, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-paper p-6 ring-1 ring-mist">
      <input type="hidden" name="id" value={inquiry.id} />
      <div>
        <label className="label" htmlFor="status">{t.inquiry.status}</label>
        <Select
          id="status"
          name="status"
          defaultValue={inquiry.status}
          options={[
            { value: "ny", ...t.status.ny, dot: "#d8285a" },
            { value: "pågår", ...t.status.pågår, dot: "#d97706" },
            { value: "klar", ...t.status.klar, dot: "#059669" },
            { value: "arkiverad", ...t.status.arkiverad, dot: "#9aa9ae" },
          ]}
        />
      </div>
      <div>
        <label className="label" htmlFor="notes">{t.inquiry.notes}</label>
        <textarea className="field min-h-32" id="notes" name="notes" defaultValue={inquiry.notes} placeholder={t.inquiry.notesPlaceholder} />
        <p className="hint mt-1">{t.inquiry.notesHint}</p>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>{t.common.save}</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
