
/* =====================================================
   SLOGON ACADEMY - INSTRUCTIONS PAGE
===================================================== */

/* LOAD CANDIDATE & SELECTED TEST INFORMATION */

const candidateData = JSON.parse(
    localStorage.getItem("candidateInfo") || "null"
);

const testDetails = JSON.parse(
    localStorage.getItem("selectedTestDetails") || "null"
);

/* DISPLAY CANDIDATE & TEST INFORMATION */

if (candidateData) {
    const candEl = document.getElementById("candidateDisplay");
    if (candEl) candEl.textContent = candidateData.name || "—";

    const regEl = document.getElementById("registerDisplay");
    if (regEl) regEl.textContent = candidateData.registerNumber || candidateData.userId || "—";
}

if (testDetails) {
    const examDisplay = document.getElementById("examDisplay");
    if (examDisplay) examDisplay.textContent = testDetails.title || "Mock Test";

    const headerExamName = document.getElementById("headerExamName");
    if (headerExamName) headerExamName.textContent = testDetails.title || "Mock Test";

    const subjectDisplay = document.getElementById("subjectDisplay");
    if (subjectDisplay) subjectDisplay.textContent = testDetails.subject || "General Paper";

    const qCountEl = document.getElementById("instructionsTotalQuestions");
    if (qCountEl) qCountEl.textContent = String(testDetails.questionsCount || 150);

    const durEl = document.getElementById("instructionsDuration");
    if (durEl) durEl.textContent = `${testDetails.duration || 180} Minutes`;
} else if (candidateData) {
    const subjEl = document.getElementById("subjectDisplay");
    if (subjEl) subjEl.textContent = candidateData.subject || "—";

    const exEl = document.getElementById("examDisplay");
    if (exEl) exEl.textContent = candidateData.exam || "—";

    const headEl = document.getElementById("headerExamName");
    if (headEl) headEl.textContent = candidateData.exam || "Mock Test";
}

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
