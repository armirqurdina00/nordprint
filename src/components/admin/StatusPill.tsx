import type { InquiryStatus } from "@/lib/types";
import type { AdminDict } from "@/lib/admin-i18n";

const STYLE: Record<InquiryStatus, string> = {
  ny: "bg-hallon text-white",
  pågår: "bg-amber-100 text-amber-900",
  klar: "bg-emerald-100 text-emerald-900",
  arkiverad: "bg-mist text-fjord",
};

export default function StatusPill({ status, t }: { status: InquiryStatus; t: AdminDict }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${STYLE[status]}`}>{t.status[status].label}</span>;
}
