import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

router.get('/about-content', async (req, res) => {
   try { 
     const [rows] = await connect.query('SELECT * FROM about_us_content ORDER BY id DESC LIMIT 1');
     const aboutUsData = rows[0];  
     return res.render('admin/about-content', { aboutUsData });
   } catch (error) {
     console.error('Error fetching About Us data:', error);
     res.status(500).send('Error fetching About Us data');
   }
 });
 

 router.get('/contact-inquiry',(req,res) =>{
    return res.render('admin/contact-inquiry');
 })
 router.get('/contact-info',(req,res) =>{
   return res.render('admin/contact-info');
})


 
export default router;
