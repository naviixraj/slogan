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

    const headerExamNameMobile = document.getElementById("headerExamNameMobile");
    if (headerExamNameMobile) headerExamNameMobile.textContent = examTitle;

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

    // Start Exam Confirmation Modal meta
    const modalQCountEl = document.getElementById("startModalQuestions");
    if (modalQCountEl) {
        modalQCountEl.textContent = String(questionsCount);
    }

    const modalDurEl = document.getElementById("startModalDuration");
    if (modalDurEl) {
        modalDurEl.textContent = `${durationMinutes} Mins`;
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

    const headMobileEl = document.getElementById("headerExamNameMobile");
    if (headMobileEl) headMobileEl.textContent = candidateData.exam || "Mock Test";
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

/* DECLARATION CHECKBOX & START MODAL CONTROLS */

const instructionCheckbox = document.getElementById("instructionCheckbox");
const proceedButton = document.getElementById("proceedButton");
const startExamModal = document.getElementById("startExamModal");
const cancelStartExamBtn = document.getElementById("cancelStartExamBtn");
const confirmStartExamBtn = document.getElementById("confirmStartExamBtn");

function openStartModal() {
    if (!startExamModal) return;
    startExamModal.style.display = "flex";
    requestAnimationFrame(() => {
        startExamModal.classList.add("active");
    });
}

function closeStartModal() {
    if (!startExamModal) return;
    startExamModal.classList.remove("active");
    setTimeout(() => {
        if (!startExamModal.classList.contains("active")) {
            startExamModal.style.display = "none";
        }
    }, 250);
}

function launchExamination() {
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
    localStorage.removeItem("slogonExamLiveStarted");

    localStorage.removeItem("slogonTimerWarning10");
    localStorage.removeItem("slogonTimerWarning5");
    localStorage.removeItem("slogonTimerWarning1");
    localStorage.removeItem("slogonTimerTimeUp");

    /* START EXAM */
    localStorage.setItem("examStarted", "true");

    /* REDIRECT TO EXAM */
    window.location.href = "exam.html";
}

if (instructionCheckbox && proceedButton) {
    const declarationCard = document.getElementById("declarationCard");

    instructionCheckbox.addEventListener("change", function () {
        proceedButton.disabled = !this.checked;
        if (declarationCard) {
            if (this.checked) {
                declarationCard.classList.add("confirmed");
            } else {
                declarationCard.classList.remove("confirmed");
            }
        }
    });

    /* OPEN CUSTOM CONFIRMATION POPUP ON PROCEED CLICK */
    proceedButton.addEventListener("click", function () {
        if (!instructionCheckbox.checked) {
            return;
        }
        openStartModal();
    });
}

/* MODAL ACTION: CANCEL */
if (cancelStartExamBtn) {
    cancelStartExamBtn.addEventListener("click", function () {
        closeStartModal();
    });
}

/* MODAL ACTION: START */
if (confirmStartExamBtn) {
    confirmStartExamBtn.addEventListener("click", function () {
        confirmStartExamBtn.disabled = true;
        confirmStartExamBtn.textContent = "Starting...";
        launchExamination();
    });
}

/* DISMISS ON BACKDROP CLICK */
if (startExamModal) {
    startExamModal.addEventListener("click", function (event) {
        if (event.target === startExamModal) {
            closeStartModal();
        }
    });
}

/* DISMISS ON ESC KEY */
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && startExamModal && startExamModal.classList.contains("active")) {
        closeStartModal();
    }
});
