import express from "express";
import cors from "cors";
import axios from "axios";
import { supabase } from "./supabaseClient.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});


// safety check
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// 🔐 Get user from Authorization: Bearer <token>
async function getUserFromRequest(req) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("Auth error:", error);
    return null;
  }
  return data.user;
}

// 🔐 Middleware to require auth
async function requireAuth(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = user;
  next();
}

// 🛰 Proxy endpoint (requires auth)
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
      validateStatus: () => true,
      timeout: 20000,
    });

    const time = Date.now() - start;

    // ✅ SAVE TO SUPABASE with user_id
    await supabase.from("history").insert([
      {
        user_id: req.user.id,
        url,
        method,
        headers,
        body,
        response: response.data,
      },
    ]);

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.data,
      time,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🧾 Get history for current user
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

// ❌ Delete a history item
app.delete("/history/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("history")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});


// 📁 Create collection
app.post("/collections", requireAuth, async (req, res) => {
  const { name } = req.body;

  const { data, error } = await supabase
    .from("collections")
    .insert([{ name, user_id: req.user.id }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

// ➕ Add request to collection
app.post("/collections/:id/items", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { request } = req.body;

  console.log("Saving item:", request);

  const { data, error } = await supabase
    .from("collection_items")
    .insert([
      {
        collection_id: id,
        user_id: req.user.id,
        request
      }
    ])
    .select();

  if (error) {
    console.error("Insert failed:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data[0]);
});


// 📂 List collections for user
app.get("/collections", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// ❌ Delete collection (and its items)
app.delete("/collections/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  // delete items first
  await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", id)
    .eq("user_id", req.user.id);

  // delete collection
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// 📄 List items in a collection (user-scoped)
app.get("/collections/:id/items", requireAuth, async (req, res) => {
  const { id } = req.params;

  console.log("Fetching items for collection:", id);
  console.log("User ID:", req.user.id);

  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", id)
    .eq("user_id", req.user.id);

  if (error) {
    console.error("Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data || []);
});

// ❌ Delete a collection item
app.delete("/collections/items/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});





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
  const { data, error } = await supabase
    .from("environments")
    .select("*")
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ error });
  res.json(data);
});




const port = process.env.PORT || 5000;
app.listen(port, () => console.log("Backend running on port", port));
