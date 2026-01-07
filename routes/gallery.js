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
   PRE-FLIGHT
================================ */
router.options("*", (_, res) => res.sendStatus(204));

/* ===============================
   PUBLIC — GET GALLERY
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

    res.json({ total: count.total, page, limit, images: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

/* ===============================
   ADMIN — GET GALLERY (MANUAL ORDER)
================================ */
router.get("/admin", verifyAdmin, async (_req, res) => {
  const [rows] = await db.query(`
    SELECT id, filename, caption, category, featured, sort_order
    FROM gallery_images
    WHERE status='active'
    ORDER BY sort_order ASC
  `);

  res.json({ images: rows });
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
  }
);

/* ===============================
   🔥 ADMIN — REORDER (MUST BE HERE)
================================ */
router.put("/reorder", verifyAdmin, async (req, res) => {
  const updates = req.body;

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
   ADMIN — UPDATE METADATA
================================ */
router.put("/:id", verifyAdmin, async (req, res) => {
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
});

/* ===============================
   ADMIN — DELETE
================================ */
router.delete("/:id", verifyAdmin, async (req, res) => {
  const [[image]] = await db.query(
    "SELECT filename FROM gallery_images WHERE id=?",
    [req.params.id]
  );

  if (!image) return res.status(404).json({ error: "Not found" });

  await db.query(
    "UPDATE gallery_images SET status='hidden' WHERE id=?",
    [req.params.id]
  );

  const filePath = path.join("uploads", "gallery", image.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  res.json({ success: true });
});

export default router;
