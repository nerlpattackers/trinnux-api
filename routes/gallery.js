import express from "express";
import fs from "fs";
import path from "path";
import db from "../db.js";
import { verifyAdmin } from "../middleware/auth.js";
import { uploadGallery, optimizeImage } from "../middleware/uploadGallery.js";

const router = express.Router();

/* PUBLIC — GET GALLERY */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, filename, caption, category, featured
       FROM gallery_images
       WHERE status = 'active'
       ORDER BY sort_order ASC, id DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

/* ADMIN — UPLOAD */
router.post(
  "/",
  verifyAdmin,
  uploadGallery,
  optimizeImage,
  async (req, res) => {
    try {
      const { caption, category, featured } = req.body;

      const [[max]] = await db.query(
        "SELECT COALESCE(MAX(sort_order),0) AS maxOrder FROM gallery_images"
      );

      await db.query(
        `INSERT INTO gallery_images
         (filename, caption, category, featured, status, sort_order)
         VALUES (?, ?, ?, ?, 'active', ?)`,
        [
          req.optimizedFilename,
          caption || "",
          category || "",
          featured ? 1 : 0,
          max.maxOrder + 1,
        ]
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* ADMIN — UPDATE */
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { caption, category, featured } = req.body;

    await db.query(
      `UPDATE gallery_images
       SET caption=?, category=?, featured=?
       WHERE id=?`,
      [caption || "", category || "", featured ? 1 : 0, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

/* ADMIN — REORDER */
router.put("/reorder", verifyAdmin, async (req, res) => {
  const items = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    for (const item of items) {
      await conn.query(
        "UPDATE gallery_images SET sort_order=? WHERE id=?",
        [item.sort_order, item.id]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "Reorder failed" });
  } finally {
    conn.release();
  }
});

/* ADMIN — DELETE (SOFT) */
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE gallery_images SET status='hidden' WHERE id=?",
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
