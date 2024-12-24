import express from "express"
import { completeOrder, createOrder ,cancelOrder ,returnOrder } from "../controller/payController.js";

const router = express.Router();

router.post('/pay', createOrder)

router.get('/pay',(req,res) =>{
    res.render('payment')
})

router.get('/complete-order', completeOrder);
router.get('/cancel-order', cancelOrder);

router.get('/cancel-order', (req, res) => {
    res.redirect('/')
});

router.post('/api/cancel-order', cancelOrder)
// router.post('/api/order-return', returnOrder)

router.post('/return-submit', returnOrder)


export default router