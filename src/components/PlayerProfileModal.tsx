/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { X, Calendar, Shield, Award, PlayCircle, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Player, TestResult, RetestRequest, GAMEMODES, TIER_COLORS } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PlayerProfileModalProps {
  username: string;
  onClose: () => void;
}

export default function PlayerProfileModal({ username, onClose }: PlayerProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    player: Player;
    testResults: TestResult[];
    retests: RetestRequest[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/players/${encodeURIComponent(username)}`);
        if (!res.ok) {
          throw new Error("Player profile not found. They might have been deleted.");
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load player profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, [username]);

  // Render a clean badge color based on type
  const getBadgeStyle = (badge: string) => {
    const b = badge.toLowerCase();
    if (b === "verified") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    if (b === "tester" || b === "staff") return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (b === "champion" || b === "mvp") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    if (b === "og" || b === "founder") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
        id="profile-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-gradient-to-b from-[#111625] to-[#0b0f1a] rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden text-slate-100 my-8"
          onClick={(e) => e.stopPropagation()}
          id="profile-modal-card"
        >
          {/* Header background glow */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900/60 hover:bg-slate-800/80 transition-colors z-10"
            aria-label="Close modal"
            id="close-profile-modal-btn"
          >
            <X size={18} />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[350px]">
              <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-display text-lg tracking-wider">RETRIEVING PLAYER DATABASE...</p>
            </div>
          ) : error || !data ? (
            <div className="py-16 px-6 text-center">
              <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
              <h3 className="text-xl font-display font-semibold tracking-wider text-white mb-2">PROFILE UNAVAILABLE</h3>
              <p className="text-slate-400 max-w-md mx-auto mb-6">{error || "Could not retrieve profile."}</p>
              <button 
                onClick={onClose}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium"
                id="profile-error-close-btn"
              >
                Close Window
              </button>
            </div>
          ) : (
            <div className="p-6 md:p-8 relative">
              {/* Profile Meta Row */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 border-b border-slate-800/60 pb-6">
                {/* 3D Head Minecraft Avatar from real MC database */}
                <div className="relative group flex-shrink-0">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 opacity-50 blur-sm group-hover:opacity-75 transition duration-500" />
                  <img
                    src={`https://mc-heads.net/avatar/${data.player.username}/96.png`}
                    alt={`${data.player.username} Skin Head`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback image in case api rate limits
                      (e.target as HTMLImageElement).src = `https://minotar.net/helm/${data.player.username}/96.png`;
                    }}
                    className="relative w-24 h-24 rounded-xl bg-slate-900 border border-slate-700 object-cover"
                  />
                  <span className="absolute -bottom-2 -right-2 bg-cyan-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-slate-900 shadow">
                    {data.player.region}
                  </span>
                </div>

                <div className="text-center md:text-left flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                    <h2 className="text-3xl font-display font-bold tracking-tight text-white">
                      {data.player.username}
                    </h2>
                    
                    {/* Badges list */}
                    <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                      {data.player.badges.length > 0 ? (
                        data.player.badges.map((badge, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getBadgeStyle(badge)}`}
                          >
                            {badge}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] uppercase text-slate-500 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
                          Standard Player
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 mb-2 font-mono">
                    Registered: {new Date(data.player.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </p>

                  {data.player.notes && (
                    <p className="text-xs text-slate-400/80 italic mt-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 max-w-xl">
                      &ldquo;{data.player.notes}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gamemodes rankings table */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 flex items-center gap-2">
                    <Award size={18} className="text-cyan-400" />
                    GAMEMODE CLASSIFICATIONS
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {GAMEMODES.map((gm) => {
                      const tier = data.player.rankings[gm] || "Unranked";
                      const movement = data.player.movements[gm] || "neutral";
                      const isRanked = tier !== "Unranked";
                      const design = TIER_COLORS[tier] || TIER_COLORS.Unranked;

                      return (
                        <div
                          key={gm}
                          className="bg-slate-900/60 hover:bg-slate-850 p-3.5 rounded-xl border border-slate-800/60 hover:border-slate-700/80 transition-all flex flex-col justify-between group"
                        >
                          <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors">
                            {gm}
                          </span>
                          
                          <div className="flex items-center justify-between mt-3.5">
                            <span 
                              className={`text-sm px-2.5 py-0.5 rounded-md font-display uppercase tracking-wider ${design.badge} ${design.text}`}
                            >
                              {tier}
                            </span>

                            {isRanked && (
                              <span className="text-xs">
                                {movement === "up" && (
                                  <span className="text-emerald-400 flex items-center" title="Promoted">
                                    ▲ <span className="text-[10px] ml-0.5">UP</span>
                                  </span>
                                )}
                                {movement === "down" && (
                                  <span className="text-rose-400 flex items-center" title="Demoted">
                                    ▼ <span className="text-[10px] ml-0.5">DOWN</span>
                                  </span>
                                )}
                                {movement === "new" && (
                                  <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wide bg-cyan-950/20 px-1.5 py-0.5 rounded border border-cyan-800/30">
                                    NEW
                                  </span>
                                )}
                                {movement === "neutral" && (
                                  <span className="text-slate-500" title="Stable">
                                    ▬
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Test Log & Activities */}
                <div>
                  <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-purple-400" />
                    TEST HISTORY LOG
                  </h3>

                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {data.testResults.length === 0 ? (
                      <div className="bg-slate-900/40 border border-slate-805 p-6 rounded-xl text-center text-slate-500 font-mono text-xs">
                        No recorded tests found for this player.
                      </div>
                    ) : (
                      data.testResults.map((test) => {
                        const isPass = test.status === "pass";
                        return (
                          <div
                            key={test.id}
                            className={`p-3 rounded-xl border bg-slate-900/60 ${isPass ? 'border-emerald-500/20' : 'border-rose-500/10'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-semibold text-slate-300 font-mono">
                                {test.gamemode}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isPass ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {isPass ? "PASS" : "FAIL"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400/90 mb-2 font-mono">
                              {test.formerTier} → <span className="text-white font-semibold">{test.newTier}</span>
                            </p>

                            {test.notes && (
                              <p className="text-xs text-slate-400 bg-slate-950/30 p-1.5 rounded border border-slate-800/60 mb-2">
                                {test.notes}
                              </p>
                            )}

                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/40">
                              <span className="flex items-center gap-1">
                                <Shield size={10} />
                                Staff: {test.tester}
                              </span>
                              
                              {test.videoUrl ? (
                                <a
                                  href={test.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-medium hover:underline text-[10px]"
                                >
                                  <PlayCircle size={10} /> Video
                                </a>
                              ) : (
                                <span>{new Date(test.date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Active Retest inquiries */}
                  {data.retests.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-display font-semibold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 uppercase">
                        <CheckCircle size={14} className="text-amber-400" />
                        Retest Applications
                      </h3>
                      <div className="space-y-2">
                        {data.retests.map((ret) => (
                          <div
                            key={ret.id}
                            className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-slate-300">{ret.gamemode}</span>
                            <span 
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                ret.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                ret.status === "approved" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                                ret.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {ret.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
