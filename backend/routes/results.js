const express = require("express");
const db = require("../config/db");

const router = express.Router();

function gradeFromPercentage(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

router.get("/search", async (req, res) => {
  try {
    const admissionNumber = req.query.admissionNumber;
    const rollNumber = req.query.rollNumber;

    if (!admissionNumber && !rollNumber) {
      return res.status(400).json({ message: "Admission or roll number required" });
    }

    const field = admissionNumber ? "admission_number" : "roll_number";
    const value = admissionNumber || rollNumber;

    const studentResult = await db.query(
      `SELECT * FROM students WHERE ${field}=$1 AND status='active' LIMIT 1`,
      [value]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ message: "Result not found" });
    }

    const student = studentResult.rows[0];

    const marksResult = await db.query(
      `SELECT e.name AS exam_name,
              e.academic_session,
              sub.name AS subject_name,
              m.obtained_marks,
              m.max_marks
       FROM marks m
       JOIN exams e ON e.id=m.exam_id AND e.published=true
       JOIN subjects sub ON sub.id=m.subject_id
       WHERE m.student_id=$1
       ORDER BY e.id DESC, sub.name`,
      [student.id]
    );

    const results = marksResult.rows.map(row => ({
      examName: row.exam_name,
      academicSession: row.academic_session,
      subject: row.subject_name,
      obtainedMarks: Number(row.obtained_marks),
      maxMarks: Number(row.max_marks)
    }));

    const totalMax = results.reduce((sum, r) => sum + r.maxMarks, 0);
    const totalObtained = results.reduce((sum, r) => sum + r.obtainedMarks, 0);
    const percentage = totalMax ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

    res.json({
      student: {
        studentName: student.student_name,
        admissionNumber: student.admission_number,
        rollNumber: student.roll_number,
        className: student.class_name,
        section: student.section_name
      },
      results,
      summary: {
        totalMarks: totalMax,
        obtainedMarks: totalObtained,
        percentage,
        grade: gradeFromPercentage(percentage),
        result: results.length && results.every(r => r.obtainedMarks >= r.maxMarks * 0.33) ? "PASS" : "FAIL"
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
