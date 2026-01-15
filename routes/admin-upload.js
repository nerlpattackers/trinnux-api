import express from "express";
import multer from "multer";
import path from "path";
import verifyAdmin from "../middleware/verifyAdmin.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/partners",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  },
});

router.post("/", verifyAdmin, upload.single("image"), (req, res) => {
  res.json({
    path: `/uploads/partners/${req.file.filename}`,
  });
});

export default router;
