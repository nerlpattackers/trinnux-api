import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import galleryRoutes from "./routes/gallery.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
const __dirname = new URL(".", import.meta.url).pathname;

/* Ensure upload dir */
const uploadDir = path.join(__dirname, "uploads", "gallery");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* Middlewares */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Static uploads */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/gallery", galleryRoutes);

app.get("/", (_, res) => {
  res.send("Trinnux API is running");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
