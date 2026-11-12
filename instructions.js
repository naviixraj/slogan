
/* =====================================================
   SLOGON ACADEMY - INSTRUCTIONS PAGE
===================================================== */

/* LOAD CANDIDATE INFORMATION */

const candidateData = JSON.parse(
    localStorage.getItem("candidateInfo") || "null"
);

/* DISPLAY CANDIDATE INFORMATION */

if (candidateData) {
    document.getElementById("candidateDisplay").textContent =
        candidateData.name || "—";

    document.getElementById("registerDisplay").textContent =
        candidateData.registerNumber || "—";

    document.getElementById("subjectDisplay").textContent =
        candidateData.subject || "—";

    document.getElementById("examDisplay").textContent =
        candidateData.exam || "—";

    document.getElementById("headerExamName").textContent =
        candidateData.exam || "Mock Test";
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

        /* 180 MINUTES = 10800 SECONDS */

        localStorage.setItem("examDuration", "10800");

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
