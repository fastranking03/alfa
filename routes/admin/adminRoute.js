import express from "express";
const router = express.Router();
router.get('/',(req,res) =>{
    return res.render('admin/index');
})
export default router