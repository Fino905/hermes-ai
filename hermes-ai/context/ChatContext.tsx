"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Conversation, Message, MessageRole } from "@/types/chat";

interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentConversation: Conversation | null;
  isStreaming: boolean;
  isThinking: boolean;
  searchQuery: string;
  isSidebarOpen: boolean;
  activeModel: string;
  setActiveModel: (model: string) => void;
  setSearchQuery: (query: string) => void;
  createNewChat: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  stopStreaming: () => void;
  clearAllConversations: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const STORAGE_KEY = "fwinobox_ai_conversations_v1";

// Fixed static timestamp prevents server/client hydration mismatch
const DEFAULT_TIMESTAMP = 1731570000000;

const DEFAULT_CONVERSATION: Conversation = {
  id: "welcome-fwinobox-session",
  title: "Welcome to Fwinobox AI",
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
  messages: [
    {
      id: "msg-welcome-user",
      role: "user",
      content: "Hi Fwinobox, what can you do?",
      createdAt: DEFAULT_TIMESTAMP,
      status: "done",
    },
    {
      id: "msg-welcome-assistant",
      role: "assistant",
      content: `Hello! I'm **Fwinobox AI**, your swift and intelligent workspace assistant.

Here is what I'm equipped to help you with:

- 🧠 **Obsidian Brain**: Seamlessly reading, synthesizing, and saving knowledge into your Obsidian Vault.
- 🌐 **Multi-Web Knowledge Absorption**: Searching multiple websites across the internet and synthesizing real-time answers.
- 🚀 **Full-Stack Engineering**: Writing Next.js, React, TypeScript, and clean CSS code.
- 📐 **System Design & API Architecture**: Crafting database schemas, REST endpoints, and algorithms.
- 📝 **Markdown & Documentation**: Outputting formatted tables, code snippets, lists, and clear summaries.

Feel free to start typing below or create a **+ New Chat** anytime!`,
      createdAt: DEFAULT_TIMESTAMP + 60000,
      status: "done",
    },
  ],
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Conversation[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error("Failed to load conversations from localStorage:", e);
      }
    }
    return [DEFAULT_CONVERSATION];
  });

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Conversation[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0].id;
          }
        }
      } catch {}
    }
    return DEFAULT_CONVERSATION.id;
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModel, setActiveModel] = useState("Fwinobox 3.5 Turbo");

  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error("Failed to save conversations to localStorage:", e);
    }
  }, [conversations]);

  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || null;

  const createNewChat = useCallback(() => {
    // If currently streaming, stop it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsThinking(false);
    }

    const newId = `fwinobox-chat-${Date.now()}`;
    const newChat: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setConversations((prev) => [newChat, ...prev]);
    setCurrentConversationId(newId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const selectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (currentConversationId === id) {
          if (filtered.length > 0) {
            setCurrentConversationId(filtered[0].id);
          } else {
            // If all deleted, generate a fresh empty conversation
            const freshId = `fwinobox-chat-${Date.now()}`;
            const freshChat: Conversation = {
              id: freshId,
              title: "New Conversation",
              messages: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setCurrentConversationId(freshId);
            return [freshChat];
          }
        }
        return filtered;
      });
    },
    [currentConversationId]
  );

  const renameConversation = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
    );
  }, []);

  const clearAllConversations = useCallback(() => {
    const freshId = `fwinobox-chat-${Date.now()}`;
    const freshChat: Conversation = {
      id: freshId,
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations([freshChat]);
    setCurrentConversationId(freshId);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsThinking(false);

    // Mark last streaming message as done
    if (currentConversationId) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== currentConversationId) return conv;
          const updatedMessages = conv.messages.map((m) =>
            m.status === "streaming" ? { ...m, status: "done" as const } : m
          );
          return { ...conv, messages: updatedMessages };
        })
      );
    }
  }, [currentConversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      let targetConvId = currentConversationId;

      // If no active conversation exists, create one
      if (!targetConvId) {
        const newId = `fwinobox-chat-${Date.now()}`;
        const newChat: Conversation = {
          id: newId,
          title: trimmed.slice(0, 30) + (trimmed.length > 30 ? "..." : ""),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        targetConvId = newId;
        setConversations((prev) => [newChat, ...prev]);
        setCurrentConversationId(newId);
      }

      const userMsgId = `msg-u-${Date.now()}`;
      const userMessage: Message = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        status: "done",
      };

      const assistantMsgId = `msg-a-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: Date.now() + 1,
        status: "streaming",
      };

      // Update state with user message and empty streaming assistant message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const isFirstMessage = c.messages.length === 0;
          return {
            ...c,
            title: isFirstMessage
              ? trimmed.slice(0, 36) + (trimmed.length > 36 ? "..." : "")
              : c.title,
            messages: [...c.messages, userMessage, assistantMessage],
            updatedAt: Date.now(),
          };
        })
      );

      setIsThinking(true);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Collect conversation context for the API
        const activeConv = conversations.find((c) => c.id === targetConvId);
        const history = activeConv ? activeConv.messages : [];
        const payloadMessages = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as MessageRole, content: trimmed },
        ];

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            conversationId: targetConvId,
            model: activeModel,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setIsThinking(false);

        if (!response.body) {
          throw new Error("ReadableStream not supported by browser or empty body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update assistant message content in state
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== targetConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, status: "streaming" }
                    : m
                ),
              };
            })
          );
        }

        // Finalize message status
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, status: "done" } : m
              ),
            };
          })
        );
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          // Handled gracefully in stopStreaming
          return;
        }

        console.error("Chat error:", err);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content:
                        m.content ||
                        "Apologies, an error occurred while connecting to Fwinobox AI. Please try again.",
                      status: "error",
                    }
                  : m
              ),
            };
          })
        );
      } finally {
        setIsStreaming(false);
        setIsThinking(false);
        abortControllerRef.current = null;
      }
    },
    [currentConversationId, isStreaming, conversations, activeModel]
  );

  const regenerateLastMessage = useCallback(async () => {
    if (!currentConversation || isStreaming) return;
    const messages = currentConversation.messages;
    if (messages.length === 0) return;

    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const userContent = messages[lastUserMessageIndex].content;

    // Truncate messages after that user message
    const trimmedMessages = messages.slice(0, lastUserMessageIndex + 1);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversation.id ? { ...c, messages: trimmedMessages } : c
      )
    );

    // Re-send the prompt
    await sendMessage(userContent);
  }, [currentConversation, isStreaming, sendMessage]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        currentConversation,
        isStreaming,
        isThinking,
        searchQuery,
        isSidebarOpen,
        activeModel,
        setActiveModel,
        setSearchQuery,
        createNewChat,
        selectConversation,
        deleteConversation,
        renameConversation,
        sendMessage,
        regenerateLastMessage,
        stopStreaming,
        clearAllConversations,
        toggleSidebar,
        closeSidebar,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
