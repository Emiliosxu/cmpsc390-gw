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
