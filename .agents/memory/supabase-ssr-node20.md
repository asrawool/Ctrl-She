---
name: Supabase SSR WebSocket Node.js 20
description: Supabase realtime throws at SSR because Node.js 20 has no native WebSocket. The fix is in src/lib/supabase.ts.
---

## Rule
Inject a stub `WebSocket` into `globalThis` before calling `createClient` when running SSR under Node.js 20.

**Why:** `@supabase/realtime-js` calls `WebSocket` in its constructor. Node.js 22+ has native WebSocket; Node.js 20 does not. Without the stub the SSR entry throws a 500 and the app never loads.

**How to apply:** `src/lib/supabase.ts` already contains the guard:
```ts
if (typeof window === "undefined" && typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class StubWS { ... }
}
```
If `supabase.ts` is ever regenerated or replaced, the guard must be re-added. Do NOT remove it to "clean up" — it is load-bearing.
