import express from "express";
import path from "path";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
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
import paypalRoutes from './routes/paypalRoutes.js';
import jwt from "jsonwebtoken";
import stripePackage from 'stripe';

import session from "express-session";
import cookieParser from "cookie-parser";
import slugify from "slugify";
import { fileURLToPath } from "url";

import connect from "./db/connect.js";
dotenv.config();
const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);
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
    res.locals.promi_discount = req.session.alfa_team;


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

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:8081/auth/google/callback",
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with Google ID 
      let [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);

      if (!user.length) {
        // If user does not exist, create a new record
        const newUser = {
          name: profile.displayName,
          email: profile.emails[0].value,
          password: '', // Handle password differently or leave it empty
          otp: '', // Default value
          status: 'active', // Default to active
          phone_no: '', // Default value
          alt_phone_no: '', // Default value
          verified: '1', // Mark as verified if using OAuth
          refresh_token: '', // Default empty value or handle accordingly 
          token_expiry_date: '',
        };

        await connect.query("INSERT INTO user_registration SET ?", newUser);
        [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);
      }


      // Generate JWT token
      const token = jwt.sign({ id: user[0].id, email: user[0].email, verified: user[0].verified }, process.env.JWT_SECRET, { expiresIn: '30m' });
      return done(null, { user: user[0], token });
    } catch (error) {
      return done(error, null);
    }
  }));


passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:8081/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with Google ID 

      const email = profile.emails ? profile.emails[0].value : null;
      if (!email) {
        return done(new Error('No email found in Facebook profile'), null);
      }
      let [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);

      // Construct the name from profile.name object
      const givenName = profile.name ? profile.name.givenName : 'Anonymous';
      const familyName = profile.name ? profile.name.familyName : '';
      const fullName = `${givenName} ${familyName}`.trim() || 'Anonymous';

      if (!user.length) {
        // If user does not exist, create a new record
        const newUser = {
          name: fullName,
          email: profile.emails[0].value,
          password: '', // Handle password differently or leave it empty
          otp: '', // Default value
          status: 'active', // Default to active
          phone_no: '', // Default value
          alt_phone_no: '', // Default value
          verified: '1', // Mark as verified if using OAuth
          refresh_token: '', // Default empty value or handle accordingly 
          token_expiry_date: '',
        };

        await connect.query("INSERT INTO user_registration SET ?", newUser);
        [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);
      }


      // Generate JWT token
      const token = jwt.sign({ id: user[0].id, email: user[0].email, verified: user[0].verified }, process.env.JWT_SECRET, { expiresIn: '30m' });
      return done(null, { user: user[0], token });
    } catch (error) {
      return done(error, null);
    }
  }));



passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:8081/auth/github/callback",
  scope: ['user:email']
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with Google ID 
      let [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);

      if (!user.length) {
        // If user does not exist, create a new record
        const newUser = {
          name: profile.displayName,
          email: profile.emails[0].value,
          password: '', // Handle password differently or leave it empty
          otp: '', // Default value
          status: 'active', // Default to active
          phone_no: '', // Default value
          alt_phone_no: '', // Default value
          verified: '1', // Mark as verified if using OAuth
          refresh_token: '', // Default empty value or handle accordingly 
          token_expiry_date: '',
        };

        await connect.query("INSERT INTO user_registration SET ?", newUser);
        [user] = await connect.query("SELECT * FROM user_registration WHERE email = ?", [profile.emails[0].value]);
      }


      // Generate JWT token
      const token = jwt.sign({ id: user[0].id, email: user[0].email, verified: user[0].verified }, process.env.JWT_SECRET, { expiresIn: '30m' });
      return done(null, { user: user[0], token });
    } catch (error) {
      return done(error, null);
    }
  }));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.use(passport.initialize());
app.use(passport.session());


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
app.use("/paypal", paypalRoutes);

// Google OAuth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { user, token } = req.user;

      // Generate a new refresh token
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' }
      );

      // Calculate token expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

      // Update refresh token and expiry date in the `alfa_personal_staff` table

      await connect.query(
        "UPDATE user_registration SET refresh_token = ?, token_expiry_date = ? WHERE id = ?",
        [refreshToken, expiresAtFormatted, user.id]
      );

      // Set cookies for tokens
      res.cookie('accessToken', token, { httpOnly: true });
      res.cookie('refreshToken', refreshToken, { httpOnly: true });

      // Store user data in session
      req.session.user = user;

      // Redirect to admin page or any protected route
      return res.redirect("/");

    } catch (error) {
      console.error("Error during Google callback:", error);
      return res.redirect('/login');
    }
  }
);


app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { user, token } = req.user;

      // Generate a new refresh token
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' }
      );

      // Calculate token expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

      // Update refresh token and expiry date in the `alfa_personal_staff` table

      await connect.query(
        "UPDATE user_registration SET refresh_token = ?, token_expiry_date = ? WHERE id = ?",
        [refreshToken, expiresAtFormatted, user.id]
      );

      // Set cookies for tokens
      res.cookie('accessToken', token, { httpOnly: true });
      res.cookie('refreshToken', refreshToken, { httpOnly: true });

      // Store user data in session
      req.session.user = user;

      // Redirect to admin page or any protected route
      return res.redirect("/");

    } catch (error) {
      console.error("Error during Google callback:", error);
      return res.redirect('/login');
    }
  }
);

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { user, token } = req.user;

      // Generate a new refresh token
      const refreshToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' }
      );

      // Calculate token expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const expiresAtFormatted = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

      // Update refresh token and expiry date in the `alfa_personal_staff` table

      await connect.query(
        "UPDATE user_registration SET refresh_token = ?, token_expiry_date = ? WHERE id = ?",
        [refreshToken, expiresAtFormatted, user.id]
      );

      // Set cookies for tokens
      res.cookie('accessToken', token, { httpOnly: true });
      res.cookie('refreshToken', refreshToken, { httpOnly: true });

      // Store user data in session
      req.session.user = user;

      // Redirect to admin page or any protected route
      return res.redirect("/");

    } catch (error) {
      console.error("Error during Google callback:", error);
      return res.redirect('/login');
    }
  }
);


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

app.get('/my-profile', async (req, res) => {
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

app.post('/payment', (req, res) => {
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


