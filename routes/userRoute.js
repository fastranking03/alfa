import express from "express";
import bcrypt from "bcrypt";
import connect from "../db/connect.js";
// import { userLogIn } from "../middleware/protected.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/login", async (req, res) => {
  const user = req.session.user;
  res.render("login", { user });
});

router.get("/signup", async (req, res) => {
  res.render("signup");
});

router.get("/forget-password", async (req, res) => {
  const user = req.session.user;
  res.render("forget-password", { user });
});

router.get("/otp-verify", async (req, res) => {
  const user = req.session.user;
  res.render("otp-verification", { user });
});

router.get("/reset-password", async (req, res) => {
  res.render("reset-password");
});

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render("signup", {
      error: "Invalid email format. Please provide a valid email address.",
    });
  }

  if (password.length < 6 || password.length > 16) {
    return res.render("signup", {
      error: "Password must be between 6 and 16 characters long.",
    });
  }
  try {

    const checkEmailQuery =
      "SELECT email FROM user_registration WHERE email = ?";
    const [existingUser] = await connect.query(checkEmailQuery, [email]);

    if (existingUser.length > 0) {
      return res.render("signup", {
        success: "Email already registered. Please use another email.",
      });
    }

    // Hash the password
    const hashPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Temporarily store the OTP and user info
    const tempUserQuery =
      "INSERT INTO user_registration (name, email, password, otp) VALUES (?, ?, ?, ?)";
    await connect.query(tempUserQuery, [name, email, hashPassword, otp]);

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // SMTP server address for Gmail
      port: 587,
      auth: {
        user: "jaydenmitchell0282@gmail.com",
        pass: "rtcslwgbcgxkoibh",
      },
    });

    // Send email with OTP
    await transporter.sendMail({
      from: "fastranking08@gmail.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}`,
    });

    res.render("verify-otp", { email }); // Render OTP verification page
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).render("signup", { error: "Failed to register user" });
  }
});

router.post("/account-verification", async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Check if the OTP matches
    const checkOTPQuery =
      "SELECT * FROM user_registration WHERE email = ? AND otp = ?";
    const [user] = await connect.query(checkOTPQuery, [email, otp]);

    if (!user) {
      return res.render("verify-otp", {
        email,
        error: "Invalid OTP. Please try again.",
      });
    }

    // Update the verified status in the database
    const updateVerifiedQuery =
      "UPDATE user_registration SET verified = 1 WHERE email = ?";
    await connect.query(updateVerifiedQuery, [email]);

    // Store user data in session
    req.session.user = user[0];
    // Redirect to login page after successful verification
    res.redirect("/");
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res
      .status(500)
      .render("verify-otp", { email, error: "Failed to verify OTP" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query user details including verified status
    const alfa_query = "SELECT * FROM user_registration WHERE email = ?";
    const [user] = await connect.query(alfa_query, [email]);

    // Check if user exists
    if (user.length === 0) {
      return res.render("login", { error: "Email is not registered." });
    }


    // Check if user is verified
    if (user[0].verified !== 1) {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Nodemailer configuration
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", // SMTP server address for Gmail
        port: 587,
        auth: {
          user: "jaydenmitchell0282@gmail.com",
          pass: "rtcslwgbcgxkoibh",
        },
      });

      // Send email with OTP
      await transporter.sendMail({
        from: "fastranking08@gmail.com",
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is ${otp}`,
      });

      res.render("verify-otp", { email }); // Render OTP verification page
    }

    // Verify password
    const passMatch = await bcrypt.compare(password, user[0].password);
    if (!passMatch) {
      return res.render("login", { error: "Invalid Email or Password" });
    }

    const token = jwt.sign(
      { id: user[0].id, email: user[0].email, role: user[0].role, current_status: user[0].current_status },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, { httpOnly: true });

    // Store user data in session
    req.session.user = user[0];

    // Check if the user has items in the session cart
    if (req.session.cart && req.session.cart.length > 0) {
      for (const item of req.session.cart) {
        const { product_id, selected_size, quantity } = item;

        // Check if the cart item already exists in the database
        const checkCartItemQuery = `
          SELECT * FROM users_cart WHERE user_id = ? AND product_id = ? AND selected_size = ?
        `;
        const [existingCartItem] = await connect.query(checkCartItemQuery, [
          user[0].id,
          product_id,
          selected_size,
        ]);

        if (existingCartItem.length > 0) {
          // Update the existing cart item
          const updateCartItemQuery = `
            UPDATE users_cart SET selected_size = ? WHERE user_id = ? AND product_id = ? AND selected_size = ? AND quantity = ?
          `;
          await connect.query(updateCartItemQuery, [
            selected_size,
            user[0].id,
            product_id,
            selected_size,
            quantity,
          ]);
        } else {
          // Insert the new cart item into the database
          const insertCartItemQuery = `
            INSERT INTO users_cart (user_id, product_id, selected_size, quantity, created_at)
            VALUES (?, ?, ?, ?, NOW())
          `;
          await connect.query(insertCartItemQuery, [
            user[0].id,
            product_id,
            selected_size,
            quantity,
          ]);
        }
      }
      // Clear the session cart after saving to database
      req.session.cart = [];
    }

    const redirectTo = req.session.redirectTo;
    // console.log(redirectTo); // Default to homepage if no redirect path is stored
    // console.log(req.session.redirectTo);
    // Clear the stored redirect path from session storage
    delete req.session.redirectTo;
    if (redirectTo === "/cart") {
      return res.redirect(redirectTo);
    }

    const productIdToAdd = req.session.productToWishlist;
    if (productIdToAdd) {

      console.log("id", productIdToAdd);

      console.log("User:", user[0].id);
      console.log("Product ID to Add:", productIdToAdd);

      const checkIfExistsQuery = `
          SELECT *
          FROM users_favorites
          WHERE user_id = ? AND product_id = ?
          `;

      const [existingProduct] = await connect.query(checkIfExistsQuery, [
        user[0].id,
        productIdToAdd,
      ]);

      if (existingProduct.length === 0) {
        console.log("inserting");
        const addToWishlistQuery = `
              INSERT INTO users_favorites (user_id, product_id)
              VALUES (?, ?)
          `;
        await connect.query(addToWishlistQuery, [user[0].id, productIdToAdd]);
      }

      let cartCount;
      let wishlistCount;

      const [cartResult] = await connect.query(
        "SELECT COUNT(*) AS cart_count FROM users_cart WHERE user_id = ?",
        [user[0].id]
      );

      const [wishlistResult] = await connect.query(
        "SELECT COUNT(*) AS wishlist_count FROM users_favorites WHERE user_id = ?",
        [user[0].id]
      );

      cartCount = cartResult[0].cart_count;
      wishlistCount = wishlistResult[0].wishlist_count;

      // Update session variables
      req.session.cartCount = cartCount;
      req.session.wishlistCount = wishlistCount;
      req.session.productToWishlist = null;

      return res.redirect(`/product-detail/${productIdToAdd}`);
    }
    // Redirect based on user status
    if (user[0].status === 1) {
      res.redirect("/admin");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.render("login", { error: "Error in login" });
  }
});

router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email is registered
    const [user] = await connect.query(
      "SELECT * FROM user_registration WHERE email = ?",
      [email]
    );

    if (user.length === 0) {
      return res.render("forget-password", {
        message: "Email is not registered",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Nodemailer configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // SMTP server address for Gmail
      port: 587,
      auth: {
        user: "jaydenmitchell0282@gmail.com",
        pass: "rtcslwgbcgxkoibh",
      },
    });

    // Send email with OTP
    await transporter.sendMail({
      from: "fastranking08@gmail.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}`,
    });

    // Update OTP in the database
    await connect.query(
      "UPDATE user_registration SET otp = ? WHERE email = ?",
      [otp, email]
    );

    // Render the OTP verification page
    res.render("otp-verification", {
      message: "OTP sent to your email.",
      email: email,
    });
  } catch (error) {
    console.error("Error processing forget password request:", error);
    res.render("forget-password", { message: "An error occurred" });
  }
});

// Route for OTP verification
router.post("/otp-verification", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sql_query =
      "SELECT * FROM user_registration WHERE email = ? AND otp = ?";

    const [result] = await connect.query(sql_query, [email, otp]);

    if (result.length === 0) {
      return res.render("otp-verification", {
        message: "Invalid OTP",
        email: email,
      });
    }

    res.render("reset-password", { email: email });
  } catch (error) {
    console.error("Error processing OTP verification:", error);
    return res.render("otp-verification", { message: "An error occurred" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { newPassword, email } = req.body;

    // Hash the password
    const hashPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    const sql_query =
      "UPDATE user_registration SET password = ?, otp = NULL WHERE email = ?";

    await connect.query(sql_query, [hashPassword, email]);

    res.render("login", {
      message: "Password reset successful. Please log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("reset-password", { message: "An error occurred" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
    }
    res.redirect("/login");
  });
});


router.get("/alfa-login", (req, res) => {
  return res.render("alfa-login");
});


router.post("/alfa-login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query user details
    const alfa_query = "SELECT * FROM alfa_personal_staff WHERE email = ?";
    const [user] = await connect.query(alfa_query, [email]);

    // Check if user exists
    if (user.length === 0) {
      return res.render("alfa-login", { error: "Email is not registered." });
    }

    // Check if the provided password matches the stored password
    if (password != user[0].password) {
      return res.render("alfa-login", { error: "Invalid Email or Password" });
    }

    // Check user status
    if (user[0].current_status === "active") {
      // Generate JWT token
      const token = jwt.sign(
        { id: user[0].id, email: user[0].email, role: user[0].role, current_status: user[0].current_status },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      console.log('Generated Token:', token);
      // Store token in a cookie
      res.cookie('token', token, { httpOnly: true });

      // Store user data in session
      req.session.alfa_team = user[0];

      return res.redirect("/admin");
    } else {
      return res.redirect('/alfa-login');
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.render("alfa-login", { error: "Error in login" });
  }
});
export default router;
