import express from "express";
import path from "path";
import userRoute from "./routes/userRoute.js";
import commanRoute from "./routes/commanRoute.js";
import adminRoute from "./routes/admin/adminRoute.js";
import categoryRoute from "./routes/admin/categoryRoute.js";
import bannerRoute from "./routes/admin/bannerRoute.js";
import session from "express-session";
const app = express();

app.use(express.json());//For parsing application/json
app.use(express.urlencoded({extended:true})) //For parsing application/x-www-form-urlencoded

app.use(session({
    secret: 'user',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } //Cookie will false on development moood
}));

//  Set Template Engine
app.set('view engine','ejs');
app.set('views',path.resolve("./views"));
app.use(express.static("public"));

// Routes
app.use('/',userRoute);
app.use('/',commanRoute);
app.use('/admin/',adminRoute);
app.use('/admin/',bannerRoute);
app.use('/admin/',categoryRoute);

const PORT = 8081;
app.listen(PORT,() =>{
    console.log(`Server is running on port ${PORT}`);
})