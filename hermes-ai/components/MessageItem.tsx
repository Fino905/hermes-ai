"use client";

import React, { useState, useEffect } from "react";
import { Message } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  FwinoboxLogo,
  UserIcon,
  CopyIcon,
  CheckIcon,
  RefreshIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "./Icons";
import { useChat } from "@/context/ChatContext";

interface MessageItemProps {
  message: Message;
  isLast: boolean;
}

function formatTime(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function ThinkingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    "Fwinobox is thinking...",
    "🔍 Menjelajahi sumber web terkait...",
    "📄 Membaca referensi & dokumentasi...",
    "💡 Mensintesis jawaban...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1600);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex items-center gap-2 py-2 text-zinc-300 text-xs font-mono">
      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span className="transition-opacity duration-300">{steps[stepIndex]}</span>
    </div>
  );
}

export function MessageItem({ message, isLast }: MessageItemProps) {
  const { isStreaming, regenerateLastMessage } = useChat();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const isUser = message.role === "user";
  const isMessageStreaming = message.status === "streaming";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 px-4 py-3 group">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] md:max-w-[70%]">
          <div className="flex items-center gap-2 mb-1">
            <span
              suppressHydrationWarning
              className="text-[11px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {formatTime(message.createdAt)}
            </span>
            <span className="text-xs font-medium text-zinc-400">You</span>
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-zinc-800 text-zinc-100 px-4 py-3 text-sm leading-relaxed border border-zinc-700 shadow-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-300 mt-5">
          <UserIcon className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex gap-3 px-4 py-4 hover:bg-zinc-900/40 transition-colors group">
      {/* Fwinobox Avatar */}
      <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 shadow-md mt-0.5">
        <FwinoboxLogo className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-zinc-200">Fwinobox AI</span>
          <span suppressHydrationWarning className="text-[11px] text-zinc-500">
            {formatTime(message.createdAt)}
          </span>
          {isMessageStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Generating
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="text-sm text-zinc-200 break-words leading-relaxed">
          {message.content ? (
            <MarkdownRenderer
              content={message.content}
              isStreaming={isMessageStreaming}
            />
          ) : (
            <ThinkingIndicator />
          )}
        </div>

        {/* Action bar for assistant response */}
        {!isMessageStreaming && message.content && (
          <div className="flex items-center gap-1 mt-3 pt-1 text-zinc-400 text-xs">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-white" />
                  <span className="text-[11px] text-white">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>

            {/* Regenerate if this is the last assistant response */}
            {isLast && !isStreaming && (
              <button
                onClick={regenerateLastMessage}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors"
                title="Regenerate response"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span className="text-[11px]">Retry</span>
              </button>
            )}

            {/* Thumbs up / down */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-zinc-800 pl-2">
              <button
                onClick={() => setFeedback(feedback === "up" ? null : "up")}
                className={`p-1 rounded-md hover:bg-zinc-800/80 transition-colors ${
                  feedback === "up" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Helpful"
              >
                <ThumbsUpIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback(feedback === "down" ? null : "down")}
                className={`p-1 rounded-md hover:bg-zinc-800/80 transition-colors ${
                  feedback === "down" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Not helpful"
              >
                <ThumbsDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

