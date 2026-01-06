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
   PUBLIC — GET GALLERY (PAGINATED + ORDERED)
================================ */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "12", 10);
    const category = req.query.category;

    const offset = (page - 1) * limit;

    let where = "WHERE status = 'active'";
    const params = [];

    if (category && category !== "All") {
      where += " AND category = ?";
      params.push(category);
    }

    /* Total count */
    const [[count]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM gallery_images
       ${where}`,
      params
    );

    /* Paginated rows — IMPORTANT: ORDER BY sort_order */
    const [rows] = await db.query(
      `SELECT id, filename, caption, category, featured, sort_order
       FROM gallery_images
       ${where}
       ORDER BY sort_order ASC, id DESC
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

      /* Put new image at the bottom */
      const [[maxOrder]] = await db.query(
        "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM gallery_images"
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
          maxOrder.maxOrder + 1,
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
   ADMIN — REORDER GALLERY (PERSISTENT)
================================ */
router.put("/reorder", verifyAdmin, async (req, res) => {
  const items = req.body; // [{ id, sort_order }]

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid reorder payload" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    for (const item of items) {
      if (
        typeof item.id !== "number" ||
        typeof item.sort_order !== "number"
      ) {
        throw new Error("Invalid reorder data");
      }

      await conn.query(
        "UPDATE gallery_images SET sort_order = ? WHERE id = ?",
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
   ADMIN — DELETE IMAGE (SOFT DELETE + FILE)
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

    /* Soft delete */
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
