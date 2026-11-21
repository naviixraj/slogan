
// If opened via VS Code Live Server (port 5500/5501/etc.), auto-redirect to the Express server on port 3000
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "5502") {
        window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}`);
    }
}

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");
const loginView = document.getElementById("loginView");
const profileSetupView = document.getElementById("profileSetupView");
const profileSetupForm = document.getElementById("profileSetupForm");
const setupName = document.getElementById("setupName");
const setupEmail = document.getElementById("setupEmail");
const setupPhone = document.getElementById("setupPhone");
const saveProfileButton = document.getElementById("saveProfileButton");
const setupMessage = document.getElementById("setupMessage");

/* PASSWORD VISIBILITY TOGGLE */
const passwordInput = document.getElementById("password");
const togglePasswordButton = document.getElementById("togglePassword");
const eyeOpenIcon = document.getElementById("eyeOpenIcon");
const eyeClosedIcon = document.getElementById("eyeClosedIcon");

if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";
        passwordInput.type = isPassword ? "text" : "password";

        if (eyeOpenIcon && eyeClosedIcon) {
            eyeOpenIcon.style.display = isPassword ? "none" : "block";
            eyeClosedIcon.style.display = isPassword ? "block" : "none";
        }

        const label = isPassword ? "Hide password" : "Show password";
        togglePasswordButton.setAttribute("aria-label", label);
        togglePasswordButton.setAttribute("title", label);
        passwordInput.focus();
    });
}

/* GET THE REQUESTED DESTINATION */

const params = new URLSearchParams(window.location.search);

const requestedPage = params.get("next");

/* ALLOW ONLY APPROVED LOCAL DESTINATIONS */

const allowedPages = [
    "exam.html",
    "tests.html",
    "admin.html"
];

const redirectPage = "tests.html";

function showProfileSetup(candidate = {}) {
    if (loginView) loginView.style.display = "none";
    if (profileSetupView) profileSetupView.style.display = "block";

    if (candidate.name && !candidate.name.startsWith("Candidate ") && setupName) {
        setupName.value = candidate.name;
    }
    if (candidate.email && !candidate.email.endsWith("@slogon.edu") && setupEmail) {
        setupEmail.value = candidate.email;
    }
    if (candidate.phone && setupPhone) {
        setupPhone.value = candidate.phone;
    }

    if (setupName && !setupName.value) {
        setupName.focus();
    } else if (setupEmail && !setupEmail.value) {
        setupEmail.focus();
    } else if (setupPhone) {
        setupPhone.focus();
    }
}

// Check if user was redirected back to complete their profile
if (params.get("completeProfile") === "1") {
    fetch("/api/me", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.needsProfileSetup) {
                showProfileSetup(data.candidate);
            }
        })
        .catch(err => console.log("Profile check skipped:", err));
}

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "VERIFYING...";

    try {

        const response = await fetch("/api/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                userId,
                password
            })
        });

        const rawResponse = await response.text();

        console.log("HTTP Status:", response.status);
        console.log("Server Response:", rawResponse);

        if (!rawResponse) {
            throw new Error(
                `Server returned an empty response. HTTP ${response.status}.`
            );
        }

        let result;

        try {
            result = JSON.parse(rawResponse);
        } catch {
            throw new Error(
                "Server returned invalid JSON. Check the backend terminal."
            );
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Login failed."
            );
        }

        /* VERIFY THE NEW LOGIN SESSION */

        const sessionResponse = await fetch("/api/me", {
            method: "GET",
            credentials: "same-origin"
        });

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.success) {
            throw new Error(
                "Login succeeded, but candidate session verification failed."
            );
        }

        /* CHECK IF FIRST-TIME PROFILE SETUP IS REQUIRED */
        if (result.firstLogin === true || sessionData.needsProfileSetup === true) {
            loginButton.disabled = false;
            loginButton.textContent = "LOGIN";
            showProfileSetup(result.candidate || sessionData.candidate);
            return;
        }

        /* REDIRECT BASED ON USER ROLE */

        const userRole = (sessionData.candidate && sessionData.candidate.role) || "Student";

        if (userRole === "Admin" || userRole === "Master Admin") {
            window.location.replace("admin.html");
        } else {
            const targetPage = requestedPage && requestedPage !== "admin.html" && allowedPages.includes(requestedPage) ? requestedPage : redirectPage;
            window.location.replace(targetPage);
        }

    } catch (error) {

        console.error("Login error:", error);

        message.style.color = "#C0392B";

        if (error.message && (error.message.includes("405") || error.message.includes("404"))) {
            message.innerHTML = `⚠️ <strong>Port Mismatch:</strong> You are browsing via VS Code Live Server (port ${window.location.port || '5500'}), which cannot process login requests.<br><a href="http://localhost:3000/login.html" style="display: inline-block; margin-top: 8px; color: #176B52; font-weight: 700; text-decoration: underline;">👉 Click here to open on http://localhost:3000/login.html</a>`;
        } else if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
            message.innerHTML = `⚠️ <strong>Server Offline:</strong> The backend server is not reachable on port 3000.<br>Please ensure <code>npm start</code> or <code>node Backend/server.js</code> is running.`;
        } else {
            message.textContent = error.message;
        }

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";
    }

});

/* SUBMIT PROFILE COMPLETION FORM */
if (profileSetupForm) {
    profileSetupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const candidateName = setupName ? setupName.value.trim() : "";
        const email = setupEmail ? setupEmail.value.trim() : "";
        const phone = setupPhone ? setupPhone.value.trim() : "";

        if (setupMessage) {
            setupMessage.textContent = "";
            setupMessage.style.color = "";
        }

        if (!candidateName || candidateName.length < 2) {
            if (setupMessage) {
                setupMessage.textContent = "Please enter your full name.";
                setupMessage.style.color = "#DC2626";
            }
            if (setupName) setupName.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            if (setupMessage) {
                setupMessage.textContent = "Please enter a valid email address.";
                setupMessage.style.color = "#DC2626";
            }
            if (setupEmail) setupEmail.focus();
            return;
        }

        const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
        if (!phone || cleanPhone.length < 10) {
            if (setupMessage) {
                setupMessage.textContent = "Please enter a valid 10-digit mobile number.";
                setupMessage.style.color = "#DC2626";
            }
            if (setupPhone) setupPhone.focus();
            return;
        }

        if (saveProfileButton) {
            saveProfileButton.disabled = true;
            saveProfileButton.textContent = "SAVING DETAILS...";
        }

        try {
            const resp = await fetch("/api/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    candidateName,
                    email,
                    phone
                })
            });

            const data = await resp.json();

            if (!resp.ok || !data.success) {
                throw new Error(data.message || "Failed to save profile details.");
            }

            if (setupMessage) {
                setupMessage.style.color = "#16A34A";
                setupMessage.textContent = "✓ Details saved! Redirecting to your examination dashboard...";
            }

            const targetPage = requestedPage && requestedPage !== "admin.html" && allowedPages.includes(requestedPage) ? requestedPage : redirectPage;
            setTimeout(() => {
                window.location.replace(targetPage);
            }, 600);

        } catch (err) {
            console.error("Save profile error:", err);
            if (setupMessage) {
                setupMessage.style.color = "#DC2626";
                setupMessage.textContent = err.message || "Failed to update profile. Please try again.";
            }
            if (saveProfileButton) {
                saveProfileButton.disabled = false;
                saveProfileButton.textContent = "SAVE & ENTER EXAMINATION PORTAL";
            }
        }
    });
}


