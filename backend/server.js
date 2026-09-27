// ==========================================
// FRONTEND PAGE ROUTES
// ==========================================

// ROOT HOME
app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});


// ==========================================
// ADMIN DASHBOARD
// ==========================================

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


// ==========================================
// ADMIN ADMISSION
// ==========================================

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


// ==========================================
// ADMIN STUDENTS
// ==========================================

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


// ==========================================
// ADMIN TEACHER
// ==========================================

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


// ==========================================
// ADMIN PRINCIPAL
// ==========================================

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


// ==========================================
// ADMIN EXAM
// ==========================================

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


// ==========================================
// ADMIN ATTENDANCE
// ==========================================

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


// ==========================================
// ADMIN MARKS
// ==========================================

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


// ==========================================
// ADMIN FEES
// ==========================================

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


// ==========================================
// ADMIN NOTICES
// ==========================================

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


// ==========================================
// ADMIN SETTINGS
// ==========================================

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
