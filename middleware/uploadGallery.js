import multer from "multer";
import sharp from "sharp";
import path from "path";

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files allowed"));
    }
    cb(null, true);
  },
});

export const uploadGallery = upload.single("image");

export async function optimizeImage(req, res, next) {
  if (!req.file) return next();

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const outputPath = path.join("uploads", "gallery", filename);

  await sharp(req.file.buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);

  req.optimizedFilename = filename;
  next();
}
