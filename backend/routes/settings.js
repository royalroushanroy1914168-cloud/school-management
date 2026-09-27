const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, authorize("admin"), async (req, res) => {
  const result = await db.query("SELECT * FROM school_settings ORDER BY id LIMIT 1");
  res.json({ settings: result.rows[0] || {} });
});

router.put("/", authenticateToken, authorize("admin"), async (req, res) => {
  try {
    const x = req.body;
    const result = await db.query(
      `UPDATE school_settings SET
       school_name=$1, board=$2, affiliation_no=$3, school_code=$4,
       academic_session=$5, principal_name=$6, vice_principal_name=$7,
       address=$8, city=$9, state=$10, pin_code=$11, phone=$12, email=$13,
       updated_at=CURRENT_TIMESTAMP
       WHERE id=(SELECT id FROM school_settings ORDER BY id LIMIT 1)
       RETURNING id`,
      [
        x.schoolName,
        x.board,
        x.affiliationNumber || null,
        x.schoolCode || null,
        x.academicSession,
        x.principalName || null,
        x.vicePrincipalName || null,
        x.address || null,
        x.city || null,
        x.state || null,
        x.pinCode || null,
        x.phone || null,
        x.email || null
      ]
    );
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
