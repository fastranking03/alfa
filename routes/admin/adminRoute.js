// import express from "express";
// import router from "../favoritesRoute";
// // const router = express.Router();
// // router.get('/',(req,res) =>{

// //     return res.render('admin/index');
// // })
 

// router.get('/', async(req,res)=>{
//    try{
//     const query = "SELECT * FROM products";
//     const [products] = await connect.query.promise().query(query);
//     res.render('admin/index' , {products});
//    } 
//    catch(error){
//     console.error("Error in fetching Products:" , error);
//     res.status(500).send("Internal Server Error");
//    }
// });

// export default router;




// import express from "express";
// import connect from "../../db/connect.js"; // Import your database connection

// const router = express.Router();

// router.get('/', async (req, res) => {
//     try {
//         // Query all products from the database
//         const query = "SELECT * FROM products";
//         const [products] = await connect.promise().query(query);

//         // Render the view with the fetched products
//         res.render('admin/index', { products });
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });

// export default router;


import express from "express";
import connect from "../../db/connect.js"; // Import your database connection

const router = express.Router();

// router.get('/', async (req, res) => {
//     try {
//         // Query all products from the database
//         const query = "SELECT * FROM products";
//         const [rows, fields] = await connect.promise().query(query);

//         // Render the view with the fetched products
//         res.render('admin/index', { products: rows });
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });

router.get('/', async (req, res) => {
    try {
        // Query all products from the database along with their category and subcategory information
        const query = `
            SELECT 
                products.*, 
                category.category_name AS category_name, 
                sub_category.sub_category_name AS subcategory_name 
            FROM 
                products 
            LEFT JOIN 
                category ON products.category_id = category.id 
            LEFT JOIN 
            sub_category ON products.subcategory_id = sub_category.id`;

        // Execute the query
        const [rows, fields] = await connect.query(query);

        // Render the view with the fetched products
        res.render('admin/index', { products: rows });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).send("Internal Server Error");
    }
});
  
export default router;
