import type { InquiryStatus } from "@/lib/types";

const STYLE: Record<InquiryStatus, string> = {
  ny: "bg-hallon text-white",
  pågår: "bg-amber-100 text-amber-900",
  klar: "bg-emerald-100 text-emerald-900",
  arkiverad: "bg-mist text-fjord",
};

export default function StatusPill({ status }: { status: InquiryStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium capitalize ${STYLE[status]}`}>{status}</span>;
}
