import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file?.path) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const normalizedPath = req.file.path.replace(/\\/g, "/");

  res.json({
    fileUrl: `http://localhost:5000/${normalizedPath}`,
    filePath: normalizedPath,
  });
});

export default router;
