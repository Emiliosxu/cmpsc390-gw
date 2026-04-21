require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const session = require("express-session");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // HTML file folder

// Add session middleware with secret from .env
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-do-not-use-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// db
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.log("DB error", err);
        return;
    }
    console.log("DB connected");
});

// GET all items (UPDATED with description)
app.get("/items", (req, res) => {
    const sql = `
        SELECT clothing_item.item_id, clothing_item.item_name, clothing_item.description,
               clothing_item.price, clothing_item.image_url, clothing_item.category, 
               clothing_item.size_range, clothing_item.style, clothing_item.occasion,
               designer.brand_name
        FROM clothing_item
        JOIN designer ON clothing_item.designer_id = designer.designer_id
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: "DB error" });
        }
        res.json(results);
    });
});

// GET single item by ID (NEW)
app.get("/item/:id", (req, res) => {
    const itemId = req.params.id;
    
    const sql = `
        SELECT clothing_item.*, designer.brand_name
        FROM clothing_item
        JOIN designer ON clothing_item.designer_id = designer.designer_id
        WHERE clothing_item.item_id = ?
    `;
    
    db.query(sql, [itemId], (err, result) => {
        if (err) {
            console.error("Error fetching item:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(result[0]);
    });
});

// SEARCH ROUTE
app.get("/search", (req, res) => {
    const q = req.query.q || "";

    if (q.trim() === "") {
        const sql = `
            SELECT clothing_item.*, designer.brand_name
            FROM clothing_item
            JOIN designer ON clothing_item.designer_id = designer.designer_id
        `;
        db.query(sql, (err, results) => {
            if (err) {
                console.error("Search error:", err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json(results);
        });
        return;
    }

    const sql = `
        SELECT clothing_item.*, designer.brand_name
        FROM clothing_item
        JOIN designer ON clothing_item.designer_id = designer.designer_id
        WHERE clothing_item.style LIKE ?
        OR clothing_item.occasion LIKE ?
        OR clothing_item.item_name LIKE ?
    `;

    const search = `%${q}%`;

    db.query(sql, [search, search, search], (err, results) => {
        if (err) {
            console.error("Search error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        res.json(results);
    });
});

// gets cart items details
app.post("/get-cart-items", (req, res) => {
    const { cart } = req.body;

    if (!cart || cart.length === 0) {
        return res.json({ items: [] });
    }

    const sql = `
        SELECT clothing_item.item_id, clothing_item.item_name, clothing_item.price,
               clothing_item.image_url, designer.brand_name
        FROM clothing_item
        JOIN designer ON clothing_item.designer_id = designer.designer_id
        WHERE clothing_item.item_id IN (?)
    `;

    db.query(sql, [cart], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ items: results });
    });
});

// Creates Stripe checkout session
app.post("/create-checkout-session", (req, res) => {
    const { cart } = req.body;

    if (!cart || cart.length === 0) return res.status(400).json({ error: "Cart empty" });

    const sql = `
        SELECT item_id, item_name, price
        FROM clothing_item
        WHERE item_id IN (?)
    `;

    db.query(sql, [cart], async (err, results) => {
        if (err) return res.status(500).json({ error: "DB error" });

        try {
            const line_items = results.map(item => ({
                price_data: {
                    currency: "usd",
                    product_data: { name: item.item_name },
                    unit_amount: Math.round(item.price * 100)
                },
                quantity: 1
            }));

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items,
                success_url: "http://localhost:3000/success.html",
                cancel_url: "http://localhost:3000/cancel.html"
            });

            res.json({ sessionId: session.id, items: results });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
});

// logout route
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: "Error logging out" });
        }
        res.json({ success: true, message: "logged out" });
    });
});

// check session route
app.get("/check-session", (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            userId: req.session.userId,
            userName: req.session.userName,
            accountType: req.session.accountType || 'user'
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// designer analytics
app.get("/designer/analytics", (req, res) => {
    if (!req.session.userId || req.session.accountType !== 'designer') {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const designerId = req.session.userId;

    const categoryQuery = `
        SELECT ci.category, COUNT(c.item_id) AS sold
        FROM contains c
        JOIN clothing_item ci ON c.item_id = ci.item_id
        WHERE ci.designer_id = ?
        GROUP BY ci.category
    `;

    const revenueQuery = `
        SELECT ci.item_name, ROUND(SUM(ci.price), 2) AS revenue, COUNT(c.item_id) AS sold
        FROM contains c
        JOIN clothing_item ci ON c.item_id = ci.item_id
        WHERE ci.designer_id = ?
        GROUP BY ci.item_id, ci.item_name
        ORDER BY revenue DESC
        LIMIT 8
    `;

    const inventoryQuery = `
        SELECT category, SUM(inventory) AS total_inventory
        FROM clothing_item
        WHERE designer_id = ?
        GROUP BY category
    `;

    const totalsQuery = `
        SELECT COUNT(c.item_id) AS items_sold, COALESCE(SUM(ci.price), 0) AS total_revenue
        FROM contains c
        JOIN clothing_item ci ON c.item_id = ci.item_id
        WHERE ci.designer_id = ?
    `;

    const inventoryLeftQuery = `
        SELECT COALESCE(SUM(inventory), 0) AS inventory_left
        FROM clothing_item WHERE designer_id = ?
    `;

    db.query(totalsQuery, [designerId], (err, totals) => {
        if (err) return res.status(500).json({ success: false });
        db.query(inventoryLeftQuery, [designerId], (err2, invLeft) => {
            if (err2) return res.status(500).json({ success: false });
            db.query(categoryQuery, [designerId], (err3, categoryData) => {
                if (err3) return res.status(500).json({ success: false });
                db.query(revenueQuery, [designerId], (err4, revenueData) => {
                    if (err4) return res.status(500).json({ success: false });
                    db.query(inventoryQuery, [designerId], (err5, inventoryData) => {
                        if (err5) return res.status(500).json({ success: false });
                        res.json({
                            success: true,
                            items_sold: totals[0].items_sold || 0,
                            total_revenue: totals[0].total_revenue || 0,
                            inventory_left: invLeft[0].inventory_left || 0,
                            by_category: categoryData,
                            by_revenue: revenueData,
                            by_inventory: inventoryData
                        });
                    });
                });
            });
        });
    });
});

// GET LIKED ITEMS
app.get("/liked-items", (req, res) => {
    if (!req.session.userId) {
        return res.json({ 
            success: true, 
            likedIds: [],
            loggedIn: false 
        });
    }

    if (req.session.accountType === 'designer') {
        return res.json({ 
            success: true, 
            likedIds: [],
            loggedIn: true,
            accountType: 'designer'
        });
    }

    const userId = req.session.userId;

    const sql = `
        SELECT clothing_item.item_id
        FROM saved_in
        JOIN saved_closet ON saved_in.closet_id = saved_closet.closet_id
        JOIN clothing_item ON saved_in.item_id = clothing_item.item_id
        WHERE saved_closet.user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, likedIds: [] });
        }

        const likedIds = results.map(r => r.item_id);
        res.json({ success: true, likedIds, loggedIn: true });
    });
});

// Get max user ID
app.get("/users/max-id", (req, res) => {
    const sql = `SELECT MAX(user_id) as maxId FROM user`;
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ maxId: result[0].maxId || 0 });
    });
});

// Get max designer ID
app.get("/designers/max-id", (req, res) => {
    const sql = `SELECT MAX(designer_id) as maxId FROM designer`;
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ maxId: result[0].maxId || 0 });
    });
});

// Register a new user
app.post("/register-user", (req, res) => {
    const { user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb } = req.body;
    
    const sql = `
        INSERT INTO user (user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb], (err, result) => {
        if (err) {
            console.error("Registration error:", err);
            return res.status(500).json({ success: false, message: "Email already exists or database error" });
        }
        res.json({ success: true });
    });
});

// Register a new designer
app.post("/register-designer", (req, res) => {
    const { designer_id, brand_name, brand_email, designer_password } = req.body;
    
    const sql = `
        INSERT INTO designer (designer_id, brand_name, brand_email, designer_password)
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(sql, [designer_id, brand_name, brand_email, designer_password], (err, result) => {
        if (err) {
            console.error("Registration error:", err);
            return res.status(500).json({ success: false, message: "Email already exists or database error" });
        }
        res.json({ success: true });
    });
});

// LOGIN ROUTE
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const userSql = `
        SELECT user_id, user_name, user_email, 'user' as account_type 
        FROM user 
        WHERE user_email = ? AND user_password = ?
    `;

    db.query(userSql, [email, password], (err, userResult) => {
        if (err) {
            console.error("User login error:", err);
            return res.status(500).json({ message: "Database error" });
        }
        
        if (userResult && userResult.length > 0) {
            req.session.userId = userResult[0].user_id;
            req.session.userName = userResult[0].user_name;
            req.session.accountType = 'user';
            
            return res.json({ 
                success: true, 
                message: "login successful",
                userId: userResult[0].user_id,
                userName: userResult[0].user_name,
                accountType: 'user'
            });
        }

        const designerSql = `
            SELECT designer_id, brand_name as user_name, brand_email, 'designer' as account_type 
            FROM designer 
            WHERE brand_email = ? AND designer_password = ?
        `;

        db.query(designerSql, [email, password], (err2, designerResult) => {
            if (err2) {
                console.error("Designer login error:", err2);
                return res.status(500).json({ message: "Database error" });
            }
            
            if (designerResult && designerResult.length > 0) {
                req.session.userId = designerResult[0].designer_id;
                req.session.userName = designerResult[0].user_name;
                req.session.accountType = 'designer';
                
                return res.json({ 
                    success: true, 
                    message: "login successful",
                    userId: designerResult[0].designer_id,
                    userName: designerResult[0].user_name,
                    accountType: 'designer'
                });
            }

            return res.json({ 
                success: false, 
                message: "Invalid email or password" 
            });
        });
    });
});

// Designer Projects Routes
app.get("/designer/projects/:designerId", (req, res) => {
    const designerId = req.params.designerId;
    
    const sql = `
        SELECT item_id, item_name, description, category, style, occasion, price, 
               inventory, size_range, image_url, designer_id
        FROM clothing_item
        WHERE designer_id = ?
        ORDER BY item_id DESC
    `;
    
    db.query(sql, [designerId], (err, results) => {
        if (err) {
            console.error("Error fetching designer projects:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Database error" 
            });
        }
        
        res.json(results);
    });
});

// CREATE a new project (UPDATED with description)
app.post("/designer/projects", (req, res) => {
    const { 
        item_name, 
        description,
        category, 
        style, 
        occasion, 
        price, 
        inventory, 
        size_range, 
        designer_id, 
        image_url 
    } = req.body;
    
    const getMaxIdSql = `SELECT MAX(item_id) as maxId FROM clothing_item`;
    
    db.query(getMaxIdSql, (err, maxIdResult) => {
        if (err) {
            console.error("Error getting max ID:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Error generating item ID" 
            });
        }
        
        const newItemId = (maxIdResult[0].maxId || 0) + 1;
        
        const sql = `
            INSERT INTO clothing_item 
            (item_id, item_name, description, category, style, occasion, price, inventory, size_range, designer_id, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(sql, [
            newItemId,
            item_name,
            description || null,
            category,
            style,
            occasion || null,
            price,
            inventory,
            size_range,
            designer_id,
            image_url
        ], (err, result) => {
            if (err) {
                console.error("Error creating project:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error creating listing. " + err.message 
                });
            }
            
            res.json({ 
                success: true, 
                message: "Listing created successfully", 
                item_id: newItemId 
            });
        });
    });
});

// DELETE a project
app.delete("/designer/projects/:itemId", (req, res) => {
    const itemId = req.params.itemId;
    
    const sql = `DELETE FROM clothing_item WHERE item_id = ?`;
    
    db.query(sql, [itemId], (err, result) => {
        if (err) {
            console.error("Error deleting project:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Error deleting listing" 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Listing not found" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Listing deleted successfully" 
        });
    });
});



app.get("/messages/inbox", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: "Not logged in" });

    const userId = req.session.userId;
    const userType = req.session.accountType;

    const sql = `
        SELECT m.*,
            CASE WHEN m.sender_id = ? AND m.sender_type = ? THEN m.receiver_id ELSE m.sender_id END AS other_id,
            CASE WHEN m.sender_id = ? AND m.sender_type = ? THEN m.receiver_type ELSE m.sender_type END AS other_type,
            SUM(CASE WHEN m.is_read = 0 AND m.receiver_id = ? AND m.receiver_type = ? THEN 1 ELSE 0 END) AS unread_count,
            m.message_text AS last_message,
            m.sent_at AS last_time
        FROM messages m
        INNER JOIN (
            SELECT MAX(message_id) AS max_id
            FROM messages
            WHERE (sender_id = ? AND sender_type = ?) OR (receiver_id = ? AND receiver_type = ?)
            GROUP BY
                LEAST(CONCAT(sender_id,'-',sender_type), CONCAT(receiver_id,'-',receiver_type)),
                GREATEST(CONCAT(sender_id,'-',sender_type), CONCAT(receiver_id,'-',receiver_type))
        ) latest ON m.message_id = latest.max_id
        GROUP BY m.message_id
        ORDER BY m.sent_at DESC
    `;

    db.query(sql, [
        userId, userType, userId, userType, userId, userType,
        userId, userType, userId, userType
    ], async (err, results) => {
        if (err) { console.error("Inbox error:", err); return res.status(500).json({ success: false }); }

        const conversations = await Promise.all(results.map(row => new Promise((resolve) => {
            const nameSql = row.other_type === 'designer'
                ? `SELECT brand_name AS name FROM designer WHERE designer_id = ?`
                : `SELECT user_name AS name FROM user WHERE user_id = ?`;
            db.query(nameSql, [row.other_id], (err2, nameResult) => {
                resolve({
                    other_id: row.other_id,
                    other_type: row.other_type,
                    other_name: nameResult && nameResult[0] ? nameResult[0].name : "Unknown",
                    last_message: row.last_message,
                    last_time: row.last_time,
                    unread_count: row.unread_count || 0
                });
            });
        })));

        res.json({ success: true, conversations });
    });
});


app.get("/messages/conversation", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false });

    const userId = req.session.userId;
    const userType = req.session.accountType;
    const otherId = parseInt(req.query.other_id);
    const otherType = req.query.other_type;

    const sql = `
        SELECT * FROM messages
        WHERE (sender_id = ? AND sender_type = ? AND receiver_id = ? AND receiver_type = ?)
           OR (sender_id = ? AND sender_type = ? AND receiver_id = ? AND receiver_type = ?)
        ORDER BY sent_at ASC
    `;

    db.query(sql, [userId, userType, otherId, otherType, otherId, otherType, userId, userType], (err, results) => {
        if (err) { console.error("Conversation error:", err); return res.status(500).json({ success: false }); }
        res.json({ success: true, messages: results });
    });
});


app.post("/messages/send", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: "Not logged in" });

    const senderId = req.session.userId;
    const senderType = req.session.accountType;
    const { receiver_id, receiver_type, message_text } = req.body;

    if (!receiver_id || !receiver_type || !message_text || !message_text.trim()) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const sql = `INSERT INTO messages (sender_id, sender_type, receiver_id, receiver_type, message_text) VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [senderId, senderType, receiver_id, receiver_type, message_text.trim()], (err, result) => {
        if (err) { console.error("Send error:", err); return res.status(500).json({ success: false }); }
        res.json({ success: true, message_id: result.insertId });
    });
});


app.post("/messages/mark-read", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false });

    const userId = req.session.userId;
    const userType = req.session.accountType;
    const { sender_id, sender_type } = req.body;

    const sql = `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND sender_type = ? AND receiver_id = ? AND receiver_type = ? AND is_read = 0`;

    db.query(sql, [sender_id, sender_type, userId, userType], (err) => {
        if (err) { console.error("Mark read error:", err); return res.status(500).json({ success: false }); }
        res.json({ success: true });
    });
});


app.delete("/messages/delete/:messageId", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false });

    const messageId = req.params.messageId;
    const userId = req.session.userId;
    const userType = req.session.accountType;

    const sql = `DELETE FROM messages WHERE message_id = ? AND sender_id = ? AND sender_type = ?`;

    db.query(sql, [messageId, userId, userType], (err, result) => {
        if (err) { console.error("Delete message error:", err); return res.status(500).json({ success: false }); }
        if (result.affectedRows === 0) return res.status(403).json({ success: false, message: "Not authorized" });
        res.json({ success: true });
    });
});


app.get("/messages/recipients", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: "Not logged in" });

    const type = req.query.type;
    const currentId = req.session.userId;
    const currentType = req.session.accountType;

    let sql;
    let params = [];

    if (type === "designer") {
        if (currentType === "designer") {
            sql = `SELECT designer_id AS id, brand_name AS name FROM designer WHERE designer_id != ?`;
            params = [currentId];
        } else {
            sql = `SELECT designer_id AS id, brand_name AS name FROM designer`;
        }
    } else if (type === "user") {
        if (currentType === "user") {
            sql = `SELECT user_id AS id, user_name AS name FROM user WHERE user_id != ?`;
            params = [currentId];
        } else {
            sql = `SELECT user_id AS id, user_name AS name FROM user`;
        }
    } else {
        return res.status(400).json({ success: false, message: "Invalid type" });
    }

    db.query(sql, params, (err, results) => {
        if (err) { console.error("Recipients error:", err); return res.status(500).json({ success: false }); }
        res.json({ success: true, recipients: results });
    });
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));