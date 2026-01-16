import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import galleryRoutes from "./routes/gallery.js";
import partnersRoutes from "./routes/partners.js";
import authRoutes from "./routes/auth.js";

/* ADMIN ROUTES */
import adminPartnersRoutes from "./routes/admin-partners.js";
import adminUploadRoutes from "./routes/admin-upload.js";

dotenv.config();

const app = express();
const __dirname = new URL(".", import.meta.url).pathname;

/* =========================
   ENSURE UPLOAD DIRECTORIES
========================= */
fs.mkdirSync(path.join(__dirname, "uploads", "gallery"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "uploads", "partners"), { recursive: true });

/* =========================
   CORS (FIRST)
========================= */
const corsOptions = {
  origin: [
    "https://trinnux.com",
    "https://www.trinnux.com",
    "https://trinnux-website-uat-production.up.railway.app",

    // 🔑 LOCAL DEV (ALL COMMON VITE PORTS)
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/* =========================
   PREFLIGHT HANDLING
========================= */
/**
 * Let CORS handle OPTIONS for /api/auth/*
 * Force 204 only for admin routes (upload / CRUD)
 */
app.options("/api/admin/*", cors(corsOptions));

/* =========================
   BODY PARSERS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC FILES
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   PUBLIC ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/partners", partnersRoutes);

/* =========================
   ADMIN ROUTES
========================= */
app.use("/api/admin/partners", adminPartnersRoutes);
app.use("/api/admin/upload", adminUploadRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_req, res) => {
  res.status(200).send("Trinnux API is running");
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Trinnux API running on port ${PORT}`);
});
