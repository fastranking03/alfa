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
import inventoryRoute from "./routes/admin/inventoryRoute.js";
import adminProductsRoute from "./routes/admin/productRoute.js";
import session from "express-session";
import { fileURLToPath } from "url";
import connect from "./db/connect.js";

const app = express();

app.use("/banner_images", express.static("banner_images"));
app.use("/category_images", express.static("category_images"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); //For parsing application/json
app.use(express.urlencoded({ extended: true })); //For parsing application/x-www-form-urlencoded

app.use(
  session({
    secret: "user",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false ,
    maxAge: 12 * 60 * 60 * 1000
    }, //Cookie will false on development moood
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.user = req.session.user;
  next();
});

async function getUserCounts(userId) {
  // Define SQL queries
  const cartCountQuery =
    "SELECT COUNT(*) AS cart_count FROM users_cart WHERE user_id = ?";
  const wishlistCountQuery =
    "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?";

  // Execute both queries asynchronously
  const [cartResult] = await connect.query(cartCountQuery, [userId]);
  const [wishlistResult] = await connect.query(wishlistCountQuery, [userId]);

  // Extract counts from results
  const cartCount = cartResult[0].cart_count;
  const wishlistCount = wishlistResult[0].wishlist_count;

  // Close the connection connect

  return { cartCount, wishlistCount };
}


async function getUserCountsMiddleware(req, res, next) {
  try {
    if (req.session.user) {
      const userId = req.session.user.id;
      const { cartCount, wishlistCount } = await getUserCounts(userId);
      req.cartCount = cartCount;
      req.wishlistCount = wishlistCount;
    }

    next();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
}

app.use(getUserCountsMiddleware);

app.get("/set-session", (req, res) => {
  req.session.a = 5;

  res.redirect("/page1");
});

app.get("/page1", (req, res) => {
  const cartCount = req.cartCount || 0;
  const wishlistCount = req.wishlistCount || 0;
  res.render("blogs", { cartCount, wishlistCount });
});

app.get("/page2", (req, res) => {
  res.render("page2");
});

app.get("/page3", (req, res) => {
  res.render("page3");
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
app.use("/", userRoute);
app.use("/", commanRoute);
app.use("/", shirtsRoute);
app.use("/", productsRoute);
app.use("/", favoritesRoute);
app.use("/", cartRoute);

app.use("/admin/", adminRoute);
app.use("/admin/", bannerRoute);
app.use("/admin/", categoryRoute);
app.use("/admin/", inventoryRoute);
app.use("/admin/", adminProductsRoute);
app.use("/admin/", subcategoryRoute);

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
