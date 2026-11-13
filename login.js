
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

/* GET THE REQUESTED DESTINATION */

const params = new URLSearchParams(window.location.search);

const requestedPage = params.get("next");

/* ALLOW ONLY APPROVED LOCAL DESTINATIONS */

const allowedPages = [
    "exam.html",
    "tests.html"
];

const redirectPage = "tests.html";

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;

    message.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "VERIFYING...";

    try {

        const response = await fetch("/api/login", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                userId,
                password
            })
        });

        const rawResponse = await response.text();

        console.log("HTTP Status:", response.status);
        console.log("Server Response:", rawResponse);

        if (!rawResponse) {
            throw new Error(
                `Server returned an empty response. HTTP ${response.status}.`
            );
        }

        let result;

        try {
            result = JSON.parse(rawResponse);
        } catch {
            throw new Error(
                "Server returned invalid JSON. Check the backend terminal."
            );
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Login failed."
            );
        }

        /* VERIFY THE NEW LOGIN SESSION */

        const sessionResponse = await fetch("/api/me", {
            method: "GET",
            credentials: "same-origin"
        });

        const sessionData = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionData.success) {
            throw new Error(
                "Login succeeded, but candidate session verification failed."
            );
        }

        /* REDIRECT BASED ON USER ROLE */

        const userRole = (sessionData.candidate && sessionData.candidate.role) || "Student";

        if (userRole === "Admin" || userRole === "Master Admin") {
            window.location.replace("admin.html");
        } else {
            const targetPage = requestedPage && allowedPages.includes(requestedPage) ? requestedPage : redirectPage;
            window.location.replace(targetPage);
        }

    } catch (error) {

        console.error("Login error:", error);

        message.style.color = "#C0392B";
        message.textContent = error.message;

        loginButton.disabled = false;
        loginButton.textContent = "LOGIN";
    }

});


