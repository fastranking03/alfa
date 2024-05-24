import express from "express";
const router = express.Router();
router.get('/category',(req,res) =>{
    return res.render('admin/category');
})
export default router