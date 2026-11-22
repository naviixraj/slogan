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
const regExamCombination = document.getElementById("regExamCombination");
const regUserId = document.getElementById("regUserId");
const regPassword = document.getElementById("regPassword");
const regConfirmPassword = document.getElementById("regConfirmPassword");
const toggleRegPassword = document.getElementById("toggleRegPassword");
const eyeOpenRegIcon = document.getElementById("eyeOpenRegIcon");
const eyeClosedRegIcon = document.getElementById("eyeClosedRegIcon");
const googleRegisterBtn = document.getElementById("googleRegisterBtn");

// Google Setup Elements (Password Creation)
const googleSetupSlide = document.getElementById("googleSetupSlide");
const googleSetupForm = document.getElementById("googleSetupForm");
const gSetupToken = document.getElementById("gSetupToken");
const gSetupPhone = document.getElementById("gSetupPhone");
const gSetupExamCombination = document.getElementById("gSetupExamCombination");
const gSetupUserId = document.getElementById("gSetupUserId");
const gSetupPassword = document.getElementById("gSetupPassword");
const gSetupConfirmPassword = document.getElementById("gSetupConfirmPassword");
const gSetupSubmitBtn = document.getElementById("gSetupSubmitBtn");
const gSetupMessage = document.getElementById("gSetupMessage");
const gVerifiedName = document.getElementById("gVerifiedName");
const gVerifiedEmail = document.getElementById("gVerifiedEmail");
const toggleGSetupPassword = document.getElementById("toggleGSetupPassword");
const eyeOpenGSetupIcon = document.getElementById("eyeOpenGSetupIcon");
const eyeClosedGSetupIcon = document.getElementById("eyeClosedGSetupIcon");
const linkBackFromGSetup = document.getElementById("linkBackFromGSetup");
const authSwitchWrapper = document.querySelector(".auth-switch-wrapper");

// Destination Navigation
const params = new URLSearchParams(window.location.search);
const requestedPage = params.get("next");
const allowedPages = ["exam", "tests", "admin", "instructions", "result", "exam.html", "tests.html", "admin.html"];
const redirectPage = "tests";

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
// GOOGLE IDENTITY SERVICES (GIS) AUTHENTICATION
// -------------------------------------------------------------

let googleClientId = null;

async function checkGoogleConfig() {
    try {
        const res = await fetch("/api/auth/google/config");
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.clientId) {
                googleClientId = data.clientId;
                initGoogleClient();
            }
        }
    } catch (e) {
        console.log("Google config lookup skipped:", e);
    }
}

function initGoogleClient() {
    if (!googleClientId) return;
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        setTimeout(initGoogleClient, 200);
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        console.log("Google Identity Services initialized successfully.");
    } catch (e) {
        console.error("GIS init error:", e);
    }
}

async function handleGoogleCredentialResponse(response) {
    const token = response && response.credential;
    if (!token) return;

    const activeMsg = currentTab === "register" ? regMessage : message;
    if (activeMsg) {
        activeMsg.style.color = "#176B52";
        activeMsg.textContent = "Verifying your Google account...";
    }

    try {
        const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ credential: token })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Google verification failed.");
        }

        // If new student, transition to Create SLOGON Password screen
        if (data.isNew && data.needsPasswordSetup) {
            showGoogleSetupSlide({
                token: data.token,
                email: data.email,
                name: data.name
            });
            return;
        }

        // Existing student: redirect to test portal
        if (activeMsg) {
            activeMsg.style.color = "#16A34A";
            activeMsg.textContent = "✓ " + (data.message || "Google verification successful! Redirecting...");
        }

        // Secure Tab Isolation: Authorize only this browser tab
        sessionStorage.setItem("slogon_tab_session", "verified_" + Date.now());

        setTimeout(() => {
            const cleanTarget = requestedPage ? requestedPage.replace(/\.html$/, "") : "";
            const targetPage = cleanTarget && cleanTarget !== "admin" && (allowedPages.includes(cleanTarget) || allowedPages.includes(requestedPage))
                ? cleanTarget
                : redirectPage;
            window.location.replace(targetPage);
        }, 500);

    } catch (err) {
        console.error("Google Auth verification error:", err);
        if (activeMsg) {
            activeMsg.style.color = "#DC2626";
            activeMsg.textContent = err.message || "Failed to authenticate with Google.";
        }
    }
}

function triggerGoogleAuth() {
    const activeMsg = currentTab === "register" ? regMessage : message;

    if (googleClientId) {
        // Direct to Google's official Account Chooser screen
        // Opens the standard Google account selection UI on both mobile and desktop
        window.location.href = "/api/auth/google/start";
    } else {
        // Graceful inline notice if Google credentials are being configured in .env / Vercel
        if (activeMsg) {
            activeMsg.style.color = "#D97706";
            activeMsg.textContent = "Google Sign-In is initializing. Please sign in or register with your User ID & Password below.";
        }
    }
}

// -------------------------------------------------------------
// GOOGLE SETUP SLIDE CONTROLLER (PASSWORD & PHONE CREATION)
// -------------------------------------------------------------

function showGoogleSetupSlide(data) {
    if (!googleSetupSlide) return;

    if (loginSlide) {
        loginSlide.classList.remove("active", "slide-in-right", "slide-in-left");
        loginSlide.style.display = "none";
    }
    if (registerSlide) {
        registerSlide.classList.remove("active", "slide-in-right", "slide-in-left");
        registerSlide.style.display = "none";
    }

    if (authSwitchWrapper) {
        authSwitchWrapper.style.display = "none";
    }

    if (gSetupToken) gSetupToken.value = data.token || "";
    if (gVerifiedName) gVerifiedName.textContent = data.name || "Google Candidate";
    if (gVerifiedEmail) gVerifiedEmail.textContent = data.email || "";

    // Prepopulate suggested User ID from email prefix
    if (gSetupUserId && !gSetupUserId.value && data.email) {
        const base = data.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
        gSetupUserId.value = base.slice(0, 20);
    }

    googleSetupSlide.style.display = "block";
    googleSetupSlide.classList.add("active", "slide-in-right");

    if (gSetupPhone) {
        setTimeout(() => gSetupPhone.focus({ preventScroll: true }), 150);
    }
}

function hideGoogleSetupSlide() {
    if (!googleSetupSlide) return;
    googleSetupSlide.classList.remove("active", "slide-in-right", "slide-in-left");
    googleSetupSlide.style.display = "none";

    if (authSwitchWrapper) {
        authSwitchWrapper.style.display = "flex";
    }

    switchToLogin();
}

if (linkBackFromGSetup) {
    linkBackFromGSetup.addEventListener("click", (e) => {
        e.preventDefault();
        hideGoogleSetupSlide();
    });
}

// Password visibility toggle for Google setup
if (toggleGSetupPassword && gSetupPassword) {
    toggleGSetupPassword.addEventListener("click", () => {
        const isPassword = gSetupPassword.type === "password";
        gSetupPassword.type = isPassword ? "text" : "password";
        if (eyeOpenGSetupIcon && eyeClosedGSetupIcon) {
            eyeOpenGSetupIcon.style.display = isPassword ? "none" : "block";
            eyeClosedGSetupIcon.style.display = isPassword ? "block" : "none";
        }
    });
}

// Handle Google Setup Form Submission (Finish Registration & Set Password)
if (googleSetupForm) {
    googleSetupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (gSetupMessage) gSetupMessage.textContent = "";

        const token = gSetupToken ? gSetupToken.value : "";
        const phone = gSetupPhone ? gSetupPhone.value.trim() : "";
        const examCombination = gSetupExamCombination ? gSetupExamCombination.value.trim() : "";
        const userId = gSetupUserId ? gSetupUserId.value.trim() : "";
        const password = gSetupPassword ? gSetupPassword.value : "";
        const confirmPassword = gSetupConfirmPassword ? gSetupConfirmPassword.value : "";

        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length < 10) {
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = "Please enter a valid 10-digit mobile phone number.";
            }
            if (gSetupPhone) gSetupPhone.focus({ preventScroll: true });
            return;
        }

        if (!examCombination) {
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = "Please choose your Exam Combination.";
            }
            if (gSetupExamCombination) gSetupExamCombination.focus({ preventScroll: true });
            return;
        }

        if (!userId || userId.length < 3) {
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = "Please choose a User ID with at least 3 characters.";
            }
            if (gSetupUserId) gSetupUserId.focus({ preventScroll: true });
            return;
        }

        if (!password || password.length < 6) {
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = "Password must be at least 6 characters long.";
            }
            if (gSetupPassword) gSetupPassword.focus({ preventScroll: true });
            return;
        }

        if (password !== confirmPassword) {
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = "Passwords do not match. Please re-enter.";
            }
            if (gSetupConfirmPassword) gSetupConfirmPassword.focus({ preventScroll: true });
            return;
        }

        if (gSetupSubmitBtn) {
            gSetupSubmitBtn.disabled = true;
            gSetupSubmitBtn.textContent = "FINISHING REGISTRATION...";
        }

        try {
            const res = await fetch("/api/auth/google/complete-registration", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ token, phone, examCombination, userId, password, confirmPassword })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Registration failed. Please try again.");
            }

            // Secure Tab Isolation: Authorize only this browser tab
            sessionStorage.setItem("slogon_tab_session", "verified_" + Date.now());

            if (gSetupMessage) {
                gSetupMessage.style.color = "#16A34A";
                gSetupMessage.textContent = "✓ " + (data.message || "Account created! Automatically logging you in...");
            }

            const cleanTarget = requestedPage ? requestedPage.replace(/\.html$/, "") : "";
            const targetPage = cleanTarget && cleanTarget !== "admin" && (allowedPages.includes(cleanTarget) || allowedPages.includes(requestedPage))
                ? cleanTarget
                : redirectPage;

            setTimeout(() => {
                window.location.replace(targetPage);
            }, 600);

        } catch (err) {
            console.error("Complete registration error:", err);
            if (gSetupMessage) {
                gSetupMessage.style.color = "#DC2626";
                gSetupMessage.textContent = err.message;
            }
            if (gSetupSubmitBtn) {
                gSetupSubmitBtn.disabled = false;
                gSetupSubmitBtn.textContent = "FINISH REGISTRATION & START";
            }
        }
    });
}

if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", triggerGoogleAuth);
}

if (googleRegisterBtn) {
    googleRegisterBtn.addEventListener("click", triggerGoogleAuth);
}

// Check URL query parameters for Google OAuth return or errors
if (params.get("complete_reg") === "1" && params.get("token")) {
    showGoogleSetupSlide({
        token: params.get("token"),
        email: params.get("email") || "",
        name: params.get("name") || ""
    });
} else if (params.get("error") === "google_not_configured") {
    if (message) {
        message.style.color = "#D97706";
        message.textContent = "Google Sign-In is initializing. Please sign in with your User ID & Password.";
    }
} else if (params.get("error") === "google_denied") {
    if (message) {
        message.style.color = "#D97706";
        message.textContent = "Google account selection was cancelled.";
    }
}

// Check Google config on page load
checkGoogleConfig();

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

            // Secure Tab Isolation: Authorize only this browser tab
            sessionStorage.setItem("slogon_tab_session", "verified_" + Date.now());

            const userRole = (sessionData.candidate && sessionData.candidate.role) || "Student";
            setTimeout(() => {
                if (userRole === "Admin" || userRole === "Master Admin") {
                    window.location.replace("admin");
                } else {
                    const cleanTarget = requestedPage ? requestedPage.replace(/\.html$/, "") : "";
                    const targetPage = cleanTarget && cleanTarget !== "admin" && (allowedPages.includes(cleanTarget) || allowedPages.includes(requestedPage))
                        ? cleanTarget
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

        const examCombination = regExamCombination ? regExamCombination.value.trim() : "";
        if (!examCombination) {
            if (regMessage) {
                regMessage.style.color = "#DC2626";
                regMessage.textContent = "Please choose your Exam Combination.";
            }
            if (regExamCombination) regExamCombination.focus({ preventScroll: true });
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
                    examCombination,
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
                regMessage.textContent = "✓ Account created! Automatically logging you in...";
            }

            // Auto-Login Guarantee: verify session or immediately authenticate
            let sessionVerified = false;
            try {
                const sessionRes = await fetch("/api/me", {
                    method: "GET",
                    credentials: "same-origin"
                });
                const sessionData = await sessionRes.json();
                if (sessionRes.ok && sessionData.success && sessionData.authenticated) {
                    sessionVerified = true;
                }
            } catch (sessErr) {
                console.log("Pre-session check skipped:", sessErr);
            }

            if (!sessionVerified) {
                // Instantly authenticate session using newly created credentials
                try {
                    await fetch("/api/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({ userId, password })
                    });
                } catch (loginErr) {
                    console.warn("Direct login fallback notice:", loginErr);
                }
            }

            // Secure Tab Isolation: Authorize only this browser tab
            sessionStorage.setItem("slogon_tab_session", "verified_" + Date.now());

            // Cache candidate info for immediate seamless load on tests.html
            localStorage.setItem("candidateInfo", JSON.stringify({
                name: candidateName,
                registerNumber: userId,
                email: email,
                role: "Student",
                examCombination: examCombination || "Paper 1"
            }));

            const cleanTarget = requestedPage ? requestedPage.replace(/\.html$/, "") : "";
            const targetPage = cleanTarget && cleanTarget !== "admin" && (allowedPages.includes(cleanTarget) || allowedPages.includes(requestedPage))
                ? cleanTarget
                : redirectPage;

            setTimeout(() => {
                window.location.replace(targetPage);
            }, 500);

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
