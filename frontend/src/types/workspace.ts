// SPDX-License-Identifier: MIT
/**
 * Core workspace domain types extracted from models/workspace.js
 */

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  chatProvider: string;
  chatModel: string;
  documents?: number;
  threadCount?: number;
  vectorCount?: number;
  openAiTemp?: number;
  openAiHistory?: number;
  similarityThreshold?: number;
  topN?: number;
  chatModel?: string;
  chatProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Thread {
  id: number;
  slug: string;
  name: string;
  workspaceId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  threadId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatHistory {
  messages: Message[];
  thread: Thread;
}
