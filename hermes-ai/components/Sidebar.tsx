"use client";

import React, { useState, useMemo } from "react";
import { useChat } from "@/context/ChatContext";
import {
  FwinoboxLogo,
  PlusIcon,
  SearchIcon,
  MessageSquareIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  CloseIcon,
} from "./Icons";
import { Conversation } from "@/types/chat";

function categorizeConversations(conversations: Conversation[]) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const groups: {
    today: Conversation[];
    yesterday: Conversation[];
    previous7Days: Conversation[];
    older: Conversation[];
  } = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const diff = now - conv.updatedAt;
    if (diff < oneDay) {
      groups.today.push(conv);
    } else if (diff < 2 * oneDay) {
      groups.yesterday.push(conv);
    } else if (diff < sevenDays) {
      groups.previous7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

export function Sidebar() {
  const {
    conversations,
    currentConversationId,
    searchQuery,
    setSearchQuery,
    createNewChat,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearAllConversations,
    isSidebarOpen,
    closeSidebar,
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const grouped = useMemo(
    () => categorizeConversations(filteredConversations),
    [filteredConversations]
  );

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 lg:w-80 bg-zinc-950 border-r border-zinc-800/80 transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        {/* Brand & Mobile close button */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <FwinoboxLogo className="w-7 h-7 text-indigo-400" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-100 tracking-tight text-base">
                  Fwinobox AI
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Intelligent Assistant</p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Close sidebar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action button: + New Chat */}
        <div className="p-3">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.99] transition-all"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-7 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* History list with groups */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-thin">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-zinc-500">
              No conversations found.
            </div>
          ) : (
            <>
              {renderGroup("Today", grouped.today)}
              {renderGroup("Yesterday", grouped.yesterday)}
              {renderGroup("Previous 7 Days", grouped.previous7Days)}
              {renderGroup("Older", grouped.older)}
            </>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-[11px] font-medium text-purple-300">Obsidian Brain Active</span>
            </div>
            {conversations.length > 1 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all conversation history?")) {
                    clearAllConversations();
                  }
                }}
                className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                title="Clear all conversations"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );

  function renderGroup(title: string, list: Conversation[]) {
    if (list.length === 0) return null;

    return (
      <div className="space-y-1">
        <h3 className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {title}
        </h3>
        {list.map((conv) => {
          const isActive = conv.id === currentConversationId;
          const isEditing = conv.id === editingId;

          return (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${isActive
                  ? "bg-zinc-800/90 text-zinc-100 font-medium shadow-sm border border-zinc-700/40"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
            >
              <MessageSquareIcon
                className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
              />

              {isEditing ? (
                <form
                  onSubmit={(e) => saveEditing(conv.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 flex items-center gap-1 mr-1"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onBlur={() => saveEditing(conv.id)}
                    className="w-full bg-zinc-950 px-2 py-0.5 rounded border border-indigo-500 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1 hover:text-emerald-400 text-zinc-400"
                    title="Save"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="p-1 hover:text-zinc-200 text-zinc-400"
                    title="Cancel"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <span className="flex-1 truncate text-left">{conv.title}</span>
              )}

              {/* Action buttons (Rename, Delete) */}
              {!isEditing && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => startEditing(conv, e)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded"
                    title="Rename chat"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 rounded"
                    title="Delete chat"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
