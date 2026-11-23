"use client";

import React from "react";
import { useChat } from "@/context/ChatContext";
import { FwinoboxLogo, SparklesIcon } from "./Icons";
import { PromptSuggestion } from "@/types/chat";

const SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "sug-web",
    title: "Serap Info dari Web",
    subtitle: "Baca artikel web dan simpan otomatis ke Obsidian Vault",
    prompt: "Tolong baca dan serap informasi dari web ini: https://id.wikipedia.org/wiki/Kecerdasan_buatan dan rangkum poin pentingnya ke Obsidian.",
    category: "analysis",
  },
  {
    id: "sug-1",
    title: "TypeScript React Hook",
    subtitle: "Custom async hook with abort controller support",
    prompt: "Write a modern TypeScript custom hook in React for async data fetching with cancellation support.",
    category: "code",
  },
  {
    id: "sug-2",
    title: "Database Architecture",
    subtitle: "Compare PostgreSQL, SQLite, and MongoDB",
    prompt: "Compare PostgreSQL vs SQLite vs MongoDB in a markdown comparison table with strengths and latency.",
    category: "analysis",
  },
  {
    id: "sug-3",
    title: "Explain Quantum Concepts",
    subtitle: "Intuitive real-world analogy and step-by-step breakdown",
    prompt: "Explain quantum superposition and entanglement using a clear, real-world airport flight analogy.",
    category: "general",
  },
];

export function WelcomeScreen() {
  const { sendMessage } = useChat();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto my-auto animate-in fade-in duration-500">
      {/* Fwinobox AI Icon Badge */}
      <div className="relative mb-5 group">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 opacity-30 blur-xl group-hover:opacity-60 transition duration-1000" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl">
          <FwinoboxLogo className="w-10 h-10 text-cyan-400" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
        How can <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400 bg-clip-text text-transparent">Fwinobox AI</span> assist you?
      </h1>
      <p className="text-sm text-zinc-400 max-w-lg mb-8 leading-relaxed">
        Universal AI assistant powered by your Obsidian Knowledge Vault & Live Web Absorption. Ask in any language (Bahasa Indonesia, English, 日本語, etc.).
      </p>

      {/* Prompt Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {SUGGESTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => sendMessage(item.prompt)}
            className="group flex flex-col justify-between p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-indigo-500/40 shadow-sm transition-all text-left active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                  {item.title}
                </span>
                <SparklesIcon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {item.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

