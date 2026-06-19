/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  username: string;
  region: string;
  badges: string[]; // e.g. ["Verified", "Tester", "Champion", "OG"]
  rankings: Record<string, string>; // gamemode -> tier (e.g. {"Sword": "HT1", "Axe": "LT2"})
  movements: Record<string, "up" | "down" | "new" | "neutral">; // gamemode -> movement
  customPositions?: Record<string, number>; // gamemode -> custom sorting order
  createdAt: string;
  notes?: string;
}

export type Tier = "HT1" | "LT1" | "HT2" | "LT2" | "HT3" | "LT3" | "Unranked";

export interface TestResult {
  id: string;
  playerUsername: string;
  tester: string;
  gamemode: string;
  formerTier: string;
  newTier: string;
  status: "pass" | "fail";
  videoUrl?: string;
  date: string;
  notes?: string;
}

export interface RetestRequest {
  id: string;
  username: string;
  gamemode: string;
  currentTier: string;
  reason: string;
  discordUsername: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  category: "Updates" | "Events" | "Rankings" | "General";
}

export interface SystemStats {
  totalPlayers: number;
  totalTests: number;
  activeTesters: number;
}

export const GAMEMODES = [
  "Sword",
  "Axe",
  "Crystal",
  "UHC",
  "SMP",
  "NethPot",
  "Diamond Pot",
  "Netherite Pot",
  "Mace",
  "Overall"
];

export const REGIONS = [
  "BD",
  "USA",
  "EU",
  "UA",
  "SEA",
  "INDIA",
  "PAKISTAN",
  "MIDDLE EAST",
  "OCEANIA",
  "SOUTH AMERICA"
];

export const AVAILABLE_TIERS = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "Unranked"];

export const TIER_COLORS: Record<string, { badge: string; text: string; glow: string }> = {
  HT1: {
    badge: "bg-amber-950/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    text: "text-amber-400 font-bold tracking-wide shadow-amber-500/50",
    glow: "shadow-[inset_0_0_14px_rgba(245,158,11,0.2),0_0_20px_rgba(245,158,11,0.3)]",
  },
  LT1: {
    badge: "bg-orange-950/30 border border-orange-600/40 shadow-[0_0_12px_rgba(234,88,12,0.2)]",
    text: "text-orange-400 font-bold tracking-wide",
    glow: "shadow-[inset_0_0_10px_rgba(234,88,12,0.15)]",
  },
  HT2: {
    badge: "bg-cyan-950/40 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]",
    text: "text-cyan-400 font-bold tracking-wide shadow-cyan-500/50",
    glow: "shadow-[inset_0_0_14px_rgba(6,182,212,0.2),0_0_20px_rgba(6,182,212,0.3)]",
  },
  LT2: {
    badge: "bg-sky-950/30 border border-sky-600/40 shadow-[0_0_12px_rgba(2,132,199,0.2)]",
    text: "text-sky-400 font-semibold tracking-wide",
    glow: "shadow-[inset_0_0_10px_rgba(2,132,199,0.15)]",
  },
  HT3: {
    badge: "bg-purple-950/40 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
    text: "text-purple-400 font-bold tracking-wide shadow-purple-500/50",
    glow: "shadow-[inset_0_0_14px_rgba(168,85,247,0.2),0_0_20px_rgba(168,85,247,0.3)]",
  },
  LT3: {
    badge: "bg-indigo-950/30 border border-indigo-600/40 shadow-[0_0_12px_rgba(79,70,229,0.2)]",
    text: "text-indigo-400 font-semibold tracking-wide",
    glow: "shadow-[inset_0_0_10px_rgba(79,70,229,0.15)]",
  },
  Unranked: {
    badge: "bg-slate-900 border border-slate-700 text-slate-500",
    text: "text-slate-500",
    glow: "",
  },
};
