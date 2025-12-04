import express from "express";
import cors from "cors";
import axios from "axios";
import { supabase } from "./supabaseClient.js";

const app = express();

/* ✅ ENV VALIDATION */
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ Missing Supabase ENV variables");
}

/* ✅ CORS FIX (EXPRESS v5 SAFE) */
app.use(cors({
  origin: "https://api-testing-tool-five.vercel.app",
  credentials: true
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://api-testing-tool-five.vercel.app");
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json({ limit: "2mb" }));

/* ✅ HEALTH CHECK */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

/* ✅ URL SAFETY */
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

/* ✅ GET USER FROM TOKEN */
async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
}

/* ✅ AUTH MIDDLEWARE */
async function requireAuth(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

/* ========================== */
/* ✅ PROXY API */
/* ========================== */
app.post("/proxy", requireAuth, async (req, res) => {
  const { url, method = "GET", headers = {}, body, params } = req.body;

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid or unsafe URL" });
  }

  try {
    const start = Date.now();

    const response = await axios({
      url,
      method,
      headers,
      data: body,
      params,
      timeout: 20000,
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: () => true
    });

    const time = Date.now() - start;

    await supabase.from("history").insert([{
      user_id: req.user.id,
      url,
      method,
      headers,
      body,
      response: response.data
    }]);

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      time
    });

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: "Proxy failed" });
  }
});

/* ========================== */
/* ✅ HISTORY */
/* ========================== */
app.get("/history", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.delete("/history/:id", requireAuth, async (req, res) => {
  const { error } = await supabase
    .from("history")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

/* ========================== */
/* ✅ COLLECTIONS */
/* ========================== */
app.post("/collections", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Collection name required" });

  const { data, error } = await supabase
    .from("collections")
    .insert([{ name, user_id: req.user.id }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

app.get("/collections", requireAuth, async (req, res) => {
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: true });

  res.json(data || []);
});

app.delete("/collections/:id", requireAuth, async (req, res) => {
  const id = req.params.id;

  await supabase.from("collection_items").delete()
    .eq("collection_id", id)
    .eq("user_id", req.user.id);

  await supabase.from("collections")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id);

  res.json({ success: true });
});

/* ========================== */
/* ✅ COLLECTION ITEMS */
/* ========================== */
app.post("/collections/:id/items", requireAuth, async (req, res) => {
  const { request } = req.body;

  const { data, error } = await supabase
    .from("collection_items")
    .insert([{ collection_id: req.params.id, user_id: req.user.id, request }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

app.get("/collections/:id/items", requireAuth, async (req, res) => {
  const { data } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", req.params.id)
    .eq("user_id", req.user.id);

  res.json(data || []);
});

app.delete("/collections/items/:id", requireAuth, async (req, res) => {
  await supabase.from("collection_items")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  res.json({ success: true });
});

/* ========================== */
/* ✅ ENVIRONMENTS */
/* ========================== */
app.post("/env", requireAuth, async (req, res) => {
  const { name, variables } = req.body;

  const { data, error } = await supabase
    .from("environments")
    .insert([{ name, variables, user_id: req.user.id }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

app.get("/env", requireAuth, async (req, res) => {
  const { data } = await supabase
    .from("environments")
    .select("*")
    .eq("user_id", req.user.id);

  res.json(data || []);
});

/* ✅ START SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("✅ Backend running on port", PORT));
