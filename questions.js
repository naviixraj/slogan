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

    const QUESTIONS_FILE = "/api/mock-tests/mock01/questions";


    /* -----------------------------------------------------
       GLOBAL QUESTION STORAGE
       ----------------------------------------------------- */

    window.examQuestions = [];

    window.questionsLoaded = false;


    /* -----------------------------------------------------
       LOAD QUESTIONS
       ----------------------------------------------------- */

    async function loadQuestions() {

        try {

            console.log("SLOGON ACADEMY: Loading question data...");

            const response = await fetch(QUESTIONS_FILE, {
                cache: "no-store"
            });


            /* ---------------------------------------------
               CHECK HTTP RESPONSE
               --------------------------------------------- */

            if (!response.ok) {

                throw new Error(
                    `Unable to load questions.json. HTTP Status: ${response.status}`
                );

            }


            /* ---------------------------------------------
               CONVERT JSON
               --------------------------------------------- */

            const result = await response.json();

                if (!result.success || !Array.isArray(result.questions)) {
                throw new Error(
                result.message || "Unable to load Mock Test 01."
               );
            }

const questions = result.questions;


            /* ---------------------------------------------
               CHECK WHETHER DATA IS ARRAY
               --------------------------------------------- */

            if (!Array.isArray(questions)) {

                throw new Error(
                    "Question data must be a JSON array."
                );

            }


            /* ---------------------------------------------
               CHECK EMPTY QUESTION FILE
               --------------------------------------------- */

            if (questions.length === 0) {

                throw new Error(
                    "questions.json contains no questions."
                );

            }


            /* ---------------------------------------------
               VALIDATE QUESTION DATA
               --------------------------------------------- */

            const validationResult = validateQuestions(questions);


            if (!validationResult.valid) {

                throw new Error(validationResult.message);

            }


            /* ---------------------------------------------
               STORE QUESTIONS
               --------------------------------------------- */

            window.examQuestions = questions;

            window.questionsLoaded = true;


            /* ---------------------------------------------
               DISPLAY SUCCESS INFORMATION
               --------------------------------------------- */

            console.log(
                `SLOGON ACADEMY: ${questions.length} questions loaded successfully.`
            );


            console.log(
                "Question Data:",
                window.examQuestions
            );


            /* ---------------------------------------------
               SEND EVENT TO exam.js
               --------------------------------------------- */

            window.dispatchEvent(
                new CustomEvent("questionsLoaded", {
                    detail: {
                        questions: questions,
                        totalQuestions: questions.length
                    }
                })
            );


            return questions;

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
           CHECK DUPLICATE IDs
           --------------------------------------------- */

        const ids = questions.map(question => String(question.id));

        const uniqueIds = new Set(ids);


        if (ids.length !== uniqueIds.size) {

            return {
                valid: false,
                message:
                    "Duplicate question IDs found in questions.json."
            };

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
            Please make sure that
            <strong>data/questions.json</strong>
            exists and the exam is opened using
            <strong>Live Server</strong>.
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
