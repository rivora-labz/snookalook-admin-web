import { io, type Socket } from "socket.io-client";
import { createClient } from "./supabase/client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "dev";

let socket: Socket | null = null;
let connectPromise: Promise<Socket | null> | null = null;

/**
 * Get-or-create the singleton Socket.IO client. Returns null if WS_URL is unset
 * or running in dev mode (backend Socket.IO requires a real Supabase JWT — no
 * X-Dev-User bypass on the WS plane). Callers should fall back to polling.
 */
export async function connectSocket(): Promise<Socket | null> {
  if (typeof window === "undefined") return null;
  if (!WS_URL) return null;
  if (AUTH_MODE !== "supabase") return null;

  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      connectPromise = null;
      return null;
    }

    const s = io(WS_URL, {
      path: "/ws",
      transports: ["websocket"],
      autoConnect: false,
      auth: { token: `Bearer ${session.access_token}` },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    });

    s.connect();
    socket = s;
    return s;
  })();

  return connectPromise;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  connectPromise = null;
}

export function getSocket(): Socket | null {
  return socket;
}
