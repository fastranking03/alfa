import express from "express";
const router = express.Router();

// user can't back to login untill session end
function userLogIn(req,res,next){
    if(req.session && req.session.user){
       res.redirect("/");
    } 
    else{
       next()   
    }
   }
<<<<<<< HEAD
=======
   
>>>>>>> ff04db84541bb9c8db44fc0e4a770acb898a3bf7
   export { router, userLogIn };