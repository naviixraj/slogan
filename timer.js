"use strict";

/*
=========================================================
 SLOGON ACADEMY — EXAM TIMER
 File: js/timer.js

 Features:
 - 180 minute countdown
 - Refresh-safe timer
 - LocalStorage persistence
 - Warning notifications
 - Last minute warning
 - Automatic submission
 - Compatible with exam.js
=========================================================
*/

(function () {
/* =====================================================
   EXAMINATION TIMER CONFIGURATION
   SLOGON ACADEMY
===================================================== */

// Dynamic examination duration: configured by admin for each test set (fallback: 180 mins)
function getExamDurationMinutes() {
    try {
        const storedSec = parseInt(localStorage.getItem("examDuration"), 10);
        if (!isNaN(storedSec) && storedSec > 0) {
            return Math.floor(storedSec / 60);
        }
    } catch (e) {}
    return 180;
}

function getExamDurationMs() {
    try {
        const storedSec = parseInt(localStorage.getItem("examDuration"), 10);
        if (!isNaN(storedSec) && storedSec > 0) {
            return storedSec * 1000;
        }
    } catch (e) {}
    return 180 * 60 * 1000;
}

    const STORAGE_KEYS = {

        endTime:
            "slogonExamEndTime",

        candidateKey:
            "slogonExamTimerCandidate",

        liveStarted:
            "slogonExamLiveStarted",

        warning10:
            "slogonTimerWarning10",

        warning5:
            "slogonTimerWarning5",

        warning1:
            "slogonTimerWarning1",

        timeUp:
            "slogonTimerTimeUp"
    };


    /* =====================================================
       TIMER STATE
    ===================================================== */

    let timerInterval = null;

    let endTime = null;

    let isRunning = false;

    let autoSubmitted = false;


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    let timerElement = null;


    /* =====================================================
       INITIALIZE
    ===================================================== */

    document.addEventListener("DOMContentLoaded", initializeTimer);


    function initializeTimer() {

        /*
        -----------------------------------------------------
        Timer should operate only on exam.html
        -----------------------------------------------------
        */

        timerElement =
            document.getElementById("timer");

        if (!timerElement) {

            console.log(
                "SLOGON TIMER: Timer element not found. Timer not started."
            );

            return;
        }


        /*
        -----------------------------------------------------
        Check whether candidate has started the exam
        -----------------------------------------------------
        */

        const examStarted =
            localStorage.getItem(
                "examStarted"
            );


        if (
            examStarted !== "true"
        ) {

            console.warn(
                "SLOGON TIMER: Exam has not been started."
            );

            return;
        }


        /*
        -----------------------------------------------------
        Create a candidate-specific timer identity
        -----------------------------------------------------
        */

        const candidateKey =
            getCandidateKey();


        const savedCandidateKey =
            localStorage.getItem(
                STORAGE_KEYS.candidateKey
            );

        const isLiveStarted =
            localStorage.getItem(
                STORAGE_KEYS.liveStarted
            ) === "true";

        const savedEndTime =
            localStorage.getItem(
                STORAGE_KEYS.endTime
            );


        /*
        -----------------------------------------------------
        CASE 1: Page was refreshed mid-exam for same candidate
        Restore the existing countdown safely
        -----------------------------------------------------
        */

        if (
            savedCandidateKey === candidateKey &&
            isLiveStarted &&
            savedEndTime
        ) {

            restoreTimer();
            startTimer();
            return;
        }


        /*
        -----------------------------------------------------
        CASE 2: Fresh exam session — Questions are still loading!
        Display full duration static in badge so candidate loses
        zero seconds while questions and options are being fetched.
        -----------------------------------------------------
        */

        const initialSeconds = Math.floor(getExamDurationMs() / 1000);
        updateDisplay(initialSeconds);
        console.log("SLOGON TIMER: Standby mode. Waiting for question paper to render before starting countdown...");
    }


    /* =====================================================
       GET CANDIDATE KEY
    ===================================================== */

    function getCandidateKey() {

        const candidateData =
            localStorage.getItem(
                "candidateInfo"
            );


        if (!candidateData) {

            return "unknown-candidate";
        }


        try {

            const candidate =
                JSON.parse(candidateData);


            return [
                candidate.registerNumber || "",
                candidate.subject || "",
                candidate.exam || ""
            ].join("|");


        } catch (error) {

            return "unknown-candidate";
        }
    }


    /* =====================================================
       START NEW TIMER
    ===================================================== */

    function startNewTimer(candidateKey) {

        /*
        -----------------------------------------------------
        Current timestamp + exact duration
        -----------------------------------------------------
        */

        endTime =
            Date.now() +
            getExamDurationMs();


        localStorage.setItem(
            STORAGE_KEYS.endTime,
            String(endTime)
        );


        localStorage.setItem(
            STORAGE_KEYS.candidateKey,
            candidateKey
        );


        /*
        -----------------------------------------------------
        Clear old warning flags
        -----------------------------------------------------
        */

        clearWarningFlags();


        autoSubmitted = false;


        console.log(
            `SLOGON TIMER: New ${getExamDurationMinutes()}-minute exam timer configured.`
        );
    }


    /* =====================================================
       START TIMER WHEN QUESTIONS ARE READY
    ===================================================== */

    function startWhenReady() {
        if (isRunning) {
            return;
        }

        timerElement = document.getElementById("timer") || timerElement;
        const candidateKey = getCandidateKey();

        startNewTimer(candidateKey);
        localStorage.setItem(STORAGE_KEYS.liveStarted, "true");

        startTimer();

        console.log(
            `SLOGON TIMER: Question paper rendered. Timer countdown officially started for ${getExamDurationMinutes()} minutes.`
        );
    }


    /* =====================================================
       RESTORE TIMER
    ===================================================== */

    function restoreTimer() {

        const savedEndTime =
            localStorage.getItem(
                STORAGE_KEYS.endTime
            );


        if (!savedEndTime) {

            startNewTimer(
                getCandidateKey()
            );

            return;
        }


        const parsedEndTime =
            Number(savedEndTime);


        if (
            !Number.isFinite(parsedEndTime)
        ) {

            startNewTimer(
                getCandidateKey()
            );

            return;
        }


        endTime =
            parsedEndTime;


        /*
        -----------------------------------------------------
        If time has already expired while browser was closed
        -----------------------------------------------------
        */

        if (
            Date.now() >= endTime
        ) {

            endTime =
                Date.now();

            updateDisplay(0);

            handleTimeUp();

            return;
        }


        console.log(
            "SLOGON TIMER: Existing timer restored."
        );
    }


    /* =====================================================
       START TIMER LOOP
    ===================================================== */

    function startTimer() {

        if (isRunning) {
            return;
        }


        if (!endTime) {

            console.error(
                "SLOGON TIMER: End time is missing."
            );

            return;
        }


        isRunning = true;


        /*
        -----------------------------------------------------
        Immediately update display
        -----------------------------------------------------
        */

        updateTimer();


        /*
        -----------------------------------------------------
        Update every 250ms

        Using actual Date.now() means timer remains
        accurate even if browser throttles intervals.
        -----------------------------------------------------
        */

        timerInterval =
            setInterval(
                updateTimer,
                250
            );


        /*
        -----------------------------------------------------
        Expose interval for exam.js
        -----------------------------------------------------
        */

        window.examTimerInterval =
            timerInterval;
    }


    /* =====================================================
       UPDATE TIMER
    ===================================================== */

    function updateTimer() {

        if (!endTime) {
            return;
        }


        const remainingMs =
            Math.max(
                0,
                endTime - Date.now()
            );


        const remainingSeconds =
            Math.ceil(
                remainingMs / 1000
            );


        updateDisplay(
            remainingSeconds
        );


        handleWarnings(
            remainingSeconds
        );


        /*
        -----------------------------------------------------
        Time Up
        -----------------------------------------------------
        */

        if (
            remainingSeconds <= 0
        ) {

            handleTimeUp();
        }
    }


    /* =====================================================
       UPDATE DISPLAY
    ===================================================== */

    function updateDisplay(
        totalSeconds
    ) {

        if (!timerElement) {
            return;
        }


        totalSeconds =
            Math.max(
                0,
                Number(totalSeconds) || 0
            );


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const seconds =
            totalSeconds % 60;


        const formattedMinutes =
            String(minutes)
                .padStart(2, "0");


        const formattedSeconds =
            String(seconds)
                .padStart(2, "0");


        timerElement.textContent =
            `${formattedMinutes}:${formattedSeconds}`;


        /*
        -----------------------------------------------------
        Timer visual states
        -----------------------------------------------------
        */

        timerElement.classList.remove(
            "timer-warning",
            "timer-danger",
            "timer-expired"
        );


        /*
        10 minutes or less
        */

        if (
            totalSeconds <= 600 &&
            totalSeconds > 60
        ) {

            timerElement.classList.add(
                "timer-warning"
            );
        }


        /*
        Last 60 seconds
        */

        if (
            totalSeconds <= 60 &&
            totalSeconds > 0
        ) {

            timerElement.classList.add(
                "timer-danger"
            );
        }


        /*
        Time expired
        */

        if (
            totalSeconds <= 0
        ) {

            timerElement.classList.add(
                "timer-expired"
            );
        }
    }


    /* =====================================================
       WARNING SYSTEM
    ===================================================== */

    function handleWarnings(
        remainingSeconds
    ) {

        /*
        -----------------------------------------------------
        10-minute warning
        -----------------------------------------------------
        */

        if (
            remainingSeconds <= 600 &&
            remainingSeconds > 599
        ) {

            showWarningOnce(
                "10 minutes remaining",
                "Only 10 minutes are left. Please review your answers.",
                STORAGE_KEYS.warning10
            );
        }


        /*
        -----------------------------------------------------
        5-minute warning
        -----------------------------------------------------
        */

        if (
            remainingSeconds <= 300 &&
            remainingSeconds > 299
        ) {

            showWarningOnce(
                "5 minutes remaining",
                "Only 5 minutes are left. Please complete your exam.",
                STORAGE_KEYS.warning5
            );
        }


        /*
        -----------------------------------------------------
        1-minute warning
        -----------------------------------------------------
        */

        if (
            remainingSeconds <= 60 &&
            remainingSeconds > 59
        ) {

            showWarningOnce(
                "1 minute remaining",
                "Only 1 minute is left. Submit your exam soon.",
                STORAGE_KEYS.warning1
            );
        }
    }


    /* =====================================================
       SHOW WARNING ONCE
    ===================================================== */

    function showWarningOnce(
        title,
        message,
        storageKey
    ) {

        const alreadyShown =
            localStorage.getItem(
                storageKey
            );


        if (
            alreadyShown === "true"
        ) {

            return;
        }


        localStorage.setItem(
            storageKey,
            "true"
        );


        showTimerNotification(
            title,
            message
        );
    }


    /* =====================================================
       TIMER NOTIFICATION
    ===================================================== */

    function showTimerNotification(
        title,
        message
    ) {

        /*
        -----------------------------------------------------
        Remove previous notification
        -----------------------------------------------------
        */

        const existing =
            document.getElementById(
                "slogonTimerNotification"
            );


        if (existing) {

            existing.remove();
        }


        const notification =
            document.createElement(
                "div"
            );


        notification.id =
            "slogonTimerNotification";


        notification.innerHTML = `
            <div class="slogon-timer-notification-title">
                ${escapeHTML(title)}
            </div>

            <div class="slogon-timer-notification-message">
                ${escapeHTML(message)}
            </div>
        `;


        /*
        -----------------------------------------------------
        Inline styling so timer works without requiring
        additional CSS.
        -----------------------------------------------------
        */

        notification.style.position =
            "fixed";

        notification.style.top =
            "24px";

        notification.style.left =
            "50%";

        notification.style.transform =
            "translateX(-50%)";

        notification.style.zIndex =
            "99999";

        notification.style.width =
            "min(90%, 420px)";

        notification.style.padding =
            "16px 20px";

        notification.style.background =
            "#0B1F3A";

        notification.style.color =
            "#FFFFFF";

        notification.style.border =
            "2px solid #D4AF37";

        notification.style.borderRadius =
            "10px";

        notification.style.boxShadow =
            "0 10px 30px rgba(0,0,0,0.20)";

        notification.style.fontFamily =
            "Inter, Poppins, sans-serif";

        notification.style.textAlign =
            "center";


        document.body.appendChild(
            notification
        );


        /*
        -----------------------------------------------------
        Automatically remove notification
        -----------------------------------------------------
        */

        setTimeout(
            function () {

                if (
                    notification &&
                    notification.parentNode
                ) {

                    notification.remove();
                }

            },
            5000
        );
    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    /* =====================================================
       TIME UP
    ===================================================== */

    function handleTimeUp() {

        /*
        -----------------------------------------------------
        Prevent multiple submissions
        -----------------------------------------------------
        */

        if (autoSubmitted) {
            return;
        }


        autoSubmitted = true;


        /*
        -----------------------------------------------------
        Stop timer immediately
        -----------------------------------------------------
        */

        stop();


        /*
        -----------------------------------------------------
        Display 00:00
        -----------------------------------------------------
        */

        updateDisplay(0);


        /*
        -----------------------------------------------------
        Show time-up notification
        -----------------------------------------------------
        */

        showTimeUpOverlay();


        /*
        -----------------------------------------------------
        Mark time-up state
        -----------------------------------------------------
        */

        localStorage.setItem(
            STORAGE_KEYS.timeUp,
            "true"
        );


        /*
        -----------------------------------------------------
        Automatically navigate to result after brief pause
        if candidate doesn't click cross or backdrop
        -----------------------------------------------------
        */

        setTimeout(
            function () {
                automaticSubmit();
            },
            3200
        );
    }


    /* =====================================================
       REDIRECT TO RESULT PAGE (SUBMIT & VIEW RESULT)
    ===================================================== */

    let hasRedirectedToResult = false;

    function redirectToResult() {
        if (hasRedirectedToResult) {
            return;
        }
        hasRedirectedToResult = true;

        console.log("SLOGON TIMER: Navigating to result page after time-up...");

        // 1. Primary: Use forceSubmit from exam.js to grade and navigate immediately
        if (
            window.SLOGONExam &&
            typeof window.SLOGONExam.forceSubmit === "function"
        ) {
            try {
                window.SLOGONExam.forceSubmit();
                return;
            } catch (err) {
                console.warn("SLOGON TIMER: forceSubmit error, attempting button fallback:", err);
            }
        }

        // 2. Button fallback: Click confirmSubmit in exam.html
        const confirmBtn =
            document.getElementById("confirmSubmit") ||
            document.getElementById("modalSubmit");

        if (confirmBtn) {
            try {
                confirmBtn.click();
                return;
            } catch (err) {
                console.warn("SLOGON TIMER: confirmSubmit click error:", err);
            }
        }

        // 3. Exam modal fallback
        if (
            window.SLOGONExam &&
            typeof window.SLOGONExam.submitExam === "function"
        ) {
            try {
                window.SLOGONExam.submitExam();
                const btn =
                    document.getElementById("confirmSubmit") ||
                    document.getElementById("modalSubmit");
                if (btn) {
                    btn.click();
                    return;
                }
            } catch (e) {}
        }

        // 4. Absolute fallback
        window.location.href = "result.html";
    }


    /* =====================================================
       TIME-UP OVERLAY
    ===================================================== */

    function showTimeUpOverlay() {

        /*
        -----------------------------------------------------
        Avoid duplicate overlay
        -----------------------------------------------------
        */

        if (
            document.getElementById(
                "slogonTimeUpOverlay"
            )
        ) {
            return;
        }


        const overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "slogonTimeUpOverlay";

        overlay.innerHTML = `
            <div class="slogon-timeup-box" style="position: relative;">

                <!-- Cross Sign in Top-Right of Banner -->
                <button type="button" class="slogon-timeup-close" id="timeUpCloseBtn" title="Close and View Result" aria-label="Close and View Result">
                    &times;
                </button>

                <div class="slogon-timeup-icon">
                    ⏰
                </div>

                <h2>
                    Time's Up
                </h2>

                <p>
                    Your examination time has ended.
                </p>

                <p style="margin-bottom: 22px;">
                    Your answers are being submitted automatically.
                </p>

                <button type="button" class="slogon-timeup-view-btn" id="timeUpViewResultBtn">
                    View Result &rarr;
                </button>

            </div>
        `;

        overlay.style.position =
            "fixed";

        overlay.style.inset =
            "0";

        overlay.style.zIndex =
            "100000";

        overlay.style.background =
            "rgba(11, 31, 58, 0.92)";

        overlay.style.backdropFilter =
            "blur(6px)";

        overlay.style.display =
            "flex";

        overlay.style.alignItems =
            "center";

        overlay.style.justifyContent =
            "center";

        overlay.style.padding =
            "20px";

        overlay.style.cursor =
            "pointer"; // Indicates backdrop is clickable to close/view result


        const box =
            overlay.querySelector(
                ".slogon-timeup-box"
            );

        box.style.width =
            "min(90%, 430px)";

        box.style.background =
            "#FFFFFF";

        box.style.borderRadius =
            "16px";

        box.style.padding =
            "36px 26px 28px";

        box.style.textAlign =
            "center";

        box.style.boxShadow =
            "0 25px 60px rgba(0,0,0,0.40)";

        box.style.cursor =
            "default"; // Reset cursor inside modal card


        /*
        -----------------------------------------------------
        Cross Button (Top Right of Banner)
        -----------------------------------------------------
        */

        const closeBtn =
            overlay.querySelector(
                ".slogon-timeup-close"
            );

        if (closeBtn) {
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "14px";
            closeBtn.style.right = "14px";
            closeBtn.style.width = "36px";
            closeBtn.style.height = "36px";
            closeBtn.style.border = "none";
            closeBtn.style.background = "#F1F5F9";
            closeBtn.style.color = "#475569";
            closeBtn.style.fontSize = "24px";
            closeBtn.style.fontWeight = "600";
            closeBtn.style.lineHeight = "1";
            closeBtn.style.borderRadius = "50%";
            closeBtn.style.cursor = "pointer";
            closeBtn.style.display = "flex";
            closeBtn.style.alignItems = "center";
            closeBtn.style.justifyContent = "center";
            closeBtn.style.transition = "all 0.15s ease";

            closeBtn.onmouseenter = function () {
                closeBtn.style.background = "#E2E8F0";
                closeBtn.style.color = "#0F172A";
            };

            closeBtn.onmouseleave = function () {
                closeBtn.style.background = "#F1F5F9";
                closeBtn.style.color = "#475569";
            };

            // Pressing cross sign -> view result page
            closeBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                redirectToResult();
            });
        }


        /*
        -----------------------------------------------------
        View Result Button
        -----------------------------------------------------
        */

        const viewBtn =
            overlay.querySelector(
                ".slogon-timeup-view-btn"
            );

        if (viewBtn) {
            viewBtn.style.minHeight = "42px";
            viewBtn.style.padding = "10px 24px";
            viewBtn.style.background = "linear-gradient(135deg, #10B981 0%, #059669 100%)";
            viewBtn.style.color = "#FFFFFF";
            viewBtn.style.border = "none";
            viewBtn.style.borderRadius = "8px";
            viewBtn.style.fontSize = "14px";
            viewBtn.style.fontWeight = "600";
            viewBtn.style.fontFamily = "Poppins, sans-serif";
            viewBtn.style.cursor = "pointer";
            viewBtn.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
            viewBtn.style.transition = "all 0.15s ease";

            viewBtn.onmouseenter = function () {
                viewBtn.style.transform = "translateY(-1px)";
                viewBtn.style.boxShadow = "0 6px 18px rgba(16, 185, 129, 0.45)";
            };

            viewBtn.onmouseleave = function () {
                viewBtn.style.transform = "translateY(0)";
                viewBtn.style.boxShadow = "0 4px 14px rgba(16, 185, 129, 0.35)";
            };

            // Pressing View Result button -> view result page
            viewBtn.addEventListener("click", function (event) {
                event.stopPropagation();
                redirectToResult();
            });
        }


        /*
        -----------------------------------------------------
        Pressing empty sides of banner (backdrop) -> view result page
        -----------------------------------------------------
        */

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                redirectToResult();
            }
        });


        /*
        -----------------------------------------------------
        Pressing Escape key -> view result page
        -----------------------------------------------------
        */

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && document.getElementById("slogonTimeUpOverlay")) {
                redirectToResult();
            }
        });


        const icon =
            overlay.querySelector(
                ".slogon-timeup-icon"
            );

        icon.style.fontSize =
            "42px";

        icon.style.marginBottom =
            "10px";


        const heading =
            overlay.querySelector(
                "h2"
            );

        heading.style.margin =
            "0 0 10px";

        heading.style.color =
            "#0B1F3A";

        heading.style.fontFamily =
            "Poppins, sans-serif";


        const paragraphs =
            overlay.querySelectorAll(
                "p"
            );

        paragraphs.forEach(
            function (paragraph) {
                paragraph.style.margin =
                    "6px 0";

                paragraph.style.color =
                    "#6B7280";

                paragraph.style.fontFamily =
                    "Inter, sans-serif";
            }
        );


        document.body.appendChild(
            overlay
        );
    }


    /* =====================================================
       AUTOMATIC SUBMISSION
    ===================================================== */

    function automaticSubmit() {
        redirectToResult();
    }


    /* =====================================================
       STOP TIMER
    ===================================================== */

    function stop() {

        if (
            timerInterval !== null
        ) {

            clearInterval(
                timerInterval
            );

            timerInterval = null;
        }


        window.examTimerInterval =
            null;


        isRunning = false;


        console.log(
            "SLOGON TIMER: Timer stopped."
        );
    }


    /* =====================================================
       CLEAR WARNING FLAGS
    ===================================================== */

    function clearWarningFlags() {

        localStorage.removeItem(
            STORAGE_KEYS.warning10
        );

        localStorage.removeItem(
            STORAGE_KEYS.warning5
        );

        localStorage.removeItem(
            STORAGE_KEYS.warning1
        );

        localStorage.removeItem(
            STORAGE_KEYS.timeUp
        );
    }


    /* =====================================================
       PUBLIC TIMER API
    ===================================================== */

    window.SLOGONTimer = {

        start: function () {
            startWhenReady();
        },

        startWhenReady: function () {
            startWhenReady();
        },

        stop: function () {
            stop();
        },

        getEndTime: function () {
            return endTime;
        },

        getRemainingSeconds: function () {
            if (!endTime) {
                return Math.floor(getExamDurationMs() / 1000);
            }

            return Math.max(
                0,
                Math.ceil(
                    (endTime - Date.now()) / 1000
                )
            );
        },

        isRunning: function () {
            return isRunning;
        }
    };

    // Custom event listener for questions ready
    window.addEventListener("slogon:questionsReady", function () {
        startWhenReady();
    });
/*
-----------------------------------------------------
INITIALIZE SLOGON EXAM TIMER
-----------------------------------------------------
*/

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTimer
    );
} else {
    initializeTimer();
}

})();