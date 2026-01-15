import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * GET /api/partners
 * Public endpoint for PartnersDouble scroll
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, name, logo
      FROM partners
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Partners fetch failed:", err);
    res.status(500).json({ error: "Failed to load partners" });
  }
});

export default router;
