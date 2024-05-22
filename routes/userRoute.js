import express from "express";
import bcrypt from "bcrypt";
import connect from "../db/connect.js";
const router = express.Router();

router.get('/login',(req,res) =>{
    return res.render('login')
})

router.get('/signup',(req,res) =>{
    return res.render('signup');
})
router.get('/forget-password',(req,res) =>{
    return res.render('forget-password')
})
router.get('/otp-verify',(req,res) =>{
    return res.render('otp-verification')
})
router.get('/reset-password',(req,res) =>{
    return res.render('reset-password')
})

// User Registration
router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // First check if email already exists
        const checkEmailQuery = 'SELECT email FROM user_registration WHERE email = ?';
        connect.query(checkEmailQuery, [email], async (err, result) => {
            if (err) {
                return res.render('signup',{error:'Error checking user'});
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
router.post('/login', async(req,res) =>{
     try{
        const {email,password} = req.body;
        const alfa_query = "SELECT * FROM user_registration WHERE email = ?";
        connect.query(alfa_query,[email], async(err,result) =>{
            if (err) {
                res.render('login', { error: 'Error in login' });
                return;
            }
            if(result.length === 0){
                res.render("login",{error:"Email is not register."})
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
 
    }catch(e){
        res.render('login', { error: 'Error in Code' }); 
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