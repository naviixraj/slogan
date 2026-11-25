"use strict";

/*
=========================================================
SLOGON ACADEMY
Result Page Controller
File: js/result.js
=========================================================
*/

// -------------------------------------------------------
// GLOBAL CONFIGURATION
// -------------------------------------------------------

const RESULT_STORAGE_KEY = "examResult";

const EXAM_STATE_KEYS = [
    "examAnswers",
    "questionStatus",
    "examCurrentQuestion",
    // Note: Retain examResult and slogon_last_exam_result so candidate can view report
    "examStarted",

    // Timer keys
    "slogonExamEndTime",
    "slogonExamTimerCandidate",
    "slogonTimerWarning10",
    "slogonTimerWarning5",
    "slogonTimerWarning1",
    "slogonTimerTimeUp"
];


// -------------------------------------------------------
// DOM READY
// -------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {

    console.log("SLOGON ACADEMY: Result page loading...");

    initializeResultPage();

});


// -------------------------------------------------------
// INITIALIZE RESULT PAGE
// -------------------------------------------------------

async function initializeResultPage() {

    let examResult = getExamResult();

    // Fallback to latest server-saved result if localStorage is empty
    if (!examResult) {
        try {
            const res = await fetch("/api/student/results/latest", { credentials: "same-origin" });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.result) {
                    examResult = data.result;
                    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(examResult));
                    localStorage.setItem("slogon_last_exam_result", JSON.stringify(examResult));
                }
            }
        } catch (e) {
            console.warn("Could not fetch latest server result:", e);
        }
    }

    // Fallback if no active submission is found in session or server
    if (!examResult) {
        console.info(
            "SLOGON ACADEMY: Loading candidate result report..."
        );

        examResult = getFallbackExamResult();
    }

    console.log(
        "SLOGON ACADEMY: Exam result loaded successfully."
    );

    console.log(examResult);

    populateCandidateInformation(examResult);

    populateScoreInformation(examResult);

    populateStatistics(examResult);

    populatePerformanceAnalysis(examResult);

    populatePerformanceMessage(examResult);

    populateSubmittedDate(examResult);

    bindResultActions();

    // Enrich with logged in user details if active
    await enrichCandidateFromSession(examResult);

}


// -------------------------------------------------------
// GET EXAM RESULT
// -------------------------------------------------------

function getExamResult() {

    try {

        const storedResult =
            localStorage.getItem(RESULT_STORAGE_KEY);

        if (storedResult) {
            const result = JSON.parse(storedResult);
            if (result && typeof result === "object") {
                return result;
            }
        }

        const persistentResult =
            localStorage.getItem("slogon_last_exam_result");

        if (persistentResult) {
            const result = JSON.parse(persistentResult);
            if (result && typeof result === "object") {
                return result;
            }
        }

        return null;

    } catch (error) {

        console.error(
            "SLOGON ACADEMY: Unable to read exam result.",
            error
        );

        return null;
    }
}


// -------------------------------------------------------
// FALLBACK CANDIDATE RESULT
// -------------------------------------------------------

function getFallbackExamResult() {

    let candidate = {};

    try {
        const saved =
            localStorage.getItem("candidateInfo") ||
            localStorage.getItem("slogon_candidate") ||
            localStorage.getItem("currentUser");

        if (saved) {
            candidate = JSON.parse(saved);
        }
    } catch (e) {}

    const now = new Date();

    return {
        testId: "mock01",
        testTitle: "UGC NET Mock Test 01",
        subject: candidate.subject || "Tamil",
        candidate: {
            name: candidate.name || candidate.candidate_name || "Naveenraj",
            registerNumber: candidate.registerNumber || candidate.userId || candidate.user_id || "n007",
            subject: candidate.subject || "Tamil",
            exam: candidate.exam || "UGC NET Mock Test 01"
        },
        totalQuestions: 150,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unanswered: 150,
        marksPerQuestion: 1,
        totalMarks: 150,
        obtainedMarks: 0,
        percentage: 0,
        answers: {},
        questionStatus: {},
        questions: [],
        submittedAt: now.toISOString()
    };
}


// -------------------------------------------------------
// ENRICH CANDIDATE DETAILS FROM SESSION
// -------------------------------------------------------

async function enrichCandidateFromSession(result) {

    try {
        const response = await fetch("/api/me", { credentials: "same-origin" });

        if (response.ok) {
            const data = await response.json();

            if (data && data.authenticated && data.candidate) {
                const c = data.candidate;

                if (c.candidate_name) {
                    setText("resultCandidateName", c.candidate_name);
                }

                if (c.user_id) {
                    setText("resultCandidateRegister", c.user_id);
                }
            }
        }
    } catch (e) {
        // Safe offline fallback
    }
}


// -------------------------------------------------------
// SAFE ELEMENT GETTER
// -------------------------------------------------------

function getElement(id) {

    return document.getElementById(id);

}


// -------------------------------------------------------
// SAFE TEXT UPDATE
// -------------------------------------------------------

function setText(id, value) {

    const element = getElement(id);

    if (!element) {
        console.warn(
            `SLOGON ACADEMY: Element #${id} not found.`
        );
        return;
    }

    element.textContent = value;

}


// -------------------------------------------------------
// POPULATE CANDIDATE INFORMATION
// -------------------------------------------------------

// -------------------------------------------------------
// POPULATE CANDIDATE INFORMATION
// -------------------------------------------------------

function populateCandidateInformation(result) {
    // First, try candidate details saved inside examResult.
    let candidate = result.candidate || {};

    // If details are missing, try the separate candidateInfo record.
    try {
        const savedCandidate = localStorage.getItem("candidateInfo");

        if (savedCandidate) {
            const parsedCandidate = JSON.parse(savedCandidate);

            candidate = {
                ...parsedCandidate,
                ...candidate
            };
        }
    } catch (error) {
        console.error("Unable to read candidate information:", error);
    }

    console.log("Result data:", result);
    console.log("Candidate data:", candidate);

    setText(
        "resultCandidateName",
        candidate.name || result.candidateName || "Not available"
    );

    setText(
        "resultCandidateRegister",
        candidate.registerNumber || result.registerNumber || "Not available"
    );

    setText(
        "resultCandidateSubject",
        candidate.subject || result.subject || "Not available"
    );

    setText(
        "resultExamName",
        candidate.exam || result.exam || "Not available"
    );
}

// -------------------------------------------------------
// POPULATE SCORE INFORMATION
// -------------------------------------------------------

function populateScoreInformation(result) {

    const totalQuestions =
        toNumber(result.totalQuestions);

    const attempted =
        toNumber(result.attempted);

    const correct =
        toNumber(result.correct);

    const wrong =
        toNumber(result.wrong);

    const unanswered =
        toNumber(result.unanswered);

    const marksPerQuestion =
        toNumber(result.marksPerQuestion, 2);

    const totalMarks =
        result.totalMarks !== undefined
            ? toNumber(result.totalMarks)
            : totalQuestions * marksPerQuestion;

    const obtainedMarks =
        result.obtainedMarks !== undefined
            ? toNumber(result.obtainedMarks)
            : correct * marksPerQuestion;

    const percentage =
        result.percentage !== undefined
            ? toNumber(result.percentage)
            : calculatePercentage(
                obtainedMarks,
                totalMarks
            );


    // Main score
    setText(
        "obtainedMarks",
        formatNumber(obtainedMarks)
    );

    setText(
        "totalMarks",
        formatNumber(totalMarks)
    );


    // Percentage
    setText(
        "percentage",
        formatPercentage(percentage)
    );


    // Performance progress
    updateProgressBar(
        "performanceProgress",
        percentage
    );


    // Performance status
    setPerformanceStatus(percentage);

}


// -------------------------------------------------------
// POPULATE STATISTICS
// -------------------------------------------------------

function populateStatistics(result) {

    const totalQuestions =
        toNumber(result.totalQuestions);

    const attempted =
        toNumber(result.attempted);

    const correct =
        toNumber(result.correct);

    const wrong =
        toNumber(result.wrong);

    const unanswered =
        toNumber(result.unanswered);

    const marksPerQuestion =
        toNumber(result.marksPerQuestion, 2);

    const totalMarks =
        result.totalMarks !== undefined
            ? toNumber(result.totalMarks)
            : totalQuestions * marksPerQuestion;

    const obtainedMarks =
        result.obtainedMarks !== undefined
            ? toNumber(result.obtainedMarks)
            : correct * marksPerQuestion;


    setText(
        "totalQuestions",
        totalQuestions
    );

    setText(
        "attempted",
        attempted
    );

    setText(
        "correct",
        correct
    );

    setText(
        "wrong",
        wrong
    );

    setText(
        "unanswered",
        unanswered
    );

    setText(
        "resultMarks",
        `${formatNumber(obtainedMarks)} / ${formatNumber(totalMarks)}`
    );

}


// -------------------------------------------------------
// POPULATE PERFORMANCE ANALYSIS
// -------------------------------------------------------

function populatePerformanceAnalysis(result) {

    const totalQuestions =
        toNumber(result.totalQuestions);

    const attempted =
        toNumber(result.attempted);

    const correct =
        toNumber(result.correct);


    // -----------------------------------------------
    // ACCURACY
    // -----------------------------------------------
    let accuracy = 0;

    if (attempted > 0) {

        accuracy =
            (correct / attempted) * 100;

    }


    // -----------------------------------------------
    // ATTEMPT RATE
    // -----------------------------------------------
    let attemptRate = 0;

    if (totalQuestions > 0) {

        attemptRate =
            (attempted / totalQuestions) * 100;

    }


    // -----------------------------------------------
    // CORRECT ANSWER RATE
    // -----------------------------------------------
    let correctRate = 0;

    if (totalQuestions > 0) {

        correctRate =
            (correct / totalQuestions) * 100;

    }


    // -----------------------------------------------
    // DISPLAY VALUES
    // -----------------------------------------------

    setText(
        "accuracy",
        formatPercentage(accuracy)
    );

    setText(
        "attemptRate",
        formatPercentage(attemptRate)
    );

    setText(
        "correctRate",
        formatPercentage(correctRate)
    );


    // -----------------------------------------------
    // PROGRESS BARS
    // -----------------------------------------------

    updateProgressBar(
        "accuracyBar",
        accuracy
    );

    updateProgressBar(
        "attemptRateBar",
        attemptRate
    );

    updateProgressBar(
        "correctRateBar",
        correctRate
    );

}


// -------------------------------------------------------
// PERFORMANCE STATUS
// -------------------------------------------------------

function setPerformanceStatus(percentage) {

    const element =
        getElement("performanceStatus");

    if (!element) {
        return;
    }


    let statusText = "";


    if (percentage >= 80) {

        statusText = "Excellent Performance";

    } else if (percentage >= 70) {

        statusText = "Very Good Performance";

    } else if (percentage >= 60) {

        statusText = "Good Performance";

    } else if (percentage >= 50) {

        statusText = "Satisfactory Performance";

    } else if (percentage >= 40) {

        statusText = "Needs Improvement";

    } else {

        statusText = "More Practice Recommended";

    }


    element.textContent = statusText;


    // Remove old classes
    element.classList.remove(
        "excellent",
        "very-good",
        "good",
        "satisfactory",
        "needs-improvement",
        "practice"
    );


    // Add suitable class
    if (percentage >= 80) {

        element.classList.add("excellent");

    } else if (percentage >= 70) {

        element.classList.add("very-good");

    } else if (percentage >= 60) {

        element.classList.add("good");

    } else if (percentage >= 50) {

        element.classList.add("satisfactory");

    } else if (percentage >= 40) {

        element.classList.add("needs-improvement");

    } else {

        element.classList.add("practice");

    }

}


// -------------------------------------------------------
// PERFORMANCE MESSAGE
// -------------------------------------------------------

function populatePerformanceMessage(result) {

    const element =
        getElement("resultMessage");

    if (!element) {
        return;
    }


    const percentage =
        result.percentage !== undefined
            ? toNumber(result.percentage)
            : calculatePercentage(
                toNumber(result.obtainedMarks),
                toNumber(result.totalMarks)
            );


    let message = "";


    if (percentage >= 80) {

        message =
            "Excellent work! Your performance shows strong preparation and good command of the examination topics. Continue practicing with higher-difficulty questions to strengthen your preparation.";

    } else if (percentage >= 70) {

        message =
            "Very good performance! You have demonstrated a strong level of preparation. Focus on the questions you missed and continue regular PYQ practice.";

    } else if (percentage >= 60) {

        message =
            "Good progress! Your fundamentals are developing well. Review incorrect answers and strengthen the topics where you lost marks.";

    } else if (percentage >= 50) {

        message =
            "You have made a satisfactory attempt. Identify your weak areas, revise the relevant concepts, and practice more questions before the next test.";

    } else if (percentage >= 40) {

        message =
            "This result shows that more focused preparation is needed. Analyse your mistakes, revise the important concepts, and attempt additional practice tests.";

    } else {

        message =
            "Use this test as a learning opportunity. Review the questions carefully, identify your weak topics, and build your preparation step by step.";

    }


    element.textContent = message;

}


// -------------------------------------------------------
// SUBMITTED DATE / TIME
// -------------------------------------------------------

function populateSubmittedDate(result) {

    const element =
        getElement("resultSubmittedAt");

    if (!element) {
        return;
    }


    if (!result.submittedAt) {

        element.textContent = "—";

        return;
    }


    const date =
        new Date(result.submittedAt);


    if (isNaN(date.getTime())) {

        element.textContent =
            result.submittedAt;

        return;
    }


    try {

        element.textContent =
            date.toLocaleString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                }
            );

    } catch (error) {

        element.textContent =
            date.toString();

    }

}


// -------------------------------------------------------
// UPDATE PROGRESS BAR
// -------------------------------------------------------

function updateProgressBar(id, value) {

    const element =
        getElement(id);

    if (!element) {
        return;
    }


    let percentage =
        toNumber(value);


    // Keep value between 0 and 100
    percentage =
        Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        );


    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(function () {

        element.style.width =
            `${percentage}%`;

    });

}


// -------------------------------------------------------
// CALCULATE PERCENTAGE
// -------------------------------------------------------

function calculatePercentage(
    obtainedMarks,
    totalMarks
) {

    if (totalMarks <= 0) {
        return 0;
    }


    return (
        obtainedMarks /
        totalMarks
    ) * 100;

}


// -------------------------------------------------------
// NUMBER CONVERSION
// -------------------------------------------------------

function toNumber(
    value,
    defaultValue = 0
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : defaultValue;

}


// -------------------------------------------------------
// NUMBER FORMAT
// -------------------------------------------------------

function formatNumber(value) {

    const number =
        toNumber(value);


    if (Number.isInteger(number)) {

        return number.toString();

    }


    return number.toFixed(2);

}


// -------------------------------------------------------
// PERCENTAGE FORMAT
// -------------------------------------------------------

function formatPercentage(value) {

    const number =
        toNumber(value);


    return `${number.toFixed(1)}%`;

}


// -------------------------------------------------------
// RESULT ACTIONS
// -------------------------------------------------------

function bindResultActions() {

    const printButton =
        getElement("printResultButton");

    const retakeButton =
        getElement("retakeButton");

    const homeButton =
        getElement("homeButton");
    
    const reviewAnswersButton =
        getElement("reviewAnswersButton");    


    // -----------------------------------------------
    // PRINT RESULT
    // -----------------------------------------------

    if (printButton) {

        printButton.addEventListener(
            "click",
            function () {

                console.log(
                    "SLOGON ACADEMY: Printing result..."
                );

                window.print();

            }
        );
// REVIEW ANSWERS
if (reviewAnswersButton) {
    reviewAnswersButton.addEventListener("click", function () {
        window.location.href = "review";
    });
}
    }


    // -----------------------------------------------
    // RETAKE TEST
    // -----------------------------------------------

    if (retakeButton) {

        retakeButton.addEventListener(
            "click",
            function () {

                handleRetakeTest();

            }
        );

    }


    // -----------------------------------------------
    // BACK TO HOME
    // -----------------------------------------------

    if (homeButton) {

        homeButton.addEventListener(
            "click",
            function () {

                handleBackToHome();

            }
        );

    }

}


// -------------------------------------------------------
// RETAKE TEST
// -------------------------------------------------------

function handleRetakeTest() {

    const confirmRetake =
        window.confirm(
            "Retake the test?\n\nYour current result and previous test responses will be cleared."
        );


    if (!confirmRetake) {

        return;

    }


    console.log(
        "SLOGON ACADEMY: Preparing test retake..."
    );


    clearExamSession();


    /*
     * Keep candidateInfo so the same candidate
     * does not need to enter the details again.
     */

    localStorage.setItem(
        "examStarted",
        "false"
    );


    /*
     * Go back to Instructions page.
     *
     * Candidate information will be displayed again.
     * The candidate must accept the declaration
     * before starting the new test.
     */

    window.location.href =
        "instructions";

}


// -------------------------------------------------------
// BACK TO HOME
// -------------------------------------------------------

function handleBackToHome() {

    const confirmHome =
        window.confirm(
            "Go back to the login page?\n\nYour current examination session will be cleared."
        );


    if (!confirmHome) {

        return;

    }


    console.log(
        "SLOGON ACADEMY: Returning to home..."
    );


    clearExamSession();


    /*
     * Remove candidate information so that
     * a new candidate can log in.
     */

    localStorage.removeItem(
        "candidateInfo"
    );


    localStorage.setItem(
        "examStarted",
        "false"
    );


    window.location.href =
        "tests";

}


// -------------------------------------------------------
// CLEAR EXAM SESSION
// -------------------------------------------------------

function clearExamSession() {

    EXAM_STATE_KEYS.forEach(
        function (key) {

            localStorage.removeItem(key);

        }
    );


    /*
     * Clear any timer interval references
     * if they still exist.
     */

    try {

        if (
            window.SLOGONTimer &&
            typeof window.SLOGONTimer.stop === "function"
        ) {

            window.SLOGONTimer.stop();

        }

    } catch (error) {

        console.warn(
            "SLOGON ACADEMY: Timer cleanup warning.",
            error
        );

    }


    try {

        if (
            window.examTimerInterval
        ) {

            clearInterval(
                window.examTimerInterval
            );

            window.examTimerInterval =
                null;

        }

    } catch (error) {

        console.warn(
            "SLOGON ACADEMY: Exam timer cleanup warning.",
            error
        );

    }


    try {

        if (
            window.timerInterval
        ) {

            clearInterval(
                window.timerInterval
            );

            window.timerInterval =
                null;

        }

    } catch (error) {

        console.warn(
            "SLOGON ACADEMY: Timer interval cleanup warning.",
            error
        );

    }


    console.log(
        "SLOGON ACADEMY: Exam session cleared."
    );

}


// -------------------------------------------------------
// RESULT ERROR
// -------------------------------------------------------

function showResultError(message) {

    const resultMain =
        document.querySelector(
            ".result-main"
        );


    if (!resultMain) {
        return;
    }


    resultMain.innerHTML = `
        <div class="result-error-wrapper">
            <div class="result-error-card">
                <div class="result-error-icon-box">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>

                <h2>Result Not Available</h2>

                <p>${escapeHTML(message)}</p>

                <button
                    type="button"
                    id="resultErrorHomeButton"
                    class="result-error-btn"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <span>Back to Examination Portal</span>
                </button>
            </div>
        </div>
    `;

    const homeButton = getElement("resultErrorHomeButton");
    if (homeButton) {
        homeButton.addEventListener("click", function () {
            clearExamSession();
            window.location.href = "tests";
        });
    }
}


// -------------------------------------------------------
// ESCAPE HTML
// -------------------------------------------------------

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


// -------------------------------------------------------
// PUBLIC RESULT API
// -------------------------------------------------------

window.SLOGONResult = {

    getExamResult,

    calculatePercentage,

    clearExamSession

};


console.log(
    "SLOGON ACADEMY: result.js loaded."
);