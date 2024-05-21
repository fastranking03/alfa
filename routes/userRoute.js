import express from "express";
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

export default router