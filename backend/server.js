const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

const PORT = process.env.PORT || 10000;


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


/* =========================================================
   FRONTEND PATH
   server.js is inside backend folder
========================================================= */

const frontendPath = path.join(__dirname, "..");


/* =========================================================
   STATIC FILES
========================================================= */

app.use(express.static(frontendPath));

app.use(
    "/css",
    express.static(
        path.join(frontendPath, "css")
    )
);

app.use(
    "/js",
    express.static(
        path.join(frontendPath, "js")
    )
);

app.use(
    "/admin",
    express.static(
        path.join(frontendPath, "admin")
    )
);


/* =========================================================
   POSTGRESQL DATABASE
========================================================= */

let pool = null;

if (process.env.DATABASE_URL) {

    pool = new Pool({
        connectionString:
            process.env.DATABASE_URL,

        ssl: {
            rejectUnauthorized: false
        }
    });

    pool.on("error", (err) => {

        console.error(
            "PostgreSQL error:",
            err
        );

    });

} else {

    console.log(
        "DATABASE_URL is not configured."
    );

}


/* =========================================================
   HOME PAGE
========================================================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
    "/api/health",
    async (req, res) => {

        let databaseStatus =
            "Not configured";

        if (pool) {

            try {

                await pool.query(
                    "SELECT NOW()"
                );

                databaseStatus =
                    "PostgreSQL connected";

            } catch (error) {

                console.error(error);

                databaseStatus =
                    "PostgreSQL connection failed";

            }

        }

        res.json({

            success: true,

            message:
                "ABC Public School API is running",

            database:
                databaseStatus

        });

    }
);


/* =========================================================
   DATABASE CHECK
========================================================= */

app.get(
    "/api/database",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "DATABASE_URL is not configured"

            });

        }

        try {

            const result =
                await pool.query(
                    "SELECT NOW()"
                );

            res.json({

                success: true,

                message:
                    "PostgreSQL database connected",

                time:
                    result.rows[0].now

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Database connection failed"

            });

        }

    }
);


/* =========================================================
   DATABASE SETUP
========================================================= */

async function setupDatabase() {

    if (!pool) {

        console.log(
            "Database not configured."
        );

        return;

    }

    await pool.query(`

        CREATE TABLE IF NOT EXISTS users (

            id SERIAL PRIMARY KEY,

            name VARCHAR(150) NOT NULL,

            email VARCHAR(150) UNIQUE NOT NULL,

            password VARCHAR(255) NOT NULL,

            role VARCHAR(50) NOT NULL,

            created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP

        )

    `);

    console.log(
        "Users table is ready."
    );

}


/* =========================================================
   MANUAL DATABASE SETUP
========================================================= */

app.get(
    "/api/setup",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "DATABASE_URL is not configured"

            });

        }

        try {

            await setupDatabase();

            res.json({

                success: true,

                message:
                    "Users table is ready"

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not create table"

            });

        }

    }
);


/* =========================================================
   CREATE PERMANENT ADMIN
========================================================= */

async function ensureAdmin() {

    if (!pool) return;

    try {

        const adminEmail =
            process.env.ADMIN_EMAIL;

        const adminPassword =
            process.env.ADMIN_PASSWORD;

        if (
            !adminEmail ||
            !adminPassword
        ) {

            console.log(
                "ADMIN_EMAIL or ADMIN_PASSWORD is not configured."
            );

            return;

        }

        const existingAdmin =
            await pool.query(`

                SELECT id

                FROM users

                WHERE role = 'admin'

                LIMIT 1

            `);

        if (
            existingAdmin.rows.length === 0
        ) {

            const hashedPassword =
                await bcrypt.hash(
                    adminPassword,
                    12
                );

            await pool.query(`

                INSERT INTO users
                (name, email, password, role)

                VALUES ($1, $2, $3, $4)

            `, [

                "School Administrator",

                adminEmail,

                hashedPassword,

                "admin"

            ]);

            console.log(
                "Permanent Admin account created."
            );

        } else {

            console.log(
                "Admin account already exists."
            );

        }

    } catch (error) {

        console.error(
            "Admin setup error:",
            error
        );

    }

}


/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/api/login",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "Database not configured"

            });

        }

        try {

            const {
                email,
                password,
                role
            } = req.body;


            if (
                !email ||
                !password ||
                !role
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email, password and role are required"

                });

            }


            const result =
                await pool.query(`

                    SELECT
                        id,
                        name,
                        email,
                        password,
                        role

                    FROM users

                    WHERE email = $1

                    AND role = $2

                `, [

                    email,
                    role

                ]);


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email, password or role"

                });

            }


            const user =
                result.rows[0];


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email, password or role"

                });

            }


            res.json({

                success: true,

                message:
                    "Login successful",

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    email:
                        user.email,

                    role:
                        user.role

                }

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Login failed"

            });

        }

    }
);


/* =========================================================
   ADMIN CHANGE CREDENTIALS
========================================================= */

app.put(
    "/api/admin/change-credentials",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "Database not configured"

            });

        }

        try {

            const {
                oldEmail,
                oldPassword,
                newEmail,
                newPassword
            } = req.body;


            if (
                !oldEmail ||
                !oldPassword ||
                !newEmail ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All fields are required"

                });

            }


            const result =
                await pool.query(`

                    SELECT
                        id,
                        password

                    FROM users

                    WHERE email = $1

                    AND role = 'admin'

                `, [

                    oldEmail

                ]);


            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current Admin ID is incorrect"

                });

            }


            const admin =
                result.rows[0];


            const passwordMatch =
                await bcrypt.compare(
                    oldPassword,
                    admin.password
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current Admin password is incorrect"

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            await pool.query(`

                UPDATE users

                SET
                    email = $1,
                    password = $2

                WHERE id = $3

            `, [

                newEmail,

                hashedPassword,

                admin.id

            ]);


            res.json({

                success: true,

                message:
                    "Admin ID and password changed successfully"

            });

        } catch (error) {

            console.error(
                "Change credentials error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not change Admin credentials"

            });

        }

    }
);


/* =========================================================
   CREATE USER
========================================================= */

app.post(
    "/api/users",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "Database not configured"

            });

        }

        try {

            const {
                name,
                email,
                password,
                role
            } = req.body;


            if (
                !name ||
                !email ||
                !password ||
                !role
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name, email, password and role are required"

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );


            const result =
                await pool.query(`

                    INSERT INTO users
                    (name, email, password, role)

                    VALUES ($1, $2, $3, $4)

                    RETURNING
                        id,
                        name,
                        email,
                        role,
                        created_at

                `, [

                    name,

                    email,

                    hashedPassword,

                    role

                ]);


            res.status(201).json({

                success: true,

                message:
                    "User created successfully",

                user:
                    result.rows[0]

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not create user"

            });

        }

    }
);


/* =========================================================
   GET USERS
========================================================= */

app.get(
    "/api/users",
    async (req, res) => {

        if (!pool) {

            return res.status(500).json({

                success: false,

                message:
                    "Database not configured"

            });

        }

        try {

            const result =
                await pool.query(`

                    SELECT
                        id,
                        name,
                        email,
                        role,
                        created_at

                    FROM users

                    ORDER BY id DESC

                `);


            res.json({

                success: true,

                users:
                    result.rows

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not fetch users"

            });

        }

    }
);


/* =========================================================
   ADMIN DASHBOARD
   IMPORTANT:
   admin-dashboard.html is in PROJECT ROOT
========================================================= */

app.get(
    [
        "/admin",
        "/admin/",
        "/admin/admin-dashboard.html",
        "/admin-dashboard.html"
    ],
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin-dashboard.html"
            )
        );

    }
);


/* =========================================================
   ADMISSION PAGE
========================================================= */

app.get(
    "/admin/admission.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "admission.html"
            )
        );

    }
);


/* =========================================================
   STUDENTS
========================================================= */

app.get(
    "/admin/students.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "students.html"
            )
        );

    }
);


/* =========================================================
   TEACHER
========================================================= */

app.get(
    "/admin/teacher.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "teacher.html"
            )
        );

    }
);


/* =========================================================
   PRINCIPAL
========================================================= */

app.get(
    "/admin/principal.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "principal.html"
            )
        );

    }
);


/* =========================================================
   EXAM
========================================================= */

app.get(
    "/admin/exam.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "exam.html"
            )
        );

    }
);


/* =========================================================
   ATTENDANCE
========================================================= */

app.get(
    "/admin/attendance.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "attendance.html"
            )
        );

    }
);


/* =========================================================
   MARKS
========================================================= */

app.get(
    "/admin/marks.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "marks.html"
            )
        );

    }
);


/* =========================================================
   FEES
========================================================= */

app.get(
    "/admin/fees.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "fees.html"
            )
        );

    }
);


/* =========================================================
   NOTICES
========================================================= */

app.get(
    "/admin/notices.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "notices.html"
            )
        );

    }
);


/* =========================================================
   SETTINGS
========================================================= */

app.get(
    "/admin/setting.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin",
                "setting.html"
            )
        );

    }
);


/* =========================================================
   API 404
========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found"

        });

    }
);


/* =========================================================
   PAGE 404
========================================================= */

app.use(
    (req, res) => {

        res.status(404).send(`

            <!DOCTYPE html>

            <html>

            <head>

                <title>
                    404 - Page Not Found
                </title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 60px;
                    }

                    h1 {
                        font-size: 50px;
                        margin-bottom: 10px;
                    }

                    a {
                        text-decoration: none;
                        color: #2563eb;
                    }

                </style>

            </head>

            <body>

                <h1>404</h1>

                <h2>
                    Page Not Found
                </h2>

                <p>
                    The requested page does not exist.
                </p>

                <a href="/">
                    Go to Home
                </a>

            </body>

            </html>

        `);

    }
);


/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

    try {

        await setupDatabase();

        await ensureAdmin();


        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `ABC Public School server running on port ${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Server startup error:",
            error
        );

        process.exit(1);

    }

}


startServer();
