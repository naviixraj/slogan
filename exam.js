"use strict";

// If opened via VS Code Live Server (port 5500/5501/etc.), auto-redirect to the Express server on port 3000
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "5502") {
        window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}`);
    }
}

/*
=========================================================
 SLOGON ACADEMY — ONLINE EXAMINATION SYSTEM
 File: js/exam.js

 Responsibilities:
 - Load questions from questions.js
 - Render questions dynamically
 - Handle answers
 - Handle question palette
 - Handle review status
 - Handle navigation
 - Maintain exam state in localStorage
 - Submit exam
 - Calculate result
 - Redirect to result.html
=========================================================
*/

(function () {

    /* =====================================================
       GLOBAL CONFIGURATION
    ===================================================== */

    const STORAGE_KEYS = {
        candidateInfo: "candidateInfo",
        examStarted: "examStarted",
        currentQuestion: "examCurrentQuestion",
        answers: "examAnswers",
        status: "questionStatus",
        result: "examResult"
    };

    const RESULT_PAGE = "result.html";


    /* =====================================================
       EXAM STATE
    ===================================================== */

    let questions = [];
    let currentQuestionIndex = 0;

    let answers = {};
    let questionStatus = {};

    let initialized = false;


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    let candidateNameEl;
    let candidateRegisterEl;
    let candidateSubjectEl;

    let questionCounterEl;
    let questionNumberEl;
    let questionTypeEl;
    let questionTextEl;
    let optionsContainerEl;

    let prevButtonEl;
    let clearButtonEl;
    let reviewButtonEl;
    let saveNextButtonEl;
    let mobileSubmitButtonEl;

    let questionPaletteEl;

    let notVisitedCountEl;
    let notAnsweredCountEl;
    let answeredCountEl;
    let reviewCountEl;
    let answeredReviewCountEl;

    let submitButtonEl;

    let submitModalEl;
    let modalNotAnsweredEl;
    let modalReviewEl;
    let modalAnsweredEl;

    let modalContinueEl;
    let modalSubmitEl;


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    document.addEventListener("DOMContentLoaded", init);


    async function init() {

        if (initialized) {
            return;
        }

        initialized = true;

        cacheDOM();

        loadCandidateInfo();

        try {

            if (window.questionsReady) {

                await window.questionsReady;

            } else if (
                window.SLOGONQuestions &&
                typeof window.SLOGONQuestions.loadQuestions === "function"
            ) {

                await window.SLOGONQuestions.loadQuestions();

            } else {

                throw new Error(
                    "Question loading system is not available."
                );

            }

            initializeExam();

        } catch (error) {

            console.error(
                "SLOGON ACADEMY: Exam initialization failed:",
                error
            );

            showExamError(
                "Question data could not be loaded. Please refresh the page."
            );
        }
    }


    /* =====================================================
       CACHE DOM ELEMENTS
    ===================================================== */

   function cacheDOM() {
    // Candidate details — match exam.html
    candidateNameEl = document.getElementById("examCandidateName");
    candidateRegisterEl = document.getElementById("examRegisterNumber");
    candidateSubjectEl = document.getElementById("examSubject");

    // Question details
    questionCounterEl = null;
    questionNumberEl = document.getElementById("questionNumber");
    questionTypeEl = document.querySelector(".question-type");
    questionTextEl = document.getElementById("questionText");
    optionsContainerEl = document.getElementById("optionsContainer");

    // Navigation — match the actual HTML IDs
    prevButtonEl = document.getElementById("previousButton");
    clearButtonEl = document.getElementById("clearButton");
    reviewButtonEl = document.getElementById("reviewButton");
   saveNextButtonEl = document.getElementById("saveNextButton");
    mobileSubmitButtonEl = document.getElementById("mobileSubmitButton");

    // Palette
    questionPaletteEl = document.getElementById("questionPalette");

    // Summary counts
    notVisitedCountEl = document.getElementById("notVisitedCount");
    notAnsweredCountEl = document.getElementById("notAnsweredCount");
    answeredCountEl = document.getElementById("answeredCount");
    reviewCountEl = document.getElementById("reviewCount");
    answeredReviewCountEl = document.getElementById("answeredReviewCount");

    // Submit controls
    submitButtonEl = document.getElementById("submitButton");
    submitModalEl = document.getElementById("submitModal");
    modalNotAnsweredEl = document.getElementById("modalNotAnswered");
    modalReviewEl = document.getElementById("modalReview");
    modalAnsweredEl = document.getElementById("modalAnswered");

    // These IDs must match exam.html
    modalContinueEl = document.getElementById("cancelSubmit");
    modalSubmitEl = document.getElementById("confirmSubmit");
}


   
/* =====================================================
   LOAD CANDIDATE INFORMATION
   AUTHENTICATE USING SERVER SESSION
===================================================== */

async function loadCandidateInfo() {

    try {

        const response = await fetch("/api/me", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        /* CHECK LOGIN SESSION */

        if (!response.ok || !data.success || !data.candidate) {

            window.location.href =
                "login.html?next=exam.html";

            return false;
        }

        /* GET AUTHENTICATED CANDIDATE */

        const candidate = data.candidate;

        /* DISPLAY CANDIDATE NAME */

        if (candidateNameEl) {

            candidateNameEl.textContent =
                candidate.name || "Candidate";
        }

        /* DISPLAY REGISTER NUMBER / USER ID */

        if (candidateRegisterEl) {

            candidateRegisterEl.textContent =
                candidate.userId || "-";
        }

        /* DISPLAY EXAM TITLE & SUBJECT FROM SELECTED QUESTION SET */

        const currentTitle = localStorage.getItem("currentExamTitle");
        const currentSubject = localStorage.getItem("currentExamSubject");

        const examTitleEl = document.getElementById("examTitle");
        if (examTitleEl && currentTitle) {
            examTitleEl.textContent = currentTitle;
        }

        if (candidateSubjectEl) {
            candidateSubjectEl.textContent =
                currentSubject || candidate.subject || "General Paper";
        }

        /* SAVE AUTHENTICATED CANDIDATE */

        window.slogonCandidate = candidate;

        return true;

    } catch (error) {

        console.error(
            "Candidate authentication failed:",
            error
        );

        window.location.href =
            "login.html?next=exam.html";

        return false;
    }
}



    /* =====================================================
       INITIALIZE EXAM
    ===================================================== */

    function initializeExam() {

        questions =
            Array.isArray(window.examQuestions)
                ? window.examQuestions
                : [];

        if (!questions.length) {

            throw new Error(
                "No questions found."
            );
        }


        initializeQuestionState();

        restoreExamState();

        buildQuestionPalette();

        bindEvents();

        renderQuestion();

        updateQuestionSummary();

        updateNavigationButtons();

        console.log(
            `SLOGON ACADEMY: Exam initialized with ${questions.length} questions.`
        );
    }


    /* =====================================================
       INITIALIZE QUESTION STATUS
    ===================================================== */

    function initializeQuestionState() {

        for (
            let i = 0;
            i < questions.length;
            i++
        ) {

            const questionId =
                String(questions[i].id);

            if (!questionStatus[questionId]) {

                questionStatus[questionId] =
                    "notVisited";
            }
        }
    }


    /* =====================================================
       RESTORE EXAM STATE
    ===================================================== */

    function restoreExamState() {

        /* ---------- Restore answers ---------- */

        const savedAnswers =
            localStorage.getItem(
                STORAGE_KEYS.answers
            );

        if (savedAnswers) {

            try {

                answers =
                    JSON.parse(savedAnswers) || {};

            } catch (error) {

                answers = {};
            }
        }


        /* ---------- Restore status ---------- */

        const savedStatus =
            localStorage.getItem(
                STORAGE_KEYS.status
            );

        if (savedStatus) {

            try {

                const parsedStatus =
                    JSON.parse(savedStatus);

                if (
                    parsedStatus &&
                    typeof parsedStatus === "object"
                ) {

                    questionStatus = {
                        ...questionStatus,
                        ...parsedStatus
                    };
                }

            } catch (error) {

                console.warn(
                    "Could not restore question status."
                );
            }
        }


        /* ---------- Strictly start at Question 1 ---------- */

        currentQuestionIndex = 0;
    }


    /* =====================================================
       SAVE EXAM STATE
    ===================================================== */

    function saveExamState() {

        localStorage.setItem(
            STORAGE_KEYS.answers,
            JSON.stringify(answers)
        );

        localStorage.setItem(
            STORAGE_KEYS.status,
            JSON.stringify(questionStatus)
        );

        localStorage.setItem(
            STORAGE_KEYS.currentQuestion,
            String(currentQuestionIndex)
        );
    }


    /* =====================================================
       BUILD QUESTION PALETTE
    ===================================================== */

    function buildQuestionPalette() {

        if (!questionPaletteEl) {
            return;
        }

        questionPaletteEl.innerHTML = "";


        questions.forEach(
            function (question, index) {

                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "palette-btn";

                button.textContent =
                    String(index + 1);

                button.dataset.index =
                    String(index);

                button.setAttribute(
                    "aria-label",
                    `Question ${index + 1}`
                );

                button.addEventListener(
                    "click",
                    function () {

                        goToQuestion(index);
                    }
                );

                questionPaletteEl.appendChild(button);
            }
        );

        updateQuestionPalette();
    }


    /* =====================================================
       UPDATE QUESTION PALETTE
    ===================================================== */

    function updateQuestionPalette() {

        if (!questionPaletteEl) {
            return;
        }

        const buttons =
            questionPaletteEl.querySelectorAll(
                ".palette-btn"
            );


        buttons.forEach(
            function (button, index) {

                const question =
                    questions[index];

                const questionId =
                    String(question.id);

                const status =
                    questionStatus[questionId] ||
                    "notVisited";


                button.classList.remove(
                    "not-visited",
                    "not-answered",
                    "answered",
                    "review",
                    "answered-review",
                    "active"
                );


                switch (status) {

                    case "answered":
                        button.classList.add(
                            "answered"
                        );
                        break;

                    case "review":
                        button.classList.add(
                            "review"
                        );
                        break;

                    case "answeredReview":
                        button.classList.add(
                            "answered-review"
                        );
                        break;

                    case "notAnswered":
                        button.classList.add(
                            "not-answered"
                        );
                        break;

                    default:
                        button.classList.add(
                            "not-visited"
                        );
                }


                if (
                    index === currentQuestionIndex
                ) {

                    button.classList.add(
                        "active"
                    );
                }
            }
        );
    }


    /* =====================================================
       RENDER CURRENT QUESTION
    ===================================================== */

    function renderQuestion() {

        if (!questions.length) {
            return;
        }


        const question =
            questions[currentQuestionIndex];


        if (!question) {
            return;
        }


        const questionId =
            String(question.id);


        /* ---------- Mark visited ---------- */

        if (
            questionStatus[questionId] ===
            "notVisited"
        ) {

            questionStatus[questionId] =
                "notAnswered";

            saveExamState();
        }


/* ---------- Question counter ---------- */

if (questionCounterEl) {
    questionCounterEl.textContent =
        `Question ${currentQuestionIndex + 1} / ${questions.length}`;
}

/* ---------- Question number ---------- */

if (questionNumberEl) {
    questionNumberEl.textContent =
        String(currentQuestionIndex + 1);
}

/* ---------- Header question counter ---------- */

const currentNumberEl =
    document.getElementById("currentQuestionNumber");

const totalNumberEl =
    document.getElementById("totalQuestionNumber");

if (currentNumberEl) {
    currentNumberEl.textContent =
        String(currentQuestionIndex + 1);
}

if (totalNumberEl) {
    totalNumberEl.textContent =
        String(questions.length);
}


        /* ---------- Question type ---------- */

        if (questionTypeEl) {

            questionTypeEl.textContent =
                question.questionType ||
                "MCQ";
        }


        /* ---------- Question text ---------- */

        if (questionTextEl) {
            if (typeof window.renderNeatQuestion === "function") {
                questionTextEl.innerHTML = window.renderNeatQuestion(question.question || "", question.options || null);
            } else {
                questionTextEl.textContent = question.question || "";
            }
        }


        /* ---------- Options ---------- */

        renderOptions(question);


        /* ---------- Review button text ---------- */

        updateReviewButton(questionId);


        /* ---------- UI ---------- */

        updateQuestionPalette();

        updateQuestionSummary();

        updateNavigationButtons();
    }


    /* =====================================================
       RENDER OPTIONS
    ===================================================== */

    function renderOptions(question) {

        if (!optionsContainerEl) {
            return;
        }

        optionsContainerEl.innerHTML = "";


        const optionKeys =
            ["A", "B", "C", "D"];


        optionKeys.forEach(
            function (key) {

                if (
                    !question.options ||
                    typeof question.options[key] ===
                    "undefined"
                ) {

                    return;
                }


                const optionLabel =
                    document.createElement("label");

                optionLabel.className =
                    "option option-item";


                const radio =
                    document.createElement("input");

                radio.type = "radio";

                radio.name = "answer";

                radio.value = key;

                radio.className =
                    "option-radio";


                const letter =
                    document.createElement("span");

                letter.className =
                    "option-letter";

                letter.textContent =
                    (question.optionLabels && question.optionLabels[key]) ?
                    question.optionLabels[key] :
                    key;


                const text =
                    document.createElement("span");

                text.className =
                    "option-text";

                text.textContent =
                    question.options[key];


                optionLabel.appendChild(radio);

                optionLabel.appendChild(letter);

                optionLabel.appendChild(text);


                optionsContainerEl.appendChild(
                    optionLabel
                );


                /* ---------- Restore answer ---------- */

                const questionId =
                    String(question.id);

                if (
                    answers[questionId] === key
                ) {

                    radio.checked = true;

                    optionLabel.classList.add(
                        "selected"
                    );
                }


                /* ---------- Answer event ---------- */

                radio.addEventListener(
                    "change",
                    function () {

                        selectAnswer(
                            questionId,
                            key
                        );
                    }
                );
            }
        );


        updateOptionVisualState();
    }


    /* =====================================================
       SELECT ANSWER
    ===================================================== */

    function selectAnswer(
        questionId,
        selectedAnswer
    ) {

        answers[questionId] =
            selectedAnswer;


        const currentStatus =
            questionStatus[questionId];


        if (
            currentStatus ===
            "review"
        ) {

            questionStatus[questionId] =
                "answeredReview";

        } else {

            questionStatus[questionId] =
                "answered";
        }


        saveExamState();

        updateOptionVisualState();

        updateQuestionPalette();

        updateQuestionSummary();

        updateReviewButton(questionId);
    }


    /* =====================================================
       UPDATE OPTION VISUAL STATE
    ===================================================== */

    function updateOptionVisualState() {

        if (!optionsContainerEl) {
            return;
        }

        const labels =
            optionsContainerEl.querySelectorAll(
                ".option, .option-item"
            );

        labels.forEach(
            function (label) {

                const radio =
                    label.querySelector(
                        "input[type='radio']"
                    );

                if (!radio) {
                    return;
                }

                if (radio.checked) {

                    label.classList.add(
                        "selected"
                    );

                } else {

                    label.classList.remove(
                        "selected"
                    );
                }
            }
        );
    }


    /* =====================================================
       CLEAR RESPONSE
    ===================================================== */

    function clearResponse() {

        const question =
            questions[currentQuestionIndex];

        if (!question) {
            return;
        }


        const questionId =
            String(question.id);


        delete answers[questionId];


        const currentStatus =
            questionStatus[questionId];


        if (
            currentStatus ===
            "answeredReview"
        ) {

            questionStatus[questionId] =
                "review";

        } else {

            questionStatus[questionId] =
                "notAnswered";
        }


        saveExamState();

        renderOptions(question);

        updateQuestionPalette();

        updateQuestionSummary();

        updateReviewButton(questionId);
    }


    /* =====================================================
       MARK FOR REVIEW
    ===================================================== */

    function toggleReview() {

        const question =
            questions[currentQuestionIndex];

        if (!question) {
            return;
        }


        const questionId =
            String(question.id);

        const hasAnswer =
            Boolean(answers[questionId]);

        const currentStatus =
            questionStatus[questionId];


        if (currentStatus === "review") {

            questionStatus[questionId] =
                hasAnswer
                    ? "answered"
                    : "notAnswered";

        } else if (
            currentStatus === "answeredReview"
        ) {

            questionStatus[questionId] =
                "answered";

        } else {

            questionStatus[questionId] =
                hasAnswer
                    ? "answeredReview"
                    : "review";
        }


        saveExamState();

        updateQuestionPalette();

        updateQuestionSummary();

        updateReviewButton(questionId);
    }


    /* =====================================================
       UPDATE REVIEW BUTTON
    ===================================================== */

    function updateReviewButton(
        questionId
    ) {

        if (!reviewButtonEl) {
            return;
        }


        const status =
            questionStatus[questionId];


        if (
            status === "review" ||
            status === "answeredReview"
        ) {

            reviewButtonEl.textContent =
                "Remove Review";

        } else {

            reviewButtonEl.textContent =
                "Mark for Review";
        }
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function goToQuestion(index) {

        if (
            index < 0 ||
            index >= questions.length
        ) {

            return;
        }


        currentQuestionIndex =
            index;

        saveExamState();

        renderQuestion();

        scrollToQuestion();
    }


    function goPrevious() {

        if (
            currentQuestionIndex >
            0
        ) {

            goToQuestion(
                currentQuestionIndex - 1
            );
        }
    }


    function goNext() {

        if (
            currentQuestionIndex <
            questions.length - 1
        ) {

            goToQuestion(
                currentQuestionIndex + 1
            );

        } else {

            openSubmitModal();
        }
    }


    function scrollToQuestion() {

        const questionCard =
            document.querySelector(
                ".question-card"
            );

        if (
            questionCard &&
            window.innerWidth <= 768
        ) {

            questionCard.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }


    /* =====================================================
       NAVIGATION BUTTON STATE
    ===================================================== */

    function updateNavigationButtons() {

        if (prevButtonEl) {

            prevButtonEl.disabled =
                currentQuestionIndex === 0;
        }


        if (saveNextButtonEl) {

            if (
                currentQuestionIndex ===
                questions.length - 1
            ) {

                saveNextButtonEl.textContent =
                    "Save & Submit";

            } else {

                saveNextButtonEl.textContent =
                    "Save & Next";
            }
        }
    }


    /* =====================================================
       QUESTION SUMMARY
    ===================================================== */

    function updateQuestionSummary() {

        let notVisited = 0;
        let notAnswered = 0;
        let answered = 0;
        let review = 0;
        let answeredReview = 0;


        questions.forEach(
            function (question) {

                const questionId =
                    String(question.id);

                const status =
                    questionStatus[questionId] ||
                    "notVisited";


                switch (status) {

                    case "notVisited":
                        notVisited++;
                        break;

                    case "notAnswered":
                        notAnswered++;
                        break;

                    case "answered":
                        answered++;
                        break;

                    case "review":
                        review++;
                        break;

                    case "answeredReview":
                        answeredReview++;
                        break;
                }
            }
        );


        if (notVisitedCountEl) {

            notVisitedCountEl.textContent =
                notVisited;
        }


        if (notAnsweredCountEl) {

            notAnsweredCountEl.textContent =
                notAnswered;
        }


        if (answeredCountEl) {

            answeredCountEl.textContent =
                answered;
        }


        if (reviewCountEl) {

            reviewCountEl.textContent =
                review;
        }


        if (answeredReviewCountEl) {

            answeredReviewCountEl.textContent =
                answeredReview;
        }
    }


    /* =====================================================
       SUBMIT MODAL
    ===================================================== */

    function openSubmitModal() {

        updateSubmitModalSummary();


        if (submitModalEl) {

            submitModalEl.classList.add(
                "show"
            );

            submitModalEl.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    }


    function closeSubmitModal() {

        if (submitModalEl) {

            submitModalEl.classList.remove(
                "show"
            );

            submitModalEl.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    }


    /* =====================================================
       SUBMIT MODAL SUMMARY
    ===================================================== */

    function updateSubmitModalSummary() {

        let notAnswered = 0;
        let review = 0;
        let answered = 0;


        questions.forEach(
            function (question) {

                const questionId =
                    String(question.id);

                const status =
                    questionStatus[questionId] ||
                    "notVisited";


                if (
                    status === "notAnswered" ||
                    status === "notVisited"
                ) {

                    notAnswered++;

                } else if (
                    status === "review" ||
                    status === "answeredReview"
                ) {

                    review++;

                } else if (
                    status === "answered"
                ) {

                    answered++;
                }
            }
        );


        if (modalNotAnsweredEl) {

            modalNotAnsweredEl.textContent =
                notAnswered;
        }


        if (modalReviewEl) {

            modalReviewEl.textContent =
                review;
        }


        if (modalAnsweredEl) {

            modalAnsweredEl.textContent =
                answered;
        }
    }


    /* =====================================================
       SUBMIT EXAM
    ===================================================== */

    function submitExam() {

        saveExamState();


        const candidateData =
            getCandidateData();


        let correct = 0;
        let attempted = 0;


        questions.forEach(
            function (question) {

                const questionId =
                    String(question.id);

                const selectedAnswer =
                    answers[questionId];


                if (selectedAnswer) {

                    attempted++;
                }


                if (
                    selectedAnswer &&
                    selectedAnswer ===
                    question.correctAnswer
                ) {

                    correct++;
                }
            }
        );


        const total =
            questions.length;

        const unanswered =
            total - attempted;

        const wrong =
            attempted - correct;

        const marksPerQuestion =
            getMarksPerQuestion();

        const totalMarks =
            total * marksPerQuestion;

        const obtainedMarks =
            correct * marksPerQuestion;

        const percentage =
            totalMarks > 0
                ? Number(
                    (
                        obtainedMarks /
                        totalMarks *
                        100
                    ).toFixed(2)
                )
                : 0;


        const activeTestId = (localStorage.getItem("selectedMockTest") || "mock01").toLowerCase();
        let storedDetails = null;
        try {
            storedDetails = JSON.parse(localStorage.getItem("selectedTestDetails") || "null");
        } catch (e) {}

        const examResult = {
            testId: activeTestId,
            testTitle: localStorage.getItem("currentExamTitle") || (storedDetails && storedDetails.title) || (candidateData && candidateData.exam) || "Mock Test",
            subject: localStorage.getItem("currentExamSubject") || (storedDetails && storedDetails.subject) || (candidateData && candidateData.subject) || "General Paper",
            candidate: candidateData,
            totalQuestions: total,
            attempted: attempted,
            correct: correct,
            wrong: wrong,
            unanswered: unanswered,
            marksPerQuestion: marksPerQuestion,
            totalMarks: totalMarks,
            obtainedMarks: obtainedMarks,
            percentage: percentage,
            answers: answers,
            questionStatus: questionStatus,
            questions: questions,
            submittedAt: new Date().toISOString()
        };


        localStorage.setItem(
            STORAGE_KEYS.result,
            JSON.stringify(examResult)
        );


        /*
        -----------------------------------------------------
        Stop timer if timer.js provides a public stop method
        -----------------------------------------------------
        */

        stopExamTimer();


        /*
        -----------------------------------------------------
        Clear temporary exam navigation data
        -----------------------------------------------------
        */

        localStorage.removeItem(
            STORAGE_KEYS.currentQuestion
        );


        /*
        -----------------------------------------------------
        Redirect to result page
        -----------------------------------------------------
        */

        window.location.href =
            RESULT_PAGE;
    }


    /* =====================================================
       GET MARKS PER QUESTION
    ===================================================== */

    function getMarksPerQuestion() {

        if (!questions.length) {
            return 1;
        }


        const firstQuestion =
            questions[0];


        const marks =
            Number(firstQuestion.marks);


        if (
            Number.isFinite(marks) &&
            marks > 0
        ) {

            return marks;
        }


        return 1;
    }


    /* =====================================================
       GET CANDIDATE DATA
    ===================================================== */

    function getCandidateData() {

        const savedCandidate =
            localStorage.getItem(
                STORAGE_KEYS.candidateInfo
            );


        if (!savedCandidate) {

            return {
                name: "",
                registerNumber: "",
                subject: "",
                exam: ""
            };
        }


        try {

            return JSON.parse(
                savedCandidate
            );

        } catch (error) {

            return {
                name: "",
                registerNumber: "",
                subject: "",
                exam: ""
            };
        }
    }


    /* =====================================================
       STOP TIMER
    ===================================================== */

    function stopExamTimer() {

        /*
        Supports multiple possible timer.js APIs.
        This prevents exam.js from breaking if timer.js
        exposes any one of these functions.
        */

        try {

            if (
                window.SLOGONTimer &&
                typeof window.SLOGONTimer.stop ===
                "function"
            ) {

                window.SLOGONTimer.stop();
                return;
            }


            if (
                typeof window.stopExamTimer ===
                "function" &&
                window.stopExamTimer !==
                stopExamTimer
            ) {

                window.stopExamTimer();
                return;
            }


            if (
                window.examTimerInterval
            ) {

                clearInterval(
                    window.examTimerInterval
                );
            }


            if (
                window.timerInterval
            ) {

                clearInterval(
                    window.timerInterval
                );
            }

        } catch (error) {

            console.warn(
                "Timer could not be stopped automatically.",
                error
            );
        }
    }


    /* =====================================================
       EVENT LISTENERS
    ===================================================== */

    function bindEvents() {

        /* ---------- Previous ---------- */

        if (prevButtonEl) {

            prevButtonEl.addEventListener(
                "click",
                goPrevious
            );
        }


        /* ---------- Clear ---------- */

        if (clearButtonEl) {

            clearButtonEl.addEventListener(
                "click",
                clearResponse
            );
        }


        /* ---------- Review ---------- */

        if (reviewButtonEl) {

            reviewButtonEl.addEventListener(
                "click",
                toggleReview
            );
        }


        /* ---------- Save & Next ---------- */

        if (saveNextButtonEl) {

            saveNextButtonEl.addEventListener(
                "click",
                goNext
            );
        }


        /* ---------- Mobile Submit ---------- */

        if (mobileSubmitButtonEl) {

            mobileSubmitButtonEl.addEventListener(
                "click",
                openSubmitModal
            );
        }


        /* ---------- Sidebar Submit ---------- */

        if (submitButtonEl) {

            submitButtonEl.addEventListener(
                "click",
                openSubmitModal
            );
        }


        /* ---------- Continue Test ---------- */

        if (modalContinueEl) {

            modalContinueEl.addEventListener(
                "click",
                closeSubmitModal
            );
        }


        /* ---------- Confirm Submit ---------- */

        if (modalSubmitEl) {

            modalSubmitEl.addEventListener(
                "click",
                submitExam
            );
        }


        /* ---------- Modal background ---------- */

        if (submitModalEl) {

            submitModalEl.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        submitModalEl
                    ) {

                        closeSubmitModal();
                    }
                }
            );
        }


        /* ---------- Escape key ---------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    submitModalEl &&
                    submitModalEl.classList.contains(
                        "show"
                    )
                ) {

                    closeSubmitModal();
                }
            }
        );


        /* ---------- Keyboard navigation ---------- */

        document.addEventListener(
            "keydown",
            function (event) {

                /*
                Do not interfere when user is typing
                in an input field.
                */

                const tag =
                    document.activeElement
                        ?.tagName;

                if (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT"
                ) {

                    return;
                }


                if (
                    event.key === "ArrowLeft"
                ) {

                    goPrevious();
                }


                if (
                    event.key === "ArrowRight"
                ) {

                    goNext();
                }
            }
        );


        /* ---------- Browser refresh protection ---------- */

        window.addEventListener(
            "beforeunload",
            function (event) {

                saveExamState();

                /*
                We intentionally do not force a browser
                confirmation dialog here because modern
                browsers may ignore custom messages.
                */
            }
        );
    }


    /* =====================================================
       EXAM ERROR MESSAGE
    ===================================================== */

    function showExamError(message) {

        let errorBox =
            document.getElementById(
                "examErrorMessage"
            );


        if (!errorBox) {

            errorBox =
                document.createElement(
                    "div"
                );

            errorBox.id =
                "examErrorMessage";

            errorBox.style.position =
                "fixed";

            errorBox.style.top =
                "20px";

            errorBox.style.left =
                "50%";

            errorBox.style.transform =
                "translateX(-50%)";

            errorBox.style.zIndex =
                "99999";

            errorBox.style.width =
                "min(90%, 600px)";

            errorBox.style.padding =
                "16px 20px";

            errorBox.style.background =
                "#DC2626";

            errorBox.style.color =
                "#FFFFFF";

            errorBox.style.borderRadius =
                "10px";

            errorBox.style.fontFamily =
                "Inter, sans-serif";

            errorBox.style.fontSize =
                "14px";

            errorBox.style.fontWeight =
                "600";

            errorBox.style.textAlign =
                "center";

            document.body.appendChild(
                errorBox
            );
        }


        errorBox.textContent =
            message;
    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.SLOGONExam = {

        getQuestions: function () {
            return questions;
        },

        getCurrentQuestionIndex:
            function () {
                return currentQuestionIndex;
            },

        getAnswers: function () {
            return { ...answers };
        },

        getQuestionStatus:
            function () {
                return {
                    ...questionStatus
                };
            },

        goToQuestion:
            function (index) {
                goToQuestion(index);
            },

        submitExam:
            function () {
                openSubmitModal();
            }
    };


})();