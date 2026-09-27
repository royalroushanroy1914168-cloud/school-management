const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, authorize("admin", "principal", "teacher"), async (req, res) => {
  try {
    const x = req.body;
    const teacherId = req.user.role === "teacher" ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO attendance
       (student_id, subject_id, teacher_id, attendance_date, status)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (student_id, subject_id, attendance_date)
       DO UPDATE SET status=EXCLUDED.status, teacher_id=EXCLUDED.teacher_id
       RETURNING id`,
      [x.studentId, x.subjectId || null, teacherId, x.attendanceDate, x.status]
    );

    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/my", authenticateToken, authorize("teacher"), async (req, res) => {
  const result = await db.query(
    `SELECT a.*, st.student_name
     FROM attendance a
     JOIN students st ON st.id=a.student_id
     WHERE a.teacher_id=$1
     ORDER BY a.attendance_date DESC`,
    [req.user.id]
  );
  res.json({ attendance: result.rows });
});

router.get("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const result = await db.query(
    `SELECT a.*, st.student_name, st.admission_number
     FROM attendance a
     JOIN students st ON st.id=a.student_id
     ORDER BY a.attendance_date DESC`
  );
  res.json({ attendance: result.rows });
});

module.exports = router;
