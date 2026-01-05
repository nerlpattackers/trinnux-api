import express from "express";
import db from "../db.js";
import fs from "fs";
import path from "path";
import { verifyAdmin } from "../middleware/auth.js";
import { uploadGallery, optimizeImage } from "../middleware/uploadGallery.js";

const router = express.Router();

/* =========================
   PUBLIC: Get gallery
========================= */
router.get("/", async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, filename, caption, category, featured, created_at
     FROM gallery_images
     WHERE status='active'
     ORDER BY featured DESC, created_at DESC`
  );
  res.json(rows);
});

/* =========================
   ADMIN: Upload image
========================= */
router.post(
  "/",
  verifyAdmin,
  uploadGallery,
  optimizeImage,
  async (req, res) => {
    const { caption, category, featured } = req.body;

    await db.query(
      `INSERT INTO gallery_images
       (filename, caption, category, featured)
       VALUES (?, ?, ?, ?)`,
      [
        req.optimizedFilename,
        caption,
        category,
        featured ? 1 : 0,
      ]
    );

    res.json({ success: true });
  }
);

/* =========================
   ADMIN: Delete image
========================= */
router.delete("/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  const [[image]] = await db.query(
    "SELECT filename FROM gallery_images WHERE id = ?",
    [id]
  );

  if (!image) {
    return res.status(404).json({ error: "Not found" });
  }

  /* Soft delete */
  await db.query(
    "UPDATE gallery_images SET status='hidden' WHERE id = ?",
    [id]
  );

  /* Remove file if exists (staging-safe) */
  const filePath = path.join("uploads", "gallery", image.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  res.json({ success: true });
});

export default router;
