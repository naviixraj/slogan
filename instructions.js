/* =====================================================
   SLOGON ACADEMY - INSTRUCTIONS PAGE
===================================================== */

/* LOAD CANDIDATE & SELECTED TEST INFORMATION */

let candidateData = JSON.parse(
    localStorage.getItem("candidateInfo") || "null"
);

let testDetails = JSON.parse(
    localStorage.getItem("selectedTestDetails") || "null"
);

// Fallback test ID
let activeTestId = localStorage.getItem("selectedMockTest") || (testDetails ? testDetails.id : "SET01");

function updateInstructionsUI(details) {
    if (!details) return;

    const examTitle = details.title || "Mock Test";
    const examSubject = details.subject || "General Paper";
    const questionsCount = Number(details.questionsCount) || (details.questions ? details.questions.length : 150);
    const durationMinutes = Number(details.duration) || 180;

    // Header and top candidate info
    const examDisplay = document.getElementById("examDisplay");
    if (examDisplay) examDisplay.textContent = examTitle;

    const headerExamName = document.getElementById("headerExamName");
    if (headerExamName) headerExamName.textContent = examTitle;

    const subjectDisplay = document.getElementById("subjectDisplay");
    if (subjectDisplay) subjectDisplay.textContent = examSubject;

    // Overview cards
    const qCountEl = document.getElementById("instructionsTotalQuestions");
    if (qCountEl) qCountEl.textContent = String(questionsCount);

    const durEl = document.getElementById("instructionsDuration");
    if (durEl) durEl.textContent = `${durationMinutes} Minutes`;

    // Detailed instruction paragraphs (Instruction 1 & 2)
    const detailQCountEl = document.getElementById("instructionDetailQuestions");
    if (detailQCountEl) {
        detailQCountEl.textContent = `${questionsCount} questions`;
    }

    const detailDurEl = document.getElementById("instructionDetailDuration");
    if (detailDurEl) {
        detailDurEl.textContent = `${durationMinutes} minutes`;
    }
}

/* INITIAL DISPLAY CANDIDATE & TEST INFORMATION */

if (candidateData) {
    const candEl = document.getElementById("candidateDisplay");
    if (candEl) candEl.textContent = candidateData.name || "—";

    const regEl = document.getElementById("registerDisplay");
    if (regEl) regEl.textContent = candidateData.registerNumber || candidateData.userId || "—";
}

if (testDetails) {
    updateInstructionsUI(testDetails);
} else if (candidateData) {
    const subjEl = document.getElementById("subjectDisplay");
    if (subjEl) subjEl.textContent = candidateData.subject || "General Paper";

    const exEl = document.getElementById("examDisplay");
    if (exEl) exEl.textContent = candidateData.exam || "Mock Test";

    const headEl = document.getElementById("headerExamName");
    if (headEl) headEl.textContent = candidateData.exam || "Mock Test";
}

/* LIVE SERVER SYNC: FETCH LATEST TEST SPECS FROM DATABASE */
async function syncLatestTestDetails() {
    if (!activeTestId) return;

    try {
        const cleanId = String(activeTestId).toLowerCase();
        const res = await fetch(`/api/mock-tests/${encodeURIComponent(cleanId)}/questions`);
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                const refreshed = {
                    id: data.testId || activeTestId,
                    title: data.testTitle || (testDetails ? testDetails.title : "Mock Test"),
                    subject: data.subject || (testDetails ? testDetails.subject : "General Paper"),
                    duration: Number(data.duration) || (testDetails ? testDetails.duration : 180),
                    questionsCount: Number(data.totalQuestions) || (data.questions ? data.questions.length : (testDetails ? testDetails.questionsCount : 150))
                };

                testDetails = refreshed;
                localStorage.setItem("selectedTestDetails", JSON.stringify(refreshed));
                localStorage.setItem("examDuration", String(refreshed.duration * 60));
                localStorage.setItem("currentExamTitle", refreshed.title);
                localStorage.setItem("currentExamSubject", refreshed.subject);

                updateInstructionsUI(refreshed);
            }
        }
    } catch (err) {
        console.warn("Could not sync test details with server, using cached:", err);
    }
}

syncLatestTestDetails();

/* DECLARATION CHECKBOX */

const instructionCheckbox =
    document.getElementById("instructionCheckbox");

const proceedButton =
    document.getElementById("proceedButton");

if (instructionCheckbox && proceedButton) {

    instructionCheckbox.addEventListener("change", function () {
        proceedButton.disabled = !this.checked;
    });

    /* PROCEED TO EXAMINATION */

    proceedButton.addEventListener("click", function () {

        if (!instructionCheckbox.checked) {
            return;
        }

        /* START TIME */

        localStorage.setItem(
            "examStartTime",
            Date.now().toString()
        );

        /* EXACT EXAMINATION DURATION IN SECONDS */
        const durMinutes = testDetails?.duration || 180;
        localStorage.setItem("examDuration", String(durMinutes * 60));

        /* CLEAR PREVIOUS EXAM DATA */

        localStorage.removeItem("examAnswers");
        localStorage.removeItem("questionStatus");
        localStorage.removeItem("examResult");
        localStorage.removeItem("examCurrentQuestion");

        /* RESET PREVIOUS TIMER */

        localStorage.removeItem("slogonExamEndTime");
        localStorage.removeItem("slogonExamTimerCandidate");

        localStorage.removeItem("slogonTimerWarning10");
        localStorage.removeItem("slogonTimerWarning5");
        localStorage.removeItem("slogonTimerWarning1");
        localStorage.removeItem("slogonTimerTimeUp");

        /* START EXAM */

        localStorage.setItem("examStarted", "true");

        window.location.href = "exam.html";
    });
}

/* PREVENT ACCIDENTAL PAGE LEAVE */

window.addEventListener("beforeunload", function (event) {

    if (instructionCheckbox && instructionCheckbox.checked) {
        event.preventDefault();
        event.returnValue = "";
    }

});
