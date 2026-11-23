"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "@/context/ChatContext";
import { MessageItem } from "./MessageItem";
import { WelcomeScreen } from "./WelcomeScreen";
import { ArrowDownIcon } from "./Icons";

export function MessageList() {
  const { currentConversation } = useChat();
  const messages = React.useMemo(
    () => currentConversation?.messages || [],
    [currentConversation?.messages]
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const userScrolledUpRef = useRef(false);

  // Check scroll position to show/hide "Scroll to bottom" button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 150;
    setShowScrollBottom(isUp);
    userScrolledUpRef.current = isUp;
  }, []);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Auto-scroll when messages update, unless user intentionally scrolled up
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom]);

  // When switching conversations, reset scroll state and scroll to bottom
  useEffect(() => {
    userScrolledUpRef.current = false;
    scrollToBottom(false);
  }, [currentConversation?.id, scrollToBottom]);

  if (messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-8 py-4 space-y-2 scrollbar-thin"
      >
        <div className="max-w-4xl mx-auto space-y-2">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Floating Scroll to Bottom button */}
      {showScrollBottom && (
        <button
          onClick={() => {
            userScrolledUpRef.current = false;
            scrollToBottom(true);
          }}
          className="absolute bottom-4 right-6 sm:right-10 p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shadow-xl border border-zinc-700 transition-all transform hover:scale-105 active:scale-95 z-20"
          title="Scroll to latest message"
        >
          <ArrowDownIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
