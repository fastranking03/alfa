import express from "express";
import pool from "../db/connect.js";

const router = express.Router();


router.post("/place-order", async (req, res) => {
  const { products, subtotal, gst, deliveryFee, totalCost } = req.body;
  const user = req.session.user;
  const userId = user ? user.id : null;

  try {
    // Generate new order ID
    const [lastOrderRow] = await connection.query(
      "SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1"
    );
    let newOrderId = "ALOI000001";
    if (lastOrderRow.length > 0) {
      const lastOrderId = lastOrderRow[0].order_id;
      const lastOrderNumber = parseInt(lastOrderId.slice(4));
      const nextOrderNumber = lastOrderNumber + 1;
      newOrderId = "ALOI" + nextOrderNumber.toString().padStart(6, "0");
    }

    // Insert new order
    await pool.query(
      "INSERT INTO orders (order_id, user_id, total_payable, vat, delivery_charges, amount_without_vat) VALUES (?, ?, ?, ?, ?, ?)",
      [newOrderId, userId, totalCost, gst, deliveryFee, subtotal]
    );

    // Insert order items
    for (const product of products) {
      await pool.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)",
        [
          newOrderId,
          product.productId,
          product.quantity,
          product.price,
          product.size,
        ]
      );
    }

    // Send the newly created order ID in the response
    res.status(201).send({ orderId: newOrderId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to place order");
  }
});


router.get("/do-payment", (req, res) => {
  res.render("payment-testing");
});

export default router;
