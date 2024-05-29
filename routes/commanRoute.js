import express from "express";
const router = express.Router();

router.get('/',(req,res) =>{
    const user = req.session.user;
    return res.render('index',{user});
})
router.get('/about',(req,res) =>{
    const user = req.session.user; 
    res.render('about', { user });
})
router.get('/product',(req,res) =>{
    const user = req.session.user; 
    res.render('product', { user });
})
export default router