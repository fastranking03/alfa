import express from "express";
import path from "path";
import userRoute from "./routes/userRoute.js";
import commanRoute from "./routes/commanRoute.js";
import adminRoute from "./routes/admin/adminRoute.js";
import shirtsRoute from "./routes/shirtsRoutes.js";
import productsRoute from "./routes/productsRoute.js";
import categoryRoute from "./routes/admin/categoryRoute.js";
import subcategoryRoute from "./routes/admin/subCategoryRoute.js";
import bannerRoute from "./routes/admin/bannerRoute.js";
import favoritesRoute from "./routes/favoritesRoute.js";
import cartRoute from "./routes/cartRoute.js";
import CategoryRoutes from "./routes/categoryRoute.js";
import inventoryRoute from "./routes/admin/inventoryRoute.js";
import adminProductsRoute from "./routes/admin/productRoute.js";
import placeOrderRoute from "./routes/placeOrderRoute.js";

import session from "express-session";
import slugify from "slugify";
import { fileURLToPath } from "url";

import connect from "./db/connect.js";

const app = express();

app.use("/banner_images", express.static("banner_images"));
app.use("/category_images", express.static("category_images"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); //For parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "user",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 12 * 60 * 60 * 1000 },
  })
);

app.use(async (req, res, next) => {
  try {
    const [categories] = await connect.query("SELECT * FROM category");
    const [contentArray] = await connect.query("SELECT * FROM alfa_content");

    if (!req.session.user) {
      if (!req.session.cart) {
        req.session.cart = [];
      }
      if (!req.session.wishlist) {
        req.session.wishlist = [];
      }

      req.session.cartCount = req.session.cart.length;
      req.session.wishlistCount = req.session.wishlist.length;
    }

    res.locals.cartCount = req.session.cartCount || 0;
    res.locals.wishlistCount = req.session.wishlistCount || 0;
    res.locals.session = req.session;
    res.locals.user = req.session.user;

    if (req.session.productToWishlist) {
      res.locals.productToWishlist = req.session.productToWishlist;
    }

    res.locals.categories = categories; // Make categories available globally
    res.locals.content = contentArray[0]; // Assign the first (and only) row of content
    next();
  } catch (error) {
    console.error("Error fetching data:", error);
    next(error);
  }
});


//  Set Template Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use(express.static("public"));

// Serve static files (like uploaded images)
app.use("/banner_images", express.static("banner_images"));
app.use("/category_images", express.static("category_images"));

app.use("/product_images", express.static("product_images"));

// Routes

app.use("/", commanRoute);
app.use("/", userRoute);
app.use("/", shirtsRoute);
app.use("/", productsRoute);
app.use("/", favoritesRoute);
app.use("/", cartRoute);
app.use("/", placeOrderRoute);
app.use("/category/", CategoryRoutes);

app.use("/admin/", adminRoute);
app.use("/admin/", bannerRoute);
app.use("/admin/", categoryRoute);
app.use("/admin/", inventoryRoute);
app.use("/admin/", adminProductsRoute);
app.use("/admin/", subcategoryRoute);

app.get("/accessories", (req, res) => {
  return res.render("accessories");
});

app.get("/my-profile", async (req, res) => {
  try {
    // Fetch user details from the user_registration table
    const userId = req.session.user.id;
    if (!userId) {
      redirect("/login");
    } else {
      const [userDetails] = await connect.query(
        "SELECT * FROM user_registration WHERE id = ?",
        [userId]
      );

      // Render the my-profile page with user details
      return res.render("my-profile", { user: userDetails[0] });
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

app.post("/payment", (req, res) => {
  let {
    cartItemscheckoutpage,
    total_mrp,
    discount_on_mrp,
    subtotal,
    vat,
    delivery_charges,
    total_payable,
    selectedAddress,
  } = req.body;
  cartItemscheckoutpage = JSON.parse(cartItemscheckoutpage);
  return res.render("payment", {
    cartItemscheckoutpage,
    total_mrp,
    discount_on_mrp,
    subtotal,
    vat,
    delivery_charges,
    total_payable,
    selectedAddress,
  });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
