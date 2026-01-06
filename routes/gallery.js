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
   PRE-FLIGHT (CORS)
================================ */
router.options("*", (_, res) => res.sendStatus(204));

/* ===============================
   PUBLIC — GET GALLERY (SAFE ORDER)
================================ */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "12");
    const offset = (page - 1) * limit;

    const [[count]] = await db.query(
      "SELECT COUNT(*) AS total FROM gallery_images WHERE status='active'"
    );

    const [rows] = await db.query(
      `
      SELECT id, filename, caption, category, featured
      FROM gallery_images
      WHERE status='active'
      ORDER BY featured DESC, sort_order ASC, created_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    res.json({
      total: count.total,
      page,
      limit,
      images: rows,
    });
  } catch (err) {
    console.error("Public gallery error:", err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

/* ===============================
   ADMIN — GET GALLERY (MANUAL ORDER)
================================ */
router.get("/admin", verifyAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, filename, caption, category, featured
      FROM gallery_images
      WHERE status='active'
      ORDER BY sort_order ASC
    `);

    res.json({ images: rows });
  } catch (err) {
    console.error("Admin gallery error:", err);
    res.status(500).json({ error: "Failed to load admin gallery" });
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
      const { caption = "", category = "", featured = 0 } = req.body;

      const [[max]] = await db.query(
        "SELECT COALESCE(MAX(sort_order), 0) AS max FROM gallery_images"
      );

      await db.query(
        `
        INSERT INTO gallery_images
        (filename, caption, category, featured, status, sort_order)
        VALUES (?, ?, ?, ?, 'active', ?)
        `,
        [
          req.optimizedFilename,
          caption,
          category,
          featured ? 1 : 0,
          max.max + 1,
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
   ADMIN — UPDATE METADATA (FIXED)
================================ */
router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const { caption = "", category = "", featured = 0 } = req.body;

    await db.query(
      `
      UPDATE gallery_images
      SET caption=?, category=?, featured=?
      WHERE id=?
      `,
      [caption, category, featured ? 1 : 0, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* ===============================
   ADMIN — REORDER (AUTHORITATIVE)
================================ */
router.put("/reorder", verifyAdmin, async (req, res) => {
  const updates = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {
    for (const item of updates) {
      await conn.query(
        "UPDATE gallery_images SET sort_order=? WHERE id=?",
        [item.sort_order, item.id]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Reorder error:", err);
    res.status(500).json({ error: "Reorder failed" });
  } finally {
    conn.release();
  }
});

/* ===============================
   ADMIN — DELETE
================================ */
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const [[image]] = await db.query(
      "SELECT filename FROM gallery_images WHERE id=?",
      [req.params.id]
    );

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    await db.query(
      "UPDATE gallery_images SET status='hidden' WHERE id=?",
      [req.params.id]
    );

    const filePath = path.join("uploads", "gallery", image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
