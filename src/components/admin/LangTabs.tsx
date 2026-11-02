"use client";

import { useId, useState } from "react";
import type { Lang } from "@/lib/types";

const LABELS: Record<Lang, string> = { sv: "Svenska", en: "English" };

/**
 * Two panels, one per language. Both stay in the form (the inactive one is only hidden),
 * so saving always submits both languages.
 */
export default function LangTabs({
  children,
  missing = {},
}: {
  children: (lang: Lang) => React.ReactNode;
  missing?: Partial<Record<Lang, boolean>>;
}) {
  const [active, setActive] = useState<Lang>("sv");
  const id = useId();
  return (
    <div>
      <div role="tablist" aria-label="Språk" className="mb-4 inline-flex rounded-full bg-snow p-1 ring-1 ring-mist">
        {(["sv", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            id={`${id}-tab-${l}`}
            aria-selected={active === l}
            aria-controls={`${id}-panel-${l}`}
            onClick={() => setActive(l)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${active === l ? "bg-granite text-snow" : "text-fjord hover:text-granite"}`}
          >
            {LABELS[l]}
            {missing[l] && <span className="h-2 w-2 rounded-full bg-hallon" title="Inte översatt" />}
          </button>
        ))}
      </div>
      {(["sv", "en"] as Lang[]).map((l) => (
        <div key={l} role="tabpanel" id={`${id}-panel-${l}`} aria-labelledby={`${id}-tab-${l}`} hidden={active !== l} className="space-y-4">
          {l === "en" && <p className="hint">Tomma fält visar den svenska texten på den engelska sidan.</p>}
          {children(l)}
        </div>
      ))}
    </div>
  );
}
