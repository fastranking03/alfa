import express from 'express';
import { client } from '../paypalconfig.js';
import pkg from '@paypal/checkout-server-sdk';

const { orders } = pkg;
const router = express.Router();

// Create PayPal transaction this is old code dont use this 
// router.post('/create-paypal-transaction', async (req, res) => {
//     const request = new orders.OrdersCreateRequest();
//     request.prefer("return=representation");
//     request.requestBody({
//         intent: 'CAPTURE',
//         purchase_units: [{
//             amount: {
//                 currency_code: 'USD',
//                 value: req.body.amount  // Use dynamic amount from the request body
//             }
//         }]
//     });

//     try {
//         const order = await client.execute(request);
//         res.json(order.result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Something went wrong');
//     }
// });

// Capture PayPal transaction
// router.post('/capture-paypal-transaction', async (req, res) => {
//     const { orderID } = req.body;
//     const request = new orders.OrdersCaptureRequest(orderID);
//     request.requestBody({});

//     try {
//         const capture = await client.execute(request);
//         res.json(capture.result);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Something went wrong');
//     }
// });

export default router;
