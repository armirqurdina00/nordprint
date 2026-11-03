"use client";

import { openChatAbout } from "@/lib/chat-client";
import type { ChatProductRef } from "@/lib/types";

/** Opens the chat with this product attached, so the studio sees what the question is about. */
export default function AskInChat({ product, label, className = "" }: { product: ChatProductRef; label: string; className?: string }) {
  return (
    <button type="button" onClick={() => openChatAbout(product)} className={className}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11.5c0 4.14-3.58 7.5-8 7.5-1.2 0-2.34-.25-3.36-.7L4 19.5l1.2-3.6A7.1 7.1 0 0 1 4 11.5C4 7.36 7.58 4 12 4s8 3.36 8 7.5Z" />
      </svg>
      {label}
    </button>
  );
}
