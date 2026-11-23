"use client";

import React from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export function ChatArea() {
  return (
    <main className="flex-1 flex flex-col h-full min-w-0 bg-zinc-950 overflow-hidden relative">
      <ChatHeader />
      <MessageList />
      <ChatInput />
    </main>
  );
}

