import express from "express";
import upload from "../../uploadConfig.js";
import connect from "../../db/connect.js";

const router = express.Router();

router.get("/banner", (req, res) => {
  return res.render("admin/banner");
});

router.get("/add-banner", (req, res) => {
  return res.render("admin/add-banner");
});

router.post("/new-banner-submit", upload.single("image"), (req, res) => {
  const { short_title, main_title, color } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!image) {
    return res.status(400).send("Image upload failed.");
  }

  const query =
    'INSERT INTO banners (short_title, main_title, image, color, status) VALUES (?, ?, ?, ?, "inactive")';

  connect.query(
    query,
    [short_title, main_title, image, color, "inactive"],
    (err, result) => {
      if (err) {
        return res.status(500).send("Error adding banner: " + err.message);
      }
      res.send("Banner added successfully");
    }
  );
});

export default router;
