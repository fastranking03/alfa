import express from "express";
import slugify from "slugify";
import connect from "./db/connect.js";


(async () => {
    try {
        // Fetch products with NULL slugs
        const [products] = await connect.query('SELECT id, product_title FROM products WHERE product_title_slug IS NULL');

        // Prepare update query
        const updateQuery = 'UPDATE products SET product_title_slug = ? WHERE id = ?';

        // Update each product with the generated slug
        for (const product of products) {
            const { id, product_title } = product;
            const slug = slugify(product_title, { lower: true, strict: true });
            await connect.query(updateQuery, [slug, id]);
        }

        console.log('Slugs updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating slugs:', error);
        process.exit(1);
    }
})();