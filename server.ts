/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { Player, TestResult, RetestRequest, Announcement } from "./src/types";

// Setup server directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json());

// Initialize empty DB if not present
interface DB {
  players: Player[];
  testResults: TestResult[];
  retests: RetestRequest[];
  announcements: Announcement[];
}

function readDB(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDB: DB = {
        players: [],
        testResults: [],
        retests: [],
        announcements: [],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
      return initialDB;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content) as DB;
  } catch (error) {
    console.error("Error reading database file, returning empty schema:", error);
    return {
      players: [],
      testResults: [],
      retests: [],
      announcements: [],
    };
  }
}

function writeDB(data: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Simple Admin Authentication Token
const ADMIN_TOKEN = "BDTiers-Super-Esports-Security-Token-0049-2026";

// Auth middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Admin privileges required" });
  }
}

// --- PUBLIC APIS ---

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "@NExYY@0049@") {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, error: "Invalid username or password" });
  }
});

// Get global/gamemode stats
app.get("/api/public/stats", (req, res) => {
  const db = readDB();
  const totalPlayers = db.players.length;
  const totalTests = db.testResults.length;
  
  // Calculate active testers (testers who have performed tests)
  const testersSet = new Set<string>();
  db.testResults.forEach(test => {
    if (test.tester) {
      testersSet.add(test.tester.trim().toLowerCase());
    }
  });
  const activeTesters = testersSet.size || 0;

  res.json({
    totalPlayers,
    totalTests,
    activeTesters,
  });
});

// Leaderboard query
app.get("/api/public/leaderboard", (req, res) => {
  const db = readDB();
  const gamemode = (req.query.gamemode as string) || "Overall";
  const region = req.query.region as string;
  const tier = req.query.tier as string;

  // Tier sorting order
  const tierOrder = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "Unranked"];
  
  let list = db.players.map(player => {
    const playerTier = player.rankings[gamemode] || "Unranked";
    const movement = player.movements[gamemode] || "neutral";
    const position = player.customPositions?.[gamemode] ?? 999999;
    return {
      ...player,
      activeTier: playerTier,
      activeMovement: movement,
      customOrder: position,
    };
  });

  // Filter unranked unless overall, or filter tier
  if (tier) {
    list = list.filter(p => p.activeTier === tier);
  } else {
    // By default, only show players who have a tier in this gamemode (not "Unranked")
    // Except if it's overall, where we want to show anyone who has any rank
    if (gamemode !== "Overall") {
      list = list.filter(p => p.activeTier !== "Unranked");
    } else {
      // For Overall, show if they have AT LEAST ONE ranked gamemode
      list = list.filter(p => {
        return Object.values(p.rankings).some(t => t && t !== "Unranked");
      });
    }
  }

  // Filter by region if set and not "All"
  if (region && region !== "All") {
    list = list.filter(p => p.region === region);
  }

  // Sort: By Custom Ordering position first if any exists, otherwise by tier hierarchy, then alphabetically by username
  list.sort((a, b) => {
    // 1. Check custom positions if set
    if (a.customOrder !== b.customOrder) {
      return a.customOrder - b.customOrder;
    }
    
    // 2. Sort by tierOrder
    const orderA = tierOrder.indexOf(a.activeTier);
    const orderB = tierOrder.indexOf(b.activeTier);
    const indexA = orderA === -1 ? 999 : orderA;
    const indexB = orderB === -1 ? 999 : orderB;
    
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    
    // 3. Alphabetical fallback
    return a.username.localeCompare(b.username);
  });

  res.json(list);
});

// Get individual player profile
app.get("/api/public/players/:username", (req, res) => {
  const db = readDB();
  const username = req.params.username.trim().toLowerCase();
  
  const player = db.players.find(p => p.username.toLowerCase() === username);
  if (!player) {
    return res.status(404).json({ error: "Player not found" });
  }

  // Filter test history, promo history, retests for this player
  const playerTestResults = db.testResults.filter(
    t => t.playerUsername.toLowerCase() === username
  );
  
  const playerRetests = db.retests.filter(
    r => r.username.toLowerCase() === username
  );

  res.json({
    player,
    testResults: playerTestResults,
    retests: playerRetests,
  });
});

// Apply for retest (public)
app.post("/api/retests", (req, res) => {
  const { username, gamemode, currentTier, reason, discordUsername } = req.body;
  if (!username || !gamemode || !reason || !discordUsername) {
    return res.status(400).json({ error: "Minecraft username, gamemode, reason, and Discord username are required." });
  }

  const db = readDB();
  const newRetest: RetestRequest = {
    id: "ret_" + Math.random().toString(36).substr(2, 9),
    username: username.trim(),
    gamemode,
    currentTier: currentTier || "Unranked",
    reason,
    discordUsername,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  db.retests.push(newRetest);
  writeDB(db);

  res.json({ success: true, retest: newRetest });
});

// Get public announcements
app.get("/api/public/announcements", (req, res) => {
  const db = readDB();
  // Sort latest first
  const sorted = [...db.announcements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted);
});

// Get public recent test results (recent activity)
app.get("/api/public/recent-tests", (req, res) => {
  const db = readDB();
  // Sort by date latest first
  const sorted = [...db.testResults].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted.slice(0, 15));
});


// --- ADMIN SECURE APIS ---

// Retest request management
app.get("/api/admin/retests", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.retests);
});

app.post("/api/admin/retests/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // pending, approved, rejected, completed
  
  if (!["pending", "approved", "rejected", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const db = readDB();
  const retestIndex = db.retests.findIndex(r => r.id === id);
  if (retestIndex === -1) {
    return res.status(404).json({ error: "Retest request not found" });
  }

  db.retests[retestIndex].status = status;
  writeDB(db);

  res.json({ success: true, retest: db.retests[retestIndex] });
});

app.delete("/api/admin/retests/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.retests = db.retests.filter(r => r.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Players management
app.get("/api/admin/players", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.players);
});

app.post("/api/admin/players", requireAdmin, (req, res) => {
  const { username, region, badges, rankings, movements, customPositions, notes } = req.body;
  if (!username || !region) {
    return res.status(400).json({ error: "Player username and region are required." });
  }

  const db = readDB();
  
  // Prevent duplicate usernames
  const exists = db.players.some(p => p.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "A player with this Minecraft username already exists." });
  }

  const newPlayer: Player = {
    id: "p_" + Math.random().toString(36).substr(2, 9),
    username: username.trim(),
    region,
    badges: badges || [],
    rankings: rankings || {},
    movements: movements || {},
    customPositions: customPositions || {},
    notes: notes || "",
    createdAt: new Date().toISOString(),
  };

  db.players.push(newPlayer);
  writeDB(db);

  res.json({ success: true, player: newPlayer });
});

app.put("/api/admin/players/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, region, badges, rankings, movements, customPositions, notes } = req.body;
  
  const db = readDB();
  const playerIndex = db.players.findIndex(p => p.id === id);
  if (playerIndex === -1) {
    return res.status(404).json({ error: "Player not found" });
  }

  // Prevent duplicate usernames on rename
  if (username && username.trim().toLowerCase() !== db.players[playerIndex].username.toLowerCase()) {
    const exists = db.players.some(p => p.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Another player with this username already exists" });
    }
  }

  const updatedPlayer: Player = {
    ...db.players[playerIndex],
    username: username ? username.trim() : db.players[playerIndex].username,
    region: region || db.players[playerIndex].region,
    badges: badges !== undefined ? badges : db.players[playerIndex].badges,
    rankings: rankings !== undefined ? rankings : db.players[playerIndex].rankings,
    movements: movements !== undefined ? movements : db.players[playerIndex].movements,
    customPositions: customPositions !== undefined ? customPositions : db.players[playerIndex].customPositions,
    notes: notes !== undefined ? notes : db.players[playerIndex].notes,
  };

  db.players[playerIndex] = updatedPlayer;
  writeDB(db);

  res.json({ success: true, player: updatedPlayer });
});

app.delete("/api/admin/players/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.players = db.players.filter(p => p.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Test Results management
app.post("/api/admin/test_results", requireAdmin, (req, res) => {
  const { playerUsername, tester, gamemode, formerTier, newTier, status, videoUrl, notes } = req.body;
  if (!playerUsername || !gamemode || !status) {
    return res.status(400).json({ error: "Player name, gamemode, and status are required." });
  }

  const db = readDB();

  // Create test entry
  const newTest: TestResult = {
    id: "test_" + Math.random().toString(36).substr(2, 9),
    playerUsername: playerUsername.trim(),
    tester: tester || "Admin",
    gamemode,
    formerTier: formerTier || "Unranked",
    newTier: newTier || "Unranked",
    status,
    videoUrl: videoUrl || "",
    date: new Date().toISOString(),
    notes: notes || "",
  };

  db.testResults.push(newTest);

  // Auto update player's gamemode tier ranking if the test was successful or if update requested
  const player = db.players.find(p => p.username.toLowerCase() === playerUsername.trim().toLowerCase());
  if (player && status === "pass") {
    // Map previous and new values, calculate movement trend (up, down, neutral)
    const tierOrder = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "Unranked"];
    const idxFormer = tierOrder.indexOf(formerTier || "Unranked");
    const idxNew = tierOrder.indexOf(newTier || "Unranked");

    let movement: "up" | "down" | "new" | "neutral" = "neutral";
    if (idxFormer === -1 || formerTier === "Unranked") {
      movement = "new";
    } else if (idxNew < idxFormer) {
      movement = "up"; // higher tiers have smaller indices in our tierOrder array
    } else if (idxNew > idxFormer) {
      movement = "down";
    }

    player.rankings[gamemode] = newTier;
    player.movements[gamemode] = movement;
  }

  writeDB(db);
  res.json({ success: true, test: newTest });
});

app.put("/api/admin/test_results/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { playerUsername, tester, gamemode, formerTier, newTier, status, videoUrl, notes, date } = req.body;
  
  const db = readDB();
  const testIndex = db.testResults.findIndex(t => t.id === id);
  if (testIndex === -1) {
    return res.status(404).json({ error: "Test record not found" });
  }

  const updatedTest: TestResult = {
    ...db.testResults[testIndex],
    playerUsername: playerUsername || db.testResults[testIndex].playerUsername,
    tester: tester !== undefined ? tester : db.testResults[testIndex].tester,
    gamemode: gamemode || db.testResults[testIndex].gamemode,
    formerTier: formerTier || db.testResults[testIndex].formerTier,
    newTier: newTier || db.testResults[testIndex].newTier,
    status: status || db.testResults[testIndex].status,
    videoUrl: videoUrl !== undefined ? videoUrl : db.testResults[testIndex].videoUrl,
    notes: notes !== undefined ? notes : db.testResults[testIndex].notes,
    date: date || db.testResults[testIndex].date,
  };

  db.testResults[testIndex] = updatedTest;
  writeDB(db);
  res.json({ success: true, test: updatedTest });
});

app.delete("/api/admin/test_results/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.testResults = db.testResults.filter(t => t.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Announcements management
app.post("/api/admin/announcements", requireAdmin, (req, res) => {
  const { title, content, author, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  const db = readDB();
  const newAnnouncement: Announcement = {
    id: "ann_" + Math.random().toString(36).substr(2, 9),
    title,
    content,
    author: author || "Admin",
    date: new Date().toISOString(),
    category: category || "General",
  };

  db.announcements.push(newAnnouncement);
  writeDB(db);

  res.json({ success: true, announcement: newAnnouncement });
});

app.put("/api/admin/announcements/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, content, author, category } = req.body;

  const db = readDB();
  const index = db.announcements.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  db.announcements[index] = {
    ...db.announcements[index],
    title: title || db.announcements[index].title,
    content: content || db.announcements[index].content,
    author: author || db.announcements[index].author,
    category: category || db.announcements[index].category,
  };

  writeDB(db);
  res.json({ success: true, announcement: db.announcements[index] });
});

app.delete("/api/admin/announcements/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.announcements = db.announcements.filter(a => a.id !== id);
  writeDB(db);
  res.json({ success: true });
});


// --- VITE MIDDLEWARE CONFIGURATION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support single-page application fallback for all paths
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production build from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BDTiers Server booted successfully! Running on http://localhost:${PORT}`);
  });
}

startServer();
