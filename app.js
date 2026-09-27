// ==========================================
// ABC PUBLIC SCHOOL - FRONTEND APP
// ==========================================

// Render backend URL
const API = "https://school-management-2-pbpv.onrender.com/api";

const $ = (selector) => document.querySelector(selector);


// ==========================================
// PAGE LOADED
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // --------------------------------------
    // LOGIN MODAL
    // --------------------------------------

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


    // Close modal when clicking outside
    if (modal) {
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };
    }


    // --------------------------------------
    // ROLE BUTTONS
    // --------------------------------------

    document.querySelectorAll("[data-role]").forEach((button) => {

        button.onclick = () => {

            const role = button.dataset.role;

            const roleInput = $("#role");

            if (roleInput) {
                roleInput.value = role;
            }

            // Remove active class
            document.querySelectorAll("[data-role]").forEach((btn) => {
                btn.classList.remove("active");
            });

            // Add active class
            button.classList.add("active");
        };

    });


    // --------------------------------------
    // LOGIN FORM
    // --------------------------------------

    const loginForm = $("#loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", async (event) => {

            event.preventDefault();

            try {

                // Get role
                const roleInput = $("#role");

                let role = roleInput ? roleInput.value : "admin";

                role = role.toLowerCase();


                // Get email/username
                let email = "";

                const emailInput =
                    $("#email") ||
                    $("#username") ||
                    $("#userId") ||
                    $("#userid") ||
                    $("input[type='email']");

                if (emailInput) {
                    email = emailInput.value.trim();
                }


                // Get password
                const passwordInput =
                    $("#password") ||
                    $("input[type='password']");

                const password =
                    passwordInput ?
                    passwordInput.value :
                    "";


                // Validation
                if (!email) {
                    showMessage("Please enter Admin ID / Email.");
                    return;
                }

                if (!password) {
                    showMessage("Please enter your password.");
                    return;
                }


                // Disable login button
                const submitButton =
                    loginForm.querySelector("button[type='submit']") ||
                    loginForm.querySelector("button");

                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Logging in...";
                }


                // --------------------------------------
                // CALL RENDER BACKEND
                // --------------------------------------

                const response = await fetch(API + "/login", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password,
                        role: role
                    })

                });


                // Read response
                const data = await response.json();


                // --------------------------------------
                // LOGIN FAILED
                // --------------------------------------

                if (!response.ok || !data.success) {

                    showMessage(
                        data.message || "Invalid login details."
                    );

                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = "Login";
                    }

                    return;
                }


                // --------------------------------------
                // LOGIN SUCCESSFUL
                // --------------------------------------

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );


                showMessage("Login successful!");


                // --------------------------------------
                // REDIRECT ACCORDING TO ROLE
                // --------------------------------------

                setTimeout(() => {

                    if (role === "admin") {

                        window.location.href = "https://school-management-2-pbpv.onrender.com/admin-dashboard.html";

                    }

                    else if (role === "principal") {
                           window.location.href = "https://school-management-2-pbpv.onrender.com/principal-dashboard.html";
                       
                    }

                    else if (role === "teacher") {

                          window.location.href = "https://school-management-2-pbpv.onrender.com/teacher-dashboard.html";
                    }

                    else {

                        window.location.href = "/";

                    }

                }, 500);

            }


            // --------------------------------------
            // NETWORK / SERVER ERROR
            // --------------------------------------

            catch (error) {

                console.error("Login error:", error);

                showMessage(
                    "Unable to connect to the server. Please try again."
                );

                const submitButton =
                    loginForm.querySelector("button[type='submit']") ||
                    loginForm.querySelector("button");

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Login";
                }

            }

        });

    }


    // --------------------------------------
    // LOAD NOTICES
    // --------------------------------------

    loadNotices();

});


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(message) {

    // Existing message element
    let messageBox =
        $("#loginMessage") ||
        $("#message") ||
        $(".login-message");


    // If no message element exists,
    // create one
    if (!messageBox) {

        messageBox = document.createElement("div");

        messageBox.id = "loginMessage";

        messageBox.style.marginTop = "15px";
        messageBox.style.padding = "10px";
        messageBox.style.textAlign = "center";
        messageBox.style.borderRadius = "6px";

        const loginForm = $("#loginForm");

        if (loginForm) {
            loginForm.appendChild(messageBox);
        }

    }


    if (messageBox) {
        messageBox.textContent = message;
    }

}


// ==========================================
// LOAD SCHOOL NOTICES
// ==========================================

async function loadNotices() {

    try {

        const response =
            await fetch(API + "/notices?published=true");

        if (!response.ok) {
            return;
        }

        const data = await response.json();


        // Find notice container
        const noticeContainer =
            $("#notices") ||
            $("#noticeList") ||
            $(".notice-list");


        if (!noticeContainer) {
            return;
        }


        // Clear existing notices
        noticeContainer.innerHTML = "";


        // Check data
        const notices =
            data.notices ||
            data.data ||
            [];


        notices.forEach((notice) => {

            const div = document.createElement("div");

            div.className = "notice";


            const title =
                document.createElement("h3");

            title.textContent =
                notice.title || "Notice";


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

        // Notices are optional.
        // Don't stop the website if notices fail.
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

    localStorage.removeItem("user");

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

        localStorage.removeItem("user");

        return null;

    }

}
