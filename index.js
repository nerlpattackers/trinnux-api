import express from "express";
import cors from "cors";
import galleryRoutes from "./routes/gallery.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/gallery", galleryRoutes);

app.get("/", (req, res) => {
  res.send("Trinnux API is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`API running on port ${PORT}`)
);
