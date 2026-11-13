require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is missing. Check your .env file.");
    process.exit(1);
}

app.disable("x-powered-by");

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Login attempt protection
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later."
    }
});

const certKeyPath = path.join(ROOT, "certs", "localhost-key.pem");
const certPath = path.join(ROOT, "certs", "localhost.pem");
const hasCerts = fs.existsSync(certKeyPath) && fs.existsSync(certPath);

// Session configuration
app.use(
    session({
        name: "slogon.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: hasCerts && process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 4 * 60 * 60 * 1000
        }
    })
);

// Prevent access to private project files
app.use((req, res, next) => {
    const blocked =
        /^\/(backend|data|node_modules|certs)(\/|$)/i.test(req.path) ||
        /^\/(\.env|package\.json|package-lock\.json)(\/|$)/i.test(req.path);

    if (blocked) {
        return res.sendStatus(404);
    }

    next();
});

// Main login page
app.get("/", (req, res) => {
    res.sendFile(path.join(ROOT, "login.html"));
});

// Login API
app.post("/api/login", loginLimiter, (req, res) => {
    const { userId, password } = req.body;

    if (
        typeof userId !== "string" ||
        typeof password !== "string" ||
        !userId.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter your User ID and password."
        });
    }

    const candidate = db.prepare(`
        SELECT id, user_id, password_hash, candidate_name, active
        FROM candidates
        WHERE user_id = ?
    `).get(userId.trim());

    if (
        !candidate ||
        candidate.active !== 1 ||
        !bcrypt.compareSync(password, candidate.password_hash)
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid User ID or password."
        });
    }

    req.session.regenerate((error) => {
        if (error) {
            console.error("Session error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to create login session."
            });
        }

        req.session.candidate = {
            id: candidate.id,
            userId: candidate.user_id,
            name: candidate.candidate_name
        };

        req.session.save((saveError) => {
            if (saveError) {
                console.error("Session save error:", saveError);
                return res.status(500).json({
                    success: false,
                    message: "Unable to save login session."
                });
            }

            return res.json({
                success: true,
                message: "Login successful.",
                candidate: {
                    userId: candidate.user_id,
                    name: candidate.candidate_name
                }
            });
        });
    });
});

// Check current login
app.get("/api/me", (req, res) => {
    if (!req.session.candidate) {
        return res.status(401).json({
            success: false,
            message: "Please log in."
        });
    }

    res.json({
        success: true,
        candidate: req.session.candidate
    });
});

// Load Mock Test 01 Questions
app.get("/api/mock-tests/mock01/questions", async (req, res) => {

    // Check candidate login
    if (!req.session.candidate) {
        return res.status(401).json({
            success: false,
            message: "Please log in to access this examination."
        });
    }

    try {

        // Locate Mock Test 01 JSON file
        const questionsPath = path.join(
            ROOT,
            "data",
            "mock01.json"
        );

        // Read JSON file
        const fileContent = await fs.promises.readFile(
            questionsPath,
            "utf8"
        );

        // Convert JSON into JavaScript data
        const questions = JSON.parse(fileContent);

        // Validate question data
        if (!Array.isArray(questions) || questions.length !== 150) {
            return res.status(500).json({
                success: false,
                message: "Mock Test 01 must contain exactly 150 questions."
            });
        }

        // Prevent browser caching
        res.set("Cache-Control", "no-store");

        // Send questions to examination portal
        return res.json({
            success: true,
            testId: "mock01",
            totalQuestions: questions.length,
            questions: questions
        });

    } catch (error) {

        console.error("Mock Test 01 loading error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load Mock Test 01 questions. Check the JSON file."
        });
    }
});

// Logout API
app.post("/api/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("slogon.sid");

        res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

// Serve existing website files
app.use(express.static(ROOT, { index: false }));

// Start server (HTTPS if certificates exist, otherwise HTTP for local development)
if (hasCerts) {
    const HTTPS_OPTIONS = {
        key: fs.readFileSync(certKeyPath),
        cert: fs.readFileSync(certPath)
    };
    https.createServer(HTTPS_OPTIONS, app).listen(PORT, () => {
        console.log("----------------------------------");
        console.log("SLOGON ACADEMY MOCK TEST SERVER");
        console.log("----------------------------------");
        console.log(`Secure server running at https://localhost:${PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log("----------------------------------");
        console.log("SLOGON ACADEMY MOCK TEST SERVER");
        console.log("----------------------------------");
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
