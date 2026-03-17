const express = require("express");
const mysql = require("mysql2");
const app = express();

app.use(express.json());

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
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.get("/userdash", (req, res) => {
    res.sendFile(__dirname + "/userdash.html");    // your dashboard page
});
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
        if (err) {
            console.log(err);
            return res.json({ success: false });
        }
        res.json({ success: true });
    });
});

app.get("/liked-items", (req, res) => {
    const userId = 1; // same temp user
    const sql = "SELECT ItemID, LikedDate FROM Liked_closet WHERE UserID = ?";
    db.query(sql, [userId], (err, results) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, items: results });
    });
});