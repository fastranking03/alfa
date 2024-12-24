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

async function generateAccessToken() {
    const response = await axios({
        url: process.env.PAYPAL_BASE_URL + '/v1/oauth2/token',
        method: 'post',
        data: 'grant_type=client_credentials',
        auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_SECRET
        }
    });

    return response.data.access_token;
}

export const createOrder = async (req, res) => {
    const accessToken = await generateAccessToken();
    try {
        const user = req.session.user;
        const cartData = JSON.parse(req.body.cartItemsInStock);
        console.log(cartData)

        if (!cartData || cartData.length === 0) {
            return res.status(400).json({ error: 'Cart data is required' });
        }

        let total = 0;
        const items = cartData.map(item => {
            total += item.product_price * item.quantity;
            return {
                name: item.product_name,
                description: item.product_name,
                quantity: item.quantity,
                unit_amount: {
                    currency_code: 'GBP',
                    value: item.product_price
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
                    return_url: process.env.BASE_URL + 'complete-order',
                    cancel_url: process.env.BASE_URL + 'cancel-order',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    brand_name: 'Alfamenswear'
                }
            })
        });

        const approvalLink = response.data.links.find(link => link.rel === 'approve').href;

        const orderId = await generateOrderId();

        await connect.execute(
            'INSERT INTO new_order (order_id, user_id, total_price, payment_method, status) VALUES (?, ?, ?, ?, ?)',
            [orderId, user.id, total.toFixed(2), 'PAYPAL', 'PENDING']
        );

        req.session.pendingOrder = { orderId, cartData };

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
            url: `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return response.data; // Capture response for further processing
    } catch (error) {
        console.error('Payment capture error:', error);
        throw new Error('Payment capture failed');
    }
};


export const completeOrder = async (req, res) => {
    try {
        // Capture payment
        const captureResponse = await capturePayment(req.query.token);
        const { cartData, userId, orderId } = req.session; // Assume cartData and orderId are stored temporarily
        if (!cartData || !orderId) {
            return res.status(400).json({ error: 'Order details not found' });
        }

        // Insert the order into `new_order`
        await connect.execute(
            'INSERT INTO new_order (order_id, user_id, total_price, payment_method, status) VALUES (?, ?, ?, ?, ?)',
            [orderId, userId, captureResponse.purchase_units[0].amount.value, 'PAYPAL', 'COMPLETED']
        );

        // Insert the associated products into `new_order_items`
        const orderItems = cartData.map(item => [orderId, item.product_id, item.quantity]);
        await connect.query(
            'INSERT INTO new_order_items (order_id, product_id, quantity) VALUES ?',
            [orderItems]
        );

        res.send('Order completed successfully');

    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({ error: 'Failed to complete the order' });
    }
};


export const cancelOrder = (req, res) => {
    delete req.session.pendingOrder;
    res.redirect('/');
};
