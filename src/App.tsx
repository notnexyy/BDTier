/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from "react";
import { 
  Trophy, Shield, Swords, Users, MessageSquare, AlertTriangle, 
  Send, ExternalLink, PlayCircle, Star, Sparkles, Globe, Filter, ChevronRight, RefreshCw,
  Search, X
} from "lucide-react";
import { Player, TestResult, Announcement, GAMEMODES, REGIONS, AVAILABLE_TIERS } from "./types";
import PlayerProfileModal from "./components/PlayerProfileModal";
import AdminPanel from "./components/AdminPanel";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation State: "home" | "rankings" | "retest" | "admin"
  const [activeTab, setActiveTab] = useState<"home" | "rankings" | "retest" | "admin">("home");

  // Leaderboard filters
  const [selectedGamemode, setSelectedGamemode] = useState("Sword");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedTierFilter, setSelectedTierFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Data State
  const [stats, setStats] = useState({ totalPlayers: 0, totalTests: 0, activeTesters: 0 });
  const [leaderboard, setLeaderboard] = useState<(Player & { activeTier: string; activeMovement: string })[]>([]);
  const [recentTests, setRecentTests] = useState<TestResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected player for profile modal
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);

  // Retest Apply Form State
  const [retestForm, setRetestForm] = useState({
    username: "",
    gamemode: "Sword",
    currentTier: "Unranked",
    reason: "",
    discordUsername: ""
  });
  const [retestSubmitStatus, setRetestSubmitStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingRetest, setSubmittingRetest] = useState(false);

  // Fetch initial stats and public feeds
  const loadStatsAndRecent = async () => {
    try {
      setLoading(true);
      const [resStats, resRecent, resAnn] = await Promise.all([
        fetch("/api/public/stats"),
        fetch("/api/public/recent-tests"),
        fetch("/api/public/announcements")
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resRecent.ok) setRecentTests(await resRecent.json());
      if (resAnn.ok) setAnnouncements(await resAnn.json());
    } catch (err) {
      console.error("Failed to load global platform telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Leaderboards (Depends on selectedGamemode, selectedRegion, selectedTierFilter)
  const loadLeaderboard = async () => {
    try {
      const url = `/api/public/leaderboard?gamemode=${encodeURIComponent(selectedGamemode)}&region=${encodeURIComponent(selectedRegion)}&tier=${encodeURIComponent(selectedTierFilter)}`;
      const res = await fetch(url);
      if (res.ok) {
        setLeaderboard(await res.json());
      }
    } catch (err) {
      console.error("Leaderboard synchronization failed:", err);
    }
  };

  useEffect(() => {
    loadStatsAndRecent();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedGamemode, selectedRegion, selectedTierFilter]);

  // Handle retest form submit
  const handleRetestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retestForm.username.trim() || !retestForm.discordUsername.trim() || !retestForm.reason.trim()) {
      setRetestSubmitStatus({ type: "error", text: "Please satisfy and compile all application input blocks." });
      return;
    }

    try {
      setSubmittingRetest(true);
      setRetestSubmitStatus(null);
      const res = await fetch("/api/retests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retestForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRetestSubmitStatus({ type: "success", text: "★ Application dispatched securely to BDTiers administrators! We will review your claim." });
        setRetestForm({
          username: "",
          gamemode: "Sword",
          currentTier: "Unranked",
          reason: "",
          discordUsername: ""
        });
        loadStatsAndRecent();
      } else {
        setRetestSubmitStatus({ type: "error", text: data.error || "Execution error compiling claims." });
      }
    } catch (err) {
      setRetestSubmitStatus({ type: "error", text: "Loss of secure node line signal during request." });
    } finally {
      setSubmittingRetest(false);
    }
  };

  // Tier design mapping for visual rank emblems
  const getTierEmblemStyles = (tier: string) => {
    if (tier === "HT1") return "from-amber-500 to-yellow-300 text-amber-100 glow-text-gold";
    if (tier === "LT1") return "from-orange-600 to-amber-500 text-orange-100";
    if (tier === "HT2") return "from-cyan-500 to-sky-400 text-cyan-500 glow-text-cyan";
    if (tier === "LT2") return "from-sky-600 to-blue-500 text-sky-100";
    if (tier === "HT3") return "from-purple-500 to-indigo-400 text-purple-100 glow-text-purple";
    if (tier === "LT3") return "from-indigo-600 to-violet-500 text-indigo-100";
    return "from-slate-600 to-slate-500 text-slate-300";
  };

  // Add absolute rank to each player before filtering
  const rankedBaseList = useMemo(() => {
    return leaderboard.map((p, idx) => ({
      ...p,
      rank: idx + 1
    }));
  }, [leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return rankedBaseList;
    const q = searchQuery.toLowerCase().trim();
    return rankedBaseList.filter(p => p.username.toLowerCase().includes(q));
  }, [rankedBaseList, searchQuery]);

  // Identify players who occupy absolute Rank 1, 2, and 3 respectively in matching filtered lists
  const playerRank1 = useMemo(() => filteredLeaderboard.find(p => p.rank === 1), [filteredLeaderboard]);
  const playerRank2 = useMemo(() => filteredLeaderboard.find(p => p.rank === 2), [filteredLeaderboard]);
  const playerRank3 = useMemo(() => filteredLeaderboard.find(p => p.rank === 3), [filteredLeaderboard]);

  const featuredRank4To10 = useMemo(() => {
    return filteredLeaderboard.filter(p => p.rank >= 4 && p.rank <= 10);
  }, [filteredLeaderboard]);

  const regularRank11To100 = useMemo(() => {
    return filteredLeaderboard.filter(p => p.rank >= 11);
  }, [filteredLeaderboard]);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans flex flex-col relative selection:bg-cyan-500 selection:text-black">
      
      {/* Background Matrix/Nebula Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/10 to-indigo-500/0 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/5 to-cyan-500/0 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Premium Esports Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0F1A]/85 backdrop-blur-xl border-b border-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand Brand */}
          <div 
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 cursor-pointer group"
            id="brand-logo-container"
          >
            <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
              <Swords className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-400 to-indigo-400 uppercase">
                BDTIER<span className="text-cyan-400">S</span>
              </h1>
              <p className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">
                PvP Ranking Infrastructure
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wider text-sm transition-all duration-200 ${
                activeTab === "home"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
              id="nav-btn-home"
            >
              HOME
            </button>

            <button
              onClick={() => setActiveTab("rankings")}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wider text-sm transition-all duration-200 ${
                activeTab === "rankings"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
              id="nav-btn-rankings"
            >
              LEADERBOARDS
            </button>

            <button
              onClick={() => setActiveTab("retest")}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wider text-sm transition-all duration-200 ${
                activeTab === "retest"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
              id="nav-btn-retest"
            >
              RETEST FORM
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-lg font-display uppercase tracking-wider text-sm transition-all duration-200 ${
                activeTab === "admin"
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
              id="nav-btn-admin"
            >
              ADMIN PORTAL
            </button>
          </nav>

          {/* Discord CTA & Mobile Menu */}
          <div className="flex items-center gap-3">
            <a
              href="https://discord.gg/YGBMdMtcnc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] hover:shadow-[0_0_15px_rgba(88,101,242,0.4)] text-white text-xs font-display tracking-widest font-bold uppercase px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-all"
              id="global-join-discord-btn"
            >
              <MessageSquare size={14} className="sm:hidden" />
              <span className="hidden sm:inline">DISCORD SERVER</span>
              <span className="inline sm:hidden text-[10px]">JOIN DISCORD</span>
              <ExternalLink size={12} className="hidden sm:inline" />
            </a>

            {/* Mobile Nav Button */}
            <div className="md:hidden flex gap-1">
              <button
                onClick={() => setActiveTab(activeTab === "admin" ? "home" : "admin")}
                className={`p-2 rounded-lg border ${activeTab === "admin" ? "bg-indigo-950 border-indigo-600 text-indigo-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                title="Admin"
              >
                <Shield size={16} />
              </button>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none"
              >
                <option value="home">Home</option>
                <option value="rankings">Rankings</option>
                <option value="retest">Retest</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        
        {/* VIEW 1: HOME PAGE */}
        {activeTab === "home" && (
          <div className="space-y-16">
            
            {/* HERO HERO SECTION */}
            <div className="text-center relative max-w-3xl mx-auto py-8">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 rounded-full text-xs font-mono text-cyan-400 mb-6 shadow-md animate-pulse-slow">
                <Sparkles size={13} />
                <span>OFFICIAL MINECRAFT MULTI-GAMEMODE TOURNAL & TIER TESTING platform</span>
              </div>

              <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-white mb-6 uppercase leading-none">
                BUILD YOUR CLAN.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-450 via-cyan-400 to-indigo-400 glow-text-cyan select-none">
                  DOMINATE THE leaderboard.
                </span>
              </h2>

              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-10 font-sans max-w-2xl mx-auto">
                Welcome to BD Tiers, the premium global network testing center. Apply for tier retrials, witness dynamic statistical feeds, verify certified Minecraft Duel champions, and watch real-time roster promotion history led by the industry's senior PvP advisors.
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
                <button
                  onClick={() => setActiveTab("rankings")}
                  className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-display font-extrabold tracking-widest uppercase px-6 py-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 transition duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0"
                  id="hero-view-rankings-cta"
                >
                  <Trophy size={15} />
                  <span>VIEW MATCH RANKINGS</span>
                </button>

                <button
                  onClick={() => setActiveTab("retest")}
                  className="w-full md:w-auto bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] text-slate-100 font-display font-bold tracking-widest uppercase px-6 py-3.5 rounded-xl transition duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0"
                  id="hero-apply-retest-cta"
                >
                  <Star size={15} className="text-amber-400" />
                  <span>APPLY FOR RETRIAL</span>
                </button>

                <a
                  href="https://discord.gg/77BkNwJxan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto bg-[#5865F2] hover:bg-[#4752C4] hover:shadow-[0_0_15px_rgba(88,101,242,0.35)] text-white font-display font-bold tracking-widest uppercase px-6 py-3.5 rounded-xl transform hover:-translate-y-0.5 transition duration-200 text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0 border border-transparent"
                  id="hero-join-discord-cta"
                >
                  <MessageSquare size={15} />
                  <span>JOIN DISCORD SERVER</span>
                </a>
              </div>

            </div>

            {/* LIVE PLATFORM METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative" id="live-stats-row">
              {/* Stat 1 */}
              <div className="bg-gradient-to-b from-[#111625] to-[#070a13] border border-slate-800/80 rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-[inset_0_0_10px_rgba(6,182,212,0.15)] group-hover:scale-105 transition-transform duration-300">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="text-3xl font-display font-extrabold text-white tracking-widest uppercase mb-1">
                    {stats.totalPlayers}
                  </h4>
                  <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Total Ranked Players
                  </p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="bg-gradient-to-b from-[#111625] to-[#070a13] border border-slate-800/80 rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl shadow-[inset_0_0_10px_rgba(99,102,241,0.15)] group-hover:scale-105 transition-transform duration-300">
                  <Swords size={24} />
                </div>
                <div>
                  <h4 className="text-3xl font-display font-extrabold text-white tracking-widest uppercase mb-1">
                    {stats.totalTests}
                  </h4>
                  <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Committed Test Records
                  </p>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="bg-gradient-to-b from-[#111625] to-[#070a13] border border-slate-800/80 rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-purple-500/5 to-transparent pointer-events-none" />
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl shadow-[inset_0_0_10px_rgba(168,85,247,0.15)] group-hover:scale-105 transition-transform duration-300">
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="text-3xl font-display font-extrabold text-white tracking-widest uppercase mb-1">
                    {stats.activeTesters}
                  </h4>
                  <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Active senior testers
                  </p>
                </div>
              </div>
            </div>

            {/* Split Row for Recent Activity Feed & Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              
              {/* Left column: Recent PvP Activity (3/5 width) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <h3 className="text-lg font-display font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <Swords size={18} className="text-cyan-400" />
                    RECENT PvP ACTIVITIES FEED
                  </h3>
                  <button 
                    onClick={loadStatsAndRecent}
                    className="p-1 px-2.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-[10px] font-mono uppercase flex items-center gap-1"
                    id="refresh-feed-btn"
                  >
                    <RefreshCw size={10} className="w-2.5 h-2.5" /> RE-SYNC
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-3.5">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="h-20 bg-slate-900/40 rounded-xl border border-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : recentTests.length === 0 ? (
                  <div className="bg-[#111625]/20 border border-slate-800/60 p-12 rounded-2xl text-center">
                    <AlertTriangle className="text-slate-600 mx-auto mb-3" size={32} />
                    <p className="text-slate-400 font-mono text-sm uppercase tracking-wide">Ledger activity empty initially</p>
                    <p className="text-slate-500 text-xs mt-1 font-sans">
                      Administrator must log in to register matches or tests to populate this live panel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {recentTests.map((act) => {
                      const isPass = act.status === "pass";
                      return (
                        <div
                          key={act.id}
                          onClick={() => setSelectedPlayerName(act.playerUsername)}
                          className="bg-gradient-to-r from-[#111625]/75 to-[#0b0f1a] hover:from-[#111625] p-3.5 sm:p-4 rounded-xl border border-slate-9ml/60 border-slate-850 hover:border-slate-700/80 transition-all shadow-md flex items-center justify-between gap-4 cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative flex-shrink-0">
                              <img
                                src={`https://mc-heads.net/avatar/${act.playerUsername}/32.png`}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://minotar.net/helm/${act.playerUsername}/32.png`;
                                }}
                                className="w-8 h-8 rounded bg-slate-900"
                              />
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white font-mono group-hover:text-cyan-400 transition-colors">
                                  {act.playerUsername}
                                </span>
                                <span className="bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase">
                                  {act.gamemode}
                                </span>
                                <span className={`text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  isPass ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {isPass ? "ACCEPTED" : "DECLINED"}
                                </span>
                              </div>

                              <p className="text-xs text-slate-400 font-mono mt-1">
                                Modified: <span className="text-slate-500">{act.formerTier}</span> ⮕ <span className="text-white font-semibold font-display tracking-wide">{act.newTier}</span>
                              </p>

                              {act.notes && (
                                <p className="text-xs text-slate-500 italic mt-1 font-sans line-clamp-1">
                                  &ldquo;{act.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {act.videoUrl ? (
                              <a
                                href={act.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-cyan-400 hover:text-cyan-300 p-1.5 rounded-lg bg-cyan-950/20 border border-cyan-800/30 flex items-center gap-1 font-mono text-[10px]"
                              >
                                <PlayCircle size={12} /> Play proof
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(act.date).toLocaleDateString(undefined, { dateStyle: 'short' })}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500 font-mono">Staff: {act.tester}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right column: Announcements (2/5 width) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="pb-2 border-b border-slate-900">
                  <h3 className="text-lg font-display font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <MessageSquare size={18} className="text-indigo-400" />
                    COMMUNITY BROADCASTS
                  </h3>
                </div>

                {loading ? (
                  <div className="h-40 bg-slate-900/40 rounded-xl border border-slate-850 animate-pulse animate-pulse-slow" />
                ) : announcements.length === 0 ? (
                  <div className="bg-[#111625]/20 border border-slate-800/60 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs">
                    No active updates broadcasted yet. Keep logged in for platform status notifications.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {announcements.map((post) => (
                      <div
                        key={post.id}
                        className="bg-slate-900/40 border border-slate-850 rounded-xl p-4.5 space-y-2 hover:border-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span className="bg-indigo-950/30 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded font-bold uppercase">
                            {post.category}
                          </span>
                          <span>{new Date(post.date).toLocaleDateString()}</span>
                        </div>

                        <h4 className="text-sm font-display font-bold text-white tracking-wide leading-snug">
                          {post.title}
                        </h4>

                        <p className="text-xs text-slate-400 font-sans leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>

                        <div className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-900 font-mono">
                          Broadcaster: {post.author}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}


        {/* VIEW 2: LEADERBOARD SYSTEM */}
        {activeTab === "rankings" && (
          <div className="space-y-8">
            
            {/* Header and filters block */}
            <div className="space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-wider text-rose-50 flex items-center gap-2 uppercase">
                    <Trophy className="text-amber-500 animate-pulse" size={26} />
                    GLOBAL TOURNAMENT LEADERBOARD
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Displays high performance PvP tier statuses dynamically managed. Click on cards to inspect historic duels.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-500">ACTIVE:</span>
                  <span className="text-cyan-400 font-bold bg-cyan-950/20 px-2.5 py-0.5 rounded-full border border-cyan-800/40">
                    {searchQuery.trim() 
                      ? `${filteredLeaderboard.length} of ${leaderboard.length} Match`
                      : `${leaderboard.length} Candidates Ranked`
                    }
                  </span>
                </div>
              </div>

              {/* Leaderboard Real-time Username Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search size={16} className="text-slate-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter leaderboard by player username... (e.g. Steve, Dream)"
                  className="w-full bg-[#0B0F1A] border border-slate-800 hover:border-slate-705 focus:border-cyan-500/80 text-xs sm:text-sm font-semibold rounded-xl text-white pl-10 pr-10 py-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/35 transition-all placeholder:text-slate-600 font-mono shadow-inner shadow-black/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Clear Search Input"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Advanced Filter Rail */}
              <div className="bg-[#111625]/60 border border-slate-850 p-4 sm:p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Gamemode dropdown */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold flex items-center gap-1">
                    <Swords size={11} className="text-slate-500" />
                    GAMEMODE SECTOR
                  </label>
                  <select
                    value={selectedGamemode}
                    onChange={(e) => setSelectedGamemode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-705 focus:border-cyan-500 text-sm font-semibold rounded-lg text-white p-2.5 focus:outline-none transition-colors"
                  >
                    {GAMEMODES.map(gm => (
                      <option key={gm} value={gm}>{gm}</option>
                    ))}
                  </select>
                </div>

                {/* Region filter */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold flex items-center gap-1">
                    <Globe size={11} className="text-slate-500" />
                    PLAYER GEOGRAPHY
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-705 focus:border-cyan-500 text-sm font-semibold rounded-lg text-white p-2.5 focus:outline-none transition-colors"
                  >
                    <option value="All">All Regions (Global)</option>
                    {REGIONS.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                {/* Tier filter */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold flex items-center gap-1">
                    <Filter size={11} className="text-slate-500" />
                    CLASSIFICATIONS CLAN TIER
                  </label>
                  <select
                    value={selectedTierFilter}
                    onChange={(e) => setSelectedTierFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-705 focus:border-cyan-500 text-sm font-semibold rounded-lg text-white p-2.5 focus:outline-none transition-colors"
                  >
                    <option value="">All Tiers</option>
                    {AVAILABLE_TIERS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Quick actions tracker info */}
                <div className="flex flex-col justify-end items-start md:items-end md:pb-1">
                  <span className="text-[10px] text-slate-400/80 italic font-sans text-left md:text-right max-w-[200px]">
                    Leaderboard rankings automatically update without code modifications.
                  </span>
                </div>

              </div>

            </div>

            {/* LEADERBOARD LIST DISPLAY */}
            {filteredLeaderboard.length === 0 ? (
              <div className="bg-[#111625]/20 border border-slate-850 p-20 rounded-2xl text-center space-y-4">
                <Trophy className="text-slate-700 w-12 h-12 mx-auto" />
                <h3 className="text-xl font-display font-bold text-white tracking-widest uppercase">
                  {searchQuery ? "No Matching Players" : "LEADERBOARD STARTS EMPTY"}
                </h3>
                <p className="text-slate-400 max-w-md mx-auto text-sm font-sans leading-relaxed">
                  {searchQuery 
                    ? `No duellists found matching "${searchQuery}" under the selected filters.` 
                    : "No PvP duellists configured for parameters. Join our Discord or login as Admin to create players and assign tier ratings manually."
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                
                {/* 1. TOP 3 FEATURED CARDS WITH GLOW */}
                {(playerRank1 || playerRank2 || playerRank3) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4" id="leaderboard-podium">
                    
                    {/* Rank 2 (Render layout: Left on desktop, otherwise order determines) */}
                    {playerRank2 && (
                      <div 
                        onClick={() => setSelectedPlayerName(playerRank2.username)}
                        className="bg-gradient-to-b from-[#111625]/85 to-[#070a13] hover:from-[#151c31] border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 relative cursor-pointer group transition-all duration-300 shadow-xl glow-card-cyan md:mt-6 text-center"
                        id="podium-rank-2"
                      >
                        {/* Rank tag */}
                        <div className="absolute top-4 left-4 bg-cyan-600 text-black text-xs font-display tracking-wider font-extrabold px-3 py-1 rounded-md uppercase">
                          RANK 2
                        </div>

                        {/* Trend placement info */}
                        <div className="absolute top-4 right-4 text-xs font-mono">
                          {playerRank2.activeMovement === "up" && <span className="text-emerald-400">▲ UP</span>}
                          {playerRank2.activeMovement === "down" && <span className="text-rose-500">▼ DOWN</span>}
                          {playerRank2.activeMovement === "new" && <span className="text-cyan-400 text-[10px] font-bold">NEW</span>}
                          {playerRank2.activeMovement === "neutral" && <span className="text-slate-500">▬</span>}
                        </div>

                        {/* Minecraft avatar head */}
                        <div className="relative w-20 h-20 mx-auto mt-6 mb-4 group-hover:scale-105 transition-transform">
                          <div className="absolute -inset-1 rounded-full bg-cyan-500/20 blur-sm group-hover:bg-cyan-500/30" />
                          <img
                            src={`https://mc-heads.net/avatar/${playerRank2.username}/80.png`}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://minotar.net/helm/${playerRank2.username}/80.png`;
                            }}
                            className="relative w-20 h-20 bg-slate-950 rounded-xl mx-auto object-cover border border-slate-700/80 shadow"
                          />
                        </div>

                        <h3 className="text-2xl font-display font-extrabold text-white tracking-wide">{playerRank2.username}</h3>
                        <p className="text-xs font-mono text-cyan-400 font-bold mb-4 uppercase">{playerRank2.region}</p>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40">
                          <span className="text-[10px] font-mono uppercase text-slate-400">Tier:</span>
                          <span className="text-sm font-display font-bold text-cyan-400 tracking-wider">
                            {playerRank2.activeTier}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rank 1 (Master center layout with gold glow) */}
                    {playerRank1 && (
                      <div 
                        onClick={() => setSelectedPlayerName(playerRank1.username)}
                        className="bg-gradient-to-b from-[#1c1d2e] to-[#0d0e1b] hover:from-[#25273e] border border-amber-500/30 hover:border-amber-500/70 rounded-2xl p-6 md:p-8 relative cursor-pointer group transition-all duration-300 shadow-2xl glow-card-gold text-center relative"
                        id="podium-rank-1"
                      >
                        {/* Crown/Banner ornament overlay */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-display font-black tracking-widest px-4 py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1 animate-pulse">
                          🏆 LEADER 🏆
                        </div>

                        {/* Rank tag */}
                        <div className="absolute top-4 left-4 bg-amber-500 text-black text-xs font-display tracking-wider font-extrabold px-3 py-1 rounded-md uppercase">
                          RANK 1
                        </div>

                        {/* Trend status */}
                        <div className="absolute top-4 right-4 text-xs font-mono">
                          {playerRank1.activeMovement === "up" && <span className="text-emerald-400">▲ UP</span>}
                          {playerRank1.activeMovement === "down" && <span className="text-rose-500">▼ DOWN</span>}
                          {playerRank1.activeMovement === "new" && <span className="text-cyan-400 text-[10px] font-bold">NEW</span>}
                          {playerRank1.activeMovement === "neutral" && <span className="text-slate-500">▬</span>}
                        </div>

                        {/* Avatar */}
                        <div className="relative w-24 h-24 mx-auto mt-6 mb-4 group-hover:scale-105 transition-transform">
                          <div className="absolute -inset-1.5 rounded-full bg-amber-500/30 blur-sm group-hover:bg-amber-500/40" />
                          <img
                            src={`https://mc-heads.net/avatar/${playerRank1.username}/96.png`}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://minotar.net/helm/${playerRank1.username}/96.png`;
                            }}
                            className="relative w-24 h-24 bg-slate-950 rounded-2xl mx-auto object-cover border border-amber-500/50 shadow-md"
                          />
                        </div>

                        <h3 className="text-3xl font-display font-black text-white tracking-widest uppercase">{playerRank1.username}</h3>
                        <p className="text-xs font-mono text-amber-400 font-extrabold mb-4 uppercase">{playerRank1.region}</p>

                        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-950/45 border border-amber-500/40">
                          <span className="text-[11px] font-mono uppercase text-amber-200">Emblem:</span>
                          <span className="text-base font-display font-black text-amber-400 tracking-widest glow-text-gold uppercase">
                            {playerRank1.activeTier}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Rank 3 (Render layout: Right side with purple glow) */}
                    {playerRank3 && (
                      <div 
                        onClick={() => setSelectedPlayerName(playerRank3.username)}
                        className="bg-gradient-to-b from-[#111625]/85 to-[#070a13] hover:from-[#151c31] border border-slate-850 hover:border-purple-500/50 rounded-2xl p-6 relative cursor-pointer group transition-all duration-300 shadow-xl glow-card-purple md:mt-6 text-center"
                        id="podium-rank-3"
                      >
                        {/* Rank tag */}
                        <div className="absolute top-4 left-4 bg-purple-600 text-white text-xs font-display tracking-wider font-extrabold px-3 py-1 rounded-md uppercase">
                          RANK 3
                        </div>

                        {/* Trend status */}
                        <div className="absolute top-4 right-4 text-xs font-mono">
                          {playerRank3.activeMovement === "up" && <span className="text-emerald-400">▲ UP</span>}
                          {playerRank3.activeMovement === "down" && <span className="text-rose-500">▼ DOWN</span>}
                          {playerRank3.activeMovement === "new" && <span className="text-cyan-400 text-[10px] font-bold">NEW</span>}
                          {playerRank3.activeMovement === "neutral" && <span className="text-slate-500">▬</span>}
                        </div>

                        {/* Avatar */}
                        <div className="relative w-20 h-20 mx-auto mt-6 mb-4 group-hover:scale-105 transition-transform">
                          <div className="absolute -inset-1 rounded-full bg-purple-500/20 blur-sm group-hover:bg-purple-500/30" />
                          <img
                            src={`https://mc-heads.net/avatar/${playerRank3.username}/80.png`}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://minotar.net/helm/${playerRank3.username}/80.png`;
                            }}
                            className="relative w-20 h-20 bg-slate-950 rounded-xl mx-auto object-cover border border-slate-700/80 shadow"
                          />
                        </div>

                        <h3 className="text-2xl font-display font-extrabold text-white tracking-wide">{playerRank3.username}</h3>
                        <p className="text-xs font-mono text-purple-400 font-bold mb-4 uppercase">{playerRank3.region}</p>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/40 border border-purple-800/40">
                          <span className="text-[10px] font-mono uppercase text-slate-400">Tier:</span>
                          <span className="text-sm font-display font-bold text-purple-400 tracking-wider">
                            {playerRank3.activeTier}
                          </span>
                        </div>
                      </div>
                    )}

                  </div>
                )}


                {/* 2. MEDIUM CARDS FOR RANKS 4-10 */}
                {featuredRank4To10.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase font-bold tracking-widest text-slate-500 pl-1 border-l-2 border-slate-800">
                      CONTENDER DIVISION (RANKS 4-10)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="contenders-grid">
                      {featuredRank4To10.map((player) => {
                        const rankNumber = player.rank;
                        return (
                          <div
                            key={player.id}
                            onClick={() => setSelectedPlayerName(player.username)}
                            className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-850 hover:border-slate-750 p-4 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-display font-bold text-slate-500 w-5">
                                #{rankNumber}
                              </span>

                              <img
                                src={`https://mc-heads.net/avatar/${player.username}/28.png`}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://minotar.net/helm/${player.username}/28.png`;
                                }}
                                className="w-7 h-7 rounded bg-slate-950"
                              />

                              <div>
                                <span className="font-semibold text-white font-mono group-hover:text-cyan-400 transition-colors">
                                  {player.username}
                                </span>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Region: {player.region}
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-display font-bold bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-0.5 rounded uppercase">
                              {player.activeTier}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* 3. COMPACT HIGH DENSITY ROWS FOR RANKS 11-100 */}
                {regularRank11To100.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase font-bold tracking-widest text-slate-500 pl-1 border-l-2 border-slate-800">
                      RISING DIVISION (RANKS 11-100)
                    </h4>

                    <div className="bg-[#111625]/45 border border-slate-850 rounded-xl overflow-hidden shadow-lg" id="leaderboard-regular-rows">
                      <div className="divide-y divide-slate-850/80">
                        {regularRank11To100.map((player) => {
                          const rankNumber = player.rank;
                          return (
                            <div
                              key={player.id}
                              onClick={() => setSelectedPlayerName(player.username)}
                              className="px-4 py-3 sm:px-6 hover:bg-[#111625] flex items-center justify-between text-xs font-mono cursor-pointer group transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <span className="w-8 font-display font-extrabold text-slate-500 tracking-wider">
                                  #{rankNumber}
                                </span>

                                <img
                                  src={`https://mc-heads.net/avatar/${player.username}/24.png`}
                                  alt=""
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://minotar.net/helm/${player.username}/24.png`;
                                  }}
                                  className="w-6 h-6 rounded bg-slate-950"
                                />

                                <span className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                                  {player.username}
                                </span>

                                <span className="bg-slate-950/40 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                                  {player.region}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Movements icons */}
                                <span>
                                  {player.activeMovement === "up" && <span className="text-emerald-400">▲</span>}
                                  {player.activeMovement === "down" && <span className="text-rose-500">▼</span>}
                                  {player.activeMovement === "new" && <span className="text-cyan-400 font-bold text-[9px]">NEW</span>}
                                </span>

                                <span className="text-[10px] font-display font-bold text-slate-400 w-12 text-right">
                                  {player.activeTier}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}


        {/* VIEW 3: RETEST SYSTEM APPLICATION FORM */}
        {activeTab === "retest" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="border-b border-slate-800 pb-5">
              <h2 className="text-3xl font-display font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
                <Star className="text-amber-500" size={24} />
                APPLY FOR RETRIAL TESTING
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Have you polished your mechanics? Request a promotion audit below. All claims must outline transparent evidence.
              </p>
            </div>

            <div className="bg-gradient-to-b from-[#111625] to-[#070fa3]/5 border border-slate-850 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-indigo-600" />
              
              <form onSubmit={handleRetestSubmit} className="space-y-6 text-xs font-mono">
                
                {/* 1. IGN username with live helm preview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold font-mono">
                      Applicant Minecraft IGN
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DreamPvP_BD"
                      value={retestForm.username}
                      onChange={(e) => setRetestForm(f => ({ ...f, username: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none placeholder-slate-755"
                    />
                  </div>

                  <div className="bg-[#0b0f1a]/80 border border-slate-800 p-3 rounded-xl flex items-center gap-3 h-full sm:mt-6">
                    <img
                      src={`https://mc-heads.net/avatar/${retestForm.username || "Steve"}/32.png`}
                      alt="IGN Avatar"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://minotar.net/helm/${retestForm.username || "Steve"}/32.png`;
                      }}
                      className="w-8 h-8 rounded bg-slate-900 border border-slate-800 object-cover"
                    />
                    <div>
                      <span className="text-[9px] uppercase text-slate-500 font-bold block mb-0.5">Live Helm Preview</span>
                      <span className="text-[10px] text-slate-300 font-bold max-w-[80px] truncate block">
                        {retestForm.username || "Enter Name"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Gamemode & Current Tier side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">
                      Requested Gamemode Category
                    </label>
                    <select
                      value={retestForm.gamemode}
                      onChange={(e) => setRetestForm(f => ({ ...f, gamemode: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm rounded-lg text-white p-3 focus:outline-none"
                    >
                      {GAMEMODES.filter(gm => gm !== "Overall").map(gm => (
                        <option key={gm} value={gm}>{gm}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">
                      Your Current Tier Rating
                    </label>
                    <select
                      value={retestForm.currentTier}
                      onChange={(e) => setRetestForm(f => ({ ...f, currentTier: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm rounded-lg text-white p-3 focus:outline-none"
                    >
                      {AVAILABLE_TIERS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Discord Username */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">
                    Official Discord Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. shahnur#0001 (or shahnur_bd)"
                    value={retestForm.discordUsername}
                    onChange={(e) => setRetestForm(f => ({ ...f, discordUsername: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-4 py-3 text-sm text-white focus:outline-none placeholder-slate-755"
                  />
                  <p className="text-[9px] text-slate-500 mt-1 font-sans">
                    Required. We will schedule duels and announce result certificates through direct Discord DM.
                  </p>
                </div>

                {/* 4. Reason box */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">
                    Trial Promotion Claims / Evidence Notes
                  </label>
                  <textarea
                    required
                    placeholder="Highlight your current win rates, tell us if you have defeated existing HT ranked players with clips/videos..."
                    rows={4}
                    value={retestForm.reason}
                    onChange={(e) => setRetestForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-sm rounded-lg text-white p-4 focus:outline-none placeholder-slate-755 font-sans"
                  />
                </div>

                {/* Status toast and actions */}
                {retestSubmitStatus && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-center gap-2 ${
                    retestSubmitStatus.type === "success" 
                      ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-950/20 border-rose-500/35 text-rose-400"
                  }`}>
                    {retestSubmitStatus.type === "success" ? <Star size={14} /> : <AlertTriangle size={14} />}
                    <span>{retestSubmitStatus.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingRetest}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-display font-extrabold tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 text-sm"
                  id="retest-submit-btn"
                >
                  <Send size={14} />
                  <span>{submittingRetest ? "TRANSMITTING TO CLOUD..." : "DISPATCH AUDIT CLAIM"}</span>
                </button>

              </form>
            </div>
          </div>
        )}


        {/* VIEW 4: ADMIN PORTAL SECTION */}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-widest text-white uppercase">
                  MANAGEMENT BOARD
                </h2>
              </div>
            </div>

            <AdminPanel onDataUpdated={loadLeaderboard} />
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="bg-[#04060d] border-t border-slate-9ml/50 border-slate-900 py-10 mt-20 text-slate-500 text-xs text-center font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-slate-450 font-display font-bold tracking-widest uppercase">
            © 2026 BDTiers Platform. All rights reserved.
          </p>
          <p className="text-[10px] text-slate-600 max-w-lg mx-auto font-sans leading-relaxed">
            This platform acts as an independent Minecraft PvP tournament tier manager and ranking ladder organization. We are not officially affiliated with Mojang Studios, faceit, or microsoft Corporation.
          </p>
        </div>
      </footer>

      {/* RENDER MODAL CONDITION */}
      {selectedPlayerName && (
        <PlayerProfileModal
          username={selectedPlayerName}
          onClose={() => setSelectedPlayerName(null)}
        />
      )}

    </div>
  );
}
