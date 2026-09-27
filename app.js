// ==========================================
// ABC PUBLIC SCHOOL - FRONTEND APP
// ==========================================

const API = "https://school-management-2-pbpv.onrender.com/api";

const $ = (selector) => document.querySelector(selector);


// ==========================================
// PAGE LOADED
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    // LOGIN MODAL
    // ======================================

    const modal = $("#modal");
    const loginBtn = $("#loginBtn");
    const closeBtn = $("#closeModal");

    if (loginBtn && modal) {
        loginBtn.onclick = () => {
            modal.style.display = "flex";
        };
    }

    if (closeBtn && modal) {
        closeBtn.onclick = () => {
            modal.style.display = "none";
        };
    }

    if (modal) {
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };
    }


    // ======================================
    // ROLE BUTTONS
    // ======================================

    document.querySelectorAll("[data-role]").forEach((button) => {

        button.onclick = () => {

            const role = button.dataset.role;

            const roleInput = $("#role");

            if (roleInput) {
                roleInput.value = role;
            }

            document
                .querySelectorAll("[data-role]")
                .forEach((btn) => {
                    btn.classList.remove("active");
                });

            button.classList.add("active");
        };

    });


    // ======================================
    // LOGIN FORM
    // ======================================

    const loginForm = $("#loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            const submitButton =
                loginForm.querySelector(
                    "button[type='submit']"
                ) ||
                loginForm.querySelector("button");

            try {

                // -------------------------------
                // GET ROLE
                // -------------------------------

                const roleInput = $("#role");

                let role = roleInput
                    ? roleInput.value.trim().toLowerCase()
                    : "admin";


                // -------------------------------
                // GET USERNAME / EMAIL / USER ID
                // -------------------------------

                const emailInput =
                    $("#email") ||
                    $("#username") ||
                    $("#userId") ||
                    $("#userid") ||
                    $("input[type='email']");

                const email = emailInput
                    ? emailInput.value.trim()
                    : "";


                // -------------------------------
                // GET PASSWORD
                // -------------------------------

                const passwordInput =
                    $("#password") ||
                    $("input[type='password']");

                const password = passwordInput
                    ? passwordInput.value
                    : "";


                // -------------------------------
                // VALIDATION
                // -------------------------------

                if (!email) {

                    showMessage(
                        "Please enter Admin ID / Email."
                    );

                    return;
                }

                if (!password) {

                    showMessage(
                        "Please enter your password."
                    );

                    return;
                }


                // -------------------------------
                // DISABLE BUTTON
                // -------------------------------

                if (submitButton) {

                    submitButton.disabled = true;
                    submitButton.textContent =
                        "Logging in...";

                }


                // =================================
                // LOGIN API
                // =================================

                const response = await fetch(
                    API + "/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email,
                            password: password,
                            role: role
                        })
                    }
                );


                // -------------------------------
                // READ SERVER RESPONSE
                // -------------------------------

                let data = {};

                try {
                    data = await response.json();
                }

                catch (jsonError) {

                    console.error(
                        "Invalid server response:",
                        jsonError
                    );

                    throw new Error(
                        "Server returned an invalid response."
                    );

                }


                // =================================
                // LOGIN FAILED
                // =================================

                if (!response.ok || !data.success) {

                    showMessage(
                        data.message ||
                        "Invalid login details."
                    );

                    if (submitButton) {

                        submitButton.disabled = false;

                        submitButton.textContent =
                            "Login";

                    }

                    return;
                }


                // =================================
                // LOGIN SUCCESSFUL
                // =================================

                if (data.user) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    );

                }


                showMessage(
                    "Login successful!"
                );


                // =================================
                // ROLE REDIRECTION
                // =================================

                setTimeout(() => {

                    // --------------------------------
                    // ADMIN
                    // --------------------------------

                    if (role === "admin") {

                        window.location.href =
                            "/admin-dashboard.html";

                        return;
                    }


                    // --------------------------------
                    // PRINCIPAL
                    // --------------------------------

                    if (role === "principal") {

                        window.location.href =
                            "/principal-dashboard.html";

                        return;
                    }


                    // --------------------------------
                    // TEACHER
                    // --------------------------------

                    if (role === "teacher") {

                        window.location.href =
                            "/teacher-dashboard.html";

                        return;
                    }


                    // --------------------------------
                    // OTHER ROLES
                    // --------------------------------

                    window.location.href = "/";

                }, 500);

            }


            // ======================================
            // LOGIN ERROR
            // ======================================

            catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showMessage(
                    "Unable to connect to the server. Please try again."
                );

                if (submitButton) {

                    submitButton.disabled = false;

                    submitButton.textContent =
                        "Login";

                }

            }

        });

    }


    // ======================================
    // LOAD PUBLIC NOTICES
    // ======================================

    loadNotices();

});


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message) {

    let messageBox =
        $("#loginMessage") ||
        $("#message") ||
        $(".login-message");


    if (!messageBox) {

        messageBox =
            document.createElement("div");

        messageBox.id =
            "loginMessage";

        messageBox.style.marginTop =
            "15px";

        messageBox.style.padding =
            "10px";

        messageBox.style.textAlign =
            "center";

        messageBox.style.borderRadius =
            "6px";

        const loginForm =
            $("#loginForm");

        if (loginForm) {

            loginForm.appendChild(
                messageBox
            );

        }

    }


    if (messageBox) {

        messageBox.textContent =
            message;

    }

}


// ==========================================
// LOAD SCHOOL NOTICES
// ==========================================

async function loadNotices() {

    try {

        const response =
            await fetch(
                API +
                "/notices?published=true"
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const noticeContainer =
            $("#notices") ||
            $("#noticeList") ||
            $(".notice-list");


        if (!noticeContainer) {
            return;
        }


        noticeContainer.innerHTML = "";


        const notices =
            data.notices ||
            data.data ||
            [];


        notices.forEach((notice) => {

            const div =
                document.createElement("div");

            div.className =
                "notice";


            const title =
                document.createElement("h3");

            title.textContent =
                notice.title ||
                "Notice";


            const text =
                document.createElement("p");

            text.textContent =
                notice.description ||
                notice.message ||
                notice.content ||
                "";


            div.appendChild(title);

            div.appendChild(text);

            noticeContainer.appendChild(div);

        });

    }

    catch (error) {

        console.log(
            "Notice service unavailable:",
            error.message
        );

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem(
        "user"
    );

    window.location.href = "/";

}


// ==========================================
// GET CURRENT USER
// ==========================================

function getCurrentUser() {

    const user =
        localStorage.getItem("user");


    if (!user) {
        return null;
    }


    try {

        return JSON.parse(user);

    }

    catch (error) {

        localStorage.removeItem(
            "user"
        );

        return null;

    }

}


// ==========================================
// ADMIN DASHBOARD NAVIGATION
// ==========================================

function openAdminPage(page) {

    const pages = {

        // IMPORTANT:
        // admin-dashboard.html is in ROOT
        dashboard:
            "/admin-dashboard.html",

        // These files are inside /admin/
        admission:
            "/admin/admission.html",

        students:
            "/admin/students.html",

        teacher:
            "/admin/teacher.html",

        principal:
            "/admin/principal.html",

        attendance:
            "/admin/attendance.html",

        exam:
            "/admin/exam.html",

        marks:
            "/admin/marks.html",

        fees:
            "/admin/fees.html",

        notices:
            "/admin/notices.html",

        setting:
            "/admin/setting.html"

    };


    if (pages[page]) {

        window.location.href =
            pages[page];

    }

    else {

        console.error(
            "Unknown admin page:",
            page
        );

    }

}


// ==========================================
// ADMIN BUTTON EVENT HANDLERS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .querySelectorAll(
                "[data-admin-page]"
            )
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.adminPage;

                        openAdminPage(
                            page
                        );

                    }
                );

            });

    }
);
