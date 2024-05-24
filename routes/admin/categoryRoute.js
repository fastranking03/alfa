import express from "express";
const router = express.Router();
router.get('/category',(req,res) =>{
    return res.render('admin/category');
}) 

router.get('/add-category',(req,res) =>{
    return res.render('admin/add-category');
}) 

export default router