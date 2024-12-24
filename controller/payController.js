import axios from "axios";
import connect from "../db/connect.js";

export const generateOrderId = async () => {
    const prefix = 'ALFA';
    const query = 'SELECT MAX(order_id) AS lastOrderId FROM new_order WHERE order_id LIKE ?';
    const [rows] = await connect.execute(query, [`${prefix}%`]);

    const lastOrderId = rows[0]?.lastOrderId;

    if (lastOrderId) {
        const numericPart = parseInt(lastOrderId.replace(prefix, ''), 10);
        const newNumericPart = numericPart + 1;
        return `${prefix}${newNumericPart.toString().padStart(4, '0')}`;
    }

    return `${prefix}0001`;
};

export const generateReturnOrderId = async () => {
    const prefix = 'ALFARETURN';
    const query = 'SELECT MAX(return_order_id) AS lastOrderId FROM return_order WHERE return_order_id LIKE ?';
    const [rows] = await connect.execute(query, [`${prefix}%`]);

    const lastOrderId = rows[0]?.lastOrderId;

    if (lastOrderId) {
        const numericPart = parseInt(lastOrderId.replace(prefix, ''), 10);
        const newNumericPart = numericPart + 1;
        return `${prefix}${newNumericPart.toString().padStart(6, '0')}`;
    }

    return `${prefix}0001`;
};

async function generateAccessToken() {
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + '/v1/oauth2/token',
        method: 'post',
        data: 'grant_type=client_credentials',
        auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_CLIENT_SECRET
        }
    });
    return response.data.access_token;
}

export const createOrder = async (req, res) => {
    const accessToken = await generateAccessToken();
    const user = req.session.user;

    try {
        const cartItemsInStock = JSON.parse(req.body.cartItemsInStock);
        const selectedAddress = req.body.selectedAddress;

        if (!cartItemsInStock || cartItemsInStock.length === 0) {
            return res.status(400).json({ error: 'Cart data is required'});
        }

        if (!selectedAddress) {
            return res.status(400).json({ error: 'Address selection is required' });
        }

        let total = 0;
        const items = cartItemsInStock.map(item => {
            total += item.product_price * item.quantity;
            return {
                name: item.product_name,
                description: item.product_name,
                quantity: item.quantity,
                unit_amount: {
                    currency_code: 'GBP',
                    value: parseFloat(item.product_price).toFixed(2)
                }
            };
        });

        const response = await axios({
            url: process.env.PAYPAL_BASE_URL + '/v2/checkout/orders',
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            data: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        items: items,
                        amount: {
                            currency_code: 'GBP',
                            value: total.toFixed(2),
                            breakdown: {
                                item_total: {
                                    currency_code: 'GBP',
                                    value: total.toFixed(2)
                                }
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: process.env.BASE_URL + '/complete-order',
                    cancel_url: process.env.BASE_URL + '/cancel-order',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    brand_name: 'Alfamenswear'
                }
            })
        });

        const approvalLink = response.data.links.find(link => link.rel === 'approve').href;

        const paypalOrderId = response.data.id;
    
        const uniqueOrderId = await generateOrderId();
      
        // Insert order details into the database
        const [orderResult] = await connect.execute(
            "INSERT INTO new_order (paypal_id, order_id, user_id, address_id, total_price, payment_method, payment_type, status, payment_status,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,NOW(),NOW())",
            [paypalOrderId,uniqueOrderId,user.id, selectedAddress, total.toFixed(2),'Paypal', '' ,'ORDER PLACED' ,'PENDING']
        );

        const orderId = orderResult.insertId;

        // Insert each item into order_items table
        for (const item of cartItemsInStock) {
            await connect.execute(
                "INSERT INTO new_order_itemsss (orders_id, product_id, quantity) VALUES (?, ?, ?)",
                [orderId, item.product_id,item.quantity]
            );
        }

        res.redirect(approvalLink);

    } catch (e) {
        console.error(e);
        res.status(500).send('Error creating order');
    }
};

export const capturePayment = async (orderId) => {
    try {
        const accessToken = await generateAccessToken();

        const response = await axios({
            url: process.env.PAYPAL_BASE_URL + `/v2/checkout/orders/${orderId}/capture`,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            }
        });

        const paymentInfo = response.data.purchase_units[0].payments.captures[0];
        const paymentStatus = paymentInfo.status;
        const paymentMethod = paymentInfo.payment_source ? paymentInfo.payment_source.name : 'PayPal'; 
        const paymentType = paymentInfo.payment_source ? paymentInfo.payment_source.card ? paymentInfo.payment_source.card.brand : 'Other' : 'PayPal';
       

        // Update order status in the database based on PayPal response
        await connect.execute("UPDATE new_order SET payment_status = ? WHERE order_id = ?", [paymentMethod, orderId]);
        await connect.execute(
            "UPDATE new_order SET payment_status = ?, payment_method = ?, payment_type = ? WHERE order_id = ?",
            [paymentStatus, paymentMethod, paymentType, orderId]
        );
        return response.data;

    } catch (error) {
        console.error(error);
        throw new Error('Error capturing payment: ' + error.message);
    }
};

export const completeOrder = async (req, res) => {
    try {
        await capturePayment(req.query.token);

        const user = req.session.user; 
        if (user && user.id) {
            await connect.execute("DELETE FROM users_cart WHERE user_id = ?", [user.id]);
        }
        res.render('complete-order');
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
};

export const cancelOrder = async (req, res) => {
    try {
      const { order_id } = req.body;
      const [result] = await connect.execute(
        "UPDATE new_order SET status = ? WHERE id = ?",
        ['CANCELLED', order_id]
      );
      if (result.affectedRows > 0) {
        res.status(200).json({ message: "Order cancelled!" });
      } else {
        res.status(404).json({ message: "Order not found!" });
      }
    } catch (error) {
      res.status(500).json({ message: "An error occurred while cancelling the order." });
    }
  };
  
 export const returnOrder = async (req,res) =>{
    try {
         const {orders_id,order_item_id,reason,by_cs, comment} = req.body;
         console.log(orders_id)
         const return_order_id = await generateReturnOrderId();
         await connect.query(
            'INSERT INTO return_order (order_item_id, return_order_id, reason, by_cs, comment,r_status) VALUES (?, ?, ?, ?, ?, ?)',
            [order_item_id, return_order_id, reason, by_cs, comment,'PENDING']
        );
        req.flash('success', 'Order return request send successfully!');
        res.redirect(`/user-order-detail/${orders_id}`);
      } catch (error) {
         res.status(500).json({ message: "An error occurred while cancelling the order." });
      }  
}
// safd