import connect from "../db/connect.js";

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
}

export const displayOrderSuccess = async (req, res) => {
    try {
        const query = `
          SELECT 
            o.*,
            u.name AS name, 
            a.address_one AS address,
             a.address_two AS address_two
          FROM new_order o
          LEFT JOIN user_registration u ON o.user_id = u.id 
          LEFT JOIN user_address a ON o.address_id = a.id
        `;
        const [orderList] = await connect.execute(query);
        res.render('user-orders', { orderData: orderList });
    } catch (e) {
        console.log(e);
        res.status(500).send('Internal Server Error');
    }
};

export const displayUserOrders = async (req, res) => {
  try {
      const { order_id } = req.params;

      // Query to fetch order details
      const query = `
          SELECT 
              o.*, 
              u.name AS name, 
              a.name AS a_name,
              a.phone AS phone,
              a.email AS email,
              a.pincode AS pincode,
              a.address_one AS full_address,
              a.address_two AS address_two,
              a.city AS city
          FROM new_order o
          LEFT JOIN user_registration u ON o.user_id = u.id 
          LEFT JOIN user_address a ON o.address_id = a.id 
          WHERE o.id = ?
          ORDER BY o.created_at DESC
      `;

      const [orderDetails] = await connect.execute(query, [order_id]);
      const order = orderDetails[0];

      // Query to fetch order items and their return statuses
      const orderItemsQuery = `
          SELECT 
              oi.*, 
              p.product_name AS product_name,
              p.product_main_image AS product_main_image,
              p.product_price AS product_price,
              r.r_status AS return_status
          FROM new_order_itemsss oi
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN return_order r ON oi.id = r.order_item_id
          WHERE oi.orders_id = ?
      `;

      const [orderItems] = await connect.execute(orderItemsQuery, [order_id]);

      // Calculate costs
      let subtotal = orderItems.reduce((acc, item) => acc + item.product_price * item.quantity, 0);
      let deliveryFee = subtotal < 100 ? 10 : 0;
      let vat = subtotal * 0.2;
      let totalCost = subtotal + vat + deliveryFee;

      res.render("user-order-detail", {
          orderID: order_id,
          order,
          orderItems,
          subtotal,
          totalCost,
          deliveryFee,
          vat,
      });
  } catch (e) {
      console.error(e);
      res.status(500).send("Internal Server Error");
  }
};


  export const returnOrder = async (req,res) =>{
    try {
         const {order_id, order_item_id,reason,by_cs, comment} = req.body;
         console.log(order_id)
         const return_order_id = await generateReturnOrderId();
         await connect.query(
            'INSERT INTO return_order (order_id,order_item_id, return_order_id, reason, by_cs, comment,r_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [order_id,order_item_id, return_order_id, reason, by_cs, comment,'PENDING']
        );
        req.flash('success', 'Request send Successfully!');
        res.redirect(`/user-order-detail/${order_id}`);
      } catch (error) {
         res.status(500).json({ message: "An error occurred while cancelling the order." });
      }  
}
