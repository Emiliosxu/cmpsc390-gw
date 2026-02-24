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

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});