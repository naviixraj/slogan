/**
 * Migration Script: Copies all data from local SQLite to Supabase
 * Usage: node Backend/migrate_to_supabase.js
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sqliteDb = require("./database");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function runMigration() {
    console.log("🔄 Connecting to Supabase at", supabaseUrl, "...");

    // 1. Check if candidates table is reachable
    const check = await supabase.from("candidates").select("id").limit(1);
    if (check.error) {
        if (check.error.code === "PGRST205") {
            console.error("\n❌ Tables do not exist yet in your Supabase project!");
            console.log("👉 Please run the SQL schema in your Supabase SQL Editor first:\nhttps://supabase.com/dashboard/project/vtvdesgvltrvvszaweik/sql/new\n");
            return;
        } else {
            console.error("❌ Supabase check error:", check.error);
            return;
        }
    }

    console.log("✅ Tables found! Starting data transfer...");

    // 2. Migrate Candidates
    const candidates = sqliteDb.prepare("SELECT user_id, password_hash, candidate_name, email, role, active FROM candidates").all();
    console.log(`📦 Transferring ${candidates.length} candidates...`);
    for (const c of candidates) {
        const { error } = await supabase.from("candidates").upsert({
            user_id: c.user_id,
            password_hash: c.password_hash,
            candidate_name: c.candidate_name,
            email: c.email,
            role: c.role || "Student",
            active: c.active ?? 1
        }, { onConflict: "user_id" });
        if (error) console.error("Error migrating user", c.user_id, error.message);
    }
    console.log("✅ Candidates migrated successfully.");

    // 3. Migrate Question Sets
    const sets = sqliteDb.prepare("SELECT * FROM question_sets").all();
    console.log(`📦 Transferring ${sets.length} question sets with all single split questions...`);
    for (const s of sets) {
        const questionsJson = typeof s.questions_json === "string" ? JSON.parse(s.questions_json) : s.questions_json;
        const { error } = await supabase.from("question_sets").upsert({
            id: s.id,
            title: s.title,
            subject: s.subject,
            file_name: s.file_name,
            file_type: s.file_type,
            questions_count: s.questions_count,
            duration: s.duration,
            status: s.status || "available",
            questions_json: questionsJson
        }, { onConflict: "id" });
        if (error) console.error("Error migrating set", s.id, error.message);
    }
    console.log(`✅ ${sets.length} question set(s) transferred successfully!`);

    console.log("\n🎉 Full migration to Supabase completed successfully!");
}

runMigration().catch(console.error);
