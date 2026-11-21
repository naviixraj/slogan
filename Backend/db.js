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

let supabaseColCheck = null;

async function checkSupabaseCandidateCols() {
    if (supabaseColCheck !== null) return supabaseColCheck;
    if (!isSupabase) {
        supabaseColCheck = { hasPhone: true, hasFirstLogin: true };
        return supabaseColCheck;
    }
    try {
        const { error } = await supabase.from("candidates").select("phone, first_login").limit(1);
        if (error) {
            supabaseColCheck = { hasPhone: false, hasFirstLogin: false };
        } else {
            supabaseColCheck = { hasPhone: true, hasFirstLogin: true };
        }
    } catch (e) {
        supabaseColCheck = { hasPhone: false, hasFirstLogin: false };
    }
    return supabaseColCheck;
}

function normalizeCandidate(c) {
    if (!c) return null;
    let phone = c.phone || null;
    let email = c.email || "";
    let firstLogin = c.first_login !== undefined && c.first_login !== null ? Number(c.first_login) === 1 : false;

    if (email.includes("|tel:")) {
        const parts = email.split("|tel:");
        email = parts[0];
        phone = parts[1];
        firstLogin = false;
    } else if (email === "PENDING_SETUP" || email.endsWith("|pending")) {
        firstLogin = true;
        email = email === "PENDING_SETUP" ? "" : email.replace("|pending", "");
    }

    return {
        ...c,
        email: email,
        phone: phone,
        first_login: firstLogin ? 1 : 0
    };
}

async function findCandidateByUserId(userId) {
    const cleanId = String(userId || "").trim();
    let raw = null;
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .ilike("user_id", cleanId)
            .maybeSingle();
        if (error) console.error("Supabase findCandidate error:", error.message);
        raw = data || null;
    } else {
        raw = sqliteDb.prepare("SELECT * FROM candidates WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))").get(cleanId) || null;
    }
    return normalizeCandidate(raw);
}

async function findCandidateById(id) {
    let raw = null;
    if (isSupabase) {
        const { data, error } = await supabase
            .from("candidates")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) console.error("Supabase findCandidateById error:", error.message);
        raw = data || null;
    } else {
        raw = sqliteDb.prepare("SELECT * FROM candidates WHERE id = ?").get(id) || null;
    }
    return normalizeCandidate(raw);
}

async function listCandidates() {
    let list = [];
    if (isSupabase) {
        const cols = await checkSupabaseCandidateCols();
        const selectFields = cols.hasPhone && cols.hasFirstLogin
            ? "id, user_id, candidate_name, email, phone, role, active, first_login, created_at"
            : "id, user_id, candidate_name, email, role, active, created_at";
        const { data, error } = await supabase
            .from("candidates")
            .select(selectFields)
            .order("created_at", { ascending: false });
        if (error) console.error("Supabase listCandidates error:", error.message);
        list = data || [];
    } else {
        list = sqliteDb.prepare(`
            SELECT id, user_id, candidate_name, email, phone, role, active, first_login, created_at
            FROM candidates
            ORDER BY datetime(created_at) DESC
        `).all() || [];
    }
    return list.map(normalizeCandidate);
}

async function createCandidate({ userId, passwordHash, candidateName, email, phone, role = "Student", firstLogin = 1 }) {
    const isStudent = (role !== "Admin" && role !== "Master Admin");
    const mustFirstLogin = isStudent ? (firstLogin !== undefined ? firstLogin : 1) : 0;
    const cleanUserId = userId.trim();
    const cleanName = candidateName ? candidateName.trim() : "";
    const cleanEmail = email ? email.trim() : "";
    const cleanPhone = phone ? phone.trim() : "";

    if (isSupabase) {
        const cols = await checkSupabaseCandidateCols();
        let insertObj = {
            user_id: cleanUserId,
            password_hash: passwordHash,
            candidate_name: cleanName || cleanUserId,
            role: role,
            active: 1
        };

        if (cols.hasPhone && cols.hasFirstLogin) {
            insertObj.email = cleanEmail || null;
            insertObj.phone = cleanPhone || null;
            insertObj.first_login = mustFirstLogin;
        } else {
            // Metadata fallback if columns not yet added to Supabase
            if (mustFirstLogin) {
                insertObj.email = cleanEmail ? `${cleanEmail}|pending` : "PENDING_SETUP";
            } else {
                insertObj.email = cleanPhone ? `${cleanEmail}|tel:${cleanPhone}` : (cleanEmail || null);
            }
        }

        const { data, error } = await supabase
            .from("candidates")
            .insert([insertObj])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return normalizeCandidate(data);
    } else {
        const info = sqliteDb.prepare(`
            INSERT INTO candidates (user_id, password_hash, candidate_name, email, phone, role, active, first_login)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `).run(cleanUserId, passwordHash, cleanName || cleanUserId, cleanEmail || null, cleanPhone || null, role, mustFirstLogin);
        return {
            id: info.lastInsertRowid,
            user_id: cleanUserId,
            candidate_name: cleanName || cleanUserId,
            email: cleanEmail || null,
            phone: cleanPhone || null,
            role: role,
            active: 1,
            first_login: mustFirstLogin
        };
    }
}

async function updateCandidateProfile(userId, { candidateName, email, phone }) {
    const cleanUserId = String(userId || "").trim();
    const cleanName = String(candidateName || "").trim();
    const cleanEmail = String(email || "").trim();
    const cleanPhone = String(phone || "").trim();

    if (isSupabase) {
        const cols = await checkSupabaseCandidateCols();
        let updateObj = {
            candidate_name: cleanName,
            active: 1
        };

        if (cols.hasPhone && cols.hasFirstLogin) {
            updateObj.email = cleanEmail;
            updateObj.phone = cleanPhone;
            updateObj.first_login = 0;
        } else {
            // Metadata fallback
            updateObj.email = cleanPhone ? `${cleanEmail}|tel:${cleanPhone}` : cleanEmail;
        }

        const { data, error } = await supabase
            .from("candidates")
            .update(updateObj)
            .ilike("user_id", cleanUserId)
            .select()
            .maybeSingle();
        if (error) throw new Error(error.message);
        return normalizeCandidate(data);
    } else {
        sqliteDb.prepare(`
            UPDATE candidates
            SET candidate_name = ?, email = ?, phone = ?, first_login = 0
            WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))
        `).run(cleanName, cleanEmail, cleanPhone, cleanUserId);

        const updated = sqliteDb.prepare("SELECT * FROM candidates WHERE LOWER(TRIM(user_id)) = LOWER(TRIM(?))").get(cleanUserId);
        return normalizeCandidate(updated);
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
    updateCandidateProfile,
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
