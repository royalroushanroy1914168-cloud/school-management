const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { userId, password, role } = req.body;
    const result = await db.query(
      "SELECT * FROM users WHERE user_id = $1 AND role = $2 LIMIT 1",
      [userId, role]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    if (user.status !== "active" || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    delete user.password;
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, user_id, name, role, email, phone, status FROM users WHERE id = $1",
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
