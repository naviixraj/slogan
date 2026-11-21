/**
 * SLOGON ACADEMY - UNIFIED DATABASE MODULE
 * Supports Supabase Cloud PostgreSQL with automatic SQLite local fallback
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const isSupabase = Boolean(supabaseUrl && supabaseKey);

let sqliteDb = null;
if (!isSupabase) {
    try {
        sqliteDb = require("./database");
    } catch (e) {
        console.warn("SQLite fallback unavailable:", e.message);
    }
}

let supabase = null;
if (isSupabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });
    console.log("🌐 Connected to Supabase Cloud PostgreSQL (" + supabaseUrl + ")");
} else {
    console.log("💾 Running on local SQLite database (Backend/candidates.sqlite)");
}

// -------------------------------------------------------------
// CANDIDATES (ADMIN & STUDENTS)
// -------------------------------------------------------------

async function findCandidateByUserId(userId) {
    const cleanId = String(userId || "").trim();
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .ilike("user_id", cleanId)
            .maybeSingle();
        if (error) console.error("Supabase findCandidate error:", error.message);
        return data || null;
    } else {
        return sqliteDb.prepare("SELECT * FROM candidates WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))").get(cleanId) || null;
    }
}

async function findCandidateById(id) {
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) console.error("Supabase findCandidateById error:", error.message);
        return data || null;
    } else {
        return sqliteDb.prepare("SELECT * FROM candidates WHERE id = ?").get(id) || null;
    }
}

async function listCandidates() {
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .select("id, user_id, candidate_name, email, role, active, created_at")
            .order("created_at", { ascending: false });
        if (error) console.error("Supabase listCandidates error:", error.message);
        return data || [];
    } else {
        return sqliteDb.prepare(`
            SELECT id, user_id, candidate_name, email, role, active, created_at
            FROM candidates
            ORDER BY datetime(created_at) DESC
        `).all() || [];
    }
}

async function createCandidate({ userId, passwordHash, candidateName, email, role = "Student" }) {
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .insert([{
                user_id: userId,
                password_hash: passwordHash,
                candidate_name: candidateName,
                email: email || null,
                role: role,
                active: 1
            }])
            .select("id, user_id, candidate_name, email, role, active")
            .single();
        if (error) throw new Error(error.message);
        return data;
    } else {
        const info = sqliteDb.prepare(`
            INSERT INTO candidates (user_id, password_hash, candidate_name, email, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(userId, passwordHash, candidateName, email, role);
        return {
            id: info.lastInsertRowid,
            user_id: userId,
            candidate_name: candidateName,
            email: email,
            role: role,
            active: 1
        };
    }
}

async function deleteCandidate(id) {
    if (isSupabase) {
        const { error } = await supabase.from("candidates").delete().eq("id", id);
        if (error) throw new Error(error.message);
        return true;
    } else {
        const result = sqliteDb.prepare("DELETE FROM candidates WHERE id = ?").run(id);
        return result.changes > 0;
    }
}

// -------------------------------------------------------------
// QUESTION SETS & EXAMS
// -------------------------------------------------------------

async function listQuestionSets() {
    if (isSupabase) {
        const { data, error } = await supabase
            .from("question_sets")
            .select("id, title, subject, file_name, file_type, questions_count, duration, status, created_at")
            .order("id", { ascending: true });
        if (error) console.error("Supabase listQuestionSets error:", error.message);
        return data || [];
    } else {
        return sqliteDb.prepare(`
            SELECT id, title, subject, file_name, file_type, questions_count, duration, status, created_at
            FROM question_sets
            ORDER BY id ASC
        `).all() || [];
    }
}

async function getQuestionSetById(id) {
    const cleanId = String(id || "").trim();
    if (isSupabase) {
        const { data, error } = await supabase
            .from("question_sets")
            .select("*")
            .ilike("id", cleanId)
            .maybeSingle();
        if (error) console.error("Supabase getQuestionSet error:", error.message);
        return data || null;
    } else {
        return sqliteDb.prepare("SELECT * FROM question_sets WHERE UPPER(id) = ?").get(cleanId.toUpperCase()) || null;
    }
}

async function countQuestionSets() {
    if (isSupabase) {
        const { count, error } = await supabase
            .from("question_sets")
            .select("*", { count: "exact", head: true });
        if (error) console.error("Supabase countQuestionSets error:", error.message);
        return count || 0;
    } else {
        const row = sqliteDb.prepare("SELECT COUNT(*) as count FROM question_sets").get();
        return row ? row.count : 0;
    }
}

async function createQuestionSet({ id, title, subject, fileName, fileType, questionsCount, duration, status = "available", questionsJson }) {
    const jsonVal = typeof questionsJson === "string" ? JSON.parse(questionsJson) : questionsJson;
    if (isSupabase) {
        const { data, error } = await supabase
            .from("question_sets")
            .insert([{
                id: id,
                title: title,
                subject: subject,
                file_name: fileName,
                file_type: fileType,
                questions_count: questionsCount,
                duration: duration,
                status: status,
                questions_json: jsonVal
            }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    } else {
        sqliteDb.prepare(`
            INSERT INTO question_sets (id, title, subject, file_name, file_type, questions_count, duration, status, questions_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            title,
            subject,
            fileName,
            fileType,
            questionsCount,
            duration,
            status,
            JSON.stringify(jsonVal)
        );
        return { id };
    }
}

async function deleteQuestionSet(id) {
    const cleanId = String(id || "").trim();
    if (isSupabase) {
        const { error } = await supabase.from("question_sets").delete().ilike("id", cleanId);
        if (error) throw new Error(error.message);
        return true;
    } else {
        const res = sqliteDb.prepare("DELETE FROM question_sets WHERE UPPER(id) = ?").run(cleanId.toUpperCase());
        return res.changes > 0;
    }
}

async function updateQuestionSetQuestions(id, questionsJson, count) {
    const cleanId = String(id || "").trim();
    const jsonVal = typeof questionsJson === "string" ? JSON.parse(questionsJson) : questionsJson;
    if (isSupabase) {
        const { error } = await supabase
            .from("question_sets")
            .update({
                questions_json: jsonVal,
                questions_count: count
            })
            .ilike("id", cleanId);
        if (error) throw new Error(error.message);
        return true;
    } else {
        sqliteDb.prepare("UPDATE question_sets SET questions_json = ?, questions_count = ? WHERE UPPER(id) = ?")
            .run(JSON.stringify(jsonVal), count, cleanId.toUpperCase());
        return true;
    }
}

async function updateQuestionSetDetails(id, { title, subject, duration }) {
    const cleanId = String(id || "").trim();
    const updatePayload = {};
    if (title !== undefined && title !== null) updatePayload.title = String(title).trim();
    if (subject !== undefined && subject !== null) updatePayload.subject = String(subject).trim();
    if (duration !== undefined && duration !== null) updatePayload.duration = parseInt(duration, 10) || 180;

    if (isSupabase) {
        const { data, error } = await supabase
            .from("question_sets")
            .update(updatePayload)
            .ilike("id", cleanId)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    } else {
        const setClauses = [];
        const params = [];
        if (updatePayload.title !== undefined) {
            setClauses.push("title = ?");
            params.push(updatePayload.title);
        }
        if (updatePayload.subject !== undefined) {
            setClauses.push("subject = ?");
            params.push(updatePayload.subject);
        }
        if (updatePayload.duration !== undefined) {
            setClauses.push("duration = ?");
            params.push(updatePayload.duration);
        }
        if (setClauses.length > 0) {
            params.push(cleanId.toUpperCase());
            sqliteDb.prepare(`UPDATE question_sets SET ${setClauses.join(", ")} WHERE UPPER(id) = ?`).run(...params);
        }
        return getQuestionSetById(cleanId);
    }
}


// -------------------------------------------------------------
// SESSIONS (PERSISTENT LOGIN STORE)
// -------------------------------------------------------------

async function getSession(sid) {
    if (isSupabase) {
        const { data } = await supabase
            .from("sessions")
            .select("sess, expire")
            .eq("sid", sid)
            .maybeSingle();
        if (!data) return null;
        if (data.expire && Number(data.expire) < Date.now()) {
            await supabase.from("sessions").delete().eq("sid", sid);
            return null;
        }
        return typeof data.sess === "string" ? JSON.parse(data.sess) : data.sess;
    } else {
        const row = sqliteDb.prepare("SELECT sess, expire FROM sessions WHERE sid = ?").get(sid);
        if (!row) return null;
        if (row.expire && row.expire < Date.now()) {
            sqliteDb.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
            return null;
        }
        return JSON.parse(row.sess);
    }
}

async function setSession(sid, sess, expire) {
    if (isSupabase) {
        await supabase.from("sessions").upsert({
            sid: sid,
            sess: sess,
            expire: expire
        });
    } else {
        sqliteDb.prepare(`
            INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
            ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
        `).run(sid, JSON.stringify(sess), expire);
    }
}

async function destroySession(sid) {
    if (isSupabase) {
        await supabase.from("sessions").delete().eq("sid", sid);
    } else {
        sqliteDb.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
    }
}

async function touchSession(sid, expire) {
    if (isSupabase) {
        await supabase.from("sessions").update({ expire }).eq("sid", sid);
    } else {
        sqliteDb.prepare("UPDATE sessions SET expire = ? WHERE sid = ?").run(expire, sid);
    }
}

module.exports = {
    isSupabase,
    supabase,
    findCandidateByUserId,
    findCandidateById,
    listCandidates,
    createCandidate,
    deleteCandidate,
    listQuestionSets,
    getQuestionSetById,
    countQuestionSets,
    createQuestionSet,
    deleteQuestionSet,
    updateQuestionSetQuestions,
    updateQuestionSetDetails,
    getSession,
    setSession,
    destroySession,
    touchSession
};
