"use client";

import React from "react";
import { ChatProvider } from "@/context/ChatContext";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";

export function ChatApp() {
  return (
    <ChatProvider>
      <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden select-text">
        <Sidebar />
        <ChatArea />
      </div>
    </ChatProvider>
  );
}

