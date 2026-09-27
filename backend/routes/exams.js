const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  try {
    const x = req.body;
    const result = await db.query(
      `INSERT INTO exams (name,academic_session,start_date,end_date,created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [x.name, x.academicSession, x.startDate || null, x.endDate || null, req.user.id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", authenticateToken, authorize("admin", "principal", "teacher"), async (req, res) => {
  const result = await db.query("SELECT * FROM exams ORDER BY id DESC");
  res.json({ exams: result.rows });
});

module.exports = router;
