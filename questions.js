/* =========================================================
   SLOGON ACADEMY - ONLINE EXAMINATION SYSTEM
   File: js/questions.js

   Purpose:
   1. Load questions from data/questions.json
   2. Validate question data
   3. Store questions globally
   4. Make questions available to exam.js
   5. Support 50 / 100 / 200+ questions
   ========================================================= */

"use strict";

(function () {

    /* -----------------------------------------------------
       CONFIGURATION
       ----------------------------------------------------- */

    const selectedTestId = (localStorage.getItem("selectedMockTest") || "set01").toLowerCase();
    const QUESTIONS_FILE = `/api/mock-tests/${selectedTestId}/questions`;


    /* -----------------------------------------------------
       GLOBAL QUESTION STORAGE
       ----------------------------------------------------- */

    window.examQuestions = [];

    window.questionsLoaded = false;


    /* -----------------------------------------------------
    function processAndStoreQuestions(result) {
        if (!result || !result.success || !Array.isArray(result.questions)) {
            throw new Error(
                (result && result.message) || `Unable to load question set "${selectedTestId}".`
            );
        }

        if (result.duration) {
            localStorage.setItem("examDuration", String(result.duration * 60));
        }
        if (result.testTitle) {
            localStorage.setItem("currentExamTitle", result.testTitle);
        }
        if (result.subject) {
            localStorage.setItem("currentExamSubject", result.subject);
        }

        const questions = result.questions;

        // Normalize and guarantee unique sequential 1-based IDs and numbers
        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

        if (!Array.isArray(questions)) {
            throw new Error("Question data must be a JSON array.");
        }

        if (questions.length === 0) {
            throw new Error("questions.json contains no questions.");
        }

        const validationResult = validateQuestions(questions);
        if (!validationResult.valid) {
            throw new Error(validationResult.message);
        }

        questions.sort((a, b) => (Number(a.number || a.id) || 0) - (Number(b.number || b.id) || 0));

        window.examQuestions = questions;
        window.questionsLoaded = true;

        console.log(
            `SLOGON ACADEMY: ${questions.length} questions loaded successfully.`
        );

        window.dispatchEvent(
            new CustomEvent("questionsLoaded", {
                detail: {
                    questions: questions,
                    totalQuestions: questions.length
                }
            })
        );

        return questions;
    }

    /* -----------------------------------------------------
       LOAD QUESTIONS
       ----------------------------------------------------- */

    async function loadQuestions() {
        const CACHE_KEY = `slogon_cached_questions_${selectedTestId}`;

        // 1. Instant load from sessionStorage cache (0ms delay on refresh)
        try {
            const cachedRaw = sessionStorage.getItem(CACHE_KEY);
            if (cachedRaw) {
                const cachedResult = JSON.parse(cachedRaw);
                if (cachedResult && cachedResult.success && Array.isArray(cachedResult.questions) && cachedResult.questions.length > 0) {
                    console.log(`SLOGON ACADEMY: Instant load from sessionStorage cache for ${selectedTestId}.`);
                    return processAndStoreQuestions(cachedResult);
                }
            }
        } catch (cacheErr) {
            console.warn("SLOGON ACADEMY: Question cache read error:", cacheErr);
        }

        try {

            console.log(`SLOGON ACADEMY: Loading question data for ${selectedTestId}...`);

            const response = await fetch(QUESTIONS_FILE, {
                cache: "no-store",
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error(
                    `Unable to load question set "${selectedTestId}". HTTP Status: ${response.status}`
                );
            }

            const result = await response.json();

            // Save in sessionStorage cache for instant loading on page refresh
            try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
            } catch (storageErr) {
                console.warn("SLOGON ACADEMY: Could not store questions in sessionStorage:", storageErr);
            }

            return processAndStoreQuestions(result);

        } catch (error) {

            console.error(
                "SLOGON ACADEMY: Question loading failed.",
                error
            );


            window.examQuestions = [];

            window.questionsLoaded = false;


            showQuestionLoadError(error);


            throw error;
        }
    }


    /* -----------------------------------------------------
       VALIDATE QUESTIONS
       ----------------------------------------------------- */

    function validateQuestions(questions) {

        const requiredFields = [
            "id",
            "question",
            "options",
            "correctAnswer"
        ];


        /* ---------------------------------------------
           CHECK EACH QUESTION
           --------------------------------------------- */

        for (let i = 0; i < questions.length; i++) {

            const question = questions[i];

            const questionNumber = i + 1;


            /* -----------------------------------------
               CHECK OBJECT
               ----------------------------------------- */

            if (
                typeof question !== "object" ||
                question === null ||
                Array.isArray(question)
            ) {

                return {
                    valid: false,
                    message:
                        `Question ${questionNumber} is not a valid object.`
                };

            }


            /* -----------------------------------------
               CHECK REQUIRED FIELDS
               ----------------------------------------- */

            for (const field of requiredFields) {

                if (
                    question[field] === undefined ||
                    question[field] === null
                ) {

                    return {
                        valid: false,
                        message:
                            `Question ${questionNumber} is missing the "${field}" field.`
                    };

                }

            }


            /* -----------------------------------------
               CHECK QUESTION TEXT
               ----------------------------------------- */

            if (
                typeof question.question !== "string" ||
                question.question.trim() === ""
            ) {

                return {
                    valid: false,
                    message:
                        `Question ${questionNumber} has invalid question text.`
                };

            }


            /* -----------------------------------------
               CHECK OPTIONS OBJECT
               ----------------------------------------- */

            if (
                typeof question.options !== "object" ||
                question.options === null ||
                Array.isArray(question.options)
            ) {

                return {
                    valid: false,
                    message:
                        `Question ${questionNumber} has invalid options.`
                };

            }


            /* -----------------------------------------
               CHECK A / B / C / D OPTIONS
               ----------------------------------------- */

            const optionKeys = ["A", "B", "C", "D"];

            for (const key of optionKeys) {

                if (
                    question.options[key] === undefined ||
                    question.options[key] === null ||
                    String(question.options[key]).trim() === ""
                ) {

                    return {
                        valid: false,
                        message:
                            `Question ${questionNumber} is missing option ${key}.`
                    };

                }

            }


            /* -----------------------------------------
               CHECK CORRECT ANSWER
               ----------------------------------------- */

            const correctAnswer =
                String(question.correctAnswer)
                    .trim()
                    .toUpperCase();


            if (!optionKeys.includes(correctAnswer)) {

                return {
                    valid: false,
                    message:
                        `Question ${questionNumber} has an invalid correctAnswer.`
                };

            }


            /* -----------------------------------------
               CHECK QUESTION ID
               ----------------------------------------- */

            if (
                question.id === "" ||
                question.id === null ||
                question.id === undefined
            ) {

                return {
                    valid: false,
                    message:
                        `Question ${questionNumber} has an invalid ID.`
                };

            }

        }


        /* ---------------------------------------------
           CHECK DUPLICATE IDs (Auto-repair if found)
           --------------------------------------------- */

        const ids = questions.map(question => String(question.id));

        const uniqueIds = new Set(ids);


        if (ids.length !== uniqueIds.size) {

            console.warn("SLOGON ACADEMY: Duplicate question IDs detected. Auto-re-indexing questions.");
            questions.forEach((q, idx) => {
                q.id = idx + 1;
                q.number = idx + 1;
            });

        }


        /* ---------------------------------------------
           VALIDATION SUCCESS
           --------------------------------------------- */

        return {
            valid: true,
            message: "Question data is valid."
        };

    }


    /* -----------------------------------------------------
       GET ALL QUESTIONS
       ----------------------------------------------------- */

    function getQuestions() {

        return window.examQuestions;

    }


    /* -----------------------------------------------------
       GET QUESTION BY ARRAY INDEX
       ----------------------------------------------------- */

    function getQuestionByIndex(index) {

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= window.examQuestions.length
        ) {

            return null;

        }

        return window.examQuestions[index];

    }


    /* -----------------------------------------------------
       GET QUESTION BY ID
       ----------------------------------------------------- */

    function getQuestionById(id) {

        return window.examQuestions.find(
            question => String(question.id) === String(id)
        ) || null;

    }


    /* -----------------------------------------------------
       GET TOTAL QUESTIONS
       ----------------------------------------------------- */

    function getTotalQuestions() {

        return window.examQuestions.length;

    }


    /* -----------------------------------------------------
       GET CORRECT ANSWER
       ----------------------------------------------------- */

    function getCorrectAnswer(questionIndex) {

        const question = getQuestionByIndex(questionIndex);

        if (!question) {

            return null;

        }

        return question.correctAnswer;

    }


    /* -----------------------------------------------------
       SHOW QUESTION LOAD ERROR
       ----------------------------------------------------- */

    function showQuestionLoadError(error) {

        /* ---------------------------------------------
           REMOVE EXISTING ERROR MESSAGE
           --------------------------------------------- */

        const existingError =
            document.getElementById("questionLoadError");

        if (existingError) {

            existingError.remove();

        }


        /* ---------------------------------------------
           CREATE ERROR MESSAGE
           --------------------------------------------- */

        const errorBox = document.createElement("div");

        errorBox.id = "questionLoadError";


        errorBox.style.position = "fixed";
        errorBox.style.top = "20px";
        errorBox.style.left = "50%";
        errorBox.style.transform = "translateX(-50%)";
        errorBox.style.zIndex = "99999";
        errorBox.style.width = "min(90%, 600px)";
        errorBox.style.padding = "16px 20px";
        errorBox.style.borderRadius = "10px";
        errorBox.style.background = "#FEF2F2";
        errorBox.style.border = "1px solid #FCA5A5";
        errorBox.style.color = "#991B1B";
        errorBox.style.fontFamily =
            "Inter, Arial, sans-serif";
        errorBox.style.fontSize = "14px";
        errorBox.style.lineHeight = "1.6";
        errorBox.style.boxShadow =
            "0 10px 30px rgba(0,0,0,0.12)";


        errorBox.innerHTML = `
            <strong>SLOGON ACADEMY</strong><br>
            Unable to load examination questions.<br>
            <span style="font-size: 13px; color: #7F1D1D;">${(error && error.message) ? error.message : "Please check your network connection or login session."}</span>
            <div style="margin-top: 10px;">
                <a href="tests.html" style="color: #991B1B; font-weight: 700; text-decoration: underline;">Return to Examinations Dashboard</a>
            </div>
        `;

        document.body.prepend(errorBox);

    }


    /* -----------------------------------------------------
       PUBLIC API
       ----------------------------------------------------- */

    window.SLOGONQuestions = {

        loadQuestions: loadQuestions,

        getQuestions: getQuestions,

        getQuestionByIndex: getQuestionByIndex,

        getQuestionById: getQuestionById,

        getTotalQuestions: getTotalQuestions,

        getCorrectAnswer: getCorrectAnswer,

        validateQuestions: validateQuestions

    };


    /* -----------------------------------------------------
       START LOADING QUESTIONS
       ----------------------------------------------------- */

    window.questionsReady = loadQuestions();


})();
