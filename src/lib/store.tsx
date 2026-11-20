import { createContext, useContext, useState, type ReactNode } from "react";

// Local in-memory state. Shapes mirror the future Lovable Cloud tables
// (screens, groups, media, playlists, playlist_items, schedules) so the store
// can later be swapped for real queries + realtime without touching pages.
export type Group = { id: string; name: string; location: string };
export type Screen = {
  id: string; name: string; pairingCode: string; groupId: string | null;
  status: "online" | "offline" | "pending"; lastSeen: string | null; playlistId: string | null;
};
export type Media = { id: string; name: string; type: "image" | "video"; size: number; duration: number | null; url: string; createdAt: string };
export type PlaylistItem = { id: string; mediaId: string; duration: number };
export type Playlist = { id: string; name: string; items: PlaylistItem[]; createdAt: string };
export type Schedule = {
  id: string; playlistId: string; targetType: "screen" | "group"; targetId: string;
  startDate: string; endDate: string; startTime: string; endTime: string; days: number[];
};

type State = { groups: Group[]; screens: Screen[]; media: Media[]; playlists: Playlist[]; schedules: Schedule[] };
type Ctx = State & { set: (fn: (s: State) => State) => void };

const StoreCtx = createContext<Ctx | null>(null);
export const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ groups: [], screens: [], media: [], playlists: [], schedules: [] });
  return <StoreCtx.Provider value={{ ...state, set: setState }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

export const isValidPairingCode = (code: string) => /^\d{6}$/.test(code);

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(2)} Go`;
}
export function formatDuration(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
