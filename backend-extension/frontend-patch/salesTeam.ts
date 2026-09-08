/* ══════════════════════════════════════════════════════════════════
   FIELD SALES TEAM — LIVE FEED WITH SIMULATED FALLBACK
   ------------------------------------------------------------------
   Single source of truth for the field-sales roster, used by the TV
   dashboard's field-sales scene (and any in-app map).

   Live positions come from the Sun Sea Field app through
   GET /api/field/positions/latest and the `field:position` socket event.
   When that endpoint is unavailable (module not installed yet) the hook
   falls back to the seeded roster below, jittered client-side, and
   reports `isLive: false` so the scene never labels simulation "LIVE".
   ══════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import apiClient from "../../../api/apiClient";
import { useSocket } from "../../../providers/SocketProvider";

export interface SalesPerson {
  id: string;
  name: string;
  initials: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  status: "active" | "in_meeting" | "transit" | "idle";
  battery: number;
  speedKmH: number;
  phone: string;
  todayOrdersCount: number;
  todaySalesValue: number;
  targetVisits: number;
  completedVisits: number;
  lastUpdated: string;
  avatarColor: string;
  accentColor: string;
}

const ACCENTS = ["#10b981", "#0ea5e9", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];
const AVATARS = ["from-emerald-400 to-emerald-600", "from-blue-400 to-cyan-600", "from-amber-400 to-orange-600", "from-purple-400 to-indigo-600", "from-rose-400 to-red-600", "from-teal-400 to-teal-600"];

export const SALES_TEAM: SalesPerson[] = [
  { id: "sp-1", name: "Ravi Kumar", initials: "RK", area: "RS Puram & Gandhipuram", city: "Coimbatore", lat: 11.0168, lng: 76.9558, status: "active", battery: 88, speedKmH: 28, phone: "+919842111020", todayOrdersCount: 5, todaySalesValue: 68400, targetVisits: 8, completedVisits: 6, lastUpdated: "Just now", avatarColor: AVATARS[0], accentColor: ACCENTS[0] },
  { id: "sp-2", name: "Suresh Mani", initials: "SM", area: "SIDCO Industrial Estate", city: "Tiruppur", lat: 11.1085, lng: 77.3411, status: "active", battery: 64, speedKmH: 34, phone: "+919443255201", todayOrdersCount: 7, todaySalesValue: 112500, targetVisits: 10, completedVisits: 7, lastUpdated: "1m ago", avatarColor: AVATARS[1], accentColor: ACCENTS[1] },
  { id: "sp-3", name: "Karthik Selvam", initials: "KS", area: "SIPCOT Industrial Complex", city: "Perundurai", lat: 11.2758, lng: 77.5828, status: "in_meeting", battery: 92, speedKmH: 0, phone: "+919789033411", todayOrdersCount: 3, todaySalesValue: 42000, targetVisits: 6, completedVisits: 4, lastUpdated: "3m ago", avatarColor: AVATARS[2], accentColor: ACCENTS[2] },
  { id: "sp-4", name: "Anand Natarajan", initials: "AN", area: "Pollachi Town & Market", city: "Pollachi", lat: 10.6582, lng: 77.0089, status: "active", battery: 76, speedKmH: 42, phone: "+919894488712", todayOrdersCount: 4, todaySalesValue: 54800, targetVisits: 7, completedVisits: 5, lastUpdated: "Just now", avatarColor: AVATARS[3], accentColor: ACCENTS[3] },
];

/** Kept for backwards compatibility; the scene now reads `isLive` from `useFieldTeam()`. */
export const SALES_GPS_IS_LIVE = false;

/** Shape returned by GET /api/field/positions/latest (see backend module field-gps). */
interface AgentLiveStatus {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  area: string;
  city: string;
  lat: number;
  lng: number;
  speedKmH: number;
  battery: number | null;
  status: SalesPerson["status"];
  lastSeenAt: string;
  minutesAgo: number;
  todayOrdersCount: number;
  todaySalesValue: number;
  targetVisits: number;
  completedVisits: number;
}

const ago = (m: number) => (m < 1 ? "Just now" : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`);

function toPerson(a: AgentLiveStatus, index: number): SalesPerson {
  return {
    id: a.id,
    name: a.name,
    initials: a.initials,
    area: a.area,
    city: a.city,
    lat: a.lat,
    lng: a.lng,
    status: a.status,
    battery: a.battery ?? 0,
    speedKmH: a.speedKmH,
    phone: a.phone ?? "",
    todayOrdersCount: a.todayOrdersCount,
    todaySalesValue: a.todaySalesValue,
    targetVisits: a.targetVisits,
    completedVisits: a.completedVisits,
    lastUpdated: ago(a.minutesAgo),
    avatarColor: AVATARS[index % AVATARS.length],
    accentColor: ACCENTS[index % ACCENTS.length],
  };
}

/**
 * Jitters the seeded roster's coordinates on an interval to mimic movement.
 * Purely cosmetic — it invents no data that is presented as a metric.
 */
export function useSimulatedPositions(enabled: boolean = true, intervalMs: number = 3500) {
  const [team, setTeam] = useState<SalesPerson[]>(SALES_TEAM);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      setTeam((prev) =>
        prev.map((sp) => {
          if (sp.status !== "active") return sp;
          return {
            ...sp,
            lat: Number((sp.lat + (Math.random() - 0.48) * 0.0012).toFixed(5)),
            lng: Number((sp.lng + (Math.random() - 0.48) * 0.0012).toFixed(5)),
            speedKmH: Math.max(15, Math.min(55, Math.round(sp.speedKmH + (Math.random() * 8 - 4)))),
            lastUpdated: "Live",
          };
        })
      );
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return team;
}

/**
 * Real positions from the Field app. Polls every `pollMs` as a safety net and
 * applies `field:position` socket events immediately. `isLive` is true only
 * once the endpoint has answered at least once.
 */
export function useLivePositions(pollMs: number = 30_000) {
  const [team, setTeam] = useState<SalesPerson[] | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { socket } = useSocket();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const load = async () => {
      try {
        const res = await apiClient.get("/field/positions/latest");
        const agents = (res.data?.data?.agents ?? []) as AgentLiveStatus[];
        if (!alive.current) return;
        setTeam(agents.map(toPerson));
        setAvailable(true);
      } catch (err: any) {
        if (!alive.current) return;
        // 404 → module not installed; anything else → keep last good data.
        if (err?.response?.status === 404) setAvailable(false);
        else if (available === null) setAvailable(false);
      }
    };
    void load();
    const id = window.setInterval(load, pollMs);
    return () => {
      alive.current = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  useEffect(() => {
    if (!socket) return;
    const onPosition = (a: AgentLiveStatus) => {
      setTeam((prev) => {
        const list = prev ? [...prev] : [];
        const idx = list.findIndex((p) => p.id === a.id);
        const person = toPerson(a, idx >= 0 ? idx : list.length);
        if (idx >= 0) list[idx] = { ...person, avatarColor: list[idx].avatarColor, accentColor: list[idx].accentColor };
        else list.push(person);
        return list;
      });
      setAvailable(true);
    };
    socket.on("field:position", onPosition);
    return () => {
      socket.off("field:position", onPosition);
    };
  }, [socket]);

  return { team: team ?? [], available };
}

/**
 * What the scenes should use: live positions when the server has them,
 * the simulated roster otherwise — and an honest `isLive` flag either way.
 */
export function useFieldTeam() {
  const live = useLivePositions();
  const simulated = useSimulatedPositions(live.available !== true);
  if (live.available === true) return { team: live.team, isLive: true as const };
  return { team: simulated, isLive: false as const };
}
