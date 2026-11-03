"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { request, usePoll } from "@/lib/chat-client";

type Summary = { newCount: number; rev: string };
const Ctx = createContext<Summary>({ newCount: 0, rev: "" });

/**
 * Keeps the number of new requests fresh in the whole admin panel (menu badge, tab title).
 * When requests change while the overview or the request list is open, that page is re-rendered,
 * so a new request appears as a new row. Checks more often on those pages.
 */
export function InquiryLiveProvider({ initial, children }: { initial: Summary; children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const router = useRouter();
  const path = usePathname();
  const onList = path === "/admin" || path === "/admin/forfragningar";
  const rev = useRef(initial.rev);

  // the server sent fresh numbers (navigation, or after a change made in this browser)
  useEffect(() => {
    rev.current = initial.rev;
    setState(initial);
  }, [initial.rev, initial.newCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = useCallback(async () => {
    const s = await request<Summary>("/api/admin/inquiries");
    if (s.rev === rev.current) return;
    rev.current = s.rev;
    setState(s);
    if (onList) router.refresh();
  }, [onList, router]);
  usePoll(check, onList ? 5000 : 20000);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useInquiryLive = () => useContext(Ctx);
