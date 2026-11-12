const bcrypt = require("bcryptjs");
const db = require("./database");

const userId = process.argv[2];
const password = process.argv[3];
const candidateName = process.argv.slice(4).join(" ");

if (!userId || !password || !candidateName) {
    console.log(
        'Usage: node backend/create-candidate.js USER_ID PASSWORD "CANDIDATE NAME"'
    );
    process.exit(1);
}

if (password.length < 10) {
    console.log("Password must contain at least 10 characters.");
    process.exit(1);
}

try {
    const passwordHash = bcrypt.hashSync(password, 12);

    const insertCandidate = db.prepare(`
        INSERT INTO candidates (user_id, password_hash, candidate_name)
        VALUES (?, ?, ?)
    `);

    insertCandidate.run(userId, passwordHash, candidateName);

    console.log("Candidate created successfully!");
    console.log("User ID:", userId);
    console.log("Candidate Name:", candidateName);
} catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        console.log("This User ID already exists.");
    } else {
        console.error("Error creating candidate:", error.message);
    }
} finally {
    db.close();
}
