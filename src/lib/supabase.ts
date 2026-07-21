import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Node.js 20 has no native WebSocket — Supabase realtime throws in SSR.
// Inject a stub so the client initialises cleanly; realtime is only used client-side.
if (
  typeof window === "undefined" &&
  typeof (globalThis as Record<string, unknown>).WebSocket === "undefined"
) {
  (globalThis as Record<string, unknown>).WebSocket = class StubWS {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = 3;

    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
