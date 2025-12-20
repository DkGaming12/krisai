import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import midtransClient from "midtrans-client";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("✅ Created data directory");
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-please-change";
const DEFAULT_TOKENS = Number(process.env.DEFAULT_TOKENS || 100);
const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const TRANSACTIONS_FILE = path.join(process.cwd(), "data", "transactions.json");
const HISTORY_FILE = path.join(process.cwd(), "data", "history.json");

// Midtrans Configuration
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

// Token Packages (Rupiah)
const TOKEN_PACKAGES = [
  { id: "pack_100", tokens: 100, price: 10000, label: "Paket Pemula" },
  {
    id: "pack_500",
    tokens: 500,
    price: 45000,
    label: "Paket Standar",
    discount: "10%",
  },
  {
    id: "pack_1000",
    tokens: 1000,
    price: 80000,
    label: "Paket Pro",
    discount: "20%",
  },
  {
    id: "pack_2500",
    tokens: 2500,
    price: 175000,
    label: "Paket Premium",
    discount: "30%",
  },
  {
    id: "pack_5000",
    tokens: 5000,
    price: 300000,
    label: "Paket Ultimate",
    discount: "40%",
  },
];

// In-memory cache for production stability (Railway ephemeral storage)
let usersCache = null;
let transactionsCache = null;

// ============= AI Helper (Groq -> Gemini fallback) =============
async function aiComplete({ prompt, messages, system }) {
  // Try GROQ first when available
  if (GROQ_API_KEY) {
    try {
      const payload = messages
        ? {
            model: "llama-3.1-8b-instant",
            messages: [
              ...(system ? [{ role: "system", content: system }] : []),
              ...messages,
            ],
          }
        : {
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "user",
                content: system ? `${system}\n\n${prompt || ""}` : prompt || "",
              },
            ],
          };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        const err = new Error(`GROQ error: ${res.status}`);
        err.code = res.status;
        err.details = txt;
        throw err;
      }
      const data = await res.json();
      const out = data?.choices?.[0]?.message?.content;
      if (out) return out;
      const err = new Error("GROQ empty response");
      err.code = "GROQ_EMPTY";
      throw err;
    } catch (e) {
      // Fall through to Gemini when rate-limited or any failure
      if (!GEMINI_API_KEY) throw e;
    }
  }

  // Gemini fallback
  if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });

    // Compose content
    const composed =
      (system ? `System instruction:\n${system}\n\n` : "") +
      (messages
        ? messages
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n\n")
        : prompt || "");

    const resp = await model.generateContent(composed);
    const text = resp?.response?.text?.();
    if (text) return text;
    throw new Error("Gemini empty response");
  }

  throw new Error("No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY.");
}

function readUsers() {
  try {
    // Return from memory cache if available
    if (usersCache !== null) {
      return usersCache;
    }

    if (!fs.existsSync(USERS_FILE)) {
      usersCache = [];
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    usersCache = JSON.parse(raw || "[]");
    return usersCache;
  } catch (e) {
    console.error("Read users error:", e);
    return usersCache || [];
  }
}

function writeUsers(arr) {
  try {
    usersCache = arr; // Update memory cache immediately

    // Ensure data directory exists
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), "utf-8");
    console.log(`✅ Users saved (${arr.length} users)`);
  } catch (e) {
    console.error("Failed write users:", e);
    // Still update cache even if file write fails
    usersCache = arr;
  }
}

function readTransactions() {
  try {
    // Return from memory cache if available
    if (transactionsCache !== null) {
      return transactionsCache;
    }

    if (!fs.existsSync(TRANSACTIONS_FILE)) {
      transactionsCache = [];
      return [];
    }
    const raw = fs.readFileSync(TRANSACTIONS_FILE, "utf-8");
    transactionsCache = JSON.parse(raw || "[]");
    return transactionsCache;
  } catch (e) {
    console.error("Read transactions error:", e);
    return transactionsCache || [];
  }
}

function writeTransactions(arr) {
  try {
    transactionsCache = arr; // Update memory cache immediately

    // Ensure data directory exists
    const dataDir = path.dirname(TRANSACTIONS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(arr, null, 2), "utf-8");
    console.log(`✅ Transactions saved (${arr.length} transactions)`);
  } catch (e) {
    console.error("Failed write transactions:", e);
    // Still update cache even if file write fails
    transactionsCache = arr;
  }
}

function addTokens(userId, amount) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return false;
  users[idx].tokens = (users[idx].tokens || 0) + amount;
  writeUsers(users);
  return true;
}

function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("Read history error:", e);
    return [];
  }
}

function writeHistory(arr) {
  try {
    const dataDir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed write history:", e);
  }
}

function saveToHistory(userId, feature, title, content, tokens) {
  const history = readHistory();
  history.push({
    id: uuidv4(),
    userId,
    feature, // 'chat', 'cerpen', 'skenario', 'novel_create', 'novel_continue', etc
    title: (title || feature).slice(0, 100),
    excerpt: (content || "").slice(0, 300),
    content, // Full content (besar)
    tokensUsed: tokens || 0,
    timestamp: Date.now(),
  });
  writeHistory(history);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function ownerRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isOwner)
      return res.status(403).json({ error: "Forbidden: Owner only" });
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function getUserById(id) {
  const users = readUsers();
  return users.find((u) => u.id === id);
}

function getAllUsers() {
  const users = readUsers();
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    tokens: u.tokens,
    isOwner: u.isOwner || false,
    createdAt: u.createdAt,
  }));
}

function updateUser(user) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeUsers(users);
}

function deductTokens(userId, amount) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, tokens: 0 };
  const user = users[idx];
  if ((user.tokens || 0) < amount)
    return { ok: false, tokens: user.tokens || 0 };
  user.tokens = (user.tokens || 0) - amount;
  users[idx] = user;
  writeUsers(users);
  return { ok: true, tokens: user.tokens };
}

/* =========================
   SYSTEM PROMPT
========================= */
const SYSTEM_PROMPT = `
Kamu adalah KrisAI, asisten AI penulisan kreatif berbahasa Indonesia.
Jangan menyebut dirimu ChatGPT.
`;

/* =========================
   HEALTHCHECK
========================= */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* =========================
   AUTH
========================= */
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password)
      return res
        .status(400)
        .json({ error: "Username, email & password required" });
    const users = readUsers();
    const existsEmail = users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
    const existsUsername = users.find(
      (u) => u.username.toLowerCase() === String(username).toLowerCase()
    );
    if (existsEmail)
      return res.status(409).json({ error: "Email already registered" });
    if (existsUsername)
      return res.status(409).json({ error: "Username already taken" });
    const user = {
      id: uuidv4(),
      username,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      tokens: 500, // Bonus 500 token untuk member baru
      isOwner: false,
      createdAt: Date.now(),
    };
    users.push(user);
    writeUsers(users);
    const token = signToken({
      id: user.id,
      username: user.username,
      isOwner: false,
    });
    return res.json({
      token,
      bonusTokens: 500, // Flag untuk popup bonus
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tokens: user.tokens,
        isOwner: false,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "Register failed" });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { credential, password } = req.body || {};
    const users = readUsers();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === String(credential || "").toLowerCase() ||
        u.username.toLowerCase() === String(credential || "").toLowerCase()
    );
    if (!user) {
      console.warn("Login gagal: user tidak ditemukan", {
        credential: String(credential || ""),
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = bcrypt.compareSync(password || "", user.passwordHash);
    if (!ok) {
      console.warn("Login gagal: password salah", {
        credential: String(credential || ""),
      });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({
      id: user.id,
      username: user.username,
      isOwner: user.isOwner || false,
    });
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tokens: user.tokens,
        isOwner: user.isOwner || false,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    tokens: user.tokens,
    isOwner: user.isOwner || false,
  });
});

app.post("/api/auth/logout", authRequired, (req, res) => {
  // Client will drop token; server simply acknowledges
  res.json({ ok: true });
});

app.get("/api/balance", authRequired, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ tokens: user.tokens });
});

/* =========================
   ADMIN: USER MANAGEMENT (OWNER ONLY)
========================= */
app.get("/api/admin/users", ownerRequired, (req, res) => {
  const users = getAllUsers();
  res.json({ users });
});

app.post("/api/admin/user/:userId/tokens", ownerRequired, (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body || {};
    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const users = readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) return res.status(404).json({ error: "User not found" });

    users[idx].tokens = Math.max(0, (users[idx].tokens || 0) + amount);
    writeUsers(users);

    res.json({
      username: users[idx].username,
      tokens: users[idx].tokens,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to update tokens" });
  }
});

app.delete("/api/admin/user/:userId", ownerRequired, (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    const users = readUsers();
    const filtered = users.filter((u) => u.id !== userId);
    if (filtered.length === users.length) {
      return res.status(404).json({ error: "User not found" });
    }

    writeUsers(filtered);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/* =========================
   TOPUP TOKEN - PAYMENT
========================= */
// Get available token packages
app.get("/api/topup/packages", authRequired, (req, res) => {
  res.json({ packages: TOKEN_PACKAGES });
});

// Create payment transaction
app.post("/api/topup/create", authRequired, async (req, res) => {
  try {
    const { packageId } = req.body;
    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const pkg = TOKEN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return res.status(400).json({ error: "Invalid package" });

    const orderId = `TOPUP-${Date.now()}-${user.id.slice(0, 8)}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: pkg.price,
      },
      item_details: [
        {
          id: pkg.id,
          price: pkg.price,
          quantity: 1,
          name: `${pkg.label} - ${pkg.tokens} Tokens`,
        },
      ],
      customer_details: {
        first_name: user.username,
        email: user.email,
      },
      enabled_payments: ["shopeepay", "dana", "seabank_transfer"],
    };

    const transaction = await snap.createTransaction(parameter);

    // Save transaction to database
    const transactions = readTransactions();
    transactions.push({
      orderId,
      userId: user.id,
      packageId: pkg.id,
      tokens: pkg.tokens,
      amount: pkg.price,
      status: "pending",
      createdAt: Date.now(),
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
    });
    writeTransactions(transactions);

    res.json({
      orderId,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
      package: pkg,
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// Webhook for payment notification from Midtrans
app.post("/api/topup/notification", async (req, res) => {
  try {
    const notification = req.body;
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    console.log(`Payment notification: ${orderId} - ${transactionStatus}`);

    const transactions = readTransactions();
    const idx = transactions.findIndex((t) => t.orderId === orderId);

    if (idx < 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = transactions[idx];

    // Handle payment status
    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      if (fraudStatus === "accept" || !fraudStatus) {
        // Payment success - add tokens
        transactions[idx].status = "success";
        transactions[idx].completedAt = Date.now();
        writeTransactions(transactions);

        addTokens(transaction.userId, transaction.tokens);
        console.log(
          `✅ Token added: ${transaction.tokens} to user ${transaction.userId}`
        );
      }
    } else if (transactionStatus === "pending") {
      transactions[idx].status = "pending";
      writeTransactions(transactions);
    } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
      transactions[idx].status = "failed";
      transactions[idx].completedAt = Date.now();
      writeTransactions(transactions);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ error: "Notification processing failed" });
  }
});

// Get user transaction history
app.get("/api/topup/history", authRequired, (req, res) => {
  try {
    const transactions = readTransactions();
    const userTransactions = transactions
      .filter((t) => t.userId === req.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({
        orderId: t.orderId,
        tokens: t.tokens,
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      }));
    res.json({ transactions: userTransactions });
  } catch (error) {
    res.status(500).json({ error: "Failed to get transaction history" });
  }
});

// Check transaction status
app.get("/api/topup/status/:orderId", authRequired, async (req, res) => {
  try {
    const { orderId } = req.params;
    const transactions = readTransactions();
    const transaction = transactions.find(
      (t) => t.orderId === orderId && t.userId === req.user.id
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({
      orderId: transaction.orderId,
      status: transaction.status,
      tokens: transaction.tokens,
      amount: transaction.amount,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to check status" });
  }
});

/* =========================
   CHAT AI (DIKUNCI)
========================= */
app.post("/api/chat", authRequired, async (req, res) => {
  try {
    // If no provider configured at all, inform client without charging tokens
    if (((!GROQ_API_KEY || GROQ_API_KEY === "REPLACE_ME") && !GEMINI_API_KEY)) {
      return res.json({
        reply:
          "⚠️ Chat AI belum aktif. Admin perlu mengisi kunci AI (GROQ_API_KEY atau GEMINI_API_KEY) di Railway Variables dulu.",
      });
    }
    const COST = 1;
    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });
    const { message } = req.body;
    if (!message) return res.json({ reply: "Pesan kosong." });

    const reply = await aiComplete({
      messages: [
        { role: "user", content: message },
      ],
      system: SYSTEM_PROMPT,
    });

    // Save to history
    saveToHistory(req.user.id, "chat", message.slice(0, 50), reply, COST);

    res.json({ reply, tokens: resDeduct.tokens });
  } catch (err) {
    res.json({ reply: "❌ Chat error." });
  }
});

/* =========================
   CERPEN (DIKUNCI)
========================= */
app.post("/api/cerpen", authRequired, async (req, res) => {
  try {
    const { judul, tema, genre, panjang = 500 } = req.body;

    // Dynamic cost: base 3 + (word count / 100) rounded up
    const targetWords = parseInt(panjang) || 500;
    const COST = Math.max(3, Math.ceil(3 + targetWords / 100));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `
Buat cerpen bahasa Indonesia.
Judul: ${judul}
Tema: ${tema}
Genre: ${genre}
Panjang ${targetWords} kata.
`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "cerpen", judul, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens });
  } catch {
    res.json({ reply: "❌ Cerpen error." });
  }
});

/* =========================
   SKENARIO (FITUR BARU)
========================= */
app.post("/api/skenario", authRequired, async (req, res) => {
  try {
    const { judul, genre, deskripsi } = req.body;

    // Dynamic cost based on description length
    const descWords = (deskripsi || "").split(/\s+/).length;
    const COST = Math.max(4, Math.ceil(4 + descWords / 50));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `
Buat skenario film berbahasa Indonesia.

Judul: ${judul}
Genre: ${genre}
Deskripsi:
${deskripsi}

Gunakan format:
SCENE
AKSI
DIALOG
`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "skenario", judul, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens });
  } catch {
    res.json({ reply: "❌ Skenario error." });
  }
});

/* =========================
   REWRITE / EDITOR (BARU)
========================= */
app.post("/api/rewrite", authRequired, async (req, res) => {
  try {
    const {
      teks,
      fokus = "Keseluruhan tulisan",
      gaya = "Konstruktif",
    } = req.body || {};
    if (!teks) return res.json({ reply: "Masukkan teks untuk direview." });

    // Dynamic cost based on text length
    const wordCount = teks.split(/\s+/).length;
    const COST = Math.max(2, Math.ceil(2 + wordCount / 100));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Anda adalah editor bahasa Indonesia. Fokus: ${fokus}. Gaya kritik: ${gaya}.
Berikan evaluasi ringkas, poin perbaikan, dan contoh perbaikan untuk teks berikut:
\n\n${teks}`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "rewrite", teks.slice(0, 50), reply, COST);

    res.json({ reply: reply || "(kosong)", tokens: resDeduct.tokens });
  } catch (e) {
    res.json({ reply: "❌ Rewrite error." });
  }
});

/* =========================
   NOVEL SUITE - CREATE
========================= */
app.post("/api/novel/create", authRequired, async (req, res) => {
  try {
    // Terima kedua versi payload (versi UI saat ini dan versi lama)
    const {
      judul,
      genre,
      tema,
      tokohUtama,
      tokoh,
      setting,
      konflik,
      panjangBab,
      panjang,
    } = req.body;

    const targetWords = parseInt(panjang || panjangBab) || 800;
    const COST = Math.max(5, Math.ceil(5 + targetWords / 100));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Buat bab pembuka novel berbahasa Indonesia dengan detail:
Judul: ${judul}
Genre: ${genre}
Tema: ${tema}
Tokoh Utama: ${tokohUtama || tokoh || "(tidak diisi)"}
Setting: ${setting || "(tidak diisi)"}
Konflik Awal: ${konflik || "(tidak diisi)"}

Tulis bab 1 sepanjang ${targetWords} kata dengan narasi menarik, dialog natural, dan deskripsi vivid.`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "novel_create", judul, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens, cost: COST });
  } catch (e) {
    console.error("Novel create error", e.message || e);
    res
      .status(500)
      .json({ error: "❌ Create error: " + (e.message || "unknown") });
  }
});

/* =========================
   NOVEL SUITE - CONTINUE
========================= */
app.post("/api/novel/continue", authRequired, async (req, res) => {
  try {
    const { konteks, arahCerita, panjang = 600, context, arahan } = req.body;

    const ctx = konteks || context;
    const arah = arahCerita || arahan || "Lanjutkan sesuai konteks.";

    const targetWords = parseInt(panjang) || 600;
    const COST = Math.max(4, Math.ceil(4 + targetWords / 100));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Lanjutkan cerita berikut dengan ${targetWords} kata:

Konteks sebelumnya:
${ctx || "(tidak diisi)"}

Arah cerita selanjutnya: ${arah}

Tulis kelanjutan yang koheren dan menarik.`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    const contextTitle = ctx ? ctx.slice(0, 50) : "Lanjutan";
    saveToHistory(req.user.id, "novel_continue", contextTitle, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens, cost: COST });
  } catch (e) {
    console.error("Novel continue error", e.message || e);
    res
      .status(500)
      .json({ error: "❌ Continue error: " + (e.message || "unknown") });
  }
});

/* =========================
   NOVEL SUITE - OUTLINE
========================= */
app.post("/api/novel/outline", authRequired, async (req, res) => {
  try {
    const { judul, genre, tema, jumlahBab = 10 } = req.body;

    const COST = Math.max(3, Math.ceil(2 + jumlahBab / 5));

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Buat outline novel berbahasa Indonesia:
Judul: ${judul}
Genre: ${genre}
Tema: ${tema}
Jumlah Bab: ${jumlahBab}

Buat struktur outline dengan:
- Ringkasan per bab
- Arc karakter utama
- Twist dan klimaks
- Resolusi`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "novel_outline", judul, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens, cost: COST });
  } catch (e) {
    console.error("Outline error", e.message || e);
    res
      .status(500)
      .json({ error: "❌ Outline error: " + (e.message || "unknown") });
  }
});

/* =========================
   NOVEL SUITE - CHARACTER
========================= */
app.post("/api/novel/character", authRequired, async (req, res) => {
  try {
    const { nama, peran, kepribadian, latar, tujuan } = req.body;

    const COST = 3;

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Kembangkan profil karakter mendalam untuk novel:
Nama: ${nama}
Peran: ${peran}
Kepribadian: ${kepribadian}
Latar Belakang: ${latar}
Tujuan: ${tujuan}

Buat profil lengkap dengan:
- Motivasi internal/eksternal
- Kekuatan & kelemahan
- Arc transformasi
- Hubungan dengan karakter lain
- Quirks unik`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "novel_character", nama, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens, cost: COST });
  } catch {
    res.json({ reply: "❌ Character error." });
  }
});

/* =========================
   NOVEL SUITE - WORLDBUILDING
========================= */
app.post("/api/novel/world", authRequired, async (req, res) => {
  try {
    const { namaWorld, tipe, elemen, aturan, budaya, nama, setting, sistem } =
      req.body;

    const namaFinal = namaWorld || nama;
    const tipeFinal = tipe || setting;
    const elemenFinal = elemen || sistem;
    const aturanFinal = aturan || "(tidak diisi)";

    const COST = 4;

    const resDeduct = deductTokens(req.user.id, COST);
    if (!resDeduct.ok)
      return res
        .status(402)
        .json({ error: "Saldo token habis", tokens: resDeduct.tokens });

    const prompt = `Bangun dunia untuk novel:
Nama: ${namaFinal}
Tipe: ${tipeFinal}
Elemen Unik: ${elemenFinal}
Aturan/Hukum: ${aturanFinal}
Budaya: ${budaya}

Buat worldbuilding lengkap dengan:
- Geografi & iklim
- Sistem sosial/politik
- Teknologi/magikal
- Sejarah penting
- Konflik inheren
- Detail sensorik (suara, bau, visual)`;

    const reply = await aiComplete({ prompt, system: SYSTEM_PROMPT });

    // Save to history
    saveToHistory(req.user.id, "novel_world", namaFinal, reply, COST);

    res.json({ reply, tokens: resDeduct.tokens, cost: COST });
  } catch {
    res.json({ reply: "❌ World building error." });
  }
});

/* =========================
   HISTORY (PER FITUR)
========================= */
app.get("/api/history/:feature", authRequired, (req, res) => {
  try {
    const { feature } = req.params; // 'cerpen', 'skenario', 'novel_create', etc
    const history = readHistory();
    const userHistory = history
      .filter((h) => h.userId === req.user.id && h.feature === feature)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((h) => ({
        id: h.id,
        title: h.title,
        excerpt: h.excerpt,
        tokensUsed: h.tokensUsed,
        timestamp: h.timestamp,
      }));

    res.json({ items: userHistory });
  } catch (e) {
    res.json({ items: [] });
  }
});

app.get("/api/history/:feature/:id", authRequired, (req, res) => {
  try {
    const { feature, id } = req.params;
    const history = readHistory();
    const item = history.find(
      (h) =>
        h.id === id &&
        h.userId === req.user.id &&
        h.feature === feature
    );

    if (!item) {
      return res.status(404).json({ error: "History not found" });
    }

    res.json({
      title: item.title,
      content: item.content,
      tokensUsed: item.tokensUsed,
      timestamp: item.timestamp,
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to load history" });
  }
});

/* =========================
   HISTORY (LAMA - untuk kompatibilitas)
========================= */
app.get("/api/history", authRequired, (req, res) => {
  try {
    const file = path.join(process.cwd(), "data", "memory.json");
    if (!fs.existsSync(file)) return res.json({ items: [] });
    const raw = fs.readFileSync(file, "utf-8");
    const json = JSON.parse(raw || "{}");

    const items = Object.entries(json).map(([id, arr]) => {
      const messages = Array.isArray(arr) ? arr : [];
      const firstUser = messages.find((m) => m.role === "user");
      const title = (firstUser?.content || "Session").slice(0, 40);
      return { id, title, count: messages.length };
    });
    res.json({ items });
  } catch (e) {
    res.json({ items: [] });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`✅ KrisAI running at http://localhost:${PORT}`);
});
