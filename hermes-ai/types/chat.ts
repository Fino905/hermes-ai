export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  status?: MessageStatus;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  conversationId?: string;
  model?: string;
  stream?: boolean;
}

export interface PromptSuggestion {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  category: 'code' | 'analysis' | 'creative' | 'general';
}

