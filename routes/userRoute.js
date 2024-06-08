import express from "express";
import bcrypt from "bcrypt";
import connect from "../db/connect.js"; 
// import { userLogIn } from "../middleware/protected.js";
import nodemailer from "nodemailer";

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

router.get("/otp-verification", async (req, res) => {
  const user = req.session.user;
  res.render("otp-verification", { user });
});

// User Registration
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const checkEmailQuery =
      "SELECT email FROM `user_registration` WHERE email = ?";
    const [existingUser] = await connect.query(checkEmailQuery, [email]);

    if (existingUser.length > 0) {
      return res.render("signup", {
        success: "Email already registered. Please use another email.",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const sql_query =
      "INSERT INTO user_registration (name, email, password, status) VALUES (?, ?, ?, ?)";
    await connect.query(sql_query, [name, email, hashPassword, 0]);
    res.redirect("/login");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).render("signup", { error: "Failed to register user" });
  }
});

// User Login
router.post("/login", async (req, res) => {


  try {
    const { email, password } = req.body;
    const alfa_query = "SELECT * FROM user_registration WHERE email = ?";
    const [user] = await connect.query(alfa_query, [email]);

    if (user.length === 0) {
      return res.render("login", { error: "Email is not registered." });
    }

    const passMatch = await bcrypt.compare(password, user[0].password);
    if (!passMatch) {
      return res.render("login", { error: "Invalid Email or Password" });
    }

    req.session.user = user[0];

    
    // Storing user data in session
    if (req.session.user.status === 1) {
      res.redirect("/admin/");
    } else {
      const [categories] = await connect.query("SELECT * FROM category");
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.render("login", { error: "Error in login" });
  }
});

// Forget Password
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;
    const sql_query = "SELECT * FROM user_registration WHERE email = ?";
    const [user] = await connect.query(sql_query, [email]);

    if (user.length === 0) {
      return res.render("forget-password", {
        error: "Email is not registered.",
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

    const mailOptions = {
      from: "jaydenmitchell0282@gmail.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    await connect.query(
      "UPDATE user_registration SET otp = ? WHERE email = ?",
      [otp, email]
    );
    res.redirect("/otp-verification");
  } catch (error) {
    console.error("Error processing forget password request:", error);
    res.render("forget-password", { error: "An error occurred" });
  }
});

router.post("/otp-verification", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sql_query = "SELECT otp FROM user_registration WHERE email = ?";
    const [user] = await connect.query(sql_query, [email]);

    if (user.length === 0) {
      return res.render("otp-verification", {
        error: "Email is not registered.",
        email,
      });
    }

    const storedOtp = user[0].otp;
    if (storedOtp === otp) {
      return res.render("reset-password", { email });
    } else {
      return res.render("otp-verification", {
        error: "Invalid OTP. Please try again.",
        email,
      });
    }
  } catch (error) {
    console.error("Error processing OTP verification:", error);
    res.render("otp-verification", { error: "An error occurred", email });
  }
});

// Session Display
router.use((req, res, next) => {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
    }
    res.redirect("/login");
  });
});

export default router;
