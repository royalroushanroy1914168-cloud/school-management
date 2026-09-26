const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", authenticateToken, authorize("admin", "principal", "teacher"), async (req, res) => {
  try {
    const x = req.body;
    const result = await db.query(
      `INSERT INTO marks
       (student_id, exam_id, subject_id, obtained_marks, teacher_id)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (student_id, exam_id, subject_id)
       DO UPDATE SET obtained_marks=EXCLUDED.obtained_marks,
                     teacher_id=EXCLUDED.teacher_id,
                     updated_at=CURRENT_TIMESTAMP
       RETURNING id`,
      [x.studentId, x.examId, x.subjectId, x.obtainedMarks, req.user.id]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", authenticateToken, authorize("admin", "principal", "teacher"), async (req, res) => {
  const result = await db.query("SELECT * FROM marks ORDER BY id DESC");
  res.json({ marks: result.rows });
});

module.exports = router;
