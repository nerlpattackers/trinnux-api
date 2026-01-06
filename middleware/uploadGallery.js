import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const uploadPath = path.join("uploads", "gallery");

/* Ensure directory exists */
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

/* Multer storage */
const storage = multer.memoryStorage();

export const uploadGallery = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

/* Optimize image */
export async function optimizeImage(req, res, next) {
  try {
    if (!req.file) return next();

    const filename = `gallery-${Date.now()}.webp`;
    const filepath = path.join(uploadPath, filename);

    await sharp(req.file.buffer)
      .resize(1600)
      .webp({ quality: 80 })
      .toFile(filepath);

    req.optimizedFilename = filename;
    next();
  } catch (err) {
    console.error("Image optimization failed:", err);
    res.status(500).json({ error: "Image optimization failed" });
  }
}
