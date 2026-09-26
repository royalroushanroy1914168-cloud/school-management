const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, authorize("admin"), async (req, res) => {
  try {
    const { name, userId, password, email, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (user_id,password,name,role,email,phone)
       VALUES ($1,$2,$3,'principal',$4,$5) RETURNING id`,
      [userId, hash, name, email || null, phone || null]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({
      message: error.code === "23505" ? "User ID already exists" : error.message
    });
  }
});

router.get("/", authenticateToken, authorize("admin"), async (req, res) => {
  const result = await db.query(
    "SELECT id,user_id,name,email,phone,status FROM users WHERE role='principal' ORDER BY id DESC"
  );
  res.json({ principals: result.rows });
});

module.exports = router;
