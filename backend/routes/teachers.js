const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  try {
    const { name, userId, password, email, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (user_id, password, name, role, email, phone)
       VALUES ($1,$2,$3,'teacher',$4,$5) RETURNING id`,
      [userId, hash, name, email || null, phone || null]
    );
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({
      message: error.code === "23505" ? "User ID already exists" : error.message
    });
  }
});

router.get("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id,user_id,name,email,phone,status FROM users WHERE role='teacher' ORDER BY id DESC"
    );
    res.json({ teachers: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/deactivate", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const result = await db.query(
    "UPDATE users SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND role='teacher' RETURNING id",
    [req.params.id]
  );
  res.json({ success: true, id: result.rows[0]?.id });
});

router.patch("/:id/activate", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const result = await db.query(
    "UPDATE users SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND role='teacher' RETURNING id",
    [req.params.id]
  );
  res.json({ success: true, id: result.rows[0]?.id });
});

router.get("/my-classes", authenticateToken, authorize("teacher"), async (req, res) => {
  const result = await db.query(
    `SELECT ta.*, c.class_name, se.section_name, sub.name AS subject_name
     FROM teacher_assignments ta
     JOIN classes c ON c.id=ta.class_id
     JOIN sections se ON se.id=ta.section_id
     LEFT JOIN subjects sub ON sub.id=ta.subject_id
     WHERE ta.teacher_id=$1`,
    [req.user.id]
  );
  res.json({ assignments: result.rows });
});

router.get("/my-students", authenticateToken, authorize("teacher"), async (req, res) => {
  const result = await db.query(
    `SELECT DISTINCT st.*
     FROM students st
     JOIN classes c ON c.class_name=st.class_name
     JOIN sections se ON se.class_id=c.id AND se.section_name=st.section_name
     JOIN teacher_assignments ta ON ta.class_id=c.id AND ta.section_id=se.id
     WHERE ta.teacher_id=$1`,
    [req.user.id]
  );
  res.json({ students: result.rows });
});

module.exports = router;
