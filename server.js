require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.static(__dirname));

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-do-not-use-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

//db
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

//connection test
db.getConnection((err, connection) => {
    if (err) {
        console.log("DB error", err);
        return;
    }
    console.log("DB connected");
    connection.release();
});

// keep connection on
setInterval(function() {
    db.query('SELECT 1', (err) => {
        if (err) {
            console.log("MySQL ping error:", err);
        }
    });
}, 30000);

//multer config

// upload directories check
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir('/var/www/stylix/public/uploads/profiles');
ensureDir('/var/www/stylix/public/uploads/listings');

//multer for pfp pictures
const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/var/www/stylix/public/uploads/profiles');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const profileUpload = multer({ 
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

//multer for listings
const listingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/var/www/stylix/public/uploads/listings');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const listingUpload = multer({ 
    storage: listingStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// html files
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/index.html", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/shoptest.html", (req, res) => {
    res.sendFile(__dirname + "/shoptest.html");
});

app.get("/designerdash.html", (req, res) => {
    res.sendFile(__dirname + "/designerdash.html");
});

app.get("/userdash.html", (req, res) => {
    res.sendFile(__dirname + "/userdash.html");
});

app.get("/createproject.html", (req, res) => {
    res.sendFile(__dirname + "/createproject.html");
});

app.get("/messages.html", (req, res) => {
    res.sendFile(__dirname + "/messages.html");
});

app.get("/login.html", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});

app.get("/register.html", (req, res) => {
    res.sendFile(__dirname + "/register.html");
});

app.get("/aboutus.html", (req, res) => {
    res.sendFile(__dirname + "/aboutus.html");
});

app.get("/contact.html", (req, res) => {
    res.sendFile(__dirname + "/contact.html");
});

app.get("/checkout.html", (req, res) => {
    res.sendFile(__dirname + "/checkout.html");
});

app.get("/success.html", (req, res) => {
    res.sendFile(__dirname + "/success.html");
});

app.get("/cancel.html", (req, res) => {
    res.sendFile(__dirname + "/cancel.html");
});

app.get("/exploreDesigners.html", (req, res) => {
    res.sendFile(__dirname + "/exploreDesigners.html");
});

app.get("/searchDesignerProfile.html", (req, res) => {
    res.sendFile(__dirname + "/searchDesignerProfile.html");
});

app.get("/analytics.html", (req, res) => {
    res.sendFile(__dirname + "/analytics.html");
});

//profile routes 

//designer pfp upload
app.post("/upload-designer-profile", profileUpload.single('profile_pic'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
    const designerId = req.session.userId;
    
    const sql = `UPDATE designer SET profile_pic = ? WHERE designer_id = ?`;
    
    db.query(sql, [profilePicUrl, designerId], (err, result) => {
        if (err) {
            console.error("Error updating profile pic:", err);
            return res.status(500).json({ success: false, message: "Database error: " + err.message });
        }
        
        req.session.profilePic = profilePicUrl;
        res.json({ success: true, profilePicUrl: profilePicUrl });
    });
});

//user pfp upload
app.post("/upload-user-profile", profileUpload.single('profile_pic'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
    
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    const profilePicUrl = `/uploads/profiles/${req.file.filename}`;
    const userId = req.session.userId;
    
    const sql = `UPDATE user SET profile_pic = ? WHERE user_id = ?`;
    
    db.query(sql, [profilePicUrl, userId], (err, result) => {
        if (err) {
            console.error("Error updating profile pic:", err);
            return res.status(500).json({ success: false, message: "Database error: " + err.message });
        }
        
        req.session.profilePic = profilePicUrl;
        res.json({ success: true, profilePicUrl: profilePicUrl });
    });
});

//user pfp
app.get("/user-profile", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not logged in" });
    }
    
    const userId = req.session.userId;
    const userType = req.session.accountType;
    
    let sql;
    if (userType === 'designer') {
        sql = `SELECT designer_id as id, brand_name as name, profile_pic FROM designer WHERE designer_id = ?`;
    } else {
        sql = `SELECT user_id as id, user_name as name, profile_pic FROM user WHERE user_id = ?`;
    }
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Error fetching profile:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        res.json({ success: true, profile: result[0] });
    });
});

//designer search routes
app.get("/designer/search", async (req, res) => {
    const query = req.query.query;
    try {
        let sql = `SELECT designer_id, brand_name, brand_email, profile_pic FROM designer`;
        let params = [];
        if (query && query.trim() !== "") {
            sql += ` WHERE brand_name LIKE ? OR brand_email LIKE ?`;
            params.push(`%${query}%`, `%${query}%`);
        }
        const [rows] = await db.promise().query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/designer/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await db.promise().query(
            "SELECT designer_id, brand_name, brand_email, profile_pic FROM designer WHERE designer_id = ?",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Designer not found" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/designer/projects/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const [rows] = await db.promise().query(
            "SELECT item_id, item_name, description, category, style, occasion, price, inventory, size_range, image_url FROM clothing_item WHERE designer_id = ?",
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// item routes
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
            return res.status(500).json({ error: "Database error" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(result[0]);
    });
});

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
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

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
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ items: results });
    });
});

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

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.json({ success: false, message: "Error logging out" });
        }
        res.json({ success: true, message: "logged out" });
    });
});

app.get("/check-session", (req, res) => {
    if (req.session.userId) {
        res.json({ 
            loggedIn: true, 
            userId: req.session.userId,
            userName: req.session.userName,
            accountType: req.session.accountType || 'user',
            profilePic: req.session.profilePic || null
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// ============ LIKE ROUTES ============
app.post("/like-item", (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: false, error: "not_logged_in", message: "Please log in to like items" });
    }
    if (req.session.accountType === 'designer') {
        return res.json({ success: false, error: "designer_not_allowed", message: "Designers cannot like items" });
    }
    const { itemId } = req.body;
    const userId = req.session.userId;
    const getClosetSql = `SELECT closet_id FROM saved_closet WHERE user_id = ?`;
    db.query(getClosetSql, [userId], (err, result) => {
        if (err) {
            return res.json({ success: false, error: "Database error" });
        }
        if (result.length === 0) {
            const getMaxIdSql = `SELECT MAX(closet_id) as maxId FROM saved_closet`;
            db.query(getMaxIdSql, (err2, maxIdResult) => {
                if (err2) {
                    return res.json({ success: false, error: "Could not create closet" });
                }
                const newClosetId = (maxIdResult[0].maxId || 0) + 1;
                const createClosetSql = `INSERT INTO saved_closet (closet_id, user_id) VALUES (?, ?)`;
                db.query(createClosetSql, [newClosetId, userId], (err3) => {
                    if (err3) {
                        return res.json({ success: false, error: "Could not create closet" });
                    }
                    toggleLike(newClosetId, itemId, res);
                });
            });
        } else {
            toggleLike(result[0].closet_id, itemId, res);
        }
    });
});

function toggleLike(closetId, itemId, res) {
    const checkSql = `SELECT * FROM saved_in WHERE closet_id = ? AND item_id = ?`;
    db.query(checkSql, [closetId, itemId], (err2, exists) => {
        if (err2) {
            return res.json({ success: false });
        }
        if (exists.length > 0) {
            const deleteSql = `DELETE FROM saved_in WHERE closet_id = ? AND item_id = ?`;
            db.query(deleteSql, [closetId, itemId], (err3) => {
                if (err3) {
                    return res.json({ success: false });
                }
                return res.json({ success: true, liked: false });
            });
        } else {
            const insertSql = `INSERT INTO saved_in (closet_id, item_id) VALUES (?, ?)`;
            db.query(insertSql, [closetId, itemId], (err4) => {
                if (err4) {
                    return res.json({ success: false });
                }
                return res.json({ success: true, liked: true });
            });
        }
    });
}

app.get("/liked-items", (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: true, likedIds: [], loggedIn: false });
    }
    if (req.session.accountType === 'designer') {
        return res.json({ success: true, likedIds: [], loggedIn: true, accountType: 'designer' });
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
            return res.json({ success: false, likedIds: [] });
        }
        const likedIds = results.map(r => r.item_id);
        res.json({ success: true, likedIds, loggedIn: true });
    });
});

// user/designer signup
app.get("/users/max-id", (req, res) => {
    db.query("SELECT MAX(user_id) as maxId FROM user", (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ maxId: result[0].maxId || 0 });
    });
});

app.get("/designers/max-id", (req, res) => {
    db.query("SELECT MAX(designer_id) as maxId FROM designer", (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ maxId: result[0].maxId || 0 });
    });
});

app.post("/register-user", (req, res) => {
    const { user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb } = req.body;
    const sql = `INSERT INTO user (user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Email already exists or database error" });
        }
        res.json({ success: true });
    });
});

app.post("/register-designer", (req, res) => {
    const { designer_id, brand_name, brand_email, designer_password } = req.body;
    const sql = `INSERT INTO designer (designer_id, brand_name, brand_email, designer_password) VALUES (?, ?, ?, ?)`;
    db.query(sql, [designer_id, brand_name, brand_email, designer_password], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Email already exists or database error" });
        }
        res.json({ success: true });
    });
});

app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const userSql = `SELECT user_id, user_name, user_email, 'user' as account_type, profile_pic FROM user WHERE user_email = ? AND user_password = ?`;
    db.query(userSql, [email, password], (err, userResult) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }
        if (userResult && userResult.length > 0) {
            req.session.userId = userResult[0].user_id;
            req.session.userName = userResult[0].user_name;
            req.session.accountType = 'user';
            req.session.profilePic = userResult[0].profile_pic;
            return res.json({ success: true, message: "login successful", userId: userResult[0].user_id, userName: userResult[0].user_name, accountType: 'user', profilePic: userResult[0].profile_pic });
        }
        const designerSql = `SELECT designer_id, brand_name as user_name, brand_email, 'designer' as account_type, profile_pic FROM designer WHERE brand_email = ? AND designer_password = ?`;
        db.query(designerSql, [email, password], (err2, designerResult) => {
            if (err2) {
                return res.status(500).json({ message: "Database error" });
            }
            if (designerResult && designerResult.length > 0) {
                req.session.userId = designerResult[0].designer_id;
                req.session.userName = designerResult[0].user_name;
                req.session.accountType = 'designer';
                req.session.profilePic = designerResult[0].profile_pic;
                return res.json({ success: true, message: "login successful", userId: designerResult[0].designer_id, userName: designerResult[0].user_name, accountType: 'designer', profilePic: designerResult[0].profile_pic });
            }
            return res.json({ success: false, message: "Invalid email or password" });
        });
    });
});

//designer routes
app.get("/designer/projects/:designerId", (req, res) => {
    const designerId = req.params.designerId;
    const sql = `SELECT item_id, item_name, description, category, style, occasion, price, inventory, size_range, image_url, designer_id FROM clothing_item WHERE designer_id = ? ORDER BY item_id DESC`;
    db.query(sql, [designerId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json(results);
    });
});

app.post("/designer/projects", listingUpload.single('image'), (req, res) => {
    const { item_name, description, category, style, occasion, price, inventory, size_range, designer_id } = req.body;
    const image_url = req.file ? `/uploads/listings/${req.file.filename}` : null;
    const getMaxIdSql = `SELECT MAX(item_id) as maxId FROM clothing_item`;
    db.query(getMaxIdSql, (err, maxIdResult) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error generating item ID" });
        }
        const newItemId = (maxIdResult[0].maxId || 0) + 1;
        const sql = `INSERT INTO clothing_item (item_id, item_name, description, category, style, occasion, price, inventory, size_range, designer_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(sql, [newItemId, item_name, description || null, category, style, occasion || null, price, inventory, size_range, designer_id, image_url], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Error creating listing. " + err.message });
            }
            res.json({ success: true, message: "Listing created successfully", item_id: newItemId });
        });
    });
});

app.delete("/designer/projects/:itemId", (req, res) => {
    const itemId = req.params.itemId;
    db.query("DELETE FROM clothing_item WHERE item_id = ?", [itemId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error deleting listing" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }
        res.json({ success: true, message: "Listing deleted successfully" });
    });
});

// ============ ENHANCED DESIGNER ANALYTICS ============
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

// ============ MESSAGING ROUTES ============
app.get("/messages/inbox", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: "Not logged in" });
    const userId = req.session.userId;
    const userType = req.session.accountType;
    const sql = `SELECT m.*, CASE WHEN m.sender_id = ? AND m.sender_type = ? THEN m.receiver_id ELSE m.sender_id END AS other_id, CASE WHEN m.sender_id = ? AND m.sender_type = ? THEN m.receiver_type ELSE m.sender_type END AS other_type, SUM(CASE WHEN m.is_read = 0 AND m.receiver_id = ? AND m.receiver_type = ? THEN 1 ELSE 0 END) AS unread_count, m.message_text AS last_message, m.sent_at AS last_time FROM messages m INNER JOIN (SELECT MAX(message_id) AS max_id FROM messages WHERE (sender_id = ? AND sender_type = ?) OR (receiver_id = ? AND receiver_type = ?) GROUP BY LEAST(CONCAT(sender_id,'-',sender_type), CONCAT(receiver_id,'-',receiver_type)), GREATEST(CONCAT(sender_id,'-',sender_type), CONCAT(receiver_id,'-',receiver_type))) latest ON m.message_id = latest.max_id GROUP BY m.message_id ORDER BY m.sent_at DESC`;
    db.query(sql, [userId, userType, userId, userType, userId, userType, userId, userType, userId, userType], async (err, results) => {
        if (err) { return res.status(500).json({ success: false }); }
        const conversations = await Promise.all(results.map(row => new Promise((resolve) => {
            const nameSql = row.other_type === 'designer' ? `SELECT brand_name AS name, profile_pic FROM designer WHERE designer_id = ?` : `SELECT user_name AS name, profile_pic FROM user WHERE user_id = ?`;
            db.query(nameSql, [row.other_id], (err2, nameResult) => {
                resolve({ other_id: row.other_id, other_type: row.other_type, other_name: nameResult && nameResult[0] ? nameResult[0].name : "Unknown", other_pic: nameResult && nameResult[0] ? nameResult[0].profile_pic : null, last_message: row.last_message, last_time: row.last_time, unread_count: row.unread_count || 0 });
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
    const sql = `SELECT * FROM messages WHERE (sender_id = ? AND sender_type = ? AND receiver_id = ? AND receiver_type = ?) OR (sender_id = ? AND sender_type = ? AND receiver_id = ? AND receiver_type = ?) ORDER BY sent_at ASC`;
    db.query(sql, [userId, userType, otherId, otherType, otherId, otherType, userId, userType], (err, results) => {
        if (err) { return res.status(500).json({ success: false }); }
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
        if (err) { return res.status(500).json({ success: false }); }
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
        if (err) { return res.status(500).json({ success: false }); }
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
        if (err) { return res.status(500).json({ success: false }); }
        if (result.affectedRows === 0) return res.status(403).json({ success: false, message: "Not authorized" });
        res.json({ success: true });
    });
});

app.get("/messages/recipients", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: "Not logged in" });
    const type = req.query.type;
    const currentId = req.session.userId;
    const currentType = req.session.accountType;
    let sql, params = [];
    if (type === "designer") {
        if (currentType === "designer") {
            sql = `SELECT designer_id AS id, brand_name AS name, profile_pic FROM designer WHERE designer_id != ?`;
            params = [currentId];
        } else {
            sql = `SELECT designer_id AS id, brand_name AS name, profile_pic FROM designer`;
        }
    } else if (type === "user") {
        if (currentType === "user") {
            sql = `SELECT user_id AS id, user_name AS name, profile_pic FROM user WHERE user_id != ?`;
            params = [currentId];
        } else {
            sql = `SELECT user_id AS id, user_name AS name, profile_pic FROM user`;
        }
    } else {
        return res.status(400).json({ success: false, message: "Invalid type" });
    }
    db.query(sql, params, (err, results) => {
        if (err) { return res.status(500).json({ success: false }); }
        res.json({ success: true, recipients: results });
    });
});

//start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));