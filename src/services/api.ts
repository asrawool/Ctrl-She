// Central placeholder service layer. Swap the internal implementations with
// real backend calls (fetch, TanStack Query, edge functions) without touching UI.

import { supabase } from "@/lib/supabase";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Attachment {
  name: string;
  type?: string;
  path: string;
  size?: number;
}

export interface Message {
  role: "user" | "assistant" | "ai" | "model";
  content: string;
}

export const documentsService = {
  async list() {
    await delay(400);
    return [] as Array<{
      id: string;
      name: string;
      type: string;
      size: number;
      updatedAt: string;
      tags: string[];
      category: string;
    }>;
  },
  async upload(_file: File, onProgress?: (n: number) => void) {
    for (let i = 10; i <= 100; i += 10) {
      await delay(120);
      onProgress?.(i);
    }
    return { id: crypto.randomUUID(), success: true };
  },
};

export const aiService = {
  async ask(
    question: string,
    attachments: Attachment[] = [],
    history: Message[] = [],
  ) {
    const { data, error } = await supabase.functions.invoke("ask-copilot", {
      body: { question, attachments, history },
    });

    if (error) {
      console.error("ask-copilot failed:", error);
      const reason = error.message || "Unknown error";
      return {
        answer: `AI Copilot is temporarily unavailable. (Detail: ${reason})`,
        citations: [] as Array<{ id: string; label: string; page?: number }>,
        confidence: 0,
      };
    }

    return {
      answer: data.answer as string,
      citations: (data.sources ?? []).map(
        (s: {
          documentId: string;
          similarity: number;
          documentName?: string;
          page?: number;
        }) => ({
          id: s.documentId,
          label:
            s.documentName ||
            `Source (${Math.round(s.similarity * 100)}% match)`,
          page: s.page,
        }),
      ),
      confidence: data.sources?.length
        ? data.sources.reduce(
            (sum: number, s: { similarity: number }) => sum + s.similarity,
            0,
          ) / data.sources.length
        : 0,
    };
  },
};

export const notificationsService = {
  async list() {
    await delay(300);
    return [];
  },
  async markAllRead() {
    await delay(200);
    return { success: true };
  },
};

export const searchService = {
  async search(_q: string) {
    await delay(250);
    return { documents: [], equipment: [], articles: [] };
  },
};
