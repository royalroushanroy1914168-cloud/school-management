require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/principals", require("./routes/principals"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/exams", require("./routes/exams"));
app.use("/api/marks", require("./routes/marks"));
app.use("/api/fees", require("./routes/fees"));
app.use("/api/notices", require("./routes/notices"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/results", require("./routes/results"));

app.get("/", (req,res) => res.json({success:true,message:"ABC Public School API is running",database:"PostgreSQL"}));

app.get("/api/health", async (req,res) => {
  try { await db.query("SELECT 1"); res.json({success:true,message:"API and database are connected",database:"connected"}); }
  catch(e) { console.error(e); res.status(500).json({success:false,message:"Database connection failed"}); }
});

async function createDefaultAdmin() {
  try {
    const r=await db.query("SELECT id FROM users WHERE user_id=$1 LIMIT 1",["admin"]);
    if(!r.rows.length) {
      const hash=await bcrypt.hash("Admin@123",10);
      await db.query("INSERT INTO users (user_id,password,role,status) VALUES ($1,$2,$3,$4)",["admin",hash,"admin","active"]);
      console.log("Default admin created.");
    } else console.log("Admin account already exists.");
  } catch(e) { console.error("Admin creation error:",e.message); }
}

app.use((req,res)=>res.status(404).json({success:false,message:"API endpoint not found"}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({success:false,message:"Internal server error"});});

const PORT=process.env.PORT||5000;
app.listen(PORT, async()=>{console.log(`ABC Public School API running on port ${PORT}`); await createDefaultAdmin();});
