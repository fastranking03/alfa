import express from "express";
import bcrypt from "bcrypt";
import connect from "../db/connect.js";
import { userLogIn } from "../middleware/protected.js";
import nodemailer from "nodemailer";
const router = express.Router();

router.get('/login', userLogIn, (req, res) => {
    const user = req.session.user;
    return res.render('login', { user })
})
router.get('/signup', (req, res) => {
    const user = req.session.user;
    return res.render('signup', {email:user[0].email });
})
router.get('/forget-password', (req, res) => {
    return res.render('forget-password');
})
router.get('/otp-verify', (req, res) => {
    return res.render('otp-verification')
})
router.get('/reset-password', (req, res) => {
    return res.render('reset-password')
})
router.get('/otp-verification', (req, res) => {
    const user = req.session.user;
    return res.render('otp-verification',{user})
})

// User Registration
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // First check if email already exists
        const checkEmailQuery = 'SELECT email FROM user_registration WHERE email = ?';
        connect.query(checkEmailQuery, [email], async (err, result) => {
            if (err) {
                return res.render('signup', { error: 'Error checking user' });
            }
            if (result.length > 0) {
                return res.render('signup', { success: 'Email already registered. Please use another email.' });
            }
            const hashPassword = await bcrypt.hash(password, 10);
            const sql_query = 'INSERT INTO user_registration (name, email, password, status) VALUES (?, ?, ?, ?)';
            connect.query(sql_query, [name, email, hashPassword, 0], (err, result) => {
                if (err) {
                    return res.status(500).send('Failed to register user');
                }
                res.render('login', { success: 'Registration successful' });
            });
        });
    } catch (e) {
        console.log(e);
        res.render('signup', { error: 'Error in Code' });
    }
});

// User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const alfa_query = "SELECT * FROM user_registration WHERE email = ?";
        connect.query(alfa_query, [email], async (err, result) => {
            if (err) {
                res.render('login', { error: 'Error in login' });
                return;
            }
            if (result.length === 0) {
                res.render("login", { error: "Email is not register." })
                return;
            }
            const passMatch = await bcrypt.compare(password, result[0].password);
            if (!passMatch) {
                res.render('login', { error: 'Invalid Email or Password' });
            } else {
                req.session.user = result[0]; // Storing user data in session
                if (req.session.user.status === 1) {
                    res.redirect('/admin/');
                } else {
                    res.redirect('/');
                }
            }
        })

    } catch (e) {
        res.render('login', { error: 'Error in Code' });
    }
});

// Forget Password
router.post('/forget-password', async (req, res) => {
    try {
        const { email } = req.body;
        const sql_query = "SELECT * FROM user_registration WHERE email = ?";
        
        connect.query(sql_query, [email], (err, result) => {
            if (err) {
                console.error('Database query error:', err); // Log the error
                return res.render('forget-password', { error: 'Error in Query' });
            }
            if (result.length === 0) {
                return res.render('forget-password', { error: 'Email is not registered.' });
            }

            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Nodemailer configuration
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com', // SMTP server address for Gmail
                port: 587,
                // server:'gmail',
                auth:{
                    user:'jaydenmitchell0282@gmail.com',
                    pass:'rtcslwgbcgxkoibh'
                }
            });

            const mailOptions = {
                from: 'jaydenmitchell0282@gmail.com',
                to: email,
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is ${otp}`
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error('Error sending OTP:', err); // Log the error
                    return res.render('forget-password', { error: 'Error sending OTP' });
                }
                console.log('Email sent: ' + info.response);

                const saveOtpQuery = 'UPDATE user_registration SET otp = ? WHERE email = ?';
                connect.query(saveOtpQuery, [otp, email], (err, result) => {
                    if (err) {
                        console.error('Error saving OTP:', err); // Log the error
                        return res.render('forget-password', { error: 'Error saving OTP' });
                    }
                     res.redirect('/otp-verification');
                });
            });
        });
    } catch (e) {
        console.error('An unexpected error occurred:', e); // Log the error
        res.render('forget-password', { error: 'An error occurred' });
    }
});

router.post('/otp-verification', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const sql_query = "SELECT otp FROM user_registration WHERE email = ?";
        
        connect.query(sql_query, [email], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.render('otp-verification', { error: 'Error in Query', email: email });
            }
            if (result.length === 0) {
                return res.render('otp-verification', { error: 'Email is not registered.', email: email });
            }

            const storedOtp = result[0].otp;
            if (storedOtp === otp) {
                return res.render('reset-password', { email: email });
            } else {
                return res.render('otp-verification', { error: 'Invalid OTP. Please try again.', email: email });
            }
        });
    } catch (e) {
        console.error('An unexpected error occurred:', e);
        res.render('otp-verification', { error: 'An error occurred', email: email });
    }
});


// Session Display
router.use((req, res, next) => {
    if (req.session.user) {
        res.locals.user = req.session.user;
    }
    next();
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/login');
    });
});

export default router