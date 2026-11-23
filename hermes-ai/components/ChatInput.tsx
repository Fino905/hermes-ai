  "use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/context/ChatContext";
import { SendIcon, StopIcon, SparklesIcon } from "./Icons";

const QUICK_PROMPTS = [
  "Serap web: https://id.wikipedia.org/wiki/Kecerdasan_buatan",
  "Explain this code snippet",
  "Write TypeScript unit tests",
  "Compare PostgreSQL vs MongoDB",
];

export function ChatInput() {
  const { sendMessage, isStreaming, stopStreaming, currentConversation } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on scroll height
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Focus textarea when conversation changes or mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentConversation?.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const content = input.trim();
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = (currentConversation?.messages.length || 0) > 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-1">
      {/* Quick Prompt Pills (shown only when in active conversation) */}
      {hasMessages && (
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-[11px]">
          <span className="text-zinc-500 flex items-center gap-1 shrink-0">
            <SparklesIcon className="w-3 h-3 text-zinc-400" /> Suggestions:
          </span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(prompt)}
              disabled={isStreaming}
              className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600 transition-all p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanya apa saja atau tempel link web (https://...) untuk diserap ke Obsidian..."
          rows={1}
          className="w-full bg-transparent px-3 py-1.5 text-sm sm:text-[15px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-[200px] leading-relaxed scrollbar-thin"
        />

        <div className="flex items-center justify-between px-2 pt-1 border-t border-zinc-800/60 mt-1">
          <div className="text-[11px] text-zinc-500 hidden sm:block">
            <span>Use <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">Shift+Enter</kbd> for newline</span>
          </div>
          <div className="sm:hidden" />

          {/* Send / Stop button */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 shadow-sm transition-all active:scale-95"
                title="Stop generating"
              >
                <StopIcon className="w-3.5 h-3.5 text-white" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className={`p-2 rounded-xl transition-all shadow-sm ${
                  input.trim()
                    ? "bg-white hover:bg-zinc-200 text-black active:scale-95"
                    : "bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-800"
                }`}
                title="Send message"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <p className="text-[11px] text-zinc-500 text-center mt-2">
        Fwinobox AI may produce inaccurate information. Always verify critical facts and code.
      </p>
    </div>
  );
}

