"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { request, usePoll } from "@/lib/chat-client";

type Live = { unread: number; rev: number; refresh: () => Promise<void> };
const Ctx = createContext<Live>({ unread: 0, rev: 0, refresh: async () => undefined });

/**
 * Keeps the number of unread chat messages fresh in the whole admin panel (menu badge, tab title)
 * and tells the inbox when something changed. Checks more often while the chat is open.
 */
export function ChatLiveProvider({ initial, children }: { initial: { unread: number; rev: number }; children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const path = usePathname();
  const onChat = path.startsWith("/admin/chatt");

  const refresh = useCallback(async () => {
    const s = await request<{ unread: number; rev: number }>("/api/admin/chat");
    setState((old) => (old.unread === s.unread && old.rev === s.rev ? old : s));
  }, []);
  usePoll(refresh, onChat ? 4000 : 20000);

  // "(2) Chatt | Admin" in the browser tab, so new messages are noticed from other tabs
  // Next sets the page title after this runs, so re-apply whenever the title changes
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\) /, "");
      const wanted = state.unread > 0 ? `(${state.unread}) ${base}` : base;
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [state.unread]);

  return <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>;
}

export const useChatLive = () => useContext(Ctx);
