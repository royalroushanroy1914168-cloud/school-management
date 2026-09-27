const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();

const PORT = process.env.PORT || 10000;


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ==================================================
// FRONTEND PATH
// server.js is inside /backend
// ==================================================

const frontendPath = path.join(__dirname, "..");


// ==================================================
// STATIC FILES
// ==================================================

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


// ==================================================
// POSTGRESQL
// ==================================================

let pool = null;

if (process.env.DATABASE_URL) {

    pool = new Pool({
        connectionString:
            process.env.DATABASE_URL,

        ssl: {
            rejectUnauthorized: false
        }
    });

    pool.on("error", (error) => {

        console.error(
            "PostgreSQL error:",
            error
        );

    });

} else {

    console.log(
        "DATABASE_URL is not configured."
    );

}


// ==================================================
// HOME PAGE
// ==================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});


// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
    "/api/health",
    async (req, res) => {

        let database =
            "Not configured";

        if (pool) {

            try {

                await pool.query(
                    "SELECT NOW()"
                );

                database =
                    "PostgreSQL connected";

            } catch (error) {

                console.error(error);

                database =
                    "PostgreSQL connection failed";

            }

        }

        res.json({

            success: true,

            message:
                "ABC Public School API is running",

            database: database

        });

    }
);


// ==================================================
// DATABASE SETUP
// ==================================================

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


// ==================================================
// CREATE DEFAULT ADMIN
// ==================================================

async function ensureAdmin() {

    if (!pool) {
        return;
    }

    try {

        const result =
            await pool.query(
                `
                SELECT id
                FROM users
                WHERE role = 'admin'
                LIMIT 1
                `
            );

        if (result.rows.length === 0) {

            const password =
                process.env.ADMIN_PASSWORD ||
                "admin123";

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );

            await pool.query(
                `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    role
                )
                VALUES
                ($1, $2, $3, $4)
                `,
                [
                    "Administrator",
                    "admin@school.com",
                    hashedPassword,
                    "admin"
                ]
            );

            console.log(
                "Default admin created."
            );

        } else {

            console.log(
                "Admin account already exists."
            );

        }

    } catch (error) {

        console.error(
            "Admin creation error:",
            error
        );

    }

}


// ==================================================
// LOGIN
// ==================================================

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
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        password,
                        role
                    FROM users
                    WHERE LOWER(email) = LOWER($1)
                    LIMIT 1
                    `,
                    [email]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid login details"

                });

            }

            const user =
                result.rows[0];


            if (
                user.role.toLowerCase() !==
                role.toLowerCase()
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Selected role does not match this account"

                });

            }


            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!validPassword) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid login details"

                });

            }


            delete user.password;


            res.json({

                success: true,

                message:
                    "Login successful",

                user: user

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


// ==================================================
// CREATE USER
// ==================================================

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
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        name,
                        email,
                        password,
                        role
                    )
                    VALUES
                    ($1, $2, $3, $4)
                    RETURNING
                        id,
                        name,
                        email,
                        role,
                        created_at
                    `,
                    [
                        name,
                        email,
                        hashedPassword,
                        role
                    ]
                );


            res.status(201).json({

                success: true,

                message:
                    "User created successfully",

                user:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Create user error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not create user"

            });

        }

    }
);


// ==================================================
// GET USERS
// ==================================================

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
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        role,
                        created_at
                    FROM users
                    ORDER BY id DESC
                    `
                );


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


// ==================================================
// ADMIN DASHBOARD
// ==================================================

app.get(
    [
        "/admin",
        "/admin/",
        "/admin/index.html",
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


// ==================================================
// ADMIN ADMISSION
// ==================================================

app.get(
    [
        "/admin/admission.html",
        "/admin/index-admission.html"
    ],
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


// ==================================================
// ADMIN STUDENTS
// ==================================================

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


// ==================================================
// ADMIN TEACHER
// ==================================================

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


// ==================================================
// ADMIN PRINCIPAL
// ==================================================

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


// ==================================================
// ADMIN EXAM
// ==================================================

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


// ==================================================
// ADMIN ATTENDANCE
// ==================================================

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


// ==================================================
// ADMIN MARKS
// ==================================================

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


// ==================================================
// ADMIN FEES
// ==================================================

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


// ==================================================
// ADMIN NOTICES
// ==================================================

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


// ==================================================
// ADMIN SETTINGS
// ==================================================

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


// ==================================================
// API 404
// ==================================================

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


// ==================================================
// PAGE 404
// ==================================================

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
                        font-family: Arial;
                        text-align: center;
                        padding: 60px;
                    }

                    h1 {
                        font-size: 60px;
                    }

                    a {
                        color: #2563eb;
                        text-decoration: none;
                    }

                </style>

            </head>

            <body>

                <h1>404</h1>

                <h2>Page Not Found</h2>

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


// ==================================================
// START SERVER
// ==================================================

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
