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
    "examResult",
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

function initializeResultPage() {

    const examResult = getExamResult();

    // No result found
    if (!examResult) {

        console.warn(
            "SLOGON ACADEMY: No exam result found."
        );

        showResultError(
            "No examination result was found. Please take the examination first."
        );

        return;
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

}


// -------------------------------------------------------
// GET EXAM RESULT
// -------------------------------------------------------

function getExamResult() {

    try {

        const storedResult =
            localStorage.getItem(RESULT_STORAGE_KEY);

        if (!storedResult) {
            return null;
        }

        const result = JSON.parse(storedResult);

        if (!result || typeof result !== "object") {
            return null;
        }

        return result;

    } catch (error) {

        console.error(
            "SLOGON ACADEMY: Unable to read exam result.",
            error
        );

        return null;
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
        window.location.href = "review.html";
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
        "instructions.html";

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
        "tests.html";

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


    const errorBox =
        document.createElement("div");


    errorBox.className =
        "result-error-message";


    errorBox.innerHTML = `
        <div class="result-error-icon">!</div>

        <div class="result-error-content">

            <h2>Result Not Available</h2>

            <p>${escapeHTML(message)}</p>

            <button
                type="button"
                id="resultErrorHomeButton"
                class="result-error-button"
            >
                Back to Home
            </button>

        </div>
    `;


    resultMain.innerHTML = "";

    resultMain.appendChild(
        errorBox
    );


    const homeButton =
        getElement(
            "resultErrorHomeButton"
        );


    if (homeButton) {

        homeButton.addEventListener(
            "click",
            function () {

                clearExamSession();

                localStorage.removeItem(
                    "candidateInfo"
                );

                window.location.href =
                    "tests.html";

            }
        );

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