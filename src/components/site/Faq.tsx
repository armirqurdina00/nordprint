import type { FaqItem } from "@/lib/types";

export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-8 divide-y divide-mist border-y border-mist">
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden className="relative h-4 w-4 shrink-0">
              <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-granite" />
              <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-granite transition-transform group-open:rotate-90 group-open:opacity-0" />
            </span>
          </summary>
          <p className="max-w-prose pb-5 text-fjord">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
