var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_url = require("url");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "db.json");
app.use(import_express.default.json());
function readDB() {
  try {
    if (!import_fs.default.existsSync(DB_FILE)) {
      const initialDB = {
        players: [],
        testResults: [],
        retests: [],
        announcements: []
      };
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
      return initialDB;
    }
    const content = import_fs.default.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading database file, returning empty schema:", error);
    return {
      players: [],
      testResults: [],
      retests: [],
      announcements: []
    };
  }
}
function writeDB(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}
var ADMIN_TOKEN = "BDTiers-Super-Esports-Security-Token-0049-2026";
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Admin privileges required" });
  }
}
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "@NExYY@0049@") {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, error: "Invalid username or password" });
  }
});
app.get("/api/public/stats", (req, res) => {
  const db = readDB();
  const totalPlayers = db.players.length;
  const totalTests = db.testResults.length;
  const testersSet = /* @__PURE__ */ new Set();
  db.testResults.forEach((test) => {
    if (test.tester) {
      testersSet.add(test.tester.trim().toLowerCase());
    }
  });
  const activeTesters = testersSet.size || 0;
  res.json({
    totalPlayers,
    totalTests,
    activeTesters
  });
});
app.get("/api/public/leaderboard", (req, res) => {
  const db = readDB();
  const gamemode = req.query.gamemode || "Overall";
  const region = req.query.region;
  const tier = req.query.tier;
  const tierOrder = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "Unranked"];
  let list = db.players.map((player) => {
    const playerTier = player.rankings[gamemode] || "Unranked";
    const movement = player.movements[gamemode] || "neutral";
    const position = player.customPositions?.[gamemode] ?? 999999;
    return {
      ...player,
      activeTier: playerTier,
      activeMovement: movement,
      customOrder: position
    };
  });
  if (tier) {
    list = list.filter((p) => p.activeTier === tier);
  } else {
    if (gamemode !== "Overall") {
      list = list.filter((p) => p.activeTier !== "Unranked");
    } else {
      list = list.filter((p) => {
        return Object.values(p.rankings).some((t) => t && t !== "Unranked");
      });
    }
  }
  if (region && region !== "All") {
    list = list.filter((p) => p.region === region);
  }
  list.sort((a, b) => {
    if (a.customOrder !== b.customOrder) {
      return a.customOrder - b.customOrder;
    }
    const orderA = tierOrder.indexOf(a.activeTier);
    const orderB = tierOrder.indexOf(b.activeTier);
    const indexA = orderA === -1 ? 999 : orderA;
    const indexB = orderB === -1 ? 999 : orderB;
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return a.username.localeCompare(b.username);
  });
  res.json(list);
});
app.get("/api/public/players/:username", (req, res) => {
  const db = readDB();
  const username = req.params.username.trim().toLowerCase();
  const player = db.players.find((p) => p.username.toLowerCase() === username);
  if (!player) {
    return res.status(404).json({ error: "Player not found" });
  }
  const playerTestResults = db.testResults.filter(
    (t) => t.playerUsername.toLowerCase() === username
  );
  const playerRetests = db.retests.filter(
    (r) => r.username.toLowerCase() === username
  );
  res.json({
    player,
    testResults: playerTestResults,
    retests: playerRetests
  });
});
app.post("/api/retests", (req, res) => {
  const { username, gamemode, currentTier, reason, discordUsername } = req.body;
  if (!username || !gamemode || !reason || !discordUsername) {
    return res.status(400).json({ error: "Minecraft username, gamemode, reason, and Discord username are required." });
  }
  const db = readDB();
  const newRetest = {
    id: "ret_" + Math.random().toString(36).substr(2, 9),
    username: username.trim(),
    gamemode,
    currentTier: currentTier || "Unranked",
    reason,
    discordUsername,
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.retests.push(newRetest);
  writeDB(db);
  res.json({ success: true, retest: newRetest });
});
app.get("/api/public/announcements", (req, res) => {
  const db = readDB();
  const sorted = [...db.announcements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted);
});
app.get("/api/public/recent-tests", (req, res) => {
  const db = readDB();
  const sorted = [...db.testResults].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted.slice(0, 15));
});
app.get("/api/admin/retests", requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.retests);
});
app.post("/api/admin/retests/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["pending", "approved", "rejected", "completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }
  const db = readDB();
  const retestIndex = db.retests.findIndex((r) => r.id === id);
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
  db.retests = db.retests.filter((r) => r.id !== id);
  writeDB(db);
  res.json({ success: true });
});
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
  const exists = db.players.some((p) => p.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "A player with this Minecraft username already exists." });
  }
  const newPlayer = {
    id: "p_" + Math.random().toString(36).substr(2, 9),
    username: username.trim(),
    region,
    badges: badges || [],
    rankings: rankings || {},
    movements: movements || {},
    customPositions: customPositions || {},
    notes: notes || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.players.push(newPlayer);
  writeDB(db);
  res.json({ success: true, player: newPlayer });
});
app.put("/api/admin/players/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, region, badges, rankings, movements, customPositions, notes } = req.body;
  const db = readDB();
  const playerIndex = db.players.findIndex((p) => p.id === id);
  if (playerIndex === -1) {
    return res.status(404).json({ error: "Player not found" });
  }
  if (username && username.trim().toLowerCase() !== db.players[playerIndex].username.toLowerCase()) {
    const exists = db.players.some((p) => p.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Another player with this username already exists" });
    }
  }
  const updatedPlayer = {
    ...db.players[playerIndex],
    username: username ? username.trim() : db.players[playerIndex].username,
    region: region || db.players[playerIndex].region,
    badges: badges !== void 0 ? badges : db.players[playerIndex].badges,
    rankings: rankings !== void 0 ? rankings : db.players[playerIndex].rankings,
    movements: movements !== void 0 ? movements : db.players[playerIndex].movements,
    customPositions: customPositions !== void 0 ? customPositions : db.players[playerIndex].customPositions,
    notes: notes !== void 0 ? notes : db.players[playerIndex].notes
  };
  db.players[playerIndex] = updatedPlayer;
  writeDB(db);
  res.json({ success: true, player: updatedPlayer });
});
app.delete("/api/admin/players/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.players = db.players.filter((p) => p.id !== id);
  writeDB(db);
  res.json({ success: true });
});
app.post("/api/admin/test_results", requireAdmin, (req, res) => {
  const { playerUsername, tester, gamemode, formerTier, newTier, status, videoUrl, notes } = req.body;
  if (!playerUsername || !gamemode || !status) {
    return res.status(400).json({ error: "Player name, gamemode, and status are required." });
  }
  const db = readDB();
  const newTest = {
    id: "test_" + Math.random().toString(36).substr(2, 9),
    playerUsername: playerUsername.trim(),
    tester: tester || "Admin",
    gamemode,
    formerTier: formerTier || "Unranked",
    newTier: newTier || "Unranked",
    status,
    videoUrl: videoUrl || "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    notes: notes || ""
  };
  db.testResults.push(newTest);
  const player = db.players.find((p) => p.username.toLowerCase() === playerUsername.trim().toLowerCase());
  if (player && status === "pass") {
    const tierOrder = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "Unranked"];
    const idxFormer = tierOrder.indexOf(formerTier || "Unranked");
    const idxNew = tierOrder.indexOf(newTier || "Unranked");
    let movement = "neutral";
    if (idxFormer === -1 || formerTier === "Unranked") {
      movement = "new";
    } else if (idxNew < idxFormer) {
      movement = "up";
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
  const testIndex = db.testResults.findIndex((t) => t.id === id);
  if (testIndex === -1) {
    return res.status(404).json({ error: "Test record not found" });
  }
  const updatedTest = {
    ...db.testResults[testIndex],
    playerUsername: playerUsername || db.testResults[testIndex].playerUsername,
    tester: tester !== void 0 ? tester : db.testResults[testIndex].tester,
    gamemode: gamemode || db.testResults[testIndex].gamemode,
    formerTier: formerTier || db.testResults[testIndex].formerTier,
    newTier: newTier || db.testResults[testIndex].newTier,
    status: status || db.testResults[testIndex].status,
    videoUrl: videoUrl !== void 0 ? videoUrl : db.testResults[testIndex].videoUrl,
    notes: notes !== void 0 ? notes : db.testResults[testIndex].notes,
    date: date || db.testResults[testIndex].date
  };
  db.testResults[testIndex] = updatedTest;
  writeDB(db);
  res.json({ success: true, test: updatedTest });
});
app.delete("/api/admin/test_results/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.testResults = db.testResults.filter((t) => t.id !== id);
  writeDB(db);
  res.json({ success: true });
});
app.post("/api/admin/announcements", requireAdmin, (req, res) => {
  const { title, content, author, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const db = readDB();
  const newAnnouncement = {
    id: "ann_" + Math.random().toString(36).substr(2, 9),
    title,
    content,
    author: author || "Admin",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    category: category || "General"
  };
  db.announcements.push(newAnnouncement);
  writeDB(db);
  res.json({ success: true, announcement: newAnnouncement });
});
app.put("/api/admin/announcements/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, content, author, category } = req.body;
  const db = readDB();
  const index = db.announcements.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Announcement not found" });
  }
  db.announcements[index] = {
    ...db.announcements[index],
    title: title || db.announcements[index].title,
    content: content || db.announcements[index].content,
    author: author || db.announcements[index].author,
    category: category || db.announcements[index].category
  };
  writeDB(db);
  res.json({ success: true, announcement: db.announcements[index] });
});
app.delete("/api/admin/announcements/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.announcements = db.announcements.filter((a) => a.id !== id);
  writeDB(db);
  res.json({ success: true });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware mounted.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Serving static production build from /dist.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BDTiers Server booted successfully! Running on http://localhost:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
