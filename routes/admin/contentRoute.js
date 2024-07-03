import express from "express";
import connect from "../../db/connect.js";
const router = express.Router();

router.get('/about-content', async (req, res) => {
  try {
    const [rows] = await connect.query('SELECT * FROM about_us_content ORDER BY id DESC LIMIT 1');
    const aboutUsData = rows[0];
    return res.render('admin/about-content', { aboutUsData });
  } catch (error) {
    console.error('Error fetching About Us data:', error);
    res.status(500).send('Error fetching About Us data');
  }
});


router.get('/contact-inquiry', (req, res) => {
  return res.render('admin/contact-inquiry');
})
router.get('/contact-info', (req, res) => {
  return res.render('admin/contact-info');
})

router.get('/review-list', async (req, res) => {
  try {
    // Ensure productId is obtained from request query, params, or body 


    // Fetch reviews with all details
    const [reviews] = await connect.query(
      `SELECT oi.*, p.product_name 
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.isReviewed = 1`
    );

    return res.render('admin/review-list', { reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).send('An error occurred while fetching reviews.');
  }
});

router.post('/update-review-status/:id', async (req, res) => {
  const reviewId = req.params.id;
  const { reviewStatus } = req.body;

  console.log(reviewId, reviewStatus);

  try {
    // Update review status in the database
    await connect.query(
      'UPDATE order_items SET isReviewApproved = ? WHERE id = ?',
      [reviewStatus, reviewId]
    );

    res.status(200).json({ message: 'Review status updated successfully!' });
  } catch (error) {
    console.error('Error updating review status:', error);
    res.status(500).json({ message: 'Failed to update review status.' });
  }
});


export default router;
