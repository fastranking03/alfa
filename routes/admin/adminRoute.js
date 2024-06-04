import express from "express";
import connect from "../../db/connect.js"; // Import your database connection

const router = express.Router();

router.get("/", async (req, res) => {
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
    res.render("admin/index", { products: rows });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/users-list", async (req, res) => {
  try {
    const [users] = await connect.query("SELECT * FROM user_registration");
    res.render("admin/users-list", { users });
  } catch (error) {}
});

// Function to fetch user wishlist from the database along with product details
const fetchFavourites = async (userId) => {
  try {
    // Perform a database query to fetch user wishlist based on userId
    const FavouritesQuery = `
      SELECT 
      users_favorites.*, 
      products.*, 
      category.* ,
      sub_category.*
    FROM 
      users_favorites 
      INNER JOIN products ON users_favorites.product_id = products.id
      INNER JOIN category ON products.category_id = category.id
      INNER JOIN sub_category ON products.subcategory_id = sub_category.id
    WHERE 
      users_favorites.user_id = ?
      `;
    const [Favourites] = await connect.query(FavouritesQuery, [userId]);
    return Favourites;
  } catch (error) {
    // Handle errors
    console.error("Error fetching user wishlist:", error);
    return [];
  }
};

// Function to fetch user cart data from the database along with product details
const fetchUserCartData = async (userId) => {
  try {
    // Perform a database query to fetch user cart data based on userId
    const cartQuery = `
        SELECT users_cart.* ,
        products.*, 
        category.* ,
        sub_category.*
        FROM 
        users_cart 
        INNER JOIN products ON users_cart.product_id = products.id
        INNER JOIN category ON products.category_id = category.id
        INNER JOIN sub_category ON products.subcategory_id = sub_category.id

        WHERE users_cart.user_id = ?
      `;
    const [cartData] = await connect.query(cartQuery, [userId]);
    return cartData;
  } catch (error) {
    // Handle errors
    console.error("Error fetching user cart data:", error);
    return [];
  }
};

// Assuming you have Express router setup
router.get("/user-detailed-view/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const userDataQuery = "SELECT * FROM user_registration WHERE id = ?";
    const [userData] = await connect.query(userDataQuery, [userId]);

    // Fetch user wishlist and add to cart data from the database
    const Favourites = await fetchFavourites(userId);
    const userCartData = await fetchUserCartData(userId);

    // Render the appropriate view with user detailed information, wishlist, and cart data
    res.render("admin/user-detailed-view", {
      userId: userId,
      userData: userData[0],
      userFavourites: Favourites,
      cartData: userCartData,
    });
  } catch (error) {
    // Handle errors
    console.error("Error fetching user data:", error);
    res.status(500).send("An error occurred while fetching user data");
  }
});

export default router;
