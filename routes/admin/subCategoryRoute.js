import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

router.get("/subcategory", async (req, res) => { 
    try {
        const[categories] = await connect.query("SELECT * FROM category WHERE status = 'active'");
        const[subCategories] = await connect.query("SELECT * FROM sub_category");
        res.render("admin/add-subCategory", { categories , subCategories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.redirect("/error");
    } 
});
 
router.post("/add-subcategory", async (req, res) => {
    const { category_id, subcategory_name ,status} = req.body;

    try {
        const query = "INSERT INTO sub_category (category_id, sub_category_name , status) VALUES (?, ?)";
        await connect.query(query, [category_id, subcategory_name , status]);
        res.redirect("/admin/subcategory");
    } catch (error) {
        console.error("Error adding subcategory:", error);
        res.redirect("/error");
    }
});

export default router;
