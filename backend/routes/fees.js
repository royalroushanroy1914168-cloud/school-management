const express = require("express");
const db = require("../config/db");
const { authenticateToken, authorize } = require("../middleware/auth");

const router = express.Router();

async function nextReceiptNumber(client) {
  const year = new Date().getFullYear();
  const prefix = `FEE-${year}-`;
  const result = await client.query(
    "SELECT receipt_number FROM fee_payments WHERE receipt_number LIKE $1 ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );
  const next = result.rows.length
    ? Number(result.rows[0].receipt_number.split("-")[2]) + 1
    : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

router.post("/pay", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const client = await db.connect();
  try {
    const x = req.body;
    await client.query("BEGIN");

    const receiptNumber = await nextReceiptNumber(client);
    const result = await client.query(
      `INSERT INTO fee_payments
       (receipt_number, student_id, amount, payment_period, payment_mode, collected_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, payment_date`,
      [
        receiptNumber,
        x.studentId,
        x.amountPaid,
        x.paymentPeriod || null,
        x.paymentMode || "Cash",
        req.user.id
      ]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      payment: {
        id: result.rows[0].id,
        receiptNumber,
        paymentDate: result.rows[0].payment_date
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.get("/", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const result = await db.query(
    `SELECT f.*, st.student_name
     FROM fee_payments f
     JOIN students st ON st.id=f.student_id
     ORDER BY f.id DESC`
  );
  res.json({ payments: result.rows });
});

router.get("/history/:studentId", authenticateToken, authorize("admin", "principal"), async (req, res) => {
  const result = await db.query(
    "SELECT * FROM fee_payments WHERE student_id=$1 ORDER BY payment_date DESC",
    [req.params.studentId]
  );
  res.json({ payments: result.rows });
});

module.exports = router;
