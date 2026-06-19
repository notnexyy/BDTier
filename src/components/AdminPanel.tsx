/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Lock, Settings, Users, Clipboard, MessageSquare, AlertTriangle, 
  Trash2, Plus, Edit3, Check, X, Shield, PlusCircle, ExternalLink, RefreshCw 
} from "lucide-react";
import { Player, TestResult, RetestRequest, Announcement, GAMEMODES, REGIONS, AVAILABLE_TIERS } from "../types";

interface AdminPanelProps {
  onDataUpdated?: () => void;
}

export default function AdminPanel({ onDataUpdated }: AdminPanelProps) {
  // Authentication State
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("bdtiers_admin_token"));
  const [loginError, setLoginError] = useState<string | null>(null);

  // Custom confirmation modal state to bypass blocked native window.confirm in iframe
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"players" | "tests" | "retests" | "announcements">("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [retests, setRetests] = useState<RetestRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms states
  const [playerForm, setPlayerForm] = useState({
    id: "",
    username: "",
    region: "BD",
    notes: "",
    badges: [] as string[],
    rankings: {} as Record<string, string>,
    customPositions: {} as Record<string, string>, // stored as string in form, parsed to number
  });
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [badgeInput, setBadgeInput] = useState("");

  const [testForm, setTestForm] = useState({
    id: "",
    playerUsername: "",
    tester: "Admin",
    gamemode: "Sword",
    formerTier: "Unranked",
    newTier: "HT1",
    status: "pass" as "pass" | "fail",
    videoUrl: "",
    notes: "",
  });
  const [isEditingTest, setIsEditingTest] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({
    id: "",
    title: "",
    content: "",
    author: "Admin",
    category: "General" as Announcement["category"],
  });
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (token) {
      loadAllAdminData();
    }
  }, [token]);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Make API calls in parallel
      const [resPlayers, resTests, resRetests, resAnn] = await Promise.all([
        fetch("/api/admin/players", { headers }),
        fetch("/api/public/recent-tests"), // public with details
        fetch("/api/admin/retests", { headers }),
        fetch("/api/public/announcements"), // public can see lists
      ]);

      if (resPlayers.status === 401) {
        logout();
        return;
      }

      const playersJson = await resPlayers.json();
      const testsJson = await resTests.json();
      const retestsJson = await resRetests.json();
      const annJson = await resAnn.json();

      setPlayers(playersJson);
      setTestResults(testsJson);
      setRetests(retestsJson);
      setAnnouncements(annJson);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      showStatus("error", "Failed to sync dashboard database.");
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("bdtiers_admin_token", data.token);
        setToken(data.token);
        setLoginError(null);
        showStatus("success", "Access Authorized as Administrator.");
      } else {
        setLoginError(data.error || "Access Denied: Incorrect password.");
      }
    } catch (err) {
      setLoginError("Failed to issue authorization request.");
    }
  };

  const logout = () => {
    localStorage.removeItem("bdtiers_admin_token");
    setToken(null);
  };

  // --- PLAYER ACTIONS ---
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerForm.username.trim()) {
      showStatus("error", "Username cannot be empty");
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Convert custom positions string map to numeric map
      const customPositionsNumeric: Record<string, number> = {};
      Object.entries(playerForm.customPositions).forEach(([gm, val]) => {
        const valStr = val as string;
        if (valStr !== undefined && valStr !== "") {
          const num = parseInt(valStr, 10);
          if (!isNaN(num)) customPositionsNumeric[gm] = num;
        }
      });

      const bodyData = {
        username: playerForm.username,
        region: playerForm.region,
        notes: playerForm.notes,
        badges: playerForm.badges,
        rankings: playerForm.rankings,
        customPositions: customPositionsNumeric,
      };

      let res;
      if (isEditingPlayer) {
        res = await fetch(`/api/admin/players/${playerForm.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(bodyData),
        });
      } else {
        res = await fetch("/api/admin/players", {
          method: "POST",
          headers,
          body: JSON.stringify(bodyData),
        });
      }

      const result = await res.json();
      if (res.ok) {
        showStatus("success", isEditingPlayer ? "Player modified successfully." : "Player added to official leaderboard.");
        resetPlayerForm();
        loadAllAdminData();
        if (onDataUpdated) onDataUpdated();
      } else {
        showStatus("error", result.error || "Save operation failed.");
      }
    } catch (ex) {
      showStatus("error", "Failed to contact database.");
    }
  };

  const handleEditPlayer = (p: Player) => {
    // Fill custom positions as strings
    const strPositions: Record<string, string> = {};
    GAMEMODES.forEach(gm => {
      if (p.customPositions?.[gm] !== undefined) {
        strPositions[gm] = p.customPositions[gm].toString();
      } else {
        strPositions[gm] = "";
      }
    });

    setPlayerForm({
      id: p.id,
      username: p.username,
      region: p.region,
      notes: p.notes || "",
      badges: p.badges,
      rankings: { ...p.rankings },
      customPositions: strPositions,
    });
    setIsEditingPlayer(true);
  };

  const handleDeletePlayer = (id: string, username: string) => {
    setConfirmModal({
      title: "Remove Player Footprint?",
      message: `Are you absolutely sure you want to remove player '${username}'? This deletes their entire ranked footprint.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/players/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showStatus("success", "Player purged successfully.");
            loadAllAdminData();
            if (onDataUpdated) onDataUpdated();
          } else {
            showStatus("error", "Purge request failed.");
          }
        } catch (err) {
          showStatus("error", "Purge connection error.");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const resetPlayerForm = () => {
    setPlayerForm({
      id: "",
      username: "",
      region: "BD",
      notes: "",
      badges: [],
      rankings: {},
      customPositions: {},
    });
    setIsEditingPlayer(false);
    setBadgeInput("");
  };

  // Badge helpers
  const appendBadge = () => {
    const fresh = badgeInput.trim();
    if (fresh && !playerForm.badges.includes(fresh)) {
      setPlayerForm(f => ({ ...f, badges: [...f.badges, fresh] }));
      setBadgeInput("");
    }
  };

  const removeBadge = (badgeToRemove: string) => {
    setPlayerForm(f => ({ ...f, badges: f.badges.filter(b => b !== badgeToRemove) }));
  };

  // --- TEST OPERATIONS ---
  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.playerUsername.trim()) {
      showStatus("error", "Player name required");
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      let res;
      if (isEditingTest) {
        res = await fetch(`/api/admin/test_results/${testForm.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(testForm),
        });
      } else {
        res = await fetch("/api/admin/test_results", {
          method: "POST",
          headers,
          body: JSON.stringify(testForm),
        });
      }

      if (res.ok) {
        showStatus("success", isEditingTest ? "Test record modified." : "Test results published & rankings calculated.");
        resetTestForm();
        loadAllAdminData();
        if (onDataUpdated) onDataUpdated();
      } else {
        const errorData = await res.json();
        showStatus("error", errorData.error || "Failed to commit test results.");
      }
    } catch (ex) {
      showStatus("error", "Test compilation failed.");
    }
  };

  const handleEditTest = (test: TestResult) => {
    setTestForm({
      id: test.id,
      playerUsername: test.playerUsername,
      tester: test.tester,
      gamemode: test.gamemode,
      formerTier: test.formerTier,
      newTier: test.newTier,
      status: test.status,
      videoUrl: test.videoUrl || "",
      notes: test.notes || "",
    });
    setIsEditingTest(true);
  };

  const handleDeleteTest = (id: string) => {
    setConfirmModal({
      title: "Delete Historical Test Log?",
      message: "Are you absolutely sure you want to remove this historical PvP test log?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/test_results/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showStatus("success", "Test log deleted successfully.");
            loadAllAdminData();
            if (onDataUpdated) onDataUpdated();
          } else {
            showStatus("error", "Pure delete command refused.");
          }
        } catch (ex) {
          showStatus("error", "Delete command exception.");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const resetTestForm = () => {
    setTestForm({
      id: "",
      playerUsername: "",
      tester: "Admin",
      gamemode: "Sword",
      formerTier: "Unranked",
      newTier: "HT1",
      status: "pass",
      videoUrl: "",
      notes: "",
    });
    setIsEditingTest(false);
  };

  // --- RETEST APPLICATIONS ---
  const handleRetestStatus = async (id: string, nextStatus: RetestRequest["status"]) => {
    try {
      const res = await fetch(`/api/admin/retests/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        showStatus("success", `Application status updated to ${nextStatus}.`);
        loadAllAdminData();
        if (onDataUpdated) onDataUpdated();
      } else {
        showStatus("error", "Failed to update retest state.");
      }
    } catch (err) {
      showStatus("error", "Communication failure.");
    }
  };

  const handleDeleteRetest = (id: string) => {
    setConfirmModal({
      title: "Delete Retest Application?",
      message: "Are you absolutely sure you want to permanently delete this retest application record?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/retests/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showStatus("success", "Purged applicant registration.");
            loadAllAdminData();
          } else {
            showStatus("error", "Request failed.");
          }
        } catch (err) {
          showStatus("error", "Request failed due to connection.");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // --- ANNOUNCEMENTS ---
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      showStatus("error", "Announcement title and body content cannot be empty.");
      return;
    }

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      let res;
      if (isEditingAnnouncement) {
        res = await fetch(`/api/admin/announcements/${announcementForm.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(announcementForm),
        });
      } else {
        res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers,
          body: JSON.stringify(announcementForm),
        });
      }

      if (res.ok) {
        showStatus("success", isEditingAnnouncement ? "Announcement modified." : "Announcement broadcasted successfully.");
        resetAnnouncementForm();
        loadAllAdminData();
        if (onDataUpdated) onDataUpdated();
      } else {
        showStatus("error", "Database broadcast error.");
      }
    } catch (ex) {
      showStatus("error", "Broadcasting exception.");
    }
  };

  const handleEditAnnouncement = (a: Announcement) => {
    setAnnouncementForm({
      id: a.id,
      title: a.title,
      content: a.content,
      author: a.author,
      category: a.category,
    });
    setIsEditingAnnouncement(true);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setConfirmModal({
      title: "Delete News Post?",
      message: "Are you absolutely sure you want to delete this news post? This will remove it from the home feed.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/announcements/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showStatus("success", "Announcement deleted.");
            loadAllAdminData();
            if (onDataUpdated) onDataUpdated();
          } else {
            showStatus("error", "Post delete refused.");
          }
        } catch (err) {
          showStatus("error", "Broadcaster offline.");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      id: "",
      title: "",
      content: "",
      author: "Admin",
      category: "General",
    });
    setIsEditingAnnouncement(false);
  };


  // If not authenticated, render login panel
  if (!token) {
    return (
      <div className="max-w-md mx-auto my-16 bg-[#111625]/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse-slow">
            <Lock className="text-cyan-400" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-display font-bold text-center tracking-wide text-white mb-1 uppercase">
          BDTiers Secure Node
        </h2>
        <p className="text-xs text-center text-slate-400 font-mono mb-8">
          RESTRICTED TO RANKING OPERATIONS DIRECTORS
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Corporate Username
            </label>
            <input
              type="text"
              disabled
              value="admin"
              className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300 font-mono select-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              Director Secret Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700/80 focus:border-cyan-500/80 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-mono"
            />
          </div>

          {loginError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-display uppercase tracking-wider font-semibold py-3 rounded-lg hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition duration-300"
            id="admin-login-submit"
          >
            Authorize Access
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-500/80 font-mono mt-8">
          Username: admin | System initialized securely
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 text-slate-200">
      
      {/* Admin Panel Header Status */}
      <div className="bg-[#111625]/60 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-lg">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-display font-bold uppercase tracking-wider text-white">
                BDTiers Control Dashboard
              </h2>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded-full uppercase font-bold">
                Director Authorized
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Live Connection Node: Secure Database synchronization active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllAdminData}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh database"
            id="admin-refresh-db-btn"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>

          <button
            onClick={logout}
            className="px-4 py-2 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-800/40 text-rose-400 text-xs font-mono rounded-lg transition-colors"
            id="admin-logout-btn"
          >
            Revoke Credentials
          </button>
        </div>
      </div>

      {statusMessage && (
        <div 
          className={`p-4 rounded-xl border text-sm font-mono flex items-center gap-2 animate-pulse-slow ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400" 
              : "bg-rose-950/30 border-rose-500/40 text-rose-400"
          }`}
          id="admin-global-toast-notification"
        >
          {statusMessage.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => { setActiveTab("players"); resetPlayerForm(); }}
          className={`flex items-center gap-2 px-5 py-3 font-display tracking-wider text-sm uppercase border-b-2 font-medium transition-all ${
            activeTab === "players"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          id="tab-btn-players"
        >
          <Users size={16} />
          Player Registry ({players.length})
        </button>

        <button
          onClick={() => { setActiveTab("tests"); resetTestForm(); }}
          className={`flex items-center gap-2 px-5 py-3 font-display tracking-wider text-sm uppercase border-b-2 font-medium transition-all ${
            activeTab === "tests"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          id="tab-btn-tests"
        >
          <Clipboard size={16} />
          PvP Tests Center ({testResults.length})
        </button>

        <button
          onClick={() => setActiveTab("retests")}
          className={`flex items-center gap-2 px-5 py-3 font-display tracking-wider text-sm uppercase border-b-2 font-medium transition-all ${
            activeTab === "retests"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          id="tab-btn-retests"
        >
          <Settings size={16} />
          Retest Claims ({retests.filter(r => r.status === "pending").length} Pending)
        </button>

        <button
          onClick={() => { setActiveTab("announcements"); resetAnnouncementForm(); }}
          className={`flex items-center gap-2 px-5 py-3 font-display tracking-wider text-sm uppercase border-b-2 font-medium transition-all ${
            activeTab === "announcements"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/5"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
          id="tab-btn-announcements"
        >
          <MessageSquare size={16} />
          Announcements ({announcements.length})
        </button>
      </div>

      {loading && players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-slate-800/40 rounded-2xl">
          <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-mono text-xs">SYNCHRONIZING SECURE NODE RECORDS...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Active Work Area (Left / Form Columns) */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* 1. Players management active tab view */}
            {activeTab === "players" && (
              <div className="bg-[#111625]/40 border border-slate-850 rounded-xl p-6">
                <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 uppercase">
                  Player Roster Database
                </h3>

                {players.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
                    <p className="text-slate-400 font-mono text-sm">NO PLAYERS INITIALIZED IN PLATFORM</p>
                    <p className="text-slate-500 text-xs mt-1">Add a player on the right to start building the esports leaderboard.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">IGN Username</th>
                          <th className="py-3 px-4">Region</th>
                          <th className="py-3 px-4">Badges</th>
                          <th className="py-3 px-4">Sword / Axe / Crystal</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => (
                          <tr key={p.id} className="border-b border-slate-850 hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                              <img
                                src={`https://mc-heads.net/avatar/${p.username}/24.png`}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://minotar.net/helm/${p.username}/24.png`;
                                }}
                                className="w-6 h-6 rounded bg-slate-950"
                              />
                              <span>{p.username}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-bold">{p.region}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {p.badges.map((b, idx) => (
                                  <span key={idx} className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded border border-slate-700">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-bold">
                              Sw: <span className="text-cyan-400">{p.rankings.Sword || "Unranked"}</span> | 
                              Ax: <span className="text-amber-500">{p.rankings.Axe || "Unranked"}</span> | 
                              Cry: <span className="text-purple-400">{p.rankings.Crystal || "Unranked"}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleEditPlayer(p)}
                                  className="p-1 px-2 bg-slate-800 hover:bg-cyan-900/60 hover:text-cyan-400 text-slate-300 rounded border border-slate-700 hover:border-cyan-700/50 transition-all font-sans text-xs flex items-center gap-1"
                                >
                                  <Edit3 size={11} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlayer(p.id, p.username)}
                                  className="p-1 px-2 bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 rounded border border-rose-800/40 transition-all font-sans text-xs flex items-center gap-1"
                                >
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. PvP tests database center view */}
            {activeTab === "tests" && (
              <div className="bg-[#111625]/40 border border-slate-850 rounded-xl p-6">
                <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 uppercase">
                  Historical Tests Center Ledger
                </h3>

                {testResults.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    <Clipboard className="text-slate-600 mx-auto mb-3" size={32} />
                    <p className="text-slate-400 font-mono text-sm">NO PVP TESTS COMMITTED YET</p>
                    <p className="text-slate-500 text-xs mt-1">Submit test logs on the right to award badges and rankings.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {testResults.map((test) => {
                      const isPass = test.status === "pass";
                      return (
                        <div
                          key={test.id}
                          className={`p-4 bg-slate-900/60 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            isPass ? "border-emerald-500/20" : "border-rose-500/15"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={`https://mc-heads.net/avatar/${test.playerUsername}/36.png`}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://minotar.net/helm/${test.playerUsername}/36.png`;
                              }}
                              className="w-9 h-9 rounded bg-slate-950 mt-0.5 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white font-mono">{test.playerUsername}</span>
                                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 rounded uppercase font-mono font-bold">
                                  {test.gamemode}
                                </span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 rounded font-mono ${
                                  isPass ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {isPass ? "PASS" : "FAIL"}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 font-mono mt-1">
                                Test Tier outcome: <span className="text-slate-400 italic">{test.formerTier}</span> → <span className="text-cyan-400 font-extrabold">{test.newTier}</span>
                              </p>

                              {test.notes && (
                                <p className="text-xs text-slate-400 mt-1 max-w-lg bg-slate-950/20 p-1.5 rounded border border-slate-800 font-sans">
                                  {test.notes}
                                </p>
                              )}

                              <div className="text-[10px] text-slate-500 font-mono mt-2 flex flex-wrap gap-x-4">
                                <span>Tester: {test.tester}</span>
                                <span>Date: {new Date(test.date).toLocaleDateString()}</span>
                                {test.videoUrl && (
                                  <a href={test.videoUrl} target="_blank" rel="noreferrer" className="text-cyan-400 inline-flex items-center gap-0.5 hover:underline">
                                    <ExternalLink size={10} /> Video Proof
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 self-end md:self-center">
                            <button
                              onClick={() => handleEditTest(test)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTest(test.id)}
                              className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/30 text-rose-400 text-xs rounded transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. Retest Claims admin lists view */}
            {activeTab === "retests" && (
              <div className="bg-[#111625]/40 border border-slate-850 rounded-xl p-6">
                <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 uppercase">
                  Minecraft Retest Applications Queue
                </h3>

                {retests.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    <Settings className="text-slate-700 mx-auto mb-3" size={32} />
                    <p className="text-slate-400 font-mono text-sm">RETEST QUEUE IS COMPLETED</p>
                    <p className="text-slate-500 text-xs mt-1">No public retest claims await evaluation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {retests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-slate-900/60 border border-slate-850/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 font-mono text-xs">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <img
                              src={`https://mc-heads.net/avatar/${req.username}/24.png`}
                              alt=""
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://minotar.net/helm/${req.username}/24.png`;
                              }}
                              className="w-6 h-6 rounded bg-slate-950 mr-0.5"
                            />
                            <span className="font-bold text-white text-sm">{req.username}</span>
                            <span className="bg-cyan-950/20 text-cyan-400 border border-cyan-800/40 px-2 py-0.5 rounded font-bold uppercase">
                              {req.gamemode}
                            </span>
                            <span className="text-slate-500 uppercase">
                              Tier: <span className="text-slate-300 font-bold">{req.currentTier}</span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-850/80 font-sans italic my-2">
                            Reason: &ldquo;{req.reason}&rdquo;
                          </p>

                          <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-500 mt-2">
                            <span>Discord ID: <span className="text-indigo-400 font-bold">{req.discordUsername}</span></span>
                            <span>Created: {new Date(req.createdAt).toLocaleDateString()}</span>
                            <span>Status:  
                              <span className={`ml-1 uppercase font-bold ${
                                req.status === "pending" ? "text-amber-400" :
                                req.status === "approved" ? "text-cyan-400" :
                                req.status === "completed" ? "text-emerald-400" : "text-rose-500"
                              }`}>
                                {req.status}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 self-end md:self-center">
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleRetestStatus(req.id, "approved")}
                                className="px-2 py-1 bg-cyan-900/30 hover:bg-cyan-900/60 border border-cyan-800/50 text-cyan-400 text-xs rounded transition-colors uppercase font-display"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRetestStatus(req.id, "rejected")}
                                className="px-2 py-1 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/30 text-rose-400 text-xs rounded transition-colors uppercase font-display"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          
                          {req.status === "approved" && (
                            <button
                              onClick={() => handleRetestStatus(req.id, "completed")}
                              className="px-2.5 py-1 bg-emerald-900/30 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 text-xs rounded transition-colors uppercase font-display"
                            >
                              Mark Completed
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteRetest(req.id)}
                            className="p-1 px-1.5 bg-slate-900 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 rounded text-slate-400 transition-colors"
                            title="Delete claim"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Announcements and community news posts */}
            {activeTab === "announcements" && (
              <div className="bg-[#111625]/40 border border-slate-850 rounded-xl p-6">
                <h3 className="text-lg font-display font-semibold tracking-wider text-white mb-4 uppercase">
                  News & Broadcast Ledger
                </h3>

                {announcements.length === 0 ? (
                  <div className="p-12 text-center bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                    <MessageSquare className="text-slate-600 mx-auto mb-3" size={32} />
                    <p className="text-slate-400 font-mono text-sm">NO ANNOUNCEMENTS BROADCASTED</p>
                    <p className="text-slate-500 text-xs mt-1">Publish news on the right to populate the platform's home feed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((post) => (
                      <div
                        key={post.id}
                        className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="bg-indigo-950/20 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono">
                              {post.category}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(post.date).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              By {post.author}
                            </span>
                          </div>

                          <h4 className="text-base font-display font-bold text-white tracking-wide">
                            {post.title}
                          </h4>

                          <p className="text-xs text-slate-400 font-sans mt-2 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </p>
                        </div>

                        <div className="flex gap-2 self-end md:self-start">
                          <button
                            onClick={() => handleEditAnnouncement(post)}
                            className="px-2.5 py-1 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(post.id)}
                            className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/35 text-rose-400 text-xs rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>


          {/* Dashboard Forms Sidebar (Right Side Panel) */}
          <div className="space-y-8">
            
            {/* 1. Player controls active tab forms panel */}
            {activeTab === "players" && (
              <div className="bg-[#111625]/60 hover:bg-[#111625]/80 border border-slate-800/80 p-6 rounded-xl shadow-xl transition-all">
                <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/10 pb-3">
                  <PlusCircle size={18} className="text-cyan-400" />
                  <h3 className="text-md font-display font-bold text-white tracking-wider uppercase">
                    {isEditingPlayer ? "Update Player Node" : "Register Player Node"}
                  </h3>
                </div>

                <form onSubmit={handleSavePlayer} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Minecraft In-Game Name (IGN)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shahnur_BD"
                      value={playerForm.username}
                      onChange={(e) => setPlayerForm(f => ({ ...f, username: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-white placeholder-slate-700 font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Regional Group
                    </label>
                    <select
                      value={playerForm.region}
                      onChange={(e) => setPlayerForm(f => ({ ...f, region: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                    >
                      {REGIONS.map(reg => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Director Player Notes / Bio
                    </label>
                    <textarea
                      placeholder="e.g. Top tier overall contender, expert in sword duels."
                      rows={2}
                      value={playerForm.notes}
                      onChange={(e) => setPlayerForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-white placeholder-slate-700 font-sans focus:outline-none"
                    />
                  </div>

                  {/* Badges system */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Account Badges / Accolades
                    </label>
                    <div className="flex gap-1.5 mb-2">
                      <input
                        type="text"
                        placeholder="e.g. Champion, Staff, Verified"
                        value={badgeInput}
                        onChange={(e) => setBadgeInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1 text-white placeholder-slate-800 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={appendBadge}
                        className="px-3 bg-cyan-900/30 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 text-xs rounded"
                      >
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {playerForm.badges.map((b, idx) => (
                        <span 
                          key={idx}
                          onClick={() => removeBadge(b)}
                          className="bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800 cursor-pointer flex items-center gap-1 group"
                          title="Click to remove badge"
                        >
                          {b} <span className="text-slate-600 group-hover:text-rose-400 text-[10px]">×</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Gamemodes initial classification setup */}
                  <div className="border-t border-slate-800/80 pt-3">
                    <h4 className="text-[10px] uppercase text-slate-400 font-bold mb-2">
                      Gamemode Tiers / Leadership Priority
                    </h4>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {GAMEMODES.map((gm) => (
                        <div key={gm} className="flex gap-2 items-center justify-between">
                          <span className="text-xs text-slate-400 font-sans font-medium">{gm}</span>
                          <div className="flex gap-1">
                            {/* Tier dropdown */}
                            <select
                              value={playerForm.rankings[gm] || "Unranked"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPlayerForm(f => ({
                                  ...f,
                                  rankings: { ...f.rankings, [gm]: val }
                                }));
                              }}
                              className="bg-slate-950 border border-slate-800 rounded text-xs p-1 text-white"
                            >
                              {AVAILABLE_TIERS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>

                            {/* Custom Sorting position */}
                            <input
                              type="number"
                              min="1"
                              placeholder="Pos"
                              title="Custom Leaderboard position override (Lower value is higher ranking)"
                              value={playerForm.customPositions[gm] || ""}
                              onChange={(e) => {
                                const posVal = e.target.value;
                                setPlayerForm(f => ({
                                  ...f,
                                  customPositions: { ...f.customPositions, [gm]: posVal }
                                }));
                              }}
                              className="w-12 bg-slate-950 border border-slate-800 rounded text-xs py-0.5 px-1 text-white text-center focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 font-display text-white font-semibold tracking-wider rounded transition-all flex items-center justify-center gap-1 text-sm uppercase"
                    >
                      <Check size={14} /> {isEditingPlayer ? "Update Record" : "Publish Record"}
                    </button>
                    {isEditingPlayer && (
                      <button
                        type="button"
                        onClick={resetPlayerForm}
                        className="px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded text-slate-400"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* 2. Test Center forms panel */}
            {activeTab === "tests" && (
              <div className="bg-[#111625]/60 hover:bg-[#111625]/80 border border-slate-800/80 p-6 rounded-xl shadow-xl transition-all">
                <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/10 pb-3">
                  <Clipboard size={18} className="text-cyan-400" />
                  <h3 className="text-md font-display font-bold text-white tracking-wider uppercase">
                    {isEditingTest ? "Modify Active Test" : "Submit Game Test Log"}
                  </h3>
                </div>

                <form onSubmit={handleSaveTest} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Applicant Minecraft IGN
                    </label>
                    <select
                      required
                      value={testForm.playerUsername}
                      onChange={(e) => setTestForm(f => ({ ...f, playerUsername: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="">-- Choose Candidate --</option>
                      {players.map(p => (
                        <option key={p.id} value={p.username}>{p.username} ({p.region})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 mt-1 font-sans">
                      Candidate must be registered in the Player Registry first.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Gamemode
                      </label>
                      <select
                        value={testForm.gamemode}
                        onChange={(e) => setTestForm(f => ({ ...f, gamemode: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      >
                        {GAMEMODES.filter(gm => gm !== "Overall").map(gm => (
                          <option key={gm} value={gm}>{gm}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Evaluation Tester
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Admin, Senior Tester"
                        value={testForm.tester}
                        onChange={(e) => setTestForm(f => ({ ...f, tester: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Former Tier (Before)
                      </label>
                      <select
                        value={testForm.formerTier}
                        onChange={(e) => setTestForm(f => ({ ...f, formerTier: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      >
                        {AVAILABLE_TIERS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Target Tier (After)
                      </label>
                      <select
                        value={testForm.newTier}
                        onChange={(e) => setTestForm(f => ({ ...f, newTier: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      >
                        {AVAILABLE_TIERS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Grade Decision
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setTestForm(f => ({ ...f, status: "pass" }))}
                        className={`py-2 px-3 rounded text-center border font-bold uppercase ${
                          testForm.status === "pass"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                            : "bg-slate-950 border-slate-855 text-slate-400 hover:text-white"
                        }`}
                      >
                        Passed
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestForm(f => ({ ...f, status: "fail" }))}
                        className={`py-2 px-3 rounded text-center border font-bold uppercase ${
                          testForm.status === "fail"
                            ? "bg-rose-500/10 border-rose-500 text-rose-400"
                            : "bg-slate-950 border-slate-855 text-slate-400 hover:text-white"
                        }`}
                      >
                        Failed
                      </button>
                    </div>
                    {testForm.status === "pass" && (
                      <p className="text-[9px] text-emerald-400/80 mt-1.5 font-sans leading-relaxed">
                        ★ NOTE: Passing will automatically update the candidate's core profile tier and compute movement indexes in real time.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Battle Evidence Video URL (Proof)
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={testForm.videoUrl}
                      onChange={(e) => setTestForm(f => ({ ...f, videoUrl: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Evaluation Notes
                    </label>
                    <textarea
                      placeholder="Describe player performance, aim, movement during trial..."
                      rows={3}
                      value={testForm.notes}
                      onChange={(e) => setTestForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white font-sans focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 font-display text-white font-semibold tracking-wider rounded transition-all flex items-center justify-center gap-1 text-sm uppercase"
                    >
                      <Check size={14} /> {isEditingTest ? "Modify Record" : "Award Tier / Safe Push"}
                    </button>
                    {isEditingTest && (
                      <button
                        type="button"
                        onClick={resetTestForm}
                        className="px-3 bg-slate-905 border border-slate-800 rounded text-slate-400"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* 3. Retests informational static view inside form sidebar */}
            {activeTab === "retests" && (
              <div className="bg-[#111625]/60 border border-slate-800/80 p-6 rounded-xl text-xs font-mono">
                <h4 className="text-sm font-display font-bold text-white uppercase mb-3 flex items-center gap-1">
                  <Shield size={14} className="text-amber-500" />
                  Management Protocols
                </h4>
                <div className="space-y-3 leading-relaxed text-slate-400 font-sans">
                  <p>
                    Retest Claims are submitted by players publicly through the website's front-end application form.
                  </p>
                  <p>
                    <strong>Approved:</strong> Welcomes the applicant to host active testing sessions. High tier candidates must undergo rigorous inspection.
                  </p>
                  <p>
                    <strong>Completed:</strong> Signifies that testing is successfully finalized, results have been securely pushed, and resources can be returned to active inventory.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Announcements publishing panel form */}
            {activeTab === "announcements" && (
              <div className="bg-[#111625]/60 hover:bg-[#111625]/80 border border-slate-800/80 p-6 rounded-xl shadow-xl transition-all">
                <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/10 pb-3">
                  <MessageSquare size={18} className="text-cyan-400" />
                  <h3 className="text-md font-display font-bold text-white tracking-wider uppercase">
                    {isEditingAnnouncement ? "Edit Announcement" : "Create Broadcast Post"}
                  </h3>
                </div>

                <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Broadcast Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BD-Regionals PvP Tier testing season 3"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white placeholder-slate-750 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Category
                      </label>
                      <select
                        value={announcementForm.category}
                        onChange={(e) => setAnnouncementForm(f => ({ ...f, category: e.target.value as Announcement["category"] }))}
                        className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      >
                        <option value="Updates">Updates</option>
                        <option value="Events">Events</option>
                        <option value="Rankings">Rankings</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                        Author Badge
                      </label>
                      <input
                        type="text"
                        placeholder="Admin"
                        value={announcementForm.author}
                        onChange={(e) => setAnnouncementForm(f => ({ ...f, author: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded px-3 py-2 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1.5 font-bold">
                      Post Content Body (Markdown Supported)
                    </label>
                    <textarea
                      required
                      placeholder="Express rules updates, regional esports changes, and test requirements..."
                      rows={6}
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm(f => ({ ...f, content: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded px-3 py-2 text-white placeholder-slate-750 font-sans focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 font-display text-white font-semibold tracking-wider rounded transition-all flex items-center justify-center gap-1 text-sm uppercase"
                    >
                      <Check size={14} /> {isEditingAnnouncement ? "Update Broadcast" : "Publish to Feed"}
                    </button>
                    {isEditingAnnouncement && (
                      <button
                        type="button"
                        onClick={resetAnnouncementForm}
                        className="px-3 bg-slate-905 border border-slate-800 rounded text-slate-400"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Custom Confirmation Modal Overlay */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0B0F1A] border border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
            
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-red-950/40 text-red-400 rounded-lg border border-red-900/30 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-white font-display">
                  {confirmModal.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-mono border border-slate-850 hover:border-slate-800 rounded transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await confirmModal.onConfirm();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 hover:scale-[1.02] active:scale-[0.98] text-white font-mono font-semibold rounded transition-all shadow-lg shadow-red-950/20 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
