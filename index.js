import express from "express";
import path from "path";
import userRoute from "./routes/userRoute.js";
import commanRoute from "./routes/commanRoute.js";
import adminRoute from "./routes/admin/adminRoute.js";
import shirtsRoute from "./routes/shirtsRoutes.js";
import productsRoute from "./routes/productsRoute.js";
import categoryRoute from "./routes/admin/categoryRoute.js";
import bannerRoute from "./routes/admin/bannerRoute.js";
import favoritesRoute from "./routes/favoritesRoute.js";
import inventoryRoute from "./routes/admin/inventoryRoute.js";
import session from "express-session";
import { fileURLToPath } from 'url'; 

const app = express();


app.use('/banner_images', express.static('banner_images'));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



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

// Serve static files (like uploaded images)
app.use('/banner_images', express.static('banner_images'));

// Routes
app.use('/',userRoute);
app.use('/',commanRoute);
app.use('/', shirtsRoute);
app.use('/', productsRoute);
app.use('/', favoritesRoute);
 
app.use('/admin/',adminRoute);
app.use('/admin/',bannerRoute);  
app.use('/admin/',categoryRoute);

app.use('/admin/',inventoryRoute);


const PORT = 8081;
app.listen(PORT,() =>{
    console.log(`Server is running on port ${PORT}`);
})