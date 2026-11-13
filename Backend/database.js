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

console.log("SLOGON candidate database is ready.");

module.exports = db;
