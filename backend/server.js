const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const fs = require("fs");

const { auth, allow, SECRET } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 10000;

/*
  server.js is inside /backend
  Frontend is one level above /backend
*/
const frontendPath = path.join(__dirname, "..");

/* =========================
   BASIC CONFIGURATION
========================= */

app.use(cors());

app.use(express.json({
    limit: "2mb"
}));

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static(frontendPath));

/* =========================
   DATABASE
========================= */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

const db = (query, params = []) => {
    return pool.query(query, params);
};

/* =========================
   DATABASE SETUP
========================= */

async function setup() {

    const schemaPath = path.join(
        __dirname,
        "database",
        "schema.sql"
    );

    const schema = fs.readFileSync(
        schemaPath,
        "utf8"
    );

    await db(schema);

    const adminEmail =
        process.env.ADMIN_EMAIL ||
        "admin@school.com";

    const adminPassword =
        process.env.ADMIN_PASSWORD ||
        "admin123";

    const existingAdmin = await db(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (!existingAdmin.rows.length) {

        const hashedPassword =
            await bcrypt.hash(adminPassword, 12);

        await db(
            `INSERT INTO users
            (name, email, password, role)
            VALUES ($1, $2, $3, $4)`,
            [
                "School Administrator",
                adminEmail,
                hashedPassword,
                "admin"
            ]
        );

        console.log("Default admin created");

    } else {

        console.log("Admin account already exists");

    }
}

/* =========================
   HOME PAGE
========================= */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", async (req, res) => {

    try {

        await db("SELECT 1");

        res.json({
            success: true,
            message: "ABC Public School API is running",
            database: "PostgreSQL connected"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });

    }

});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password,
            role
        } = req.body;

        if (!email || !password || !role) {

            return res.status(400).json({
                success: false,
                message: "Email, password and role are required"
            });

        }

        const result = await db(
            `SELECT
                id,
                name,
                email,
                password,
                role
             FROM users
             WHERE LOWER(email) = LOWER($1)
             AND role = $2
             LIMIT 1`,
            [
                email.trim(),
                role
            ]
        );

        if (!result.rows.length) {

            return res.status(401).json({
                success: false,
                message: "Invalid login details"
            });

        }

        const user = result.rows[0];

        const passwordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordCorrect) {

            return res.status(401).json({
                success: false,
                message: "Invalid login details"
            });

        }

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(
            safeUser,
            SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            success: true,
            token,
            user: safeUser
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });

    }

});

/* =====================================================
   ADMIN USER MANAGEMENT
===================================================== */

/*
   Allowed roles that Admin can create
*/
const allowedStaffRoles = [
    "principal",
    "teacher",
    "accountant",
    "admission",
    "librarian",
    "exam-controller",
    "notice-manager"
];

/* =========================
   GET ALL USERS
========================= */

app.get(
    "/api/users",
    auth,
    allow("admin"),
    async (req, res) => {

        try {

            const result = await db(
                `SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                 FROM users
                 ORDER BY id DESC`
            );

            res.json({
                success: true,
                users: result.rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Could not load users"
            });

        }

    }
);

/* =========================
   CREATE PRINCIPAL / TEACHER / STAFF
========================= */

app.post(
    "/api/users",
    auth,
    allow("admin"),
    async (req, res) => {

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

            /*
              Admin cannot create another admin
            */
            if (!allowedStaffRoles.includes(role)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Admin can create Principal, Teacher and permitted staff accounts only"
                });

            }

            /*
              Check duplicate email
            */
            const existing = await db(
                `SELECT id
                 FROM users
                 WHERE LOWER(email) = LOWER($1)
                 LIMIT 1`,
                [email.trim()]
            );

            if (existing.rows.length) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This email/login ID already exists"
                });

            }

            /*
              Hash password
            */
            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );

            /*
              Create account
            */
            const result = await db(
                `INSERT INTO users
                (name, email, password, role)
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id,
                    name,
                    email,
                    role,
                    created_at`,
                [
                    name.trim(),
                    email.trim(),
                    hashedPassword,
                    role
                ]
            );

            res.status(201).json({
                success: true,
                message:
                    `${role} account created successfully`,
                user: result.rows[0]
            });

        } catch (error) {

            console.error(
                "CREATE USER ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not create account"
            });

        }

    }
);

/* =========================
   DELETE USER
========================= */

app.delete(
    "/api/users/:id",
    auth,
    allow("admin"),
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });

            }

            /*
              Prevent deleting the currently logged-in admin
            */
            if (id === req.user.id) {

                return res.status(400).json({
                    success: false,
                    message:
                        "You cannot delete your own admin account"
                });

            }

            await db(
                "DELETE FROM users WHERE id = $1",
                [id]
            );

            res.json({
                success: true,
                message: "User deleted successfully"
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Could not delete user"
            });

        }

    }
);

/* =====================================================
   STUDENTS
===================================================== */

app.get(
    "/api/students",
    auth,
    async (req, res) => {

        try {

            const result = await db(
                `SELECT *
                 FROM students
                 ORDER BY id DESC`
            );

            res.json({
                success: true,
                students: result.rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Could not load students"
            });

        }

    }
);

app.post(
    "/api/students",
    auth,
    allow(
        "admin",
        "principal",
        "admission"
    ),
    async (req, res) => {

        try {

            const {
                admission_no,
                name,
                class_name,
                section,
                roll_no,
                parent_name,
                phone
            } = req.body;

            if (!admission_no || !name) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Admission number and student name are required"
                });

            }

            const result = await db(
                `INSERT INTO students
                (
                    admission_no,
                    name,
                    class_name,
                    section,
                    roll_no,
                    parent_name,
                    phone
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7)
                RETURNING *`,
                [
                    admission_no,
                    name,
                    class_name,
                    section,
                    roll_no,
                    parent_name,
                    phone
                ]
            );

            res.status(201).json({
                success: true,
                message: "Student added successfully",
                student: result.rows[0]
            });

        } catch (error) {

            console.error(error);

            res.status(400).json({
                success: false,
                message:
                    "Could not add student. Admission number may already exist."
            });

        }

    }
);

/* =====================================================
   ADMISSIONS
===================================================== */

app.get(
    "/api/admissions",
    auth,
    async (req, res) => {

        try {

            const result = await db(
                `SELECT *
                 FROM admissions
                 ORDER BY id DESC`
            );

            res.json({
                success: true,
                admissions: result.rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Could not load admissions"
            });

        }

    }
);

/* CREATE ADMISSION */

app.post(
    "/api/admissions",
    auth,
    allow(
        "admin",
        "principal",
        "admission"
    ),
    async (req, res) => {

        try {

            const {
                application_no,
                student_name,
                class_name,
                parent_name,
                phone
            } = req.body;

            if (
                !application_no ||
                !student_name
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Application number and student name are required"
                });

            }

            const result = await db(
                `INSERT INTO admissions
                (
                    application_no,
                    student_name,
                    class_name,
                    parent_name,
                    phone,
                    status
                )
                VALUES
                ($1,$2,$3,$4,$5,'Pending')
                RETURNING *`,
                [
                    application_no,
                    student_name,
                    class_name,
                    parent_name,
                    phone
                ]
            );

            res.status(201).json({
                success: true,
                message:
                    "Admission application created",
                admission: result.rows[0]
            });

        } catch (error) {

            console.error(error);

            res.status(400).json({
                success: false,
                message:
                    "Could not save admission"
            });

        }

    }
);

/* =========================
   CHANGE ADMISSION STATUS
========================= */

app.patch(
    "/api/admissions/:id/status",
    auth,
    allow(
        "admin",
        "principal",
        "admission"
    ),
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            const {
                status
            } = req.body;

            const allowedStatuses = [
                "Pending",
                "Approved",
                "Rejected"
            ];

            if (!allowedStatuses.includes(status)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Status must be Pending, Approved or Rejected"
                });

            }

            const result = await db(
                `UPDATE admissions
                 SET status = $1
                 WHERE id = $2
                 RETURNING *`,
                [
                    status,
                    id
                ]
            );

            if (!result.rows.length) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Admission not found"
                });

            }

            res.json({
                success: true,
                message:
                    "Admission status updated successfully",
                admission: result.rows[0]
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Could not update admission status"
            });

        }

    }
);

/* =====================================================
   NOTICES
===================================================== */

app.get(
    "/api/notices",
    auth,
    async (req, res) => {

        try {

            const result = await db(
                `SELECT *
                 FROM notices
                 WHERE published = true
                 ORDER BY id DESC`
            );

            res.json({
                success: true,
                notices: result.rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message: "Could not load notices"
            });

        }

    }
);

app.post(
    "/api/notices",
    auth,
    allow(
        "admin",
        "principal",
        "teacher",
        "notice-manager"
    ),
    async (req, res) => {

        try {

            const {
                title,
                body,
                target_role = "all",
                published = true
            } = req.body;

            const result = await db(
                `INSERT INTO notices
                (
                    title,
                    body,
                    target_role,
                    published
                )
                VALUES
                ($1,$2,$3,$4)
                RETURNING *`,
                [
                    title,
                    body,
                    target_role,
                    published
                ]
            );

            res.status(201).json({
                success: true,
                notice: result.rows[0]
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Could not create notice"
            });

        }

    }
);

/* =====================================================
   ATTENDANCE
===================================================== */

app.get(
    "/api/attendance",
    auth,
    async (req, res) => {

        const result = await db(
            `SELECT *
             FROM attendance
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            attendance: result.rows
        });

    }
);

app.post(
    "/api/attendance",
    auth,
    allow(
        "admin",
        "principal",
        "teacher"
    ),
    async (req, res) => {

        try {

            const {
                student_id,
                attendance_date,
                status
            } = req.body;

            const result = await db(
                `INSERT INTO attendance
                (
                    student_id,
                    attendance_date,
                    status
                )
                VALUES
                ($1,$2,$3)
                RETURNING *`,
                [
                    student_id,
                    attendance_date,
                    status
                ]
            );

            res.status(201).json({
                success: true,
                attendance: result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Could not save attendance"
            });

        }

    }
);

/* =====================================================
   EXAMS
===================================================== */

app.get(
    "/api/exams",
    auth,
    async (req, res) => {

        const result = await db(
            `SELECT *
             FROM exams
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            exams: result.rows
        });

    }
);

app.post(
    "/api/exams",
    auth,
    allow(
        "admin",
        "principal",
        "teacher",
        "exam-controller"
    ),
    async (req, res) => {

        try {

            const {
                name,
                subject,
                class_name,
                exam_date
            } = req.body;

            const result = await db(
                `INSERT INTO exams
                (
                    name,
                    subject,
                    class_name,
                    exam_date
                )
                VALUES
                ($1,$2,$3,$4)
                RETURNING *`,
                [
                    name,
                    subject,
                    class_name,
                    exam_date
                ]
            );

            res.status(201).json({
                success: true,
                exam: result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Could not create exam"
            });

        }

    }
);

/* =====================================================
   MARKS
===================================================== */

app.get(
    "/api/marks",
    auth,
    async (req, res) => {

        const result = await db(
            `SELECT *
             FROM marks
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            marks: result.rows
        });

    }
);

app.post(
    "/api/marks",
    auth,
    allow(
        "admin",
        "principal",
        "teacher",
        "exam-controller"
    ),
    async (req, res) => {

        try {

            const {
                student_id,
                exam_id,
                marks,
                max_marks = 100,
                published = false
            } = req.body;

            const result = await db(
                `INSERT INTO marks
                (
                    student_id,
                    exam_id,
                    marks,
                    max_marks,
                    published
                )
                VALUES
                ($1,$2,$3,$4,$5)
                RETURNING *`,
                [
                    student_id,
                    exam_id,
                    marks,
                    max_marks,
                    published
                ]
            );

            res.status(201).json({
                success: true,
                mark: result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Could not save marks"
            });

        }

    }
);

/* =====================================================
   FEES
===================================================== */

app.get(
    "/api/fees",
    auth,
    async (req, res) => {

        const result = await db(
            `SELECT *
             FROM fees
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            fees: result.rows
        });

    }
);

app.post(
    "/api/fees",
    auth,
    allow(
        "admin",
        "principal",
        "accountant"
    ),
    async (req, res) => {

        try {

            const {
                student_id,
                amount,
                paid = 0,
                description,
                payment_date
            } = req.body;

            const result = await db(
                `INSERT INTO fees
                (
                    student_id,
                    amount,
                    paid,
                    description,
                    payment_date
                )
                VALUES
                ($1,$2,$3,$4,$5)
                RETURNING *`,
                [
                    student_id,
                    amount,
                    paid,
                    description,
                    payment_date
                ]
            );

            res.status(201).json({
                success: true,
                fee: result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Could not save fee"
            });

        }

    }
);

/* =====================================================
   LIBRARY
===================================================== */

app.get(
    "/api/books",
    auth,
    async (req, res) => {

        const result = await db(
            `SELECT *
             FROM books
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            books: result.rows
        });

    }
);

app.post(
    "/api/books",
    auth,
    allow(
        "admin",
        "principal",
        "librarian"
    ),
    async (req, res) => {

        try {

            const {
                title,
                author,
                isbn,
                quantity = 1
            } = req.body;

            const result = await db(
                `INSERT INTO books
                (
                    title,
                    author,
                    isbn,
                    quantity,
                    available
                )
                VALUES
                ($1,$2,$3,$4,$4)
                RETURNING *`,
                [
                    title,
                    author,
                    isbn,
                    quantity
                ]
            );

            res.status(201).json({
                success: true,
                book: result.rows[0]
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message:
                    "Could not add book"
            });

        }

    }
);

/* =====================================================
   FRONTEND DASHBOARDS
===================================================== */

app.get(
    "/admin-dashboard.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "admin-dashboard.html"
            )
        );

    }
);

app.get(
    "/principal-dashboard.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "principal-dashboard.html"
            )
        );

    }
);

app.get(
    "/teacher-dashboard.html",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendPath,
                "teacher-dashboard.html"
            )
        );

    }
);

/* =====================================================
   ADMIN PAGES
===================================================== */

const adminPages = [
    "admission",
    "students",
    "teacher",
    "principal",
    "exam",
    "attendance",
    "marks",
    "fees",
    "notices",
    "setting"
];

adminPages.forEach(page => {

    app.get(
        `/admin/${page}.html`,
        (req, res) => {

            res.sendFile(
                path.join(
                    frontendPath,
                    "admin",
                    `${page}.html`
                )
            );

        }
    );

});

/* =====================================================
   ROLE PAGES
===================================================== */

const rolePages = {

    principal: [
        "admission",
        "students",
        "teachers",
        "attendance",
        "exams",
        "marks",
        "fees",
        "notices"
    ],

    teacher: [
        "students",
        "classes",
        "attendance",
        "marks"
    ],

    student: [
        "profile",
        "attendance",
        "results",
        "notices",
        "fees"
    ],

    parent: [
        "profile",
        "attendance",
        "results",
        "notices",
        "fees"
    ],

    accountant: [
        "fees",
        "reports"
    ],

    admission: [
        "admissions",
        "students"
    ],

    librarian: [
        "books"
    ],

    "exam-controller": [
        "exams",
        "marks",
        "results"
    ],

    "notice-manager": [
        "notices"
    ]

};

for (
    const [role, pages]
    of Object.entries(rolePages)
) {

    pages.forEach(page => {

        app.get(
            `/${role}/${page}.html`,
            (req, res) => {

                res.sendFile(
                    path.join(
                        frontendPath,
                        role,
                        `${page}.html`
                    )
                );

            }
        );

    });

}

/* =====================================================
   404 API
===================================================== */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({
            success: false,
            message: "API endpoint not found"
        });

    }
);

/* =====================================================
   404 WEBSITE
===================================================== */

app.use(
    (req, res) => {

        res.status(404).send(`
            <html>
            <head>
                <title>404</title>
            </head>
            <body style="
                font-family:Arial;
                text-align:center;
                padding-top:80px;
            ">
                <h1>404 - Page Not Found</h1>
                <p>The requested page does not exist.</p>
            </body>
            </html>
        `);

    }
);

/* =====================================================
   START SERVER
===================================================== */

setup()
    .then(() => {

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `ABC Public School server running on port ${PORT}`
                );

            }
        );

    })
    .catch(error => {

        console.error(
            "Startup error:",
            error
        );

        process.exit(1);

    });
