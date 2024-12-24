import connect from "../../db/connect.js";

export const displayOrder = async (req, res) => {
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
    res.render('admin/orders', { orderData: orderList });
  } catch (e) {
    console.log(e);
    res.status(500).send('Internal Server Error');
  }
};


export const displayOrderDetail = async (req, res) => {
  try {
    const { order_id } = req.params;
    const orderID = order_id;
 
    // SQL query to fetch all fields from relevant tables
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

    // Execute the query
    const [orderDetails] = await connect.execute(query, [order_id]);
    const order = orderDetails[0];
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
    const [orderItems] = await connect.execute( orderItemsQuery, [order_id]
    );
    let subtotal = orderItems.reduce((acc, item) => acc + item.product_price * item.quantity, 0);
    let deliveryFee = subtotal < 100 ? 5 : 0;
    let vat = subtotal * 0.2;
    let totalCost = subtotal +  vat + deliveryFee;

    res.render("admin/order-details", {orderID, order,orderItems ,subtotal ,totalCost , deliveryFee ,vat});
  } catch (e) {
    console.error("Error fetching order details:", e);
    res.status(500).send("Internal Server Error");
  }
};


export const updateStatus = async (req, res) => {
  const { status } = req.body;
  const { order_id } = req.params;
  try {
    await connect.execute('UPDATE new_order SET status = ? WHERE id = ?', [status, order_id]);
    res.redirect(`/admin/order-details/${order_id}`);
  } catch (e) {
    console.error("Error updating order status:", e);
    res.status(500).send("Internal Server Error");
  }
};
