const express = require("express");
const mysql = require("mysql2");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.static(__dirname + "/public"));
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "keni",
    database: "dbliked"
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL Connected");
});

// Pages
app.get("/", (req, res) => {
    const sql = "SELECT * FROM Items";
    db.query(sql, (err, results) => {
        if (err) return res.send("Error loading items.");

        const dynamicCards = results.map(item => `
            <div class="card" data-id="${item.ItemID}">
                <img src="${item.ImagePath}" alt="${item.DesignerName}" class="card-img">
                <h3 class="designer-name">Designer: ${item.DesignerName}</h3>
                <div class="card-buttons">
                    <button class="btn">Add to Cart</button>
                    <button class="btn">View</button>
                    <button class="btn like-btn">Like</button>
                </div>
            </div>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stylix</title>
                <link rel="stylesheet" href="/styles.css">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Raleway:wght@400;600&display=swap" rel="stylesheet">
                <script src="https://code.jquery.com/jquery-3.4.1.slim.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.min.js"></script>
            </head>
            <body>
                <nav class="navbar">
                    <a href="/">Home</a> |
                    <a href="/about">About Us</a> |
                    <a href="/contact">Contact Us</a> |
                    <a href="/login">Login</a> |
                    <a href="/register">Register</a> |
                    <a href="/userdash">User Dashboard</a> |
                    <a href="/designerdash">Designer Dashboard</a>
                </nav>

                <div class="chrome-effect">
                    <p><h1>Welcome to Stylix</h1><br>
                    A fashion company that designers and users can access a range of stylish clothing and accessories.
                    </p>
                </div>

                <div id="carouselExampleSlidesOnly" class="carousel slide" data-ride="carousel">
                    <div class="carousel-inner">
                        <div class="carousel-item active">
                            <img class="d-block w-100" src="clothes.jpg" alt="First slide">
                        </div>
                        <div class="carousel-item">
                            <img class="d-block w-100" src="clothes2.jpg" alt="Second slide">
                        </div>
                        <div class="carousel-item">
                            <img class="d-block w-100" src="clothes3.jpg" alt="Third slide">
                        </div>
                    </div>
                </div>

                <section class="content-grid">
                    <!-- Hardcoded cards -->
                    <div class="card" data-id="1">
                        <img src="clothes2.jpg" alt="Item 1" class="card-img">
                        <h3 class="designer-name">Designer: Alice</h3>
                        <div class="card-buttons">
                            <button class="btn">Add to Cart</button>
                            <button class="btn">View</button>
                            <button class="btn like-btn">Like</button>
                        </div>
                    </div>
                    <div class="card" data-id="2">
                        <img src="clothes3.jpg" alt="Item 2" class="card-img">
                        <h3 class="designer-name">Designer: Bob</h3>
                        <div class="card-buttons">
                            <button class="btn">Add to Cart</button>
                            <button class="btn">View</button>
                            <button class="btn like-btn">Like</button>
                        </div>
                    </div>
                    <div class="card" data-id="3">
                        <img src="clothes4.jpg" alt="Item 3" class="card-img">
                        <h3 class="designer-name">Designer: Charlie</h3>
                        <div class="card-buttons">
                            <button class="btn">Add to Cart</button>
                            <button class="btn">View</button>
                            <button class="btn like-btn">Like</button>
                        </div>
                    </div>
                    <div class="card" data-id="4">
                        <img src="clothes5.jpg" alt="Item 4" class="card-img">
                        <h3 class="designer-name">Designer: David</h3>
                        <div class="card-buttons">
                            <button class="btn">Add to Cart</button>
                            <button class="btn">View</button>
                            <button class="btn like-btn">Like</button>
                        </div>
                    </div>
                    <div class="card" data-id="5">
                        <img src="clothes6.jpg" alt="Item 5" class="card-img">
                        <h3 class="designer-name">Designer: Eve</h3>
                        <div class="card-buttons">
                            <button class="btn">Add to Cart</button>
                            <button class="btn">View</button>
                            <button class="btn like-btn">Like</button>
                        </div>
                    </div>

                    <!-- Dynamic cards from database -->
                    ${dynamicCards}
                </section>

                <footer class="footer">
                    <p>&copy; 2026 My Explore Page</p>
                </footer>

                <script>
                    document.addEventListener("click", function (e) {
                        if (!e.target.classList.contains("like-btn")) return;
                        const card = e.target.closest(".card");
                        const itemId = card.dataset.id;
                        fetch("/like-item", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ itemId: itemId })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                alert("Liked successfully!");
                            } else {
                                alert("Error saving like.");
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `);
    });
});

app.get("/about", (req, res) => res.sendFile(__dirname + "/aboutus.html"));
app.get("/contact", (req, res) => res.sendFile(__dirname + "/contact.html"));
app.get("/login", (req, res) => res.sendFile(__dirname + "/login.html"));
app.get("/register", (req, res) => res.sendFile(__dirname + "/register.html"));
app.get("/userdash", (req, res) => res.sendFile(__dirname + "/userdash.html"));
app.get("/designerdash", (req, res) => res.sendFile(__dirname + "/designerdash.html"));

// API routes
app.post("/like-item", (req, res) => {
    const { itemId } = req.body;
    const userId = 1;
    const sql = `
        INSERT INTO Liked_closet (UserID, ItemID)
        SELECT ?, ? FROM DUAL
        WHERE NOT EXISTS (
            SELECT 1 FROM Liked_closet WHERE UserID = ? AND ItemID = ?
        )
    `;
    db.query(sql, [userId, itemId, userId, itemId], (err, result) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

app.get("/liked-items", (req, res) => {
    const userId = 1;
    const sql = "SELECT ItemID, LikedDate FROM Liked_closet WHERE UserID = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, items: results });
    });
});

app.post("/add-item", (req, res) => {
    const { designerName, imagePath } = req.body;
    const sql = `INSERT INTO Items (DesignerName, ImagePath) VALUES (?, ?)`;
    db.query(sql, [designerName, imagePath], (err, result) => {
        if (err) return res.send("Error adding item.");
        res.redirect("/");
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});