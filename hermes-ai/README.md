# Fwinobox AI — Modern Next.js AI Assistant

A sleek, responsive, ChatGPT-style AI assistant interface built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, and **React**.

## 🚀 Features

1. **Modern Dark Mode Interface**: Deep obsidian/zinc aesthetic (`#09090b`), glowing badges, subtle borders, and smooth transitions.
2. **Responsive Layout**: Persistent sidebar on desktop and sliding animated drawer overlay on mobile viewports.
3. **Conversation History & Organization**:
   - Categorized by recency: *Today*, *Yesterday*, *Previous 7 Days*, and *Older*.
   - Live search filter across conversation titles and message contents.
   - Inline conversation renaming and deletion.
   - Local persistence via `localStorage`.
4. **New Chat Button**: Prominent "+ New Chat" button in the sidebar and top navigation bar.
5. **Polished Message Bubbles**:
   - Distinct styling for user queries and Fwinobox AI responses.
   - Timestamps and branding icons.
   - One-click message copy button with instant checkmark feedback.
   - Response regeneration button for quick retries.
   - Thumbs up/down feedback controls.
6. **Dynamic Message Input**:
   - Auto-resizing textarea with multi-line support.
   - Keyboard shortcuts: `Enter` to submit, `Shift + Enter` for newlines.
   - Responsive send button with active state detection.
   - "Stop generating" button with stream cancellation support.
   - Quick prompt suggestion pills.
7. **Multi-Stage Loading & Streaming**:
   - Hermes "thinking" state indicator with pulsing badge.
   - Simulated chunk-by-chunk text streaming with blinking cursor (`▊`).
8. **Auto-Scroll with Smart Pause**:
   - Automatically follows new incoming messages and streaming text.
   - Pauses when user scrolls up to read earlier responses.
   - Floating "Scroll to bottom" button appears when scrolled up.
9. **Rich Markdown Renderer**:
   - Code blocks with syntax highlighting headers and a one-click "Copy Code" button.
   - Formatted tables with alternating row shading and horizontal scroll wrappers.
   - Blockquotes, bold, italic, strikethrough, and links.
   - Ordered, unordered, and task lists.
10. **Clean Component Architecture**:
    - `app/api/chat/route.ts`: Mock response API supporting `ReadableStream` chunked responses.
    - `components/Sidebar.tsx`: Searchable conversation history sidebar.
    - `components/ChatHeader.tsx`: Model selector and header controls.
    - `components/MessageList.tsx`: Auto-scrolling message container.
    - `components/MessageItem.tsx`: User and assistant message cards.
    - `components/ChatInput.tsx`: Auto-resizing input with keyboard shortcuts.
    - `components/MarkdownRenderer.tsx`: Custom markdown and code block parser.
    - `components/WelcomeScreen.tsx`: Empty state with prompt suggestion cards.
    - `components/Icons.tsx`: Lightweight SVG icon suite.
    - `context/ChatContext.tsx`: Centralized conversation state and persistence.
    - `types/chat.ts`: TypeScript type definitions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) (Modern Dark Theme)
- **Library**: [React](https://react.dev/)

---

## 💻 Getting Started

To run the development server:

```bash
cd hermes-ai
npm run dev
```

To build and start for production:

```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting with **Hermes AI**.
