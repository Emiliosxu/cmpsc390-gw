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

// Route 
app.get("/items", (req, res) => {
    const sql = `
        SELECT clothing_item.item_id, clothing_item.item_name, clothing_item.price,
               clothing_item.image_url, clothing_item.category, clothing_item.size_range,
               clothing_item.style, clothing_item.occasion,
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
    res.status(400).json({ message: "Designer ID required" });
});

// LIKE feature
app.post("/like-item", (req, res) => {
    if (!req.session.userId) {
        return res.json({ 
            success: false, 
            error: "not_logged_in",
            message: "Please log in to like items" 
        });
    }

    if (req.session.accountType === 'designer') {
        return res.json({ 
            success: false, 
            error: "designer_not_allowed",
            message: "Designers cannot like items" 
        });
    }

    const { itemId } = req.body;
    const userId = req.session.userId;

    const getClosetSql = `
        SELECT closet_id FROM SAVED_CLOSET WHERE user_id = ?
    `;

    db.query(getClosetSql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, error: "Database error" });
        }

        if (result.length === 0) {
            const getMaxIdSql = `SELECT MAX(closet_id) as maxId FROM SAVED_CLOSET`;
            
            db.query(getMaxIdSql, (err2, maxIdResult) => {
                if (err2) {
                    console.error(err2);
                    return res.json({ success: false, error: "Could not create closet" });
                }
                
                const newClosetId = (maxIdResult[0].maxId || 0) + 1;
                
                const createClosetSql = `
                    INSERT INTO SAVED_CLOSET (closet_id, user_id) 
                    VALUES (?, ?)
                `;
                
                db.query(createClosetSql, [newClosetId, userId], (err3, insertResult) => {
                    if (err3) {
                        console.error(err3);
                        return res.json({ success: false, error: "Could not create closet" });
                    }
                    
                    toggleLike(newClosetId, itemId, res);
                });
            });
        } else {
            const closetId = result[0].closet_id;
            toggleLike(closetId, itemId, res);
        }
    });
});

function toggleLike(closetId, itemId, res) {
    const checkSql = `
        SELECT * FROM SAVED_IN WHERE closet_id = ? AND item_id = ?
    `;

    db.query(checkSql, [closetId, itemId], (err2, exists) => {
        if (err2) {
            console.error(err2);
            return res.json({ success: false });
        }

        if (exists.length > 0) {
            const deleteSql = `
                DELETE FROM SAVED_IN WHERE closet_id = ? AND item_id = ?
            `;
            db.query(deleteSql, [closetId, itemId], (err3) => {
                if (err3) {
                    console.error(err3);
                    return res.json({ success: false });
                }
                return res.json({ success: true, liked: false });
            });
        } 
        else {
            const insertSql = `
                INSERT INTO SAVED_IN (closet_id, item_id)
                VALUES (?, ?)
            `;
            db.query(insertSql, [closetId, itemId], (err4) => {
                if (err4) {
                    console.error(err4);
                    return res.json({ success: false });
                }
                return res.json({ success: true, liked: true });
            });
        }
    });
}

//get liked Items
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
        FROM SAVED_IN
        JOIN SAVED_CLOSET ON SAVED_IN.closet_id = SAVED_CLOSET.closet_id
        JOIN clothing_item ON SAVED_IN.item_id = clothing_item.item_id
        WHERE SAVED_CLOSET.user_id = ?
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
    const sql = `SELECT MAX(user_id) as maxId FROM USER`;
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ maxId: result[0].maxId || 0 });
    });
});

// Get max designer ID
app.get("/designers/max-id", (req, res) => {
    const sql = `SELECT MAX(designer_id) as maxId FROM DESIGNER`;
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
        INSERT INTO USER (user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb)
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
        INSERT INTO DESIGNER (designer_id, brand_name, brand_email, designer_password)
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

// LOGIN ROUTE - Checks both USER and DESIGNER tables
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Email:", email);

    // First check if it's a user
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
            console.log("User found:", userResult[0].user_name);
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

        // If not found in USER, check DESIGNER table
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
                console.log("Designer found:", designerResult[0].user_name);
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

            console.log("No user or designer found with these credentials");
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
        SELECT item_id, item_name, category, style, occasion, price, 
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

// CREATE a new listing (clothing item)
app.post("/designer/projects", (req, res) => {
    const { 
        item_name, 
        category, 
        style, 
        occasion, 
        price, 
        inventory, 
        size_range, 
        designer_id, 
        image_url 
    } = req.body;
    
    // First get the max item_id to generate a new one
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
            (item_id, item_name, category, style, occasion, price, inventory, size_range, designer_id, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.query(sql, [
            newItemId,
            item_name,
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

// DELETE a listing (clothing item)
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

// Search designers by brand name or brand_email
app.get("/designers/search", (req, res) => {
    const { query } = req.query;

    const sql = `
        SELECT * FROM designer
        WHERE brand_name LIKE ? OR brand_email = ?
    `;

    const likeQuery = `%${query}%`;

    db.query(sql, [likeQuery, query], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));