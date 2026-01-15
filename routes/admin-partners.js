import express from "express";
import pool from "../db.js";
import adminAuth from "../middleware/adminAuth.js"; // SAME AS GALLERY

const router = express.Router();

/* LIST */
router.get("/", adminAuth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM partners ORDER BY sort_order ASC, id ASC"
  );
  res.json(rows);
});

/* CREATE */
router.post("/", adminAuth, async (req, res) => {
  const { name, logo, link } = req.body;

  await pool.query(
    `INSERT INTO partners (name, logo, link, is_active, sort_order)
     VALUES (?, ?, ?, 1, 999)`,
    [name, logo, link]
  );

  res.json({ success: true });
});

/* UPDATE */
router.put("/:id", adminAuth, async (req, res) => {
  const { name, link } = req.body;

  await pool.query(
    "UPDATE partners SET name=?, link=? WHERE id=?",
    [name, link, req.params.id]
  );

  res.json({ success: true });
});

/* TOGGLE */
router.patch("/:id/toggle", adminAuth, async (req, res) => {
  await pool.query(
    "UPDATE partners SET is_active = !is_active WHERE id=?",
    [req.params.id]
  );
  res.json({ success: true });
});

/* DELETE */
router.delete("/:id", adminAuth, async (req, res) => {
  await pool.query("DELETE FROM partners WHERE id=?", [req.params.id]);
  res.json({ success: true });
});

/* SORT */
router.post("/sort", adminAuth, async (req, res) => {
  const { order } = req.body; // [{id, sort_order}]

  for (const item of order) {
    await pool.query(
      "UPDATE partners SET sort_order=? WHERE id=?",
      [item.sort_order, item.id]
    );
  }

  res.json({ success: true });
});

export default router;
