require('./instrument');
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { dbQuery } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure directory for saving test emails exists
const emailLogsDir = path.join(__dirname, 'data', 'emails');
if (!fs.existsSync(emailLogsDir)) {
  fs.mkdirSync(emailLogsDir, { recursive: true });
}

// Set up Nodemailer transporter
let transporter;

// Create transporter helper
async function initEmailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Nodemailer configured with environment SMTP credentials.');
  } else {
    // If no configuration is provided, try creating an Ethereal test account asynchronously
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Nodemailer initialized with Ethereal Test Account:');
      console.log(`User: ${testAccount.user}`);
      console.log('Any sent emails can be viewed at the Ethereal URLs printed on order placement.');
    } catch (err) {
      console.warn('Could not initialize Ethereal email transporter. Fallback to console/file logging only.', err.message);
    }
  }
}
initEmailTransporter();

// --- API ENDPOINTS ---

// 1. Get all menu items (static data for simplicity)
const MENU_ITEMS = [
  // Brownies
  { id: 'b1', category: 'brownies', name: 'Classic Fudge Brownie', flavor: 'Fudge Chocolate', description: 'Rich, dense, fudgy brownie made with premium Belgian chocolate and a crinkly top.', price: 290, image: 'images/brownie.png' },
  { id: 'b2', category: 'brownies', name: 'Nutella Loaded Brownie', flavor: 'Nutella Chocolate', description: 'Our classic brownie stuffed and topped with a generous layer of creamy Nutella spread.', price: 380, image: 'images/brownie.png' },
  { id: 'b3', category: 'brownies', name: 'Salted Caramel Walnut Brownie', flavor: 'Caramel Walnut', description: 'Fudgy brownie packed with toasted walnuts and drizzled with signature salted caramel sauce.', price: 350, image: 'images/brownie.png' },
  
  // Cupcakes
  { id: 'c1', category: 'cupcakes', name: 'Red Velvet Royale Cupcake', flavor: 'Red Velvet', description: 'Classic red velvet sponge topped with a velvety, smooth cream cheese frosting swirl.', price: 320, image: 'images/cupcake.png' },
  { id: 'c2', category: 'cupcakes', name: 'Double Chocolate Fudge Cupcake', flavor: 'Double Chocolate', description: 'Moist chocolate sponge filled with chocolate ganache and iced with dark chocolate buttercream.', price: 290, image: 'images/cupcake.png' },
  { id: 'c3', category: 'cupcakes', name: 'Vanilla Bean Dream Cupcake', flavor: 'Vanilla Bean', description: 'Fragrant vanilla bean cupcake topped with a light, fluffy Madagascar vanilla frosting.', price: 280, image: 'images/cupcake.png' },
  
  // Ice Creams
  { id: 'i1', category: 'icecream', name: 'Premium Belgian Chocolate Ice Cream', flavor: 'Belgian Chocolate', description: 'Deep, rich, and ultra-creamy chocolate ice cream made with 70% dark Belgian cocoa.', price: 420, image: 'images/icecream.png' },
  { id: 'i2', category: 'icecream', name: 'Classic Madagascar Vanilla Bean Ice Cream', flavor: 'Madagascar Vanilla', description: 'Silky smooth vanilla ice cream speckled with real, aromatic Madagascar vanilla bean pods.', price: 380, image: 'images/icecream.png' },
  { id: 'i3', category: 'icecream', name: 'Wild Strawberry Cream Ice Cream', flavor: 'Strawberry Cream', description: 'Creamy, sweet ice cream churned with fresh Swat valley strawberries and fruit swirls.', price: 400, image: 'images/icecream.png' }
];

app.get('/api/menu', (req, res) => {
  res.json(MENU_ITEMS);
});

// 2. Place a new order
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, customer_email, customer_address, items, total_price, order_type } = req.body;

  if (!customer_name || !customer_phone || !customer_email || !customer_address || !items || !total_price || !order_type) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const itemsJson = JSON.stringify(items);
    const result = await dbQuery.run(
      `INSERT INTO orders (customer_name, customer_phone, customer_email, customer_address, items, total_price, order_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_phone, customer_email, customer_address, itemsJson, total_price, order_type]
    );

    const orderId = result.id;
    const itemsList = items.map(item => `<li>${item.name} (${item.flavor}) x ${item.quantity} - Rs. ${item.price * item.quantity}</li>`).join('');
    const timeMessage = order_type === 'Self Pickup' 
      ? 'Your order will be ready for pickup in 15–25 minutes.' 
      : `Your order will reach your saved address shortly at: ${customer_address}`;

    // Prepare Email HTML
    const emailHtml = `
      <div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #ebdcd0; background-color: #fffdf9; color: #2c1a0c;">
        <h1 style="color: #5c3a21; text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 12px;">The Velvet Whisk</h1>
        <p style="font-size: 16px;">Dear ${customer_name},</p>
        <p style="font-size: 16px;">Thank you for ordering with us! We have received your order and are preparing it with love.</p>
        
        <div style="background-color: #ffffff; padding: 16px; border: 1px solid #ebdcd0; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #5c3a21; margin-top: 0;">Order Details (Order ID: #${orderId})</h3>
          <p><strong>Order Type:</strong> ${order_type}</p>
          <p><strong>Status:</strong> Pending</p>
          <ul>
            ${itemsList}
          </ul>
          <h4 style="border-top: 1px solid #ebdcd0; padding-top: 8px; margin-bottom: 0;">Total Price: <span style="color: #d4af37; font-size: 18px;">Rs. ${total_price}</span></h4>
        </div>
        
        <p style="font-size: 15px; font-style: italic; background-color: #f8bbd0; color: #5c3a21; padding: 12px; border-radius: 4px; text-align: center;">
          ${timeMessage}
        </p>
        
        <p style="font-size: 14px; color: #6d5b4e; text-align: center; margin-top: 30px;">
          If you have any questions, call us at +92 300 1234567. Enjoy your sweet treats!<br>
          <strong>The Velvet Whisk, Mall Road, Lahore</strong>
        </p>
      </div>
    `;

    // Save email content to local file for offline verification
    const localEmailPath = path.join(emailLogsDir, `order_${orderId}.html`);
    fs.writeFileSync(localEmailPath, emailHtml);
    console.log(`[Backup] Order confirmation email saved locally to: ${localEmailPath}`);

    // Send email via Nodemailer
    let emailStatus = 'Saved locally';
    let previewUrl = null;

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: '"The Velvet Whisk" <orders@thevelvetwhisk.com>',
          to: customer_email,
          subject: `Order Confirmation #${orderId} - The Velvet Whisk`,
          html: emailHtml,
        });
        
        emailStatus = 'Sent successfully';
        console.log(`[Email] Message sent: %s`, info.messageId);
        
        // If Ethereal test account, get the preview URL
        if (nodemailer.getTestMessageUrl(info)) {
          previewUrl = nodemailer.getTestMessageUrl(info);
          emailStatus = 'Sent successfully (Ethereal test)';
          console.log(`[Email Preview Link] View Ethereal Email here: ${previewUrl}`);
        }
      } catch (mailErr) {
        console.error('[Email Error] Failed to send email via transporter:', mailErr.message);
        emailStatus = 'Sending failed, fallback to local log';
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: orderId,
      emailStatus: emailStatus,
      emailPreviewUrl: previewUrl,
      localEmailFile: localEmailPath
    });

  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// 3. Get all orders (for Admin Dashboard)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await dbQuery.all(`SELECT * FROM orders ORDER BY created_at DESC`);
    // Parse the JSON string items for each order
    const formattedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// 4. Update order status (for Admin Dashboard)
app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await dbQuery.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// 5. Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await dbQuery.all(`SELECT * FROM reviews ORDER BY created_at DESC`);
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// 6. Submit a review
app.post('/api/reviews', async (req, res) => {
  const { name, rating, comment } = req.body;

  if (!name || !rating || !comment) {
    return res.status(400).json({ error: 'All fields (name, rating, comment) are required' });
  }

  const parsedRating = parseInt(rating, 10);
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  try {
    const result = await dbQuery.run(
      `INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)`,
      [name, parsedRating, comment]
    );
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: result.id
    });
  } catch (error) {
    console.error('Error submitting review:', error.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Fallback to index.html for undefined routes (supporting SPA structure)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  The Velvet Whisk server is running on port ${PORT}`);
  console.log(`  Access the website: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
