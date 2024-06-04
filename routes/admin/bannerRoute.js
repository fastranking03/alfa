// import express from "express";
// import upload from "../../uploadConfig.js";
// import connect from "../../db/connect.js";

// const { param } = express;

// const router = express.Router();

// router.get("/banner", (req, res) => {
//   const query = "SELECT * FROM banners";
//   connect.query(query, (err, banners) => {
//     if (err) {
//       return res.status(500).send("Error fetching banners: " + err.message);
//     }
//     // Render the template with the fetched banner data
//     return res.render("admin/banner", { banners });
//   });
// });

// router.get("/add-banner", (req, res) => {
//   return res.render("admin/add-banner");
// });

// router.post("/new-banner-submit", upload.single("image"), (req, res) => {
//   const { short_title, main_title, color } = req.body;
//   const image = req.file ? req.file.filename : null;

//   if (!image) {
//     return res.status(400).send("Image upload failed.");
//   }

//   const query =
//     'INSERT INTO banners (short_title, main_title, image, color, status) VALUES (?, ?, ?, ?, "inactive")';

//   connect.query(query,[short_title, main_title, image, color, "inactive"],
//     (err, result) => {
//       if (err) {
//         return res.status(500).send("Error adding banner: " + err.message);
//       }
//       res.redirect("/admin/banner");
//     }
//   );
// });



// // edit banner
// router.get("/edit-banner/:id", async (req, res) => {
//   try {
//     const bannerId = req.params.id;
//     const query = "SELECT * FROM banners WHERE id = ?"; // Assuming 'id' is the column name for banner ID
//     const [banner] = await connect.promise().query(query, [bannerId]);
//     if (!banner.length) {
//       return res.status(404).send("Banner not found");
//     }
//     res.render("admin/edit-banner", { banner: banner[0] });
//   } catch (error) {
//     console.error("Error fetching banner:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// router.post("/update-banner", upload.single("image"), (req, res) => {
//   const { id, short_title, main_title, color } = req.body;

//   const image = req.file ? req.file.filename : null;

//   let query;
//   let queryParams;

//   if (image) {
//     query =
//       "UPDATE banners SET short_title = ?, main_title = ?, image = ?, color = ? WHERE id = ?";
//     queryParams = [short_title, main_title, image, color, id];
//   } else {
//     query =
//       "UPDATE banners SET short_title = ?, main_title = ?, color = ? WHERE id = ?";
//     queryParams = [short_title, main_title, color, id];
//   }

//   try {
//     // Execute the SQL UPDATE query
//     connect.query(query, queryParams, (err, results) => {
//       if (err) {
//         console.error("Error updating banner:", err);
//         res.redirect("/admin/banner"); // Redirecting for simplicity, you may want to handle errors more gracefully
//       } else {
//         res.redirect("/admin/banner");
//       }
//     });
//   } catch (error) {
//     // Handle any errors
//     console.error("Error connecting to the database:", error);
//     res.redirect("/admin/banner"); // Redirecting for simplicity, you may want to handle errors more gracefully
//   }
// });

// // delete banner
// router.get("/delete-banner/:id", async (req, res) => {
//   try {
//     // Handle the logic for deleting a banner
//     const bannerId = req.params.id;

//     // Execute SQL DELETE query to remove the banner from the database
//     await connect.query("DELETE FROM banners WHERE id = ?", [bannerId]);

//     // Redirect to the banner list page after successful deletion
//     res.render("/admin/banner");
//   } catch (error) {
//     // Handle any errors
//     console.error("Error deleting banner:", error);
//     // Redirect to an error page or display an error message
//     res.redirect("/admin/banner"); // Redirecting for simplicity, you may want to handle errors more gracefully
//   }
// });

// export default router;




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
router.post("/new-banner-submit", upload.single("image"), async (req, res) => {
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
