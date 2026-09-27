const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// POSTGRESQL DATABASE
// ===============================

let pool = null;

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    pool.on("error", (err) => {
        console.error("PostgreSQL error:", err);
    });
} else {
    console.log("DATABASE_URL is not configured.");
}

// ===============================
// FRONTEND
// ===============================

// Repository root is one level above /backend
const frontendPath = path.join(__dirname, "..");

// Serve CSS, JS, HTML and folders
app.use(express.static(frontendPath));

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// ===============================
// API HEALTH CHECK
// ===============================

app.get("/api/health", async (req, res) => {
    let databaseStatus = "Not configured";

    if (pool) {
        try {
            await pool.query("SELECT NOW()");
            databaseStatus = "PostgreSQL connected";
        } catch (error) {
            console.error(error);
            databaseStatus = "PostgreSQL connection failed";
        }
    }

    res.json({
        success: true,
        message: "ABC Public School API is running",
        database: databaseStatus
    });
});

// ===============================
// DATABASE TEST
// ===============================

app.get("/api/database", async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: "DATABASE_URL is not configured"
        });
    }

    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "PostgreSQL database connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed",
            error: error.message
        });
    }
});

// ===============================
// CREATE USERS TABLE
// ===============================

app.get("/api/setup", async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: "DATABASE_URL is not configured"
        });
    }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        res.json({
            success: true,
            message: "Users table is ready"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not create table",
            error: error.message
        });
    }
});

// ===============================
// CREATE USER
// ===============================

app.post("/api/users", async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: "Database not configured"
        });
    }

    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and role are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO users
            (name, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role, created_at
            `,
            [name, email, password, role]
        );

        res.status(201).json({
            success: true,
            message: "User created successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not create user",
            error: error.message
        });
    }
});

// ===============================
// LOGIN
// ===============================

app.post("/api/login", async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: "Database not configured"
        });
    }

    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password and role are required"
            });
        }

        const result = await pool.query(
            `
            SELECT id, name, email, role
            FROM users
            WHERE email = $1
            AND password = $2
            AND role = $3
            `,
            [email, password, role]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or role"
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
});

// ===============================
// GET ALL USERS
// ===============================

app.get("/api/users", async (req, res) => {
    if (!pool) {
        return res.status(500).json({
            success: false,
            message: "Database not configured"
        });
    }

    try {
        const result = await pool.query(`
            SELECT id, name, email, role, created_at
            FROM users
            ORDER BY id DESC
        `);

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Could not fetch users"
        });
    }
});

// ===============================
// 404 API HANDLER
// ===============================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log(`ABC Public School server running on port ${PORT}`);
});
