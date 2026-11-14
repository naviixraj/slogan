require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const unifiedDb = require("./db");
const multer = require("multer");
const xlsx = require("xlsx");
const mammoth = require("mammoth");

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Handle JSON body parser errors gracefully
app.use((err, req, res, next) => {
    if (err && err.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "The pasted text or question file exceeds the size limit. Please reduce the batch size."
        });
    }
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Malformed data payload received."
        });
    }
    next(err);
});

// Login attempt protection
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
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

// Persistent Session Store (Supabase Cloud PostgreSQL with SQLite fallback)
const Store = session.Store;
class AppSessionStore extends Store {
    get(sid, cb) {
        unifiedDb.getSession(sid)
            .then(sess => cb(null, sess))
            .catch(err => cb(err));
    }
    set(sid, sess, cb) {
        const maxAge = sess.cookie?.maxAge || 4 * 60 * 60 * 1000;
        const expire = Date.now() + maxAge;
        unifiedDb.setSession(sid, sess, expire)
            .then(() => cb && cb(null))
            .catch(err => cb && cb(err));
    }
    destroy(sid, cb) {
        unifiedDb.destroySession(sid)
            .then(() => cb && cb(null))
            .catch(err => cb && cb(err));
    }
    touch(sid, sess, cb) {
        const maxAge = sess.cookie?.maxAge || 4 * 60 * 60 * 1000;
        const expire = Date.now() + maxAge;
        unifiedDb.touchSession(sid, expire)
            .then(() => cb && cb(null))
            .catch(err => cb && cb(err));
    }
}

// Session configuration
app.use(
    session({
        name: "slogon.sid",
        secret: process.env.SESSION_SECRET,
        store: new AppSessionStore(),
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
app.post("/api/login", loginLimiter, async (req, res) => {
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

    const cleanUserId = userId.trim();
    const candidate = await unifiedDb.findCandidateByUserId(cleanUserId);

    if (!candidate) {
        console.log(`[LOGIN FAILED] User ID not found in database: "${cleanUserId}"`);
        return res.status(401).json({
            success: false,
            message: "Invalid User ID or password."
        });
    }

    if (candidate.active !== 1) {
        console.log(`[LOGIN FAILED] Account is deactivated: "${candidate.user_id}"`);
        return res.status(401).json({
            success: false,
            message: "This account has been deactivated."
        });
    }

    const isMatch = bcrypt.compareSync(password, candidate.password_hash) ||
                    bcrypt.compareSync(password.trim(), candidate.password_hash);

    if (!isMatch) {
        console.log(`[LOGIN FAILED] Password mismatch for User ID: "${candidate.user_id}"`);
        return res.status(401).json({
            success: false,
            message: "Invalid User ID or password."
        });
    }

    console.log(`[LOGIN SUCCESS] Authenticated as "${candidate.user_id}" (${candidate.role})`);

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

// Helper: extract raw text from PDF buffer
async function extractPdfText(buffer) {
    try {
        const pdfModule = require("pdf-parse");
        if (typeof pdfModule === "function") {
            const data = await pdfModule(buffer);
            return data.text || "";
        } else if (pdfModule && pdfModule.PDFParse) {
            const parser = new pdfModule.PDFParse({ data: buffer });
            const result = await parser.getText();
            if (typeof parser.destroy === "function") {
                await parser.destroy();
            }
            return result.text || "";
        }
    } catch (err) {
        console.error("PDF parse extraction error:", err);
    }
    return "";
}

// Helper: robust parser for MCQ questions from text (PDF or plain text)
function parseMcqText(text) {
    if (!text || typeof text !== "string") return [];

    // Strip page number markers and normalize linebreaks
    const normalized = text
        .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
        .replace(/Page\s+\d+(?:\s+of\s+\d+)?/gi, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

    // Split into question blocks by detecting "Question 1", "Q.1", "Q1", or "1." at start of line
    const regex = /(?:^|\n)(?=(?:(?:Question|Q)\s*[:\.-]?\s*\d+[\.:\)\s\-]+|\d+[\.\)]\s+))/gi;
    const rawBlocks = normalized.split(regex).map(b => b.trim()).filter(b => b.length > 5);

    const questions = [];

    rawBlocks.forEach((block, idx) => {
        // Clean leading question numbering: e.g. "Question 1:", "Q1.", "1."
        let cleanBlock = block.replace(/^(?:(?:Question|Q)\s*[:\.-]?\s*\d+[\.:\)\s\-]*|\d+[\.\)]\s*)/i, "").trim();

        // Extract explanation if present
        let explanation = "";
        const expMatch = cleanBlock.match(/(?:Explanation|Solution|Exp|Sol)[:\s\-]+([\s\S]*)$/i);
        if (expMatch) {
            explanation = expMatch[1].trim();
            cleanBlock = cleanBlock.replace(expMatch[0], "").trim();
        }

        // Extract answer if present
        let answer = "A";
        const ansMatch = cleanBlock.match(/(?:Correct\s*Answer|Answer|Ans|Key)[:\s\-]+([A-Da-d1-4]|\([A-Da-d1-4]\)|\[[A-Da-d1-4]\])/i);
        if (ansMatch) {
            const rawLetter = ansMatch[1].replace(/[\(\)\[\]\s]/g, "").toUpperCase();
            const mapped = rawLetter === "1" ? "A" : rawLetter === "2" ? "B" : rawLetter === "3" ? "C" : rawLetter === "4" ? "D" : rawLetter;
            if (["A", "B", "C", "D"].includes(mapped)) {
                answer = mapped;
            }
            cleanBlock = cleanBlock.replace(ansMatch[0], "").trim();
        }

        // Parse options A, B, C, D
        const optPattern = /(?:^|\n|\s{2,})(?:\(?([A-Da-d1-4])[\.\)\:\-\]]\s*|\(([A-Da-d1-4])\)\s*)/g;
        const matches = [];
        let m;
        while ((m = optPattern.exec(cleanBlock)) !== null) {
            const optKey = (m[1] || m[2]).toUpperCase();
            const mapKey = optKey === "1" ? "A" : optKey === "2" ? "B" : optKey === "3" ? "C" : optKey === "4" ? "D" : optKey;
            matches.push({
                key: mapKey,
                index: m.index,
                matchLen: m[0].length
            });
        }

        let questionText = cleanBlock;
        let options = { A: "", B: "", C: "", D: "" };

        if (matches.length >= 4) {
            questionText = cleanBlock.substring(0, matches[0].index).trim();
            for (let i = 0; i < matches.length; i++) {
                const current = matches[i];
                const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : cleanBlock.length;
                const optText = cleanBlock.substring(current.index + current.matchLen, nextIndex).trim();
                if (options.hasOwnProperty(current.key)) {
                    options[current.key] = optText;
                }
            }
        } else {
            const lines = cleanBlock.split("\n").map(l => l.trim()).filter(Boolean);
            if (lines.length > 0) {
                questionText = lines[0];
                if (lines[1]) options.A = lines[1].replace(/^[A-Da-d1-4][\.\)\:\-\]]\s*/, "");
                if (lines[2]) options.B = lines[2].replace(/^[A-Da-d1-4][\.\)\:\-\]]\s*/, "");
                if (lines[3]) options.C = lines[3].replace(/^[A-Da-d1-4][\.\)\:\-\]]\s*/, "");
                if (lines[4]) options.D = lines[4].replace(/^[A-Da-d1-4][\.\)\:\-\]]\s*/, "");
            }
        }

        if (!options.A) options.A = "Option A";
        if (!options.B) options.B = "Option B";
        if (!options.C) options.C = "Option C";
        if (!options.D) options.D = "Option D";

        if (questionText.trim()) {
            questions.push({
                id: idx + 1,
                number: idx + 1,
                section: "Paper 1",
                question: questionText.trim(),
                text: questionText.trim(),
                options: options,
                correctAnswer: answer,
                answer: answer,
                explanation: explanation
            });
        }
    });

    return questions;
}

// Helper: parse uploaded exam files into single split questions (supports PDF, Excel, CSV, JSON, TXT)
async function parseUploadedQuestions(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    let questions = [];

    if (ext === ".pdf") {
        const text = await extractPdfText(file.buffer);
        questions = parseMcqText(text);
    } else if (ext === ".docx") {
        try {
            const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
            questions = parseMcqText(docxResult.value);
        } catch (docxErr) {
            console.error("DOCX parsing error:", docxErr);
            questions = parseMcqText(file.buffer.toString("utf8"));
        }
    } else if (ext === ".json") {
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
    } else if (ext === ".xlsx" || ext === ".xls" || ext === ".csv" || ext === ".tsv") {
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
        // Plain text fallback
        const textContent = file.buffer.toString("utf8");
        questions = parseMcqText(textContent);
    }

    return questions;
}

// -----------------------------------------------------
// MASTER ADMIN: QUESTION SETS APIS
// -----------------------------------------------------

// Helper: generate guaranteed unique Question Set ID that avoids primary key collisions
async function getNextUniqueSetId() {
    try {
        const sets = await unifiedDb.listQuestionSets();
        const existingIds = new Set((sets || []).map(s => String(s.id || "").trim().toUpperCase()));

        let maxNum = 0;
        for (const id of existingIds) {
            const match = id.match(/^SET(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }

        let candidateNum = maxNum + 1;
        let candidateId = `SET${String(candidateNum).padStart(2, "0")}`;
        while (existingIds.has(candidateId.toUpperCase())) {
            candidateNum++;
            candidateId = `SET${String(candidateNum).padStart(2, "0")}`;
        }
        return candidateId;
    } catch (e) {
        console.error("Error generating unique set ID:", e);
        return `SET_${Date.now()}`;
    }
}

// Get all Question Sets
app.get("/api/admin/sets", requireAdmin, async (req, res) => {
    try {
        const sets = await unifiedDb.listQuestionSets();
        return res.json({ success: true, sets });
    } catch (error) {
        console.error("Admin fetch sets error:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve question sets." });
    }
});

// Get a specific Question Set with all single split questions
app.get("/api/admin/sets/:id", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const row = await unifiedDb.getQuestionSetById(setId);

        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        const questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
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
app.post("/api/admin/sets/upload", requireAdmin, upload.single("file"), async (req, res) => {
    try {
        const { title, subject, duration } = req.body;
        const file = req.file;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Please provide a title for the Question Set." });
        }

        if (!file) {
            return res.status(400).json({ success: false, message: "Please select an Excel (.xlsx), CSV, JSON, or PDF file to upload." });
        }

        const questions = await parseUploadedQuestions(file);

        if (!questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Unable to extract single questions from the uploaded file. Please ensure the file contains multiple-choice questions with options (A, B, C, D) and answers."
            });
        }

        // Generate collision-free next ID
        const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
        const setId = await getNextUniqueSetId();

        const setDuration = parseInt(duration, 10) || 180;
        const setSubject = subject && subject.trim() ? subject.trim() : "General Paper";

        await unifiedDb.createQuestionSet({
            id: setId,
            title: title.trim(),
            subject: setSubject,
            fileName: file.originalname,
            fileType: ext,
            questionsCount: questions.length,
            duration: setDuration,
            status: "available",
            questionsJson: questions
        });

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

// Bulk Paste & parse raw text into a Question Set
app.post("/api/admin/sets/paste", requireAdmin, async (req, res) => {
    try {
        const { title, subject, duration, textContent } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: "Please provide an Examination Display Title." });
        }

        if (!textContent || !textContent.trim()) {
            return res.status(400).json({ success: false, message: "Please paste your question set text." });
        }

        const questions = parseMcqText(textContent);

        if (!questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No questions could be extracted from the pasted text. Please make sure questions have numbers (e.g. 1. or Q1.), options A, B, C, D, and answer keys (e.g. Answer: C)."
            });
        }

        // Generate collision-free next ID
        const setId = await getNextUniqueSetId();

        const setDuration = parseInt(duration, 10) || 180;
        const setSubject = subject && subject.trim() ? subject.trim() : "General Paper";

        await unifiedDb.createQuestionSet({
            id: setId,
            title: title.trim(),
            subject: setSubject,
            fileName: "Pasted Question Set.txt",
            fileType: "text",
            questionsCount: questions.length,
            duration: setDuration,
            status: "available",
            questionsJson: questions
        });

        return res.json({
            success: true,
            message: `Question Set "${title.trim()}" created successfully with ${questions.length} questions from pasted text!`,
            setId: setId,
            questionsCount: questions.length
        });
    } catch (error) {
        console.error("Paste question set error:", error);
        return res.status(500).json({ success: false, message: "Failed to process pasted question set: " + error.message });
    }
});

// Delete a Question Set
app.delete("/api/admin/sets/:id", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const deleted = await unifiedDb.deleteQuestionSet(setId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        return res.json({ success: true, message: `Question set ${setId} deleted.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete question set." });
    }
});

// Delete a single question from a Question Set
app.delete("/api/admin/sets/:id/questions/:qNum", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const targetNum = Number(req.params.qNum);

        const row = await unifiedDb.getQuestionSetById(setId);
        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        let questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
        const originalCount = questions.length;

        questions = questions.filter((q, idx) => {
            const currentNum = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            return currentNum !== targetNum && (idx + 1) !== targetNum;
        });

        if (questions.length === originalCount) {
            return res.status(404).json({ success: false, message: "Question not found in set." });
        }

        // Re-index remaining questions cleanly
        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

        await unifiedDb.updateQuestionSetQuestions(setId, questions, questions.length);

        return res.json({
            success: true,
            message: `Question ${targetNum} deleted successfully.`,
            remainingCount: questions.length
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete question: " + error.message });
    }
});

// Bulk delete multiple questions from a Question Set
app.post("/api/admin/sets/:id/questions/bulk-delete", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const { questionNumbers } = req.body;

        if (!Array.isArray(questionNumbers) || questionNumbers.length === 0) {
            return res.status(400).json({ success: false, message: "No question numbers provided for bulk deletion." });
        }

        const deleteSet = new Set(questionNumbers.map(n => Number(n)));

        const row = await unifiedDb.getQuestionSetById(setId);
        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        let questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
        const originalCount = questions.length;

        questions = questions.filter((q, idx) => {
            const currentNum = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            return !deleteSet.has(currentNum) && !deleteSet.has(idx + 1);
        });

        const deletedCount = originalCount - questions.length;
        if (deletedCount === 0) {
            return res.status(404).json({ success: false, message: "None of the selected questions were found in the set." });
        }

        // Re-index remaining questions cleanly
        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

        await unifiedDb.updateQuestionSetQuestions(setId, questions, questions.length);

        return res.json({
            success: true,
            message: `Successfully deleted ${deletedCount} questions. Remaining: ${questions.length}`,
            deletedCount: deletedCount,
            remainingCount: questions.length
        });
    } catch (error) {
        console.error("Bulk delete questions error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete questions: " + error.message });
    }
});

// Reorder questions in a Question Set
app.post("/api/admin/sets/:id/questions/reorder", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const { orderedQuestionNumbers } = req.body;

        if (!Array.isArray(orderedQuestionNumbers) || orderedQuestionNumbers.length === 0) {
            return res.status(400).json({ success: false, message: "Ordered question numbers array is required." });
        }

        const row = await unifiedDb.getQuestionSetById(setId);
        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        let questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
        if (!Array.isArray(questions)) {
            return res.status(500).json({ success: false, message: "Questions payload corrupt." });
        }

        // Map existing questions by their current number / id
        const questionMap = new Map();
        questions.forEach((q, idx) => {
            const num = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            questionMap.set(Number(num), q);
        });

        // Reorder questions according to orderedQuestionNumbers
        const newQuestions = [];
        const seen = new Set();
        orderedQuestionNumbers.forEach(num => {
            const n = Number(num);
            if (questionMap.has(n) && !seen.has(n)) {
                newQuestions.push(questionMap.get(n));
                seen.add(n);
            }
        });

        // Safety fallback: append any questions that were omitted
        questions.forEach((q, idx) => {
            const num = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            if (!seen.has(Number(num))) {
                newQuestions.push(q);
                seen.add(Number(num));
            }
        });

        // Re-index remaining questions cleanly (1, 2, 3...)
        newQuestions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

        await unifiedDb.updateQuestionSetQuestions(setId, newQuestions, newQuestions.length);

        return res.json({
            success: true,
            message: "Questions reordered successfully.",
            questions: newQuestions
        });
    } catch (error) {
        console.error("Reorder questions error:", error);
        return res.status(500).json({ success: false, message: "Failed to reorder questions: " + error.message });
    }
});

// Update Question Set Details (Title, Subject, Duration)
app.put("/api/admin/sets/:id", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const { title, subject, duration } = req.body;

        const row = await unifiedDb.getQuestionSetById(setId);
        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        if (title !== undefined && !String(title).trim()) {
            return res.status(400).json({ success: false, message: "Examination title cannot be blank." });
        }

        const durNum = duration !== undefined ? parseInt(duration, 10) : undefined;
        if (durNum !== undefined && (isNaN(durNum) || durNum <= 0)) {
            return res.status(400).json({ success: false, message: "Duration must be a positive number of minutes." });
        }

        const updated = await unifiedDb.updateQuestionSetDetails(setId, {
            title: title ? String(title).trim() : undefined,
            subject: subject ? String(subject).trim() : undefined,
            duration: durNum
        });

        return res.json({
            success: true,
            message: "Question set details updated successfully.",
            set: updated
        });
    } catch (error) {
        console.error("Update question set details error:", error);
        return res.status(500).json({ success: false, message: "Failed to update question set details: " + error.message });
    }
});

// Update an individual question inside a Question Set
app.put("/api/admin/sets/:id/questions/:qNum", requireAdmin, async (req, res) => {
    try {
        const setId = req.params.id;
        const targetQNum = Number(req.params.qNum);
        const { question, options, correctAnswer, explanation } = req.body;

        if (!question || !String(question).trim()) {
            return res.status(400).json({ success: false, message: "Question statement cannot be empty." });
        }

        const row = await unifiedDb.getQuestionSetById(setId);
        if (!row) {
            return res.status(404).json({ success: false, message: "Question set not found." });
        }

        let questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
        if (!Array.isArray(questions)) {
            return res.status(500).json({ success: false, message: "Questions payload corrupt." });
        }

        const qIndex = questions.findIndex((q, idx) => {
            const num = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            return Number(num) === targetQNum || idx + 1 === targetQNum;
        });

        if (qIndex === -1) {
            return res.status(404).json({ success: false, message: `Question ${targetQNum} not found in this set.` });
        }

        // Update question properties while preserving metadata
        const existingQ = questions[qIndex];
        const updatedQ = {
            ...existingQ,
            question: String(question).trim(),
            options: {
                A: options?.A !== undefined ? String(options.A).trim() : (existingQ.options?.A || ""),
                B: options?.B !== undefined ? String(options.B).trim() : (existingQ.options?.B || ""),
                C: options?.C !== undefined ? String(options.C).trim() : (existingQ.options?.C || ""),
                D: options?.D !== undefined ? String(options.D).trim() : (existingQ.options?.D || "")
            },
            correctAnswer: correctAnswer ? String(correctAnswer).trim().toUpperCase() : (existingQ.correctAnswer || "A"),
            explanation: explanation !== undefined ? String(explanation).trim() : (existingQ.explanation || "")
        };

        // Also normalize answer field for backwards compatibility
        updatedQ.answer = updatedQ.correctAnswer;
        questions[qIndex] = updatedQ;

        await unifiedDb.updateQuestionSetQuestions(setId, questions, questions.length);

        return res.json({
            success: true,
            message: `Question ${targetQNum} updated successfully.`,
            question: updatedQ
        });
    } catch (error) {
        console.error("Update single question error:", error);
        return res.status(500).json({ success: false, message: "Failed to update question: " + error.message });
    }
});

// -----------------------------------------------------
// MASTER ADMIN: CANDIDATE / STUDENT APIS
// -----------------------------------------------------

// Get all Candidates
app.get("/api/admin/students", requireAdmin, async (req, res) => {
    try {
        const candidates = await unifiedDb.listCandidates();
        return res.json({ success: true, students: candidates });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load candidate list." });
    }
});

// Add new Student
app.post("/api/admin/students", requireAdmin, async (req, res) => {
    try {
        const { userId, password, candidateName, email, role } = req.body;

        if (!userId || !password || !candidateName) {
            return res.status(400).json({ success: false, message: "User ID, Candidate Name, and Password are required." });
        }

        const cleanUserId = userId.trim();
        const existing = await unifiedDb.findCandidateByUserId(cleanUserId);
        if (existing) {
            return res.status(400).json({ success: false, message: `Candidate User ID "${cleanUserId}" already exists. Choose a unique User ID.` });
        }

        const passwordHash = bcrypt.hashSync(password, 12);
        const candidateEmail = email && email.trim() ? email.trim() : `${cleanUserId.toLowerCase()}@slogon.edu`;
        const candidateRole = role === "Admin" ? "Admin" : "Student";

        const created = await unifiedDb.createCandidate({
            userId: cleanUserId,
            passwordHash,
            candidateName: candidateName.trim(),
            email: candidateEmail,
            role: candidateRole
        });

        return res.json({
            success: true,
            id: created.id,
            student: created,
            message: `Candidate account for "${candidateName.trim()}" (${cleanUserId}) created successfully!`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create student account: " + error.message });
    }
});

// Delete a Candidate
app.delete("/api/admin/students/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const candidate = await unifiedDb.findCandidateById(id);

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate not found." });
        }

        if (candidate.user_id === req.session.candidate.userId) {
            return res.status(400).json({ success: false, message: "Cannot delete the currently logged in administrator." });
        }

        await unifiedDb.deleteCandidate(id);
        return res.json({ success: true, message: `Candidate ${candidate.user_id} deleted.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete candidate." });
    }
});

// -----------------------------------------------------
// STUDENT APIS: DYNAMIC TESTS CATALOG & EXAM LOADER
// -----------------------------------------------------

// Get dynamic test catalog for student tests.html
app.get("/api/student/tests", async (req, res) => {
    try {
        const tests = await unifiedDb.listQuestionSets();
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
        const row = await unifiedDb.getQuestionSetById(rawId);
        if (row && row.questions_json) {
            questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
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
            subject: (row && row.subject) ? row.subject : "General Paper",
            duration: (row && row.duration) ? row.duration : 180,
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
