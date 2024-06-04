import express from "express";
const router = express.Router();

// user can't back to login untill session end
function userLogIn(req, res, next) {
  if (req.session && req.session.user) {
    res.redirect("/");
  } else {
    next();
  }
}

export { router, userLogIn };
