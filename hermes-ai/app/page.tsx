"use client";

import dynamic from "next/dynamic";
import { HermesLogo } from "@/components/Icons";

const ChatApp = dynamic(
  () => import("@/components/ChatApp").then((mod) => mod.ChatApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg shadow-indigo-500/10 animate-pulse">
            <HermesLogo className="w-7 h-7 text-indigo-400" />
          </div>
          <span className="text-xs font-medium text-zinc-400">Loading Fwinobox AI...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <ChatApp />;
}
