import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import galleryRoutes from "./routes/gallery.js";

const app = express();

/* =========================
   Ensure upload directory exists
========================= */
const uploadDir = path.join("uploads", "gallery");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   Middlewares
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   Static uploads
========================= */
app.use("/uploads", express.static("uploads"));

/* =========================
   Routes
========================= */
app.use("/api/gallery", galleryRoutes);

app.get("/", (req, res) => {
  res.send("Trinnux API is running");
});

/* =========================
   Start server
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`API running on port ${PORT}`)
);
