/**
 * SLOGON ACADEMY - ENTERPRISE ZERO-FLASH SECURITY & ROUTE GUARD
 * File: auth-guard.js
 * 
 * Strict Single-Tab Isolation & Clean URL Protection:
 * 1. Blocks any copied/pasted link from opening in another tab or window.
 * 2. Only allows authenticated navigation within the active browser tab.
 * 3. Restricts Admin pages to Administrator role only.
 * 4. Locks exam so it can only be started from instructions.
 * 5. Uses clean, professional URLs without .html extensions.
 */
(function () {
    "use strict";

    var pathname = (window.location.pathname || "").toLowerCase();

    // Do nothing if already on login page or root
    if (pathname === "/" || pathname === "" || pathname.indexOf("/login") !== -1 || pathname.indexOf("login.html") !== -1) {
        return;
    }

    // 1. Immediately hide document to prevent any UI flashing
    if (document.documentElement) {
        document.documentElement.style.visibility = "hidden";
    }

    // 2. CHECK ONE-TIME ENTRY TOKEN (From Google OAuth redirect)
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("auth_token")) {
        sessionStorage.setItem("slogon_tab_session", "verified_" + Date.now());
        // Clean URL immediately so token cannot be copied or shared
        urlParams.delete("auth_token");
        var cleanSearch = urlParams.toString() ? ("?" + urlParams.toString()) : "";
        window.history.replaceState({}, document.title, window.location.pathname + cleanSearch);
    }

    // 3. STRICT TAB ISOLATION (Detect direct URL copy-paste into new tab/window)
    var tabSession = sessionStorage.getItem("slogon_tab_session");
    if (!tabSession) {
        console.warn("[SECURITY LOCK] Direct URL copy-paste detected! Blocked access to:", pathname);
        // Wipe any storage to prevent session leakage
        sessionStorage.clear();
        // Redirect immediately to clean /login
        window.location.replace("login");
        return;
    }

    // 4. Prevent Back-Forward Cache (bfcache) peeking
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    });

    var isAdminPage = pathname.indexOf("admin") !== -1;
    var isExamPage = pathname.indexOf("exam") !== -1;

    // 5. Verify session credentials against server
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
                console.warn("[SECURITY GUARD] Student attempted to access Admin portal. Redirecting to tests.");
                window.location.replace("tests");
                return;
            }

            // Exam Page Guard: Direct URL access without starting from portal is blocked
            if (isExamPage) {
                var activeSession = sessionStorage.getItem("slogon_active_exam_session");
                var examStarted = localStorage.getItem("examStarted");

                if (!activeSession || examStarted !== "true") {
                    console.warn("[SECURITY GUARD] Direct URL copy-paste to exam blocked. Must start test properly.");
                    window.location.replace("tests");
                    return;
                }
            }

            // Save verified candidate in window scope for instant page availability
            window.slogonVerifiedCandidate = candidate;

            // Authentication & Authorization passed: Reveal UI
            if (document.documentElement) {
                document.documentElement.style.visibility = "visible";
            }
        })
        .catch(function () {
            // Not authenticated: Redirect immediately to clean /login
            sessionStorage.clear();
            window.location.replace("login");
        });
})();
