/**
 * SLOGON ACADEMY - ENTERPRISE ZERO-FLASH SECURITY & ROUTE GUARD
 * File: auth-guard.js
 * 
 * Protects internal portal pages against:
 * 1. Deep-linking / URL sharing / direct copy-pasting
 * 2. Unauthorized role access (Students accessing Admin)
 * 3. Bypassing exam flow (Opening exam.html directly)
 * 4. Browser history and Back-Forward Cache (bfcache) peeking
 */
(function () {
    "use strict";

    var pathname = (window.location.pathname || "").toLowerCase();

    // Do nothing if already on login page
    if (pathname.indexOf("login") !== -1 || pathname === "/" || pathname === "") {
        return;
    }

    // 1. Immediately hide document to prevent any UI flashing before verification
    if (document.documentElement) {
        document.documentElement.style.visibility = "hidden";
    }

    // Safety fallback: reveal page after 3.5 seconds if network hangs
    var revealTimer = setTimeout(function () {
        if (document.documentElement) {
            document.documentElement.style.visibility = "visible";
        }
    }, 3500);

    function revealUI() {
        clearTimeout(revealTimer);
        if (document.documentElement) {
            document.documentElement.style.visibility = "visible";
        }
    }

    // 2. Prevent Back-Forward Cache (bfcache) peeking after logout
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    var isAdminPage = pathname.indexOf("admin") !== -1;
    var isExamPage = pathname.indexOf("exam.html") !== -1;

    // 3. Verify session credentials against server
    fetch("/api/me", {
        method: "GET",
        credentials: "same-origin",
        headers: { "Accept": "application/json" }
    })
        .then(function (res) {
            if (!res.ok) throw new Error("Unauthenticated");
            return res.json();
        })
        .then(function (data) {
            if (!data || (!data.success && !data.authenticated) || !data.candidate) {
                throw new Error("Unauthorized");
            }

            var candidate = data.candidate;
            var role = String(candidate.role || "Student").toLowerCase();

            // Admin Page Guard: Only Admins are permitted
            if (isAdminPage && role !== "admin") {
                console.warn("[SECURITY GUARD] Student attempted to access Admin portal. Redirecting to tests.html.");
                window.location.replace("tests.html");
                return;
            }

            // Exam Page Guard: Direct URL access without starting from portal is blocked
            if (isExamPage) {
                var activeSession = sessionStorage.getItem("slogon_active_exam_session");
                var examStarted = localStorage.getItem("examStarted");

                if (!activeSession || examStarted !== "true") {
                    console.warn("[SECURITY GUARD] Direct URL copy-paste to exam.html blocked. Must start test properly.");
                    window.location.replace("tests.html");
                    return;
                }
            }

            // Save verified candidate in window scope for instant page availability
            window.slogonVerifiedCandidate = candidate;

            // Authentication & Authorization passed: Reveal UI
            revealUI();
        })
        .catch(function (err) {
            console.warn("[SECURITY GUARD] Access check failed:", err.message);

            // Check if candidate is remembered in localStorage as temporary fallback before kicking
            var localCandidate = null;
            try {
                var raw = localStorage.getItem("candidateInfo") || localStorage.getItem("currentUser");
                if (raw) localCandidate = JSON.parse(raw);
            } catch (e) {}

            if (localCandidate && localCandidate.userId && !isAdminPage) {
                // Allow student to proceed with local credentials
                revealUI();
                return;
            }

            // Redirect immediately to login.html with return destination
            console.warn("[SECURITY GUARD] Unauthenticated deep-link blocked. Redirecting to login.");
            var returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.replace("login.html?next=" + returnUrl);
        });
})();
