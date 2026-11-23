import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fwinobox AI — Intelligent Conversations",
  description: "A modern, responsive ChatGPT-style AI assistant powered by Next.js & Obsidian Brain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
