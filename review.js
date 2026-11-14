
"use strict";

document.addEventListener("DOMContentLoaded", loadAnswerReview);

async function loadAnswerReview() {
    const message = document.getElementById("reviewMessage");
    const questionsContainer =
        document.getElementById("reviewQuestions");

    try {
        // Load the result saved when the exam was submitted.
        const savedResult = localStorage.getItem("examResult");

        if (!savedResult) {
            throw new Error(
                "No submitted result was found. Please complete an exam first."
            );
        }

        const result = JSON.parse(savedResult);

        // Use questions snapshot from exam result if available; otherwise fetch the specific test dynamically
        let questions = Array.isArray(result.questions) && result.questions.length > 0 ? result.questions : null;

        if (!questions) {
            const activeTestId = (result.testId || localStorage.getItem("selectedMockTest") || "mock01").toLowerCase();
            const response = await fetch(`/api/mock-tests/${encodeURIComponent(activeTestId)}/questions`, {
                cache: "no-store",
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error(
                    "The question bank could not be loaded."
                );
            }

            const apiResult = await response.json();
            questions = Array.isArray(apiResult) ? apiResult : (apiResult.questions || []);
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("The question bank format is invalid.");
        }

        const answers = result.answers || {};
        const candidate = result.candidate || {};
        const examTitle = result.testTitle || (candidate && candidate.exam) || localStorage.getItem("currentExamTitle") || "Mock Test";
        const examSubject = result.subject || (candidate && candidate.subject) || localStorage.getItem("currentExamSubject") || "General Paper";

        document.getElementById("reviewCandidate").textContent =
            "Candidate: " + (candidate.name || "Not available") +
            " | Register Number: " +
            (candidate.registerNumber || candidate.userId || "Not available") +
            " | Subject: " + examSubject +
            " | Exam: " + examTitle;

        document.getElementById("reviewSummary").textContent =
            "Total: " + result.totalQuestions +
            " | Correct: " + result.correct +
            " | Incorrect: " + result.wrong +
            " | Unanswered: " + result.unanswered;

        const correctCount = Number(result.correct || 0);
        const wrongCount = Number(result.wrong || 0);
        const unansweredCount = Number(result.unanswered || 0);

        if (questions.length === 0) {
            throw new Error("No questions were found.");
        }

        // Display questions in their original order.
        questions.forEach(function (question, index) {
            const questionId = String(question.id !== undefined ? question.id : (question.number !== undefined ? question.number : index + 1));
            const correctAnswer = String(
                question.correctAnswer || question.answer || ""
            ).trim().toUpperCase();

            const selectedAnswer = String(
                answers[questionId] !== undefined ? answers[questionId] : (answers[String(index + 1)] || "")
            ).trim().toUpperCase();

            let status;
            let statusClass;

            if (!selectedAnswer) {
                status = "Unanswered";
                statusClass = "review-unanswered";
            } else if (selectedAnswer === correctAnswer) {
                status = "Correct";
                statusClass = "review-correct";
            } else {
                status = "Incorrect";
                statusClass = "review-incorrect";
            }

            const card = document.createElement("article");
            card.className = "review-card";

            const statusBadge = document.createElement("span");
            statusBadge.className =
                "review-status " + statusClass;
            statusBadge.textContent = status;
            card.appendChild(statusBadge);

            const heading = document.createElement("h2");
            heading.textContent =
                "Question " + (index + 1) + ": " +
                (question.question || "");
            card.appendChild(heading);

            // Show all options, highlighting the correct one
            // and the candidate's incorrect selection.
            const options = question.options || {};

            ["A", "B", "C", "D"].forEach(function (key) {
                if (typeof options[key] === "undefined") {
                    return;
                }

                const option = document.createElement("div");
                option.className = "review-option";

                if (key === correctAnswer) {
                    option.classList.add("correct-option");
                }

                if (
                    key === selectedAnswer &&
                    selectedAnswer !== correctAnswer
                ) {
                    option.classList.add("selected-wrong");
                }

                let label = key + ". " + options[key];

                if (key === correctAnswer) {
                    label += " — Correct Answer";
                }

                if (key === selectedAnswer) {
                    label += " — Your Answer";
                }

                option.textContent = label;
                card.appendChild(option);
            });

            const answerSummary = document.createElement("p");
            answerSummary.className = "review-meta";

            answerSummary.textContent =
                "Your answer: " +
                (selectedAnswer
                    ? selectedAnswer + ". " +
                      (options[selectedAnswer] || "")
                    : "Not answered") +
                " | Correct answer: " +
                (correctAnswer
                    ? correctAnswer + ". " +
                      (options[correctAnswer] || "")
                    : "Answer key unavailable");

            card.appendChild(answerSummary);

            const explanationBox = document.createElement("div");
            explanationBox.className = "review-explanation";

            const explanationHeading = document.createElement("h3");
            explanationHeading.textContent = "Explanation";
            explanationBox.appendChild(explanationHeading);

            const explanationText = document.createElement("p");
            explanationText.textContent =
                question.explanation ||
                "No explanation has been added to this question yet.";

            explanationBox.appendChild(explanationText);
            card.appendChild(explanationBox);

            questionsContainer.appendChild(card);
        });

        message.textContent =
            "Answer review loaded successfully.";

    } catch (error) {
        console.error("Answer review error:", error);

        message.className = "review-error";
        message.textContent =
            error.message ||
            "Unable to load the answer review.";
    }
}
