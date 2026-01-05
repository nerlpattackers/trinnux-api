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
   PUBLIC — GET GALLERY
================================ */
/* ===============================
   PUBLIC — GET GALLERY (PAGINATED)
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

    // total count
    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total FROM gallery_images ${where}`,
      params
    );

    // paginated rows
    const [rows] = await db.query(
      `SELECT id, filename, caption, category, featured
       FROM gallery_images
       ${where}
       ORDER BY featured DESC, created_at DESC
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
    console.error("Gallery pagination error:", err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});


/* ===============================
   ADMIN — UPLOAD IMAGE
================================ */
router.post(
  "/",
  verifyAdmin,
  uploadGallery,
  optimizeImage,
  async (req, res) => {
    try {
      const { caption, category, featured } = req.body;

      if (!req.optimizedFilename) {
        return res.status(400).json({ error: "Image processing failed" });
      }

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
   ADMIN — UPDATE METADATA
================================ */
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { caption, category, featured } = req.body;
    const { id } = req.params;

    await db.query(
      `UPDATE gallery_images
       SET caption = ?, category = ?, featured = ?
       WHERE id = ?`,
      [
        caption || "",
        category || "",
        featured ? 1 : 0,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* ===============================
   ADMIN — DELETE IMAGE
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

    /* Soft delete in DB */
    await db.query(
      "UPDATE gallery_images SET status = 'hidden' WHERE id = ?",
      [id]
    );

    /* Remove file if exists */
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
/* ===============================
   PUBLIC — GET CATEGORIES
================================ */
router.get("/categories", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT category
       FROM gallery_images
       WHERE status = 'active'
         AND category IS NOT NULL
         AND category != ''
       ORDER BY category ASC`
    );

    res.json(rows.map((r) => r.category));
  } catch (err) {
    console.error("Category fetch error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});
