import express from "express";
import path from "path";
import dotenv from "dotenv";
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
import CategoryRoutes from './routes/categoryRoute.js'
import inventoryRoute from "./routes/admin/inventoryRoute.js";
import adminProductsRoute from "./routes/admin/productRoute.js";
import placeOrderRoute from './routes/placeOrderRoute.js';
import blogRoute from './routes/admin/blogRoute.js';
import contentRoute from './routes/admin/contentRoute.js';
import newProduct from './routes/admin/newProduct.js';
import accessoriesRoutes from './routes/accessoriesRoutes.js';
import jwt from "jsonwebtoken";

import session from "express-session";
import cookieParser from "cookie-parser";
import slugify from "slugify";
import { fileURLToPath } from "url";

import connect from "./db/connect.js";
dotenv.config();

const app = express();

app.use("/banner_images", express.static("banner_images"));
app.use("/category_images", express.static("category_images"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); //For parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
    res.locals.alfa_team = req.session.alfa_team;

    res.locals.categories = categories;
    res.locals.content = contentArray[0];
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
app.use("/blog_images", express.static("blog_images"));
app.use("/about_us_images", express.static("about_us_images"));
// Routes

app.use("/", commanRoute);
app.use("/", userRoute);
app.use("/", shirtsRoute);
app.use("/", productsRoute);
app.use("/", favoritesRoute);
app.use("/", cartRoute);
app.use("/", placeOrderRoute);
app.use("/category/", CategoryRoutes);
app.use("/accessory/", accessoriesRoutes);


// Middleware to verify and refresh JWT token
async function verifyToken(req, res, next) {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken) {
    return res.redirect('/alfa-login');
  }

  try {
    // Verify the access token
    const decodedAccessToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = decodedAccessToken;

    return next();
  } catch (accessTokenError) {

    if (accessTokenError.name === 'TokenExpiredError' && refreshToken) {
      try {
        console.log("1st", accessToken);
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const refreshTokenQuery = "SELECT * FROM alfa_personal_staff WHERE  id = ? AND refresh_token = ?";
        const now = new Date();
        const [storedToken] = await connect.query(refreshTokenQuery, [decodedRefreshToken.id, refreshToken]);


        const tokenExpiryDate = new Date(storedToken[0].token_expiry_date);
        if (storedToken.length === 0 || tokenExpiryDate < now) {
          console.log("2nd", accessToken);
          return res.redirect('/alfa-login');
        }

        const userQuery = "SELECT id, email, role, current_status FROM alfa_personal_staff WHERE id = ?";
        const [userDetails] = await connect.query(userQuery, [decodedRefreshToken.id]);

        if (userDetails.length === 0) {
          console.log("3rd", accessToken);
          return res.redirect('/alfa-login');
        }


        const newAccessToken = jwt.sign(
          { id: userDetails[0].id, email: userDetails[0].email, role: userDetails[0].role, current_status: userDetails[0].current_status },
          process.env.JWT_SECRET,
          { expiresIn: '1m' }
        );

        const newrefreshToken = jwt.sign(
          { id: userDetails[0].id, email: userDetails[0].email, role: userDetails[0].role, current_status: userDetails[0].current_status },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '30d' }
        );


        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' ');



        await connect.query(
          "UPDATE alfa_personal_staff SET refresh_token = ?, token_expiry_date = ? WHERE id = ?",
          [newrefreshToken, expiresAtFormatted, userDetails[0].id]
        );

        console.log("accessToken", newAccessToken);
        console.log("refreshToken", newrefreshToken);

        res.cookie('accessToken', newAccessToken, { httpOnly: true });
        res.cookie('refreshToken', newrefreshToken, { httpOnly: true });


        req.session.alfa_team = userDetails[0];

        return next();
      } catch (refreshTokenError) {
        return res.redirect('/alfa-login');
      }
    }
    console.log("catch else ");
    return res.redirect('/alfa-login');
  }
}



function isAdminOrStaffAndActive(req, res, next) {
  if (req.session.alfa_team) {
    if ((req.session.alfa_team.role === 'admin' || req.session.alfa_team.role === 'staff') && req.session.alfa_team.current_status === 'active') {
      return next();
    }
  }
  return res.redirect("/alfa-login");
}

app.use("/admin/", verifyToken, isAdminOrStaffAndActive);

app.use("/admin/", adminRoute);
app.use("/admin/", bannerRoute);
app.use("/admin/", categoryRoute);
app.use("/admin/", inventoryRoute);
app.use("/admin/", adminProductsRoute);
app.use("/admin/", subcategoryRoute);
app.use("/admin/", blogRoute);
app.use("/admin/", contentRoute);
app.use("/admin/", newProduct);

// app.get('/order-history', verifyToken, (req, res) => {
//   return res.render('order-history')
// });

app.get('/my-profile', verifyToken, async (req, res) => {
  try {
    // Fetch user details from the user_registration table
    const userId = req.session.user.id;
    if (!userId) {
      redirect("/login");
    }
    else {
      const [userDetails] = await connect.query(
        "SELECT * FROM user_registration WHERE id = ?",
        [userId]
      );

      // Render the my-profile page with user details
      return res.render('my-profile', { user: userDetails[0] });
    }

  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

app.post('/payment', verifyToken, (req, res) => {
  let { cartItemscheckoutpage, total_mrp, discount_on_mrp, subtotal, vat, delivery_charges, total_payable, selectedAddress } = req.body;
  cartItemscheckoutpage = JSON.parse(cartItemscheckoutpage);
  return res.render('payment', {
    cartItemscheckoutpage,
    total_mrp,
    discount_on_mrp,
    subtotal,
    vat,
    delivery_charges,
    total_payable,
    selectedAddress
  });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




