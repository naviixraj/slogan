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

// Total examination duration: 180 minutes
const EXAM_DURATION_MINUTES = 180;

// Convert minutes into milliseconds
const EXAM_DURATION_MS =
    EXAM_DURATION_MINUTES * 60 * 1000;


    const STORAGE_KEYS = {

        endTime:
            "slogonExamEndTime",

        candidateKey:
            "slogonExamTimerCandidate",

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

    document.addEventListener( "DOMContentLoaded",initializeTimer);


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


        /*
        -----------------------------------------------------
        New candidate / new exam session
        -----------------------------------------------------
        */

        if (
            !savedCandidateKey ||
            savedCandidateKey !== candidateKey
        ) {

            startNewTimer(candidateKey);

        } else {

            restoreTimer();
        }


        /*
        -----------------------------------------------------
        Start timer
        -----------------------------------------------------
        */

        startTimer();
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
       Current timestamp + 180 minutes
        -----------------------------------------------------
        */

        endTime =
            Date.now() +
            EXAM_DURATION_MS;


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
            "SLOGON TIMER: New 60-minute exam timer started."
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
        Give the user a short moment to see the message,
        then automatically submit the examination.
        -----------------------------------------------------
        */

        setTimeout(
            function () {

                automaticSubmit();

            },
            1800
        );
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
            <div class="slogon-timeup-box">

                <div class="slogon-timeup-icon">
                    ⏰
                </div>

                <h2>
                    Time's Up
                </h2>

                <p>
                    Your examination time has ended.
                </p>

                <p>
                    Your answers are being submitted automatically.
                </p>

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

        overlay.style.display =
            "flex";

        overlay.style.alignItems =
            "center";

        overlay.style.justifyContent =
            "center";

        overlay.style.padding =
            "20px";


        const box =
            overlay.querySelector(
                ".slogon-timeup-box"
            );


        box.style.width =
            "min(90%, 430px)";

        box.style.background =
            "#FFFFFF";

        box.style.borderRadius =
            "14px";

        box.style.padding =
            "35px 25px";

        box.style.textAlign =
            "center";

        box.style.boxShadow =
            "0 20px 60px rgba(0,0,0,0.30)";


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
                    "7px 0";

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

        /*
        -----------------------------------------------------
        exam.js exposes SLOGONExam.submitExam().
        That function opens the confirmation modal.

        We then automatically click its final Submit button.
        -----------------------------------------------------
        */

        if (
            window.SLOGONExam &&
            typeof window.SLOGONExam.submitExam ===
            "function"
        ) {

            try {

                /*
                Open submit process
                */

                window.SLOGONExam.submitExam();


                /*
                -------------------------------------------------
                Give the modal a moment to render, then click
                the actual final Submit Test button.
                -------------------------------------------------
                */

                setTimeout(
                    function () {

                        const finalSubmitButton =
                            document.getElementById(
                                "modalSubmit"
                            );


                        if (
                            finalSubmitButton
                        ) {

                            finalSubmitButton.click();

                        } else {

                            /*
                            -----------------------------------------
                            Fallback:
                            If the modal button is unavailable,
                            use the public forceSubmit API if it
                            exists.
                            -----------------------------------------
                            */

                            if (
                                window.SLOGONExam &&
                                typeof window.SLOGONExam.forceSubmit ===
                                "function"
                            ) {

                                window.SLOGONExam.forceSubmit();

                            } else {

                                console.error(
                                    "SLOGON TIMER: Automatic submit button not found."
                                );
                            }
                        }

                    },
                    100
                );


            } catch (error) {

                console.error(
                    "SLOGON TIMER: Automatic submission failed:",
                    error
                );
            }

        } else {

            console.error(
                "SLOGON TIMER: exam.js is not available."
            );
        }
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

            if (!isRunning) {

                startTimer();
            }
        },


        stop: function () {

            stop();
        },


        getEndTime: function () {

            return endTime;
        },


        getRemainingSeconds:
            function () {

                if (!endTime) {
                    return 0;
                }


                return Math.max(
                    0,
                    Math.ceil(
                        (
                            endTime -
                            Date.now()
                        ) / 1000
                    )
                );
            },


        isRunning: function () {

            return isRunning;
        }
    };
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