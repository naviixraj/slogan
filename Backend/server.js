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
const multer = require("multer");
const xlsx = require("xlsx");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 }
});

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is missing. Check your .env file.");
    process.exit(1);
}

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-inline'"],
                "script-src-attr": ["'self'", "'unsafe-inline'"],
                "style-src": ["'self'", "https:", "'unsafe-inline'"],
                "font-src": ["'self'", "https:", "data:"],
                "img-src": ["'self'", "data:"]
            }
        }
    })
);
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

// Persistent SQLite Session Store
const Store = session.Store;
class SqliteSessionStore extends Store {
    get(sid, cb) {
        try {
            const row = db.prepare("SELECT sess, expire FROM sessions WHERE sid = ?").get(sid);
            if (!row) return cb(null, null);
            if (row.expire && row.expire < Date.now()) {
                db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
                return cb(null, null);
            }
            return cb(null, JSON.parse(row.sess));
        } catch (e) {
            return cb(e);
        }
    }
    set(sid, sess, cb) {
        try {
            const maxAge = sess.cookie?.maxAge || 4 * 60 * 60 * 1000;
            const expire = Date.now() + maxAge;
            db.prepare(`
                INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
                ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
            `).run(sid, JSON.stringify(sess), expire);
            if (cb) cb(null);
        } catch (e) {
            if (cb) cb(e);
        }
    }
    destroy(sid, cb) {
        try {
            db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
            if (cb) cb(null);
        } catch (e) {
            if (cb) cb(e);
        }
    }
    touch(sid, sess, cb) {
        try {
            const maxAge = sess.cookie?.maxAge || 4 * 60 * 60 * 1000;
            const expire = Date.now() + maxAge;
            db.prepare("UPDATE sessions SET expire = ? WHERE sid = ?").run(expire, sid);
            if (cb) cb(null);
        } catch (e) {
            if (cb) cb(e);
        }
    }
}

// Session configuration
app.use(
    session({
        name: "slogon.sid",
        secret: process.env.SESSION_SECRET,
        store: new SqliteSessionStore(),
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

// Guard: Master Admin portal page
app.get("/admin.html", (req, res, next) => {
    if (!req.session.candidate) {
        return res.redirect("/login.html?next=admin.html");
    }
    if (req.session.candidate.role !== "Admin") {
        return res.redirect("/tests.html");
    }
    next();
});

// Guard: Candidate dashboard page
app.get("/tests.html", (req, res, next) => {
    if (!req.session.candidate) {
        return res.redirect("/login.html?next=tests.html");
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
        SELECT id, user_id, password_hash, candidate_name, email, role, active
        FROM candidates
        WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))
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

        const candidateEmail = candidate.email || `${candidate.user_id}@slogon.edu`;
        const candidateRole = candidate.role || "Student";

        req.session.candidate = {
            id: candidate.id,
            userId: candidate.user_id,
            name: candidate.candidate_name,
            email: candidateEmail,
            role: candidateRole
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
                    name: candidate.candidate_name,
                    email: candidateEmail,
                    role: candidateRole
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

// Middleware: Master Admin authorization
function requireAdmin(req, res, next) {
    if (!req.session.candidate || req.session.candidate.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Master Administrator privileges required."
        });
    }
    next();
}

// Helper: parse uploaded exam files into single split questions
function parseUploadedQuestions(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    let questions = [];

    if (ext === ".json") {
        const parsed = JSON.parse(file.buffer.toString("utf8"));
        if (Array.isArray(parsed)) {
            questions = parsed.map((q, idx) => ({
                id: q.id || idx + 1,
                number: q.number || q.id || idx + 1,
                section: q.section || "Paper 1",
                question: q.question || q.text || "",
                text: q.question || q.text || "",
                options: {
                    A: String(q.options?.A || q.option_a || q.A || ""),
                    B: String(q.options?.B || q.option_b || q.B || ""),
                    C: String(q.options?.C || q.option_c || q.C || ""),
                    D: String(q.options?.D || q.option_d || q.D || "")
                },
                correctAnswer: String(q.correctAnswer || q.answer || "A").trim().toUpperCase(),
                answer: String(q.correctAnswer || q.answer || "A").trim().toUpperCase(),
                explanation: q.explanation || ""
            }));
        }
    } else if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
        const workbook = xlsx.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

        questions = rows.map((row, idx) => {
            const qText = row.Question || row.question || row.Text || row.text || row.Q || row["Question Text"] || row["வினா"] || `Question ${idx + 1}`;
            const optA = row["Option A"] || row.OptionA || row.option_a || row.A || row.a || "";
            const optB = row["Option B"] || row.OptionB || row.option_b || row.B || row.b || "";
            const optC = row["Option C"] || row.OptionC || row.option_c || row.C || row.c || "";
            const optD = row["Option D"] || row.OptionD || row.option_d || row.D || row.d || "";
            const ansRaw = String(row["Correct Answer"] || row.Answer || row.answer || row.Correct || row.correct || row["விடை"] || "A").trim().toUpperCase();
            const ans = ["A", "B", "C", "D"].includes(ansRaw[0]) ? ansRaw[0] : "A";
            const exp = row.Explanation || row.explanation || row.Solution || row.solution || row["விளக்கம்"] || "";
            const sec = row.Section || row.section || "Paper 1";

            return {
                id: idx + 1,
                number: idx + 1,
                section: sec,
                question: String(qText).trim(),
                text: String(qText).trim(),
                options: {
                    A: String(optA).trim(),
                    B: String(optB).trim(),
                    C: String(optC).trim(),
                    D: String(optD).trim()
                },
                correctAnswer: ans,
                answer: ans,
                explanation: String(exp).trim()
            };
        });
    } else {
        // Plain text or PDF text fallback
        const textContent = file.buffer.toString("utf8");
        const rawBlocks = textContent.split(/(?:(?:Question|Q)\s*\d+[:\.]|^\d+[\.\)])/gim).filter(b => b.trim());
        if (rawBlocks.length > 0) {
            questions = rawBlocks.map((block, idx) => {
                const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const qText = lines[0] || `Question ${idx + 1}`;
                return {
                    id: idx + 1,
                    number: idx + 1,
                    section: "Paper 1",
                    question: qText,
                    text: qText,
                    options: {
                        A: lines[1] || "Option A",
                        B: lines[2] || "Option B",
                        C: lines[3] || "Option C",
                        D: lines[4] || "Option D"
                    },
                    correctAnswer: "A",
                    answer: "A",
                    explanation: lines.slice(5).join(" ") || ""
                };
            });
        }
    }

    return questions;
}

// -----------------------------------------------------
// MASTER ADMIN: QUESTION SETS APIS
// -----------------------------------------------------

// Get all Question Sets
app.get("/api/admin/sets", requireAdmin, (req, res) => {
    try {
        const sets = db.prepare(`
            SELECT id, title, subject, file_name, file_type, questions_count, duration, status, created_at
            FROM question_sets
            ORDER BY created_at DESC
        `).all();

        return res.json({ success: true, sets });
    } catch (error) {
        console.error("Admin fetch sets error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve question sets." });
    }
});

// Get a specific Question Set with all single split questions
app.get("/api/admin/sets/:id", requireAdmin, (req, res) => {
    try {
        const setId = req.params.id;
        const row = db.prepare("SELECT * FROM question_sets WHERE UPPER(id) = ?").get(setId.toUpperCase());

        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        const questions = JSON.parse(row.questions_json);
        return res.json({
            success: true,
            set: {
                id: row.id,
                title: row.title,
                subject: row.subject,
                fileName: row.file_name,
                fileType: row.file_type,
                questionsCount: row.questions_count,
                duration: row.duration,
                status: row.status,
                createdAt: row.created_at,
                questions: questions
            }
        });
    } catch (error) {
        console.error("Admin fetch set detail error:", error);
        return res.status(500).json({ success: false, message: "Failed to load set questions." });
    }
});

// Upload and parse file into a Question Set with single split questions
app.post("/api/admin/sets/upload", requireAdmin, upload.single("file"), (req, res) => {
    try {
        const { title, subject, duration } = req.body;
        const file = req.file;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Please provide a title for the Question Set." });
        }

        if (!file) {
            return res.status(400).json({ success: false, message: "Please select an Excel (.xlsx), CSV, JSON, or PDF file to upload." });
        }

        const questions = parseUploadedQuestions(file);

        if (!questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Unable to extract single questions from the uploaded file. Please ensure the file has rows with Question, Option A, Option B, Option C, Option D, and Answer."
            });
        }

        // Generate next ID
        const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
        const countRow = db.prepare("SELECT COUNT(*) as count FROM question_sets").get();
        const nextNum = (countRow ? countRow.count : 0) + 1;
        const setId = `SET${String(nextNum).padStart(2, "0")}`;

        const setDuration = parseInt(duration, 10) || 180;
        const setSubject = subject && subject.trim() ? subject.trim() : "General Paper";
        const questionsJson = JSON.stringify(questions);

        db.prepare(`
            INSERT INTO question_sets (id, title, subject, file_name, file_type, questions_count, duration, status, questions_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)
        `).run(
            setId,
            title.trim(),
            setSubject,
            file.originalname,
            ext,
            questions.length,
            setDuration,
            questionsJson
        );

        return res.json({
            success: true,
            message: `Question Set "${title.trim()}" uploaded successfully with ${questions.length} single split questions!`,
            setId: setId,
            questionsCount: questions.length
        });
    } catch (error) {
        console.error("Upload question set error:", error);
        return res.status(500).json({ success: false, message: "Failed to process and save question set: " + error.message });
    }
});

// Delete a Question Set
app.delete("/api/admin/sets/:id", requireAdmin, (req, res) => {
    try {
        const setId = req.params.id.toUpperCase();
        if (setId === "MOCK01") {
            return res.status(400).json({ success: false, message: "Cannot delete the default Mock Test 01." });
        }

        const result = db.prepare("DELETE FROM question_sets WHERE UPPER(id) = ?").run(setId);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        return res.json({ success: true, message: `Question set ${setId} deleted.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete question set." });
    }
});

// -----------------------------------------------------
// MASTER ADMIN: CANDIDATE / STUDENT APIS
// -----------------------------------------------------

// Get all Candidates
app.get("/api/admin/students", requireAdmin, (req, res) => {
    try {
        const candidates = db.prepare(`
            SELECT id, user_id, candidate_name, email, role, active, created_at
            FROM candidates
            ORDER BY id ASC
        `).all();

        return res.json({ success: true, students: candidates });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load candidate list." });
    }
});

// Add new Student
app.post("/api/admin/students", requireAdmin, (req, res) => {
    try {
        const { userId, password, candidateName, email, role } = req.body;

        if (!userId || !password || !candidateName) {
            return res.status(400).json({ success: false, message: "User ID, Candidate Name, and Password are required." });
        }

        const cleanUserId = userId.trim();
        const existing = db.prepare("SELECT id FROM candidates WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))").get(cleanUserId);
        if (existing) {
            return res.status(400).json({ success: false, message: `Candidate User ID "${cleanUserId}" already exists. Choose a unique User ID.` });
        }

        const passwordHash = bcrypt.hashSync(password, 12);
        const candidateEmail = email && email.trim() ? email.trim() : `${cleanUserId.toLowerCase()}@slogon.edu`;
        const candidateRole = role === "Admin" ? "Admin" : "Student";

        const info = db.prepare(`
            INSERT INTO candidates (user_id, password_hash, candidate_name, email, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(cleanUserId, passwordHash, candidateName.trim(), candidateEmail, candidateRole);

        return res.json({
            success: true,
            id: info.lastInsertRowid,
            student: {
                id: info.lastInsertRowid,
                user_id: cleanUserId,
                candidate_name: candidateName.trim(),
                email: candidateEmail,
                role: candidateRole,
                active: 1
            },
            message: `Candidate account for "${candidateName.trim()}" (${cleanUserId}) created successfully!`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create student account: " + error.message });
    }
});

// Delete a Candidate
app.delete("/api/admin/students/:id", requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        const candidate = db.prepare("SELECT user_id, role FROM candidates WHERE id = ?").get(id);

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate not found." });
        }

        if (candidate.user_id === req.session.candidate.userId) {
            return res.status(400).json({ success: false, message: "Cannot delete the currently logged in administrator." });
        }

        db.prepare("DELETE FROM candidates WHERE id = ?").run(id);
        return res.json({ success: true, message: `Candidate ${candidate.user_id} deleted.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete candidate." });
    }
});

// -----------------------------------------------------
// STUDENT APIS: DYNAMIC TESTS CATALOG & EXAM LOADER
// -----------------------------------------------------

// Get dynamic test catalog for student tests.html
app.get("/api/student/tests", (req, res) => {
    try {
        const tests = db.prepare(`
            SELECT id, title, subject, file_type, questions_count, duration, status
            FROM question_sets
            ORDER BY id ASC
        `).all();

        return res.json({ success: true, tests });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load examination catalog." });
    }
});

// Universal question loader for mock01 and any dynamic question sets
app.get("/api/mock-tests/:testId/questions", async (req, res) => {
    if (!req.session.candidate) {
        return res.status(401).json({
            success: false,
            message: "Please log in to access this examination."
        });
    }

    try {
        const rawId = req.params.testId.toUpperCase();
        let questions = null;
        let testTitle = "";

        // Look up in database
        const row = db.prepare("SELECT id, title, questions_json FROM question_sets WHERE UPPER(id) = ?").get(rawId);
        if (row && row.questions_json) {
            questions = JSON.parse(row.questions_json);
            testTitle = row.title;
        } else if (rawId === "MOCK01") {
            const questionsPath = path.join(ROOT, "data", "mock01.json");
            const fileContent = await fs.promises.readFile(questionsPath, "utf8");
            questions = JSON.parse(fileContent);
        }

        if (!questions || !Array.isArray(questions)) {
            return res.status(404).json({
                success: false,
                message: `Examination set "${req.params.testId}" not found.`
            });
        }

        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            testId: rawId,
            testTitle: testTitle,
            totalQuestions: questions.length,
            questions: questions
        });
    } catch (error) {
        console.error("Test loading error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load examination questions."
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
