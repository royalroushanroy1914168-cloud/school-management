const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const params = [];
    let sql = "SELECT * FROM notices";
    if (req.query.published === "true") {
      sql += " WHERE published=true";
    }
    sql += " ORDER BY id DESC";

    const result = await db.query(sql, params);
    res.json({ notices: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  try {
    const x = req.body;
    const result = await db.query(
      `INSERT INTO notices (title,description,published,published_at,created_by)
       VALUES ($1,$2,$3,CASE WHEN $3=true THEN CURRENT_TIMESTAMP ELSE NULL END,$4)
       RETURNING id`,
      [x.title, x.description || null, Boolean(x.published), req.user.id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
