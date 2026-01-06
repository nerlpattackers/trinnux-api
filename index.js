import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import galleryRoutes from "./routes/gallery.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

/* =========================
   ESM __dirname FIX
========================= */
const __dirname = new URL(".", import.meta.url).pathname;

/* =========================
   ENSURE UPLOAD DIRECTORY
========================= */
const uploadDir = path.join(__dirname, "uploads", "gallery");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   CORS (CRITICAL FIX)
========================= */
app.use(
  cors({
    origin: [
      "https://trinnux.com",
      "https://www.trinnux.com",
      "https://trinnux-api-production.up.railway.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* 🔴 REQUIRED: allow preflight requests */
app.options("*", cors());

/* =========================
   BODY PARSERS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   STATIC UPLOADS
========================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/gallery", galleryRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (_, res) => {
  res.status(200).send("Trinnux API is running");
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
