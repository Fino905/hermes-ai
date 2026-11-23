"use client";

import React, { useState, useEffect } from "react";
import { useChat } from "@/context/ChatContext";
import {
  MenuIcon,
  PlusIcon,
  ChevronDownIcon,
  SparklesIcon,
} from "./Icons";

const MODELS = [
  { id: "Fwinobox 3.5 Turbo", badge: "Fast & General", desc: "Optimized for high-speed conversations" },
  { id: "Fwinobox Pro Reasoning", badge: "Deep Analysis", desc: "Best for complex code, architecture & math" },
];

export function ChatHeader() {
  const {
    currentConversation,
    toggleSidebar,
    createNewChat,
    activeModel,
    setActiveModel,
  } = useChat();

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [vaultInfo, setVaultInfo] = useState<{ vaultName: string; totalNotes: number } | null>(null);
  const [llmInfo, setLlmInfo] = useState<{ isOnline: boolean; model: string } | null>(null);

  const fetchStatus = () => {
    fetch("/api/obsidian")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "connected" && data.stats) {
          setVaultInfo({
            vaultName: data.stats.vaultName || "FwinoboxBrain",
            totalNotes: data.stats.totalNotes || 0,
          });
        }
        if (data.llm) {
          setLlmInfo({
            isOnline: Boolean(data.llm.isOnline),
            model: data.llm.model || "qwen2.5-0.5b",
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    // Re-check backend status periodically
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
      {/* Left: Mobile hamburger & Model selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
          title="Toggle sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsModelDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all shadow-sm"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>{activeModel}</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                isModelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isModelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsModelDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-2 border-b border-zinc-800/60 mb-1">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Select AI Model
                  </p>
                </div>
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveModel(m.id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all ${
                      activeModel === m.id
                        ? "bg-indigo-600/10 border border-indigo-500/30 text-white"
                        : "hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{m.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Middle: Badges for Obsidian, AI Model Engine & Multilingual */}
      <div className="flex items-center gap-2">
        {/* Obsidian Brain Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-800/50 text-[11px] font-medium text-purple-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>🧠 Obsidian: <span className="text-purple-200 font-semibold">{vaultInfo?.vaultName || "HermesBrain"}</span> ({vaultInfo?.totalNotes ?? "..."})</span>
        </div>

        {/* AI Engine Status Badge */}
        {llmInfo?.isOnline ? (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-medium text-emerald-300" title="Model AI Lokal Siap Menjawab">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>⚡ AI Engine: Online</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/50 text-[11px] font-medium text-amber-300" title="AI Backend Offline">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>⚠️ AI Engine: Offline</span>
          </div>
        )}

        {/* Multilingual Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-800/50 text-[11px] font-medium text-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>🌐 Semua Bahasa</span>
        </div>

        {/* Web Ingestion Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/50 text-[11px] font-medium text-cyan-300" title="Tempel URL web apa saja untuk diserap ke Obsidian">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>🔍 Serap Web: Aktif</span>
        </div>
      </div>

      {/* Right: + New Chat quick action */}
      <div className="flex items-center gap-2">
        <button
          onClick={createNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all active:scale-95"
          title="Start a new chat"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </header>
  );
}
