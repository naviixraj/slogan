const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

// Store the database inside the backend folder
const dbPath = path.join(__dirname, "candidates.sqlite");

// Create or open the database
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec("PRAGMA foreign_keys = ON;");

// Create candidates table
db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        candidate_name TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'Student',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Migration for existing database columns
try {
    db.exec("ALTER TABLE candidates ADD COLUMN email TEXT;");
} catch (e) {}

try {
    db.exec("ALTER TABLE candidates ADD COLUMN role TEXT DEFAULT 'Student';");
} catch (e) {}

// Seed default Admin and Student accounts if missing
const bcrypt = require("bcryptjs");
try {
    const adminExists = db.prepare("SELECT id FROM candidates WHERE user_id = 'admin'").get();
    if (!adminExists) {
        const adminHash = bcrypt.hashSync("admin123", 12);
        db.prepare(`
            INSERT INTO candidates (user_id, password_hash, candidate_name, email, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run("admin", adminHash, "Master Administrator", "admin@slogon.edu", "Admin");
    }

    const naviExists = db.prepare("SELECT id FROM candidates WHERE user_id = 'navi'").get();
    if (!naviExists) {
        const naviHash = bcrypt.hashSync("navii007", 12);
        db.prepare(`
            INSERT INTO candidates (user_id, password_hash, candidate_name, email, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run("navi", naviHash, "Navi", "navi@slogon.edu", "Student");
    }
} catch (e) {
    console.error("Account seeding error:", e);
}

// Create question_sets table
db.exec(`
    CREATE TABLE IF NOT EXISTS question_sets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subject TEXT,
        file_name TEXT,
        file_type TEXT,
        questions_count INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 180,
        status TEXT DEFAULT 'available',
        questions_json TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Create sessions table for persistent login sessions across restarts
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
    );
`);

// Seed Mock Test 01 if question_sets is empty
try {
    const countCheck = db.prepare("SELECT COUNT(*) as count FROM question_sets").get();
    if (countCheck && countCheck.count === 0) {
        const mock01Path = path.join(__dirname, "..", "data", "mock01.json");
        if (fs.existsSync(mock01Path)) {
            const rawMock = fs.readFileSync(mock01Path, "utf8");
            const parsedMock = JSON.parse(rawMock);
            db.prepare(`
                INSERT INTO question_sets (id, title, subject, file_name, file_type, questions_count, duration, status, questions_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                "MOCK01",
                "UGC NET Full-Length Mock Test 01",
                "Paper 1 (General) & Paper 2 (Subject)",
                "mock01.json",
                "json",
                parsedMock.length,
                180,
                "available",
                rawMock
            );
            console.log("Seeded initial Mock Test 01 into question_sets.");
        }
    }
} catch (err) {
    console.error("Error seeding initial question set:", err);
}

console.log("SLOGON candidate and question database is ready.");

module.exports = db;
