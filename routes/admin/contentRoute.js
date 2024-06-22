import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

 router.get('/about-content',(req,res) =>{
    return res.render('admin/about-content');
 })

 router.get('/contact-inquiry',(req,res) =>{
    return res.render('admin/contact-inquiry');
 })

export default router;