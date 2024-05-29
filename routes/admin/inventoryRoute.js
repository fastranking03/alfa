import express from "express";  
import connect from "../../db/connect.js"; 
const router = express.Router();
  
router.get('/inventory/bottom-wear', async (req, res) => {
    try {
        // Fetch inventory data with product name from the database
        const query = `
            SELECT 
                p.id AS productid,
                p.product_name AS productname,
                bw.* 
            FROM 
                products p
            LEFT JOIN 
                bottom_wear_inventory_with_sizes bw ON p.id = bw.product_id`;

        const [rows, fields] = await connect.query(query);    

        // Render the HTML template with the fetched data
        res.render('admin/inventory', { inventory: rows , inventory_type:"bottomwear"});
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        res.status(500).send("Internal Server Error");
    }
});

router.get('/inventory/top-wear', async (req, res) => {
    try {
        // Fetch inventory data with product name from the database
        const query = `
            SELECT 
                p.id AS productid,
                p.product_name AS productname,
                bw.* 
            FROM 
                products p
            LEFT JOIN 
            topwear_inventory_with_sizes bw ON p.id = bw.product_id`;

        const [rows, fields] = await connect.query(query);    

        // Render the HTML template with the fetched data
        res.render('admin/inventory', { inventory: rows , inventory_type:"topwear"});
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        res.status(500).send("Internal Server Error");
    }
});
 
export default router;

