 
import express from "express";
import upload from "../../uploadConfig.js";
import pool from "../../db/connect.js";
import slugify  from "slugify";

const router = express.Router();

// Fetch banners
router.get("/blog", async (req, res) => {
  try {
    const [blogs] = await pool.query("SELECT * FROM blogs");
    res.render("admin/blog", { blogs });
  } catch (err) {
    res.status(500).send("Error fetching Blogs: " + err.message);
  }
});

// Add banner form
router.get("/add-blog", (req, res) => {
  res.render("admin/add-blog");
});

// Add new banner
router.post("/add-blog", upload.single("image_path"), async (req, res) => {
  const { tag, title, slug_name,content,date ,created_by,profession,instagram_link,facebook_link,linkedin_link} = req.body;
  const image = req.file ? req.file.filename : null;
  const blog_slagify = slugify(title,{replacement: '-', remove: undefined, lower: true,  strict: false,trim: true })

  if (!image) {
    return res.status(400).send("Image upload failed.");
  }
  const query = 'INSERT INTO blogs (tag, title, slug_name,content, image_path,created_by, profession,instagram_link,facebook_link,linkedin_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  try {
    await pool.query(query, [tag, title, blog_slagify,content,image,date ,created_by,profession,instagram_link,facebook_link,linkedin_link]);
    res.redirect("/admin/blog");
  } catch (err) {
    res.status(500).send("Error adding banner: " + err.message);
  }
});

// Edit banner form
router.get("/edit-blogs/:id", async (req, res) => {
  const blogId = req.params.id;

  try {
    const [blogs] = await pool.query("SELECT * FROM banners WHERE id = ?", [image]);

    if (blogs.length === 0) {
      return res.status(404).send("Blog not found");
    }

    res.render("admin/edit-blog", { blog: blogs[0] });
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
router.get("/delete-blogs/:id", async (req, res) => {
  const bannerId = req.params.id;

  try {
    await pool.query("DELETE FROM blogs WHERE id = ?", [bannerId]);
    res.redirect("/admin/blogs");
  } catch (err) {
    res.status(500).send("Error deleting banner: " + err.message);
  }
});

export default router;
