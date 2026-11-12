
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Store the database inside the backend folder
const dbPath = path.join(__dirname, "candidates.sqlite");

// Create or open the database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create candidates table
db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        candidate_name TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log("SLOGON candidate database is ready.");

module.exports = db;
