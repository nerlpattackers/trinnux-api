import express from "express";
import pool from "../db.js";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

router.put("/sort", verifyAdmin, async (req, res) => {
  const updates = req.body;

  for (const p of updates) {
    await pool.query(
      "UPDATE partners SET sort_order=? WHERE id=?",
      [p.sort_order, p.id]
    );
  }

  res.json({ success: true });
});


/* LIST */
router.get("/", verifyAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM partners ORDER BY sort_order ASC, id ASC"
  );
  res.json(rows);
});

/* CREATE */
router.post("/", verifyAdmin, async (req, res) => {
  const { name, logo, link } = req.body;

  await pool.query(
    `INSERT INTO partners (name, logo, link, is_active, sort_order)
     VALUES (?, ?, ?, 1, 999)`,
    [name, logo, link]
  );

  res.json({ success: true });
});

/* TOGGLE */
router.patch("/:id/toggle", verifyAdmin, async (req, res) => {
  await pool.query(
    "UPDATE partners SET is_active = !is_active WHERE id = ?",
    [req.params.id]
  );
  res.json({ success: true });
});

/* DELETE */
router.delete("/:id", verifyAdmin, async (req, res) => {
  await pool.query("DELETE FROM partners WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

/* SORT */
router.post("/sort", verifyAdmin, async (req, res) => {
  const { order } = req.body;

  for (const item of order) {
    await pool.query(
      "UPDATE partners SET sort_order = ? WHERE id = ?",
      [item.sort_order, item.id]
    );
  }

  res.json({ success: true });
});

export default router;
