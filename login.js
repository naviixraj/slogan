"use strict";

// If opened via VS Code Live Server (port 5500/5501/etc.), auto-redirect to the Express server on port 3000
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "5502") {
        window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}`);
    }
}

// -------------------------------------------------------------
// DOM ELEMENTS
// -------------------------------------------------------------

// Slider Elements
const authSwitchBg = document.getElementById("authSwitchBg");
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegisterBtn = document.getElementById("tabRegisterBtn");
const loginSlide = document.getElementById("loginSlide");
const registerSlide = document.getElementById("registerSlide");
const authCard = document.getElementById("authCard");
const linkToRegister = document.getElementById("linkToRegister");
const linkToLogin = document.getElementById("linkToLogin");

// Login Elements
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const passwordInput = document.getElementById("password");
const togglePasswordButton = document.getElementById("togglePassword");
const eyeOpenIcon = document.getElementById("eyeOpenIcon");
const eyeClosedIcon = document.getElementById("eyeClosedIcon");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// Register Elements
const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const regMessage = document.getElementById("regMessage");
const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPhone = document.getElementById("regPhone");
const regUserId = document.getElementById("regUserId");
const regPassword = document.getElementById("regPassword");
const regConfirmPassword = document.getElementById("regConfirmPassword");
const toggleRegPassword = document.getElementById("toggleRegPassword");
const eyeOpenRegIcon = document.getElementById("eyeOpenRegIcon");
const eyeClosedRegIcon = document.getElementById("eyeClosedRegIcon");
const googleRegisterBtn = document.getElementById("googleRegisterBtn");

// Destination Navigation
const params = new URLSearchParams(window.location.search);
const requestedPage = params.get("next");
const allowedPages = ["exam.html", "tests.html", "admin.html"];
const redirectPage = "tests.html";

// -------------------------------------------------------------
// SLIDING TAB SWITCH CONTROLLER
// -------------------------------------------------------------

let currentTab = "login"; // "login" or "register"

function switchToLogin() {
    currentTab = "login";
    if (authSwitchBg) authSwitchBg.style.transform = "translateX(0%)";

    if (tabLoginBtn) {
        tabLoginBtn.classList.add("active");
        tabLoginBtn.setAttribute("aria-selected", "true");
    }
    if (tabRegisterBtn) {
        tabRegisterBtn.classList.remove("active");
        tabRegisterBtn.setAttribute("aria-selected", "false");
    }

    if (registerSlide) {
        registerSlide.classList.remove("active", "slide-in-right", "slide-in-left");
    }
    if (loginSlide) {
        loginSlide.classList.remove("slide-in-right");
        loginSlide.classList.add("active", "slide-in-left");
    }

    if (regMessage) regMessage.textContent = "";
}

function switchToRegister() {
    currentTab = "register";
    if (authSwitchBg) authSwitchBg.style.transform = "translateX(100%)";

    if (tabRegisterBtn) {
        tabRegisterBtn.classList.add("active");
        tabRegisterBtn.setAttribute("aria-selected", "true");
    }
    if (tabLoginBtn) {
        tabLoginBtn.classList.remove("active");
        tabLoginBtn.setAttribute("aria-selected", "false");
    }

    if (loginSlide) {
        loginSlide.classList.remove("active", "slide-in-right", "slide-in-left");
    }
    if (registerSlide) {
        registerSlide.classList.remove("slide-in-left");
        registerSlide.classList.add("active", "slide-in-right");
    }

    if (message) message.textContent = "";
    if (regName && !regName.value) {
        setTimeout(() => regName.focus({ preventScroll: true }), 100);
    }
}

if (tabLoginBtn) tabLoginBtn.addEventListener("click", switchToLogin);
if (tabRegisterBtn) tabRegisterBtn.addEventListener("click", switchToRegister);

if (linkToRegister) {
    linkToRegister.addEventListener("click", (e) => {
        e.preventDefault();
        switchToRegister();
    });
}

if (linkToLogin) {
    linkToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        switchToLogin();
    });
}

// Check URL param: ?tab=register or ?action=register
if (params.get("tab") === "register" || params.get("register") === "1") {
    switchToRegister();
}

// -------------------------------------------------------------
// TOUCH SWIPE GESTURE SUPPORT (MOBILE)
// -------------------------------------------------------------

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

if (authCard) {
    authCard.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    authCard.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleGesture();
    }, { passive: true });
}

function handleGesture() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0 && currentTab === "login") {
            switchToRegister();
        } else if (deltaX > 0 && currentTab === "register") {
            switchToLogin();
        }
    }
}

// -------------------------------------------------------------
// PASSWORD VISIBILITY TOGGLES
// -------------------------------------------------------------

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
        passwordInput.focus({ preventScroll: true });
    });
}

if (toggleRegPassword && regPassword) {
    toggleRegPassword.addEventListener("click", () => {
        const isPassword = regPassword.type === "password";
        regPassword.type = isPassword ? "text" : "password";
        if (regConfirmPassword) {
            regConfirmPassword.type = isPassword ? "text" : "password";
        }

        if (eyeOpenRegIcon && eyeClosedRegIcon) {
            eyeOpenRegIcon.style.display = isPassword ? "none" : "block";
            eyeClosedRegIcon.style.display = isPassword ? "block" : "none";
        }

        const label = isPassword ? "Hide password" : "Show password";
        toggleRegPassword.setAttribute("aria-label", label);
        toggleRegPassword.setAttribute("title", label);
        regPassword.focus({ preventScroll: true });
    });
}

// -------------------------------------------------------------
// GOOGLE AUTH & AUTOFILL PROMPT
// -------------------------------------------------------------

function handleGoogleAuthPrompt(isRegister = false) {
    const emailHint = prompt(
        "Google Authentication:\nEnter your Google Email to autofill your SLOGON candidate profile:"
    );

    if (emailHint && emailHint.trim()) {
        const clean = emailHint.trim().toLowerCase();
        if (isRegister) {
            if (regEmail) regEmail.value = clean;
            const nameGuess = clean.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            if (regName && !regName.value) regName.value = nameGuess;
            const userGuess = clean.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
            if (regUserId && !regUserId.value) regUserId.value = userGuess;
            if (regPhone) regPhone.focus({ preventScroll: true });
            if (regMessage) {
                regMessage.style.color = "#16A34A";
                regMessage.textContent = `✓ Google details autofilled from ${clean}. Please set your phone & SLOGON password.`;
            }
        } else {
            const userField = document.getElementById("userId");
            if (userField) userField.value = clean.split("@")[0];
            if (passwordInput) passwordInput.focus({ preventScroll: true });
        }
    }
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => handleGoogleAuthPrompt(false));
}

if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener("click", () => handleGoogleAuthPrompt(true));
}

// -------------------------------------------------------------
// LOGIN FORM SUBMISSION
// -------------------------------------------------------------

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const userId = document.getElementById("userId").value.trim();
        const password = document.getElementById("password").value;

        if (message) {
            message.textContent = "";
            message.style.color = "";
        }

        loginButton.disabled = true;
        loginButton.textContent = "VERIFYING...";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ userId, password })
            });

            const rawResponse = await response.text();

            if (!rawResponse) {
                throw new Error(`Server returned an empty response (HTTP ${response.status}).`);
            }

            let result;
            try {
                result = JSON.parse(rawResponse);
            } catch {
                throw new Error("Server returned invalid JSON response.");
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Invalid User ID or password.");
            }

            // Verify session
            const sessionResponse = await fetch("/api/me", {
                method: "GET",
                credentials: "same-origin"
            });
            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok || !sessionData.success) {
                throw new Error("Login succeeded, but candidate session verification failed.");
            }

            if (message) {
                message.style.color = "#16A34A";
                message.textContent = "✓ Login successful! Opening examination portal...";
            }

            const userRole = (sessionData.candidate && sessionData.candidate.role) || "Student";
            setTimeout(() => {
                if (userRole === "Admin" || userRole === "Master Admin") {
                    window.location.replace("admin.html");
                } else {
                    const targetPage = requestedPage && requestedPage !== "admin.html" && allowedPages.includes(requestedPage)
                        ? requestedPage
                        : redirectPage;
                    window.location.replace(targetPage);
                }
            }, 500);

        } catch (error) {
            console.error("Login error:", error);
            if (message) {
                message.style.color = "#C0392B";
                message.textContent = error.message;
            }
            loginButton.disabled = false;
            loginButton.textContent = "LOGIN";
        }
    });
}

// -------------------------------------------------------------
// REGISTRATION FORM SUBMISSION
// -------------------------------------------------------------

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const candidateName = regName ? regName.value.trim() : "";
        const email = regEmail ? regEmail.value.trim().toLowerCase() : "";
        const phone = regPhone ? regPhone.value.trim() : "";
        const userId = regUserId ? regUserId.value.trim().toLowerCase() : "";
        const password = regPassword ? regPassword.value : "";
        const confirmPassword = regConfirmPassword ? regConfirmPassword.value : "";

        if (regMessage) {
            regMessage.textContent = "";
            regMessage.style.color = "";
        }

        // Client-side validations
        if (!candidateName || candidateName.length < 2) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Please enter your full name (minimum 2 characters).";
            }
            if (regName) regName.focus({ preventScroll: true });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Please enter a valid email address.";
            }
            if (regEmail) regEmail.focus({ preventScroll: true });
            return;
        }

        const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
        if (!phone || cleanPhone.length < 10) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Please enter a valid 10-digit mobile phone number.";
            }
            if (regPhone) regPhone.focus({ preventScroll: true });
            return;
        }

        if (!userId || userId.length < 3 || userId.length > 30) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Account User ID must be between 3 and 30 characters.";
            }
            if (regUserId) regUserId.focus({ preventScroll: true });
            return;
        }

        if (!/^[a-zA-Z0-9_\-\.]+$/.test(userId)) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "User ID may only contain letters, numbers, underscores, and dots (no spaces).";
            }
            if (regUserId) regUserId.focus({ preventScroll: true });
            return;
        }

        if (!password || password.length < 6) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Password must be at least 6 characters long.";
            }
            if (regPassword) regPassword.focus({ preventScroll: true });
            return;
        }

        if (password !== confirmPassword) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Passwords do not match. Please re-enter your password.";
            }
            if (regConfirmPassword) regConfirmPassword.focus({ preventScroll: true });
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = "CREATING ACCOUNT...";

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    candidateName,
                    email,
                    phone,
                    userId,
                    password,
                    confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to create account. Please try again.");
            }

            if (regMessage) {
                regMessage.style.color = "#16A34A";
                regMessage.textContent = "✓ Account created! Redirecting to your examination dashboard...";
            }

            const targetPage = requestedPage && requestedPage !== "admin.html" && allowedPages.includes(requestedPage)
                ? requestedPage
                : redirectPage;

            setTimeout(() => {
                window.location.replace(targetPage);
            }, 600);

        } catch (error) {
            console.error("Register error:", error);
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = error.message;
            }
            registerButton.disabled = false;
            registerButton.textContent = "CREATE ACCOUNT";
        }
    });
}
