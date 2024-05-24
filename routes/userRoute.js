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
     
    return res.render('signup');
})
router.get('/forget-password', (req, res) => {
    const user = req.session.user;
    return res.render('forget-password',{user});
})
router.get('/otp-verify', (req, res) => {
    const user = req.session.user;
    return res.render('otp-verification',{user})
})
router.get('/reset-password', (req, res) => {
    return res.render('reset-password')
})
router.get('/otp-verification', (req, res) => {
     return res.render('otp-verification')
})
router.get('/password-success', (req, res) => {
    return res.render('password-success')
})
// User Registration
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // First check if email already exists
        const checkEmailQuery = 'SELECT email FROM `user_registration` WHERE email = ?';
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
                res.redirect('/login');
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
router.post('/forget-password',async (req,res) =>{
    try{
    const {email} = req.body;
    const sql_query = "SELECT * FROM user_registration WHERE email = ?";
    connect.query(sql_query, [email] , (err,result) =>{
        
        if(err){
            console.error('Error in Query:', err);
            return res.render('forget-password',{message:'Error in Query'})
        }if (result.length === 0) {
            return res.render('forget-password', { message: 'Email is not registered' });
        } 
 
        // Genereate Otp
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

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
            from:'fastranking08@gmail.com',
            to:email,
            subject:'Password Reset Otp',
            text:`Your Otp for password reset is ${otp}`
        }

        transporter.sendMail(mailOptions,(err,info) =>{
            if(err){
                console.error('Error sending email:', err);
                return res.render('forget-password',{message:'Error sending OTP'})
            }
            console.log('Email sent: ' + info.response);

            const saveOtpQuery = 'UPDATE user_registration SET otp = ? WHERE email = ?';
            connect.query(saveOtpQuery,[otp,email],(err,result) =>{
                if(err){

                    return res.render('forget-password',{message:'Error saving OTP'});
                }
                res.render('otp-verification', {email: email });
            })
        })
     })
    }
    catch(e){
        res.render('forget-password', { message: 'An error occurred' });
    }
});
 
router.post('/otp-verification',(req,res) =>{
    try{
      const {email,otp} = req.body;
      const sql_query = "SELECT * FROM `user_registration` WHERE email = ? AND otp = ?";

      connect.query(sql_query,[email,otp],(err,result) =>{
        if(err){
            return res.render('otp-verification',{message:'Error in Query'})
        }
        if(result.length === 0){
            return res.render('otp-verification',{message:'Invalid OTP', email:email})
        }
        res.render('reset-password',{email:email})
      })
    }catch(e){
        return res.render('otp-verification',{message:'Error in Code'})
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
         const saltRounds = 10;
         // Hash the new password before storing it in the database
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const sql_query = "UPDATE `user_registration` SET password = ? WHERE email = ?";
        connect.query(sql_query, [hashedPassword, email], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.render('reset-password', { email: email, message: 'Error updating password' });
            }
            res.redirect('/password-success');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.render('reset-password', { email: email, message: 'An error occurred while resetting the password.' });
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