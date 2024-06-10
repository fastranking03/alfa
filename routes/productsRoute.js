import express from "express";
import connect from "../db/connect.js";

const router = express.Router();

router.post('/place-order', async (req, res) => {
    const { products } = req.body; // Array of products { productId, quantity, price, size }
    const userId = req.session.userId; // Assuming user ID is stored in the session
    
    if (!userId || !products || products.length === 0) {
        return res.status(400).send('Invalid order data');
    }

    const connection = await connect(); // Use connect function to obtain connection
    try {
        // Calculate the total price
        const totalPrice = products.reduce((sum, item) => sum + item.quantity * item.price, 0);

        // Start transaction
        await connection.beginTransaction();

        // Insert new order
        const [orderResult] = await connection.query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [
            userId,
            totalPrice
        ]);

        const orderId = orderResult.insertId;

        // Insert order items
        const orderItemsPromises = products.map(product => 
            connection.query('INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)', [
                orderId,
                product.productId,
                product.quantity,
                product.price,
                product.size
            ])
        );

        // Execute all insert queries
        await Promise.all(orderItemsPromises);

        // Commit transaction
        await connection.commit();

        res.status(201).send({ orderId });
    } catch (error) {
        // Rollback transaction on error
        await connection.rollback();
        console.error(error);
        res.status(500).send('Failed to place order');
    } finally {
        // Release connection
        connection.release();
    }
});

export default router;
