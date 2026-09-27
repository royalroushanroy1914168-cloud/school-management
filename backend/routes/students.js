const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

async function nextAdmissionNumber(client) {
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;
  const result = await client.query(
    "SELECT admission_number FROM students WHERE admission_number LIKE $1 ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  const next = result.rows.length
    ? Number(result.rows[0].admission_number.split("-")[2]) + 1
    : 1;

  return `${prefix}${String(next).padStart(5, "0")}`;
}

router.post("/admission", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const client = await db.connect();
  try {
    const x = req.body;
    await client.query("BEGIN");

    const admissionNumber = await nextAdmissionNumber(client);

    const result = await client.query(
      `INSERT INTO students
       (admission_number, student_name, father_name, mother_name, dob, gender,
        photo_url, address, mobile, email, academic_session, class_name,
        section_name, roll_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        admissionNumber,
        x.studentName,
        x.fatherName,
        x.motherName,
        x.dob,
        x.gender,
        x.photo || null,
        x.address,
        x.mobile || null,
        x.email || null,
        x.academicSession,
        x.className,
        x.section || null,
        x.rollNumber || null
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      student: {
        id: result.rows[0].id,
        admissionNumber,
        ...x
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.get("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  try {
    let where = "WHERE 1=1";
    const params = [];

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      params.push(`%${req.query.search}%`);
      params.push(`%${req.query.search}%`);
      where += ` AND (student_name ILIKE $1 OR admission_number ILIKE $2 OR roll_number ILIKE $3)`;
    }

    const result = await db.query(
      `SELECT * FROM students ${where} ORDER BY id DESC`,
      params
    );

    res.json({ success: true, count: result.rows.length, students: result.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", authenticateToken, authorize("admin", "principal", "teacher"), async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM students WHERE id = $1", [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json({ success: true, student: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
