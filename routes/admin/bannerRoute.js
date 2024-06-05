 
import express from "express";
import upload from "../../uploadConfig.js";
import pool from "../../db/connect.js";

const router = express.Router();

// Fetch banners
router.get("/banner", async (req, res) => {
  try {
    const [banners] = await pool.query("SELECT * FROM banners");
    res.render("admin/banner", { banners });
  } catch (err) {
    res.status(500).send("Error fetching banners: " + err.message);
  }
});

// Add banner form
router.get("/add-banner", (req, res) => {
  res.render("admin/add-banner");
});

// Add new banner
router.post("/add-banner", upload.single("image"), async (req, res) => {
  const { short_title, main_title, color } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!image) {
    return res.status(400).send("Image upload failed.");
  }

  const query = 'INSERT INTO banners (short_title, main_title, image, color, status) VALUES (?, ?, ?, ?, "inactive")';

  try {
    await pool.query(query, [short_title, main_title, image, color]);
    res.redirect("/admin/banner");
  } catch (err) {
    res.status(500).send("Error adding banner: " + err.message);
  }
});

// Edit banner form
router.get("/edit-banner/:id", async (req, res) => {
  const bannerId = req.params.id;

  try {
    const [banners] = await pool.query("SELECT * FROM banners WHERE id = ?", [bannerId]);

    if (banners.length === 0) {
      return res.status(404).send("Banner not found");
    }

    res.render("admin/edit-banner", { banner: banners[0] });
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});



// Update banner
router.post("/update-banner", upload.single("image"), async (req, res) => {
  const { id, short_title, main_title, color } = req.body;
  const image = req.file ? req.file.filename : null;

  let query;
  let queryParams;

  if (image) {
    query = "UPDATE banners SET short_title = ?, main_title = ?, image = ?, color = ? WHERE id = ?";
    queryParams = [short_title, main_title, image, color, id];
  } else {
    query = "UPDATE banners SET short_title = ?, main_title = ?, color = ? WHERE id = ?";
    queryParams = [short_title, main_title, color, id];
  }

  try {
    await pool.query(query, queryParams);
    res.redirect("/admin/banner");
  } catch (err) {
    res.status(500).send("Error updating banner: " + err.message);
  }
});

// Delete banner
router.get("/delete-banner/:id", async (req, res) => {
  const bannerId = req.params.id;

  try {
    await pool.query("DELETE FROM banners WHERE id = ?", [bannerId]);
    res.redirect("/admin/banner");
  } catch (err) {
    res.status(500).send("Error deleting banner: " + err.message);
  }
});

export default router;
