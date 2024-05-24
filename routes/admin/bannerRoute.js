import express from "express";
const router = express.Router();
router.get('/banner',(req,res) =>{
    return res.render('admin/banner');
})

router.get('/add-banner',(req,res) =>{
    return res.render('admin/add-banner');
})
export default router