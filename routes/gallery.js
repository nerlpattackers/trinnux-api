import express from "express";
import fs from "fs";
import path from "path";
import db from "../db.js";
import { verifyAdmin } from "../middleware/auth.js";
import {
  uploadGallery,
  optimizeImage,
} from "../middleware/uploadGallery.js";

const router = express.Router();

/* ===============================
   PRE-FLIGHT (CRITICAL FIX)
================================ */
router.options("*", (req, res) => {
  res.sendStatus(204);
});

/* ===============================
   PUBLIC — GET GALLERY
================================ */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "12");
    const category = req.query.category;

    const offset = (page - 1) * limit;

    let where = "WHERE status = 'active'";
    const params = [];

    if (category && category !== "All") {
      where += " AND category = ?";
      params.push(category);
    }

    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total FROM gallery_images ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT id, filename, caption, category, featured
       FROM gallery_images
       ${where}
       ORDER BY featured DESC, sort_order ASC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      total: count.total,
      page,
      limit,
      images: rows,
    });
  } catch (err) {
    console.error("Gallery fetch error:", err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

/* ===============================
   ADMIN — UPLOAD
================================ */
router.post(
  "/",
  verifyAdmin,
  uploadGallery,
  optimizeImage,
  async (req, res) => {
    try {
      const { caption, category, featured } = req.body;

      await db.query(
        `INSERT INTO gallery_images
         (filename, caption, category, featured, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [
          req.optimizedFilename,
          caption || "",
          category || "",
          featured ? 1 : 0,
        ]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* ===============================
   ADMIN — DELETE (FIXED)
================================ */
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [[image]] = await db.query(
      "SELECT filename FROM gallery_images WHERE id = ?",
      [id]
    );

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    await db.query(
      "UPDATE gallery_images SET status = 'hidden' WHERE id = ?",
      [id]
    );

    const filePath = path.join(
      "uploads",
      "gallery",
      image.filename
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
