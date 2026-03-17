require("dotenv").config();

const express= require("express");
const mysql= require("mysql2");
const cors= require("cors");
const app= express();

//middleware (preps login req for route)

app.use(cors());
app.use(express.json());

//db connection
const db= mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
    console.log("connection failed",err);
    return;
     }
    console.log("connected");
});

///login route (recives login req, queries db)
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM USER WHERE user_email=? AND user_password=?";

    db.query(sql, [email, password], (err, result) => {
        if (err) {
            res.status(500).json({ message: "error" });
            return;
        }

        if (result.length > 0) {
            res.json({ success: true, message: "login successful" });
        } else {
            res.json({ success: false, message: "invalid username/password" });
        }
    });
});

app.get("/designer/analytics", (req, res) => {

    const salesQuery = `
        SELECT 
            DESIGNER.designer_id,
            DESIGNER.brand_name,
            COUNT(CONTAINS.item_id) AS items_sold,
            SUM(CLOTHING_ITEM.price) AS total_revenue
        FROM DESIGNER
        JOIN CLOTHING_ITEM
            ON DESIGNER.designer_id = CLOTHING_ITEM.designer_id
        JOIN CONTAINS
            ON CLOTHING_ITEM.item_id = CONTAINS.item_id
        WHERE DESIGNER.designer_id = 1
        GROUP BY DESIGNER.designer_id, DESIGNER.brand_name;
    `;

    const inventoryQuery = `
        SELECT 
            CLOTHING_ITEM.designer_id,
            SUM(CLOTHING_ITEM.inventory) AS inventory_left
        FROM CLOTHING_ITEM
        WHERE CLOTHING_ITEM.designer_id = 1
        GROUP BY CLOTHING_ITEM.designer_id;
    `;

    db.query(salesQuery, (err, salesResult) => {
        if (err) {
            res.status(500).json({ message: "error getting sales analytics" });
            return;
        }

        db.query(inventoryQuery, (err, inventoryResult) => {
            if (err) {
                res.status(500).json({ message: "error getting inventory analytics" });
                return;
            }

            res.json({
                designer_id: salesResult[0].designer_id,
                brand_name: salesResult[0].brand_name,
                items_sold: salesResult[0].items_sold,
                total_revenue: salesResult[0].total_revenue,
                inventory_left: inventoryResult[0].inventory_left
            });
        });
    });

});


app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
