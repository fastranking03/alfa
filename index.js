import express from "express";
import path from "path";
import userRoute from "./routes/userRoute.js";
import commanRoute from "./routes/commanRoute.js";
const app = express();

app.use(express.json());//For parsing application/json
app.use(express.urlencoded({extended:true})) //For parsing application/x-www-form-urlencoded

//  Set Template Engine
app.set('view engine','ejs');
app.set('views',path.resolve("./views"));
app.use(express.static("public"))

// Routes
app.use('/',userRoute)
app.use('/',commanRoute);

const PORT = 8081;
app.listen(PORT,() =>{
    console.log(`Server is running on port ${PORT}`);
})