require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
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
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

const SESSION_SECRET = process.env.SESSION_SECRET || "slogon_secure_secret_key_2026_exam_platform_dev";

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

// Prevent browser caching of HTML pages to guarantee immediate updates
app.use((req, res, next) => {
    if (req.path.endsWith(".html") || req.path === "/" || !path.extname(req.path)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }
    next();
});

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
        secret: SESSION_SECRET,
        store: new AppSessionStore(),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production" || hasCerts,
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
        const candidatePhone = candidate.phone || "";

        req.session.candidate = {
            id: candidate.id,
            userId: candidate.user_id,
            name: candidate.candidate_name,
            email: candidateEmail,
            phone: candidatePhone,
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
                    phone: candidatePhone,
                    role: candidateRole
                }
            });
        });
    });
});

// -------------------------------------------------------------
// AUTOMATED WHATSAPP GREETING NOTIFICATION SERVICE
// Supports Meta Official WhatsApp Cloud API + Twilio Fallback
// -------------------------------------------------------------

async function sendWhatsAppWelcomeMessage({ phone, candidateName, userId }) {
    if (!phone) return { success: false, reason: "no_phone" };

    // Standardize phone number to international format without '+'
    let cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
        return { success: false, reason: "invalid_phone" };
    }

    // Default to Indian country code (91) if 10 digits provided
    if (cleanPhone.length === 10) {
        cleanPhone = "91" + cleanPhone;
    }

    const metaToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_TOKEN;
    const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_PHONE_ID;

    const portalUrl = process.env.APP_URL || "https://slogan-two.vercel.app";

    const greetingText =
`🎓 *Welcome to SLOGON ACADEMY!* 🎓\n\n` +
`Hello *${candidateName || "Candidate"}*,\n` +
`Your student account for the *Online Examination Portal* has been registered successfully! 🎉\n\n` +
`📋 *Account Credentials:*\n` +
`• *Candidate ID:* ${userId}\n` +
`• *Status:* Active / Ready for Mock Tests\n` +
`• *Exam Portal:* ${portalUrl}/login.html\n\n` +
`You can now log in, take practice examinations, and review your performance.\n\n` +
`_Best wishes for your UGC NET and competitive examination preparation!_\n` +
`*SLOGON ACADEMY*`;

    // 1. Meta Official Cloud API (1,000 Free Messages/Month)
    if (metaToken && metaPhoneId) {
        try {
            const endpoint = `https://graph.facebook.com/v21.0/${metaPhoneId}/messages`;
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: {
                    preview_url: true,
                    body: greetingText
                }
            };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${metaToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                console.log(`[WHATSAPP DELIVERED] Meta Cloud API sent greeting to +${cleanPhone} (${userId})`);
                return { success: true, provider: "meta", data };
            } else {
                console.warn(`[WHATSAPP META ERROR]`, data);
                return { success: false, provider: "meta", error: data };
            }
        } catch (err) {
            console.error(`[WHATSAPP META NETWORK FAILED]:`, err.message);
            return { success: false, provider: "meta", error: err.message };
        }
    }

    // 2. Twilio WhatsApp API Fallback
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (twilioSid && twilioAuth && twilioFrom) {
        try {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
            const params = new URLSearchParams({
                From: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
                To: `whatsapp:+${cleanPhone}`,
                Body: greetingText
            });

            const twilioRes = await fetch(twilioUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params.toString()
            });

            const twilioData = await twilioRes.json();
            if (twilioRes.ok) {
                console.log(`[WHATSAPP DELIVERED] Twilio sent greeting to +${cleanPhone} (${userId})`);
                return { success: true, provider: "twilio", data: twilioData };
            } else {
                console.warn(`[WHATSAPP TWILIO ERROR]`, twilioData);
                return { success: false, provider: "twilio", error: twilioData };
            }
        } catch (err) {
            console.error(`[WHATSAPP TWILIO NETWORK FAILED]:`, err.message);
            return { success: false, provider: "twilio", error: err.message };
        }
    }

    // Log gracefully when credentials are not yet added to .env
    console.log(`[WHATSAPP READY (PENDING API KEYS)] Greeting queued for +${cleanPhone} (${userId})`);
    return { success: false, reason: "credentials_not_configured" };
}

// WhatsApp Config API Status
app.get("/api/whatsapp/config", (req, res) => {
    const hasMeta = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);

    res.json({
        success: true,
        configured: hasMeta || hasTwilio,
        provider: hasMeta ? "meta" : (hasTwilio ? "twilio" : "none"),
        metaPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID ? `***${process.env.WHATSAPP_PHONE_NUMBER_ID.slice(-4)}` : null
    });
});

// Candidate Self-Registration API
app.post("/api/register", async (req, res) => {
    try {
        const { candidateName, email, phone, userId, password, confirmPassword } = req.body;

        const cleanName = String(candidateName || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanPhone = String(phone || "").trim();
        const cleanUserId = String(userId || "").trim().toLowerCase();
        const cleanPassword = String(password || "");
        const cleanConfirm = String(confirmPassword || "");

        if (!cleanName || cleanName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Please enter your full name (minimum 2 characters)."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const phoneDigits = cleanPhone.replace(/[\s\-\(\)]/g, "");
        if (!cleanPhone || cleanPhone.length < 10 || !/^\+?[0-9]{10,15}$/.test(phoneDigits)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit mobile phone number."
            });
        }

        if (!cleanUserId || cleanUserId.length < 3 || cleanUserId.length > 30) {
            return res.status(400).json({
                success: false,
                message: "Account User ID must be between 3 and 30 characters."
            });
        }

        if (!/^[a-zA-Z0-9_\-\.]+$/.test(cleanUserId)) {
            return res.status(400).json({
                success: false,
                message: "Account User ID may only contain letters, numbers, underscores, hyphens, and periods (no spaces)."
            });
        }

        if (!cleanPassword || cleanPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long."
            });
        }

        if (cleanPassword !== cleanConfirm) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match. Please re-enter your password."
            });
        }

        // Check if User ID already exists
        const existingUser = await unifiedDb.findCandidateByUserId(cleanUserId);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: `Account User ID "${cleanUserId}" is already registered. Please choose a different User ID.`
            });
        }

        const passwordHash = bcrypt.hashSync(cleanPassword, 12);

        const candidate = await unifiedDb.createCandidate({
            userId: cleanUserId,
            passwordHash,
            candidateName: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: "Student"
        });

        console.log(`[REGISTER SUCCESS] New student account created: "${candidate.user_id}" (${candidate.candidate_name})`);

        // Automated WhatsApp Welcome Greeting (non-blocking)
        sendWhatsAppWelcomeMessage({
            phone: cleanPhone,
            candidateName: cleanName,
            userId: cleanUserId
        }).catch((err) => console.warn("[WHATSAPP] Dispatch notice:", err.message));

        req.session.regenerate((error) => {
            if (error) {
                console.error("Session error on registration:", error);
                return res.json({
                    success: true,
                    message: "Account registered successfully! Please log in with your new credentials."
                });
            }

            req.session.candidate = {
                id: candidate.id,
                userId: candidate.user_id,
                name: candidate.candidate_name,
                email: candidate.email,
                phone: candidate.phone || cleanPhone,
                role: "Student"
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("Session save error on registration:", saveErr);
                }
                return res.json({
                    success: true,
                    message: "Account created successfully! Welcome to SLOGON Academy.",
                    candidate: req.session.candidate
                });
            });
        });

    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to register account: " + err.message
        });
    }
});

// -------------------------------------------------------------
// GOOGLE OAUTH 2.0 & IDENTITY SERVICES
// -------------------------------------------------------------

function generateRegistrationToken(data) {
    const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + 15 * 60 * 1000 })).toString("base64url");
    const sig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
    return `${payload}.${sig}`;
}

function verifyRegistrationToken(tokenStr) {
    if (!tokenStr || typeof tokenStr !== "string") return null;
    const parts = tokenStr.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!data || !data.exp || Date.now() > data.exp) return null;
        return data;
    } catch (e) {
        return null;
    }
}

function getAppBaseUrl(req) {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host") || `localhost:${PORT}`;
    return `${proto}://${host}`;
}

// Google Auth Configuration
app.get("/api/auth/google/config", (req, res) => {
    res.json({
        success: true,
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        configured: Boolean(process.env.GOOGLE_CLIENT_ID)
    });
});

// Start Google OAuth flow (Account Picker)
app.get("/api/auth/google/start", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.redirect("/login.html?error=google_not_configured");
    }
    const baseUrl = getAppBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent("openid email profile")}&` +
        `prompt=select_account&` +
        `access_type=offline`;
    res.redirect(googleAuthUrl);
});

// Helper: Decode and extract payload from Google JWT
function decodeGoogleCredential(token) {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(payloadBase64, "base64").toString("utf8");
        return JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }
}

// Google OAuth Callback (Exchanges authorization code for profile)
app.get("/api/auth/google/callback", async (req, res) => {
    const { code, error } = req.query;
    if (error) {
        console.warn("[GOOGLE OAUTH] Google returned error:", error);
        return res.redirect("/login.html?error=google_denied");
    }
    if (!code) {
        return res.redirect("/login.html");
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
        const baseUrl = getAppBaseUrl(req);
        const redirectUri = `${baseUrl}/api/auth/google/callback`;

        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code"
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.id_token) {
            console.error("[GOOGLE OAUTH] Token exchange failed:", tokenData);
            return res.redirect("/login.html?error=google_token_failed");
        }

        const payload = decodeGoogleCredential(tokenData.id_token);
        if (!payload || !payload.email) {
            return res.redirect("/login.html?error=invalid_google_profile");
        }

        const googleEmail = String(payload.email).trim().toLowerCase();
        const googleName = String(payload.name || payload.given_name || "Google Candidate").trim();
        const googlePicture = String(payload.picture || "").trim();
        const googleSub = String(payload.sub || "");

        console.log(`[GOOGLE OAUTH] Verified account: ${googleEmail} (${googleName})`);

        let candidate = null;
        if (unifiedDb.isSupabase) {
            const { data } = await unifiedDb.supabase
                .from("candidates")
                .select("*")
                .ilike("email", googleEmail)
                .maybeSingle();
            if (data) candidate = data;
        }

        if (!candidate) {
            const baseUserId = googleEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
            candidate = await unifiedDb.findCandidateByUserId(baseUserId);
        }

        if (candidate) {
            // Existing student -> Log in immediately!
            req.session.regenerate((err) => {
                if (err) {
                    console.error("Session error:", err);
                    return res.redirect("/login.html?error=session_error");
                }
                req.session.candidate = {
                    id: candidate.id,
                    userId: candidate.user_id,
                    name: candidate.candidate_name,
                    email: candidate.email || googleEmail,
                    phone: candidate.phone || "",
                    role: candidate.role || "Student",
                    picture: googlePicture || candidate.picture || candidate.avatar_url || ""
                };
                req.session.save(() => {
                    const nextUrl = candidate.role === "Admin" ? "/admin.html" : "/tests.html";
                    res.redirect(nextUrl);
                });
            });
        } else {
            // New student -> Redirect to Create SLOGON Password slide!
            const regToken = generateRegistrationToken({
                email: googleEmail,
                name: googleName,
                googleId: googleSub,
                picture: googlePicture
            });
            const redirectUrl = `/login.html?complete_reg=1&token=${encodeURIComponent(regToken)}&email=${encodeURIComponent(googleEmail)}&name=${encodeURIComponent(googleName)}`;
            res.redirect(redirectUrl);
        }
    } catch (err) {
        console.error("[GOOGLE OAUTH] Callback error:", err);
        res.redirect("/login.html?error=auth_failed");
    }
});

// Google One-Tap / GIS verification endpoint (Supports instant check)
app.post("/api/auth/google", async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ success: false, message: "Missing Google credential token." });
        }

        const payload = decodeGoogleCredential(credential);
        if (!payload || !payload.email) {
            return res.status(400).json({ success: false, message: "Invalid Google credential token." });
        }

        const googleEmail = String(payload.email).trim().toLowerCase();
        const googleName = String(payload.name || payload.given_name || "Google Candidate").trim();
        const googlePicture = String(payload.picture || "").trim();
        const googleSub = String(payload.sub || "");

        console.log(`[GOOGLE AUTH] Verified Google identity for "${googleEmail}" (${googleName})`);

        let candidate = null;
        if (unifiedDb.isSupabase) {
            const { data } = await unifiedDb.supabase
                .from("candidates")
                .select("*")
                .ilike("email", googleEmail)
                .maybeSingle();
            if (data) candidate = data;
        }

        if (!candidate) {
            const baseUserId = googleEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
            candidate = await unifiedDb.findCandidateByUserId(baseUserId);
        }

        if (!candidate) {
            // New Candidate -> Return registration token so UI transitions to "Create Password"
            const regToken = generateRegistrationToken({
                email: googleEmail,
                name: googleName,
                googleId: googleSub,
                picture: googlePicture
            });
            return res.json({
                success: true,
                isNew: true,
                needsPasswordSetup: true,
                token: regToken,
                email: googleEmail,
                name: googleName,
                picture: googlePicture
            });
        }

        // Existing student -> establish session
        req.session.regenerate((error) => {
            if (error) {
                console.error("Session error during Google login:", error);
                return res.status(500).json({ success: false, message: "Unable to create session." });
            }

            req.session.candidate = {
                id: candidate.id,
                userId: candidate.user_id,
                name: candidate.candidate_name,
                email: candidate.email || googleEmail,
                phone: candidate.phone || "",
                role: candidate.role || "Student",
                picture: googlePicture || candidate.picture || candidate.avatar_url || ""
            };

            req.session.save((saveErr) => {
                if (saveErr) console.error("Session save error:", saveErr);
                return res.json({
                    success: true,
                    isNew: false,
                    needsPasswordSetup: false,
                    message: `Welcome back, ${googleName}!`,
                    redirect: candidate.role === "Admin" ? "/admin.html" : "/tests.html"
                });
            });
        });

    } catch (err) {
        console.error("Google Auth Error:", err);
        return res.status(500).json({ success: false, message: "Google authentication failed: " + err.message });
    }
});

// Complete Google Student Registration (Sets Slogan Password & Phone)
app.post("/api/auth/google/complete-registration", async (req, res) => {
    try {
        const { token, phone, userId, password, confirmPassword } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: "Missing registration session token." });
        }

        const tokenData = verifyRegistrationToken(token);
        if (!tokenData) {
            return res.status(400).json({
                success: false,
                message: "Registration session has expired. Please tap 'Continue with Google' again."
            });
        }

        const cleanEmail = String(tokenData.email).trim().toLowerCase();
        const candidateName = String(tokenData.name).trim();

        if (!phone || typeof phone !== "string") {
            return res.status(400).json({ success: false, message: "Please enter your mobile phone number." });
        }
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return res.status(400).json({ success: false, message: "Mobile number must be at least 10 digits." });
        }

        if (!userId || typeof userId !== "string") {
            return res.status(400).json({ success: false, message: "Please choose a SLOGON User ID." });
        }
        const cleanUserId = userId.trim().replace(/[^a-zA-Z0-9_]/g, "");
        if (cleanUserId.length < 3 || cleanUserId.length > 30) {
            return res.status(400).json({ success: false, message: "User ID must be between 3 and 30 characters (letters, numbers, underscores)." });
        }

        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }
        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        // Check if userId is already taken
        const existing = await unifiedDb.findCandidateByUserId(cleanUserId);
        if (existing) {
            return res.status(400).json({ success: false, message: `The User ID "${cleanUserId}" is already taken. Please choose another.` });
        }

        // Check if email already registered
        if (unifiedDb.isSupabase) {
            const { data: emailExisting } = await unifiedDb.supabase
                .from("candidates")
                .select("id")
                .ilike("email", cleanEmail)
                .maybeSingle();
            if (emailExisting) {
                return res.status(400).json({ success: false, message: `An account with ${cleanEmail} already exists. Please sign in instead.` });
            }
        }

        const passwordHash = bcrypt.hashSync(password, 12);

        const newCandidate = await unifiedDb.createCandidate({
            userId: cleanUserId,
            passwordHash,
            candidateName,
            email: cleanEmail,
            phone: cleanPhone,
            role: "Student"
        });

        console.log(`[GOOGLE REGISTRATION COMPLETE] Created student: "${newCandidate.user_id}" with password & phone.`);

        // Automated WhatsApp Welcome Greeting (non-blocking)
        sendWhatsAppWelcomeMessage({
            phone: cleanPhone,
            candidateName,
            userId: cleanUserId
        }).catch((err) => console.warn("[WHATSAPP] Dispatch notice:", err.message));

        req.session.regenerate((error) => {
            if (error) {
                console.error("Session error after Google registration:", error);
                return res.status(500).json({ success: false, message: "Unable to establish session." });
            }

            req.session.candidate = {
                id: newCandidate.id,
                userId: newCandidate.user_id,
                name: newCandidate.candidate_name,
                email: newCandidate.email,
                phone: newCandidate.phone || cleanPhone,
                role: newCandidate.role || "Student",
                picture: tokenData.picture || ""
            };

            req.session.save((saveErr) => {
                if (saveErr) console.error("Session save error:", saveErr);
                return res.json({
                    success: true,
                    message: "Account created successfully! Redirecting to test portal...",
                    redirect: "/tests.html"
                });
            });
        });

    } catch (err) {
        console.error("Google complete registration error:", err);
        return res.status(500).json({ success: false, message: "Registration failed: " + err.message });
    }
});

// Check current login
app.get("/api/me", (req, res) => {
    if (!req.session.candidate) {
        return res.status(401).json({
            success: false,
            authenticated: false,
            message: "Please log in."
        });
    }

    res.json({
        success: true,
        authenticated: true,
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

// Helper: convert HTML tables (from Word or rich text) into clean markdown tables
function convertHtmlTablesToMarkdown(html) {
    if (!html) return "";
    let processed = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
        const rows = [];
        const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const tr of trMatches) {
            const cells = [];
            const cellMatches = tr.match(/<(?:td|th)[\s\S]*?<\/(?:td|th)>/gi) || [];
            for (const cell of cellMatches) {
                const cellText = cell.replace(/<[^>]+>/g, "").trim();
                cells.push(cellText);
            }
            if (cells.length > 0) {
                rows.push("| " + cells.join(" | ") + " |");
            }
        }
        if (rows.length > 0) {
            return "\n\n" + rows.join("\n") + "\n\n";
        }
        return "";
    });

    // Convert Word/HTML <ol><li> list items into numbered statements if not already numbered
    processed = processed.replace(/<ol[\s\S]*?<\/ol>/gi, (olHtml) => {
        let idx = 1;
        const romanMap = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
        return olHtml.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => {
            const clean = content.replace(/<[^>]+>/g, "").trim();
            if (/^\(?([0-9]+|[a-d]|[ivx]+)\)[\.\:\-\s]/i.test(clean)) {
                return "\n" + clean + "\n";
            }
            const badge = idx <= romanMap.length ? `(${romanMap[idx - 1]})` : `(${idx})`;
            idx++;
            return `\n${badge} ${clean}\n`;
        });
    });

    return processed
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, "");
}

// Helper: smart option splitter for numeric (1-4), letter (A-D), and Tamil (அ-ஈ) choices
function splitOptionsSmart(str) {
    if (!str || typeof str !== "string") return null;

    const candidates = [];

    // Helper to find valid 4-option sequences
    function findSeq(regex, keys, labelList, mapFn) {
        const matches = [];
        let m;
        while ((m = regex.exec(str)) !== null) {
            matches.push({ key: mapFn ? mapFn(m[1]) : m[1], rawLabel: m[1], index: m.index, len: m[0].length });
        }
        for (let i = 0; i <= matches.length - 4; i++) {
            if (matches[i].key === keys[0] && matches[i + 1].key === keys[1] && matches[i + 2].key === keys[2] && matches[i + 3].key === keys[3]) {
                const m0 = matches[i];
                const m1 = matches[i + 1];
                const m2 = matches[i + 2];
                const m3 = matches[i + 3];

                let optD = str.slice(m3.index + m3.len).trim();
                const trail = optD.match(/\s*(?:SECTION\s+[A-Z]|Directions:|Passage|Faculty\s+Answer|Answer\s+Key|சரியான\s*விடை|விளக்கம்|Explanation|பதில்|குறுகிய\s*விளக்கம்|தடயவியல்\s*பகுப்பாய்வு)[\s\S]*$/i);
                if (trail) {
                    optD = optD.slice(0, trail.index).trim();
                }

                candidates.push({
                    startIndex: m0.index,
                    options: {
                        A: str.slice(m0.index + m0.len, m1.index).trim(),
                        B: str.slice(m1.index + m1.len, m2.index).trim(),
                        C: str.slice(m2.index + m2.len, m3.index).trim(),
                        D: optD
                    },
                    optionLabels: {
                        A: labelList[0],
                        B: labelList[1],
                        C: labelList[2],
                        D: labelList[3]
                    },
                    body: str.slice(0, m0.index).trim()
                });
            }
        }
    }

    // 1. Strictly numbered options: (1) ... (2) ... (3) ... (4) ...
    findSeq(/(?:^|\n|\s)\(([1-4])\)\s+/g, ["1", "2", "3", "4"], ["1", "2", "3", "4"]);

    // 2. Lettered options: (A)... (B)... (C)... (D)...
    findSeq(/(?:^|\n|\s)\(([A-D])\)\s+/gi, ["A", "B", "C", "D"], ["A", "B", "C", "D"], k => k.toUpperCase());

    // 2b. Tamil lettered options: (அ)... (ஆ)... (இ)... (ஈ)...
    findSeq(/(?:^|\n|\s)\(([அஆஇஈ])\)\s+/gi, ["A", "B", "C", "D"], ["அ", "ஆ", "இ", "ஈ"], k => k === "அ" ? "A" : k === "ஆ" ? "B" : k === "இ" ? "C" : "D");

    if (candidates.length > 0) {
        // Pick candidate closest to bottom of question to avoid matching embedded List II items
        candidates.sort((a, b) => b.startIndex - a.startIndex);
        return candidates[0];
    }

    // 3. Fallback: 4 consecutive lines (e.g. Q1-Q5 unlabeled numbers)
    const lines = str.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 5) {
        const candidateOpts = lines.slice(-4);
        const qLines = lines.slice(0, -4);
        if (candidateOpts.every(c => c.length < 80 && !c.includes("?") && !c.includes("|"))) {
            return {
                startIndex: 0,
                options: {
                    A: candidateOpts[0],
                    B: candidateOpts[1],
                    C: candidateOpts[2],
                    D: candidateOpts[3]
                },
                optionLabels: {
                    A: "1",
                    B: "2",
                    C: "3",
                    D: "4"
                },
                body: qLines.join("\n").trim()
            };
        }
    }

    return null;
}

// Helper: format statements vertically line-by-line if merged together on the same line
function formatStatementsVertical(text) {
    if (!text || typeof text !== "string") return text;

    // Skip if it's already match lists or tables
    if (/(?:List\s*[-–—:]?\s*(?:I|1|A|One)|பட்டியல்\s*[-–—:]?\s*(?:I|1|ஒன்று|முதல்))/i.test(text) &&
        /(?:List\s*[-–—:]?\s*(?:II|2|B|Two)|பட்டியல்\s*[-–—:]?\s*(?:II|2|இரண்டு))/i.test(text)) {
        return text;
    }

    let formatted = text;

    // 0. Normalize split prompt headers like "பல்கூற்று \n\n த் தேர்வு வினா" or "காலவரிசை \n\n வினா"
    formatted = formatted.replace(/^(?:\[?\s*)?(பல்கூற்று|பல்நோக்கு|காலவரிசை|நிரல்படுத்துக|பொருத்துக|கூற்று)\s*\n+\s*(?:த்?\s*தேர்வு\s*)?(வினா|காரணம்)[^\]\n]*\]?/im, (m, p1, p2) => {
        if (/தேர்வு/i.test(m)) return `${p1}த் தேர்வு ${p2}`;
        return `${p1} ${p2}`;
    });
    formatted = formatted.replace(/^பல்கூற்று\s*\n+\s*த்\s*தேர்வு\s*வினா/im, "பல்கூற்றுத் தேர்வு வினா");

    // 1. Statement 1 & 2 / கூற்று 1 & 2: ensure on newlines
    formatted = formatted.replace(/([^\n])\s*(கூற்று\s*2|Statement\s*(?:2|II))[:\.]\s*/gi, "$1\n$2: ");

    // 2. Letters A, B, C, D: if preceded by sentence and space, put each on a newline
    if (/(?:^|\n|\s)A[\.:\)]\s+/i.test(formatted) && /(?:^|\n|\s)B[\.:\)]\s+/i.test(formatted)) {
        formatted = formatted.replace(/([^\n])\s+(A[\.:\)]\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(B[\.:\)]\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(C[\.:\)]\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(D[\.:\)]\s+)/i, "$1\n$2");
    }

    // 3. Parenthesized (A), (B), (C), (D)
    if (/(?:^|\n|\s)\(A\)\s+/i.test(formatted) && /(?:^|\n|\s)\(B\)\s+/i.test(formatted)) {
        formatted = formatted.replace(/([^\n])\s+(\(A\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(B\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(C\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(D\)\s+)/i, "$1\n$2");
    }

    // 4. Roman (i), (ii), (iii), (iv)
    if (/(?:^|\n|\s)\(i\)\s+/i.test(formatted) && /(?:^|\n|\s)\(ii\)\s+/i.test(formatted)) {
        formatted = formatted.replace(/([^\n])\s+(\(i\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(ii\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(iii\)\s+)/i, "$1\n$2");
        formatted = formatted.replace(/([^\n])\s+(\(iv\)\s+)/i, "$1\n$2");
    }

    return formatted;
}

// Helper: robust parser for MCQ questions from text (PDF, Word, or plain text)
function parseMcqText(rawText) {
    if (!rawText || typeof rawText !== "string") return [];

    // 1. Extract all Faculty Answer Keys (Section B & C)
    const facultyKeys = new Map();
    const facultyBlockRegex = /SECTION\s+[B-Z]\s*[—–-]\s*(?:[A-Z\s-]+)?ANSWER\s+KEY[\s\S]*?(?=(?:SECTION\s+A|Q\d+\.|\d+\.\s+[A-Za-z]|(?:வினா|வினா\s*எண்)\s*\d+[:\.]|\d+\s*[:\.]\s*(?:பொருத்துக|பல்நோக்கு|காலவரிசை|சரியான|கூற்று|வினா)|$))/gi;
    let fbMatch;
    while ((fbMatch = facultyBlockRegex.exec(rawText)) !== null) {
        const block = fbMatch[0];
        const itemRegex = /(?:Q|வினா\s*எண்|வினா)?\s*(\d+)[:\.]\s*(?:Correct\s*Answer[:\s]+(?:\(([1-4A-Da-dஅஆஇஈ])\)|([1-4A-Da-dஅஆஇஈ]))|சரியான\s*விடை[:\s]+(?:\(([1-4A-Da-dஅஆஇஈ])\)|([1-4A-Da-dஅஆஇஈ]))|பதில்[:\s]+(?:\(([1-4A-Da-dஅஆஇஈ])\)|([1-4A-Da-dஅஆஇஈ])))?\s*(?:(?:Explanation|விளக்கம்|குறுகிய\s*விளக்கம்)[:\s]+([\s\S]*?))(?=(?:(?:Q|வினா\s*எண்|வினா)?\s*\d+[:\.]|SECTION|$))/gi;
        let im;
        while ((im = itemRegex.exec(block)) !== null) {
            const qNum = parseInt(im[1], 10);
            const ansRaw = (im[2] || im[3] || im[4] || im[5] || im[6] || im[7] || "A").toUpperCase();
            const tamilMap = { "அ": "A", "ஆ": "B", "இ": "C", "ஈ": "D" };
            const ans = tamilMap[ansRaw] || (ansRaw === "1" ? "A" : ansRaw === "2" ? "B" : ansRaw === "3" ? "C" : ansRaw === "4" ? "D" : ansRaw);
            const exp = (im[8] || "").trim();
            facultyKeys.set(qNum, { answer: ans, explanation: exp });
        }

        const tableItemRegex = /Q(\d+)\s*\(([1-4A-Da-d])\)/gi;
        let tim;
        while ((tim = tableItemRegex.exec(block)) !== null) {
            const qNum = parseInt(tim[1], 10);
            const ansRaw = tim[2].toUpperCase();
            const ans = ansRaw === "1" ? "A" : ansRaw === "2" ? "B" : ansRaw === "3" ? "C" : ansRaw === "4" ? "D" : ansRaw;
            if (!facultyKeys.has(qNum)) {
                facultyKeys.set(qNum, { answer: ans, explanation: "Passage-grounded direct comprehension response." });
            }
        }
    }

    // 2. Remove Section B & C blocks from text
    const cleanDoc = rawText.replace(facultyBlockRegex, "\n\n");

    // 3. Match question headers (supports Q1., Question 1:, வினா 1:, வினா எண்: 68, 68 [உறுதிக்கூற்று], 1: தலைப்பு, 1. கேள்வி)
    const qHeaderRegex = /(?:^|\n)\s*(?:Q\s*[:\.]?\s*(\d+)[\.:\)]?|Question\s*[:\.]?\s*(\d+)[\.:\)]?|(?:வினா(?:\s*எண்)?)\s*[:\.]?\s*(\d+)(?:\s*(?:\[[^\]]+\]|\([^\)]+\)))?[:\.]?|(\d+)\s*[:\.\-]?\s*(?:\[[^\]]+\]|\([^\)]+\)|பொருத்துக|பல்நோக்கு|பல்கூற்று|காலவரிசை|நிரல்படுத்துக|சரியான|கூற்று|வினா|உறுதிக்கூற்று)|(\d+)[\.:\)]\s+)/gi;

    const matches = [];
    let m;
    while ((m = qHeaderRegex.exec(cleanDoc)) !== null) {
        const num = parseInt(m[1] || m[2] || m[3] || m[4] || m[5], 10);
        matches.push({ num, index: m.index, len: m[0].length, headerText: m[0].trim() });
    }

    // Filter sublabel (வினா 1 after question 50)
    const validMatches = matches.filter((item, idx) => !(item.num === 1 && idx > 5));

    // 4. Find preamble (Table 1 & Table 2) before Q1
    let passageBeforeQ1 = "";
    const firstQMatch = validMatches.length > 0 ? validMatches[0] : null;
    if (firstQMatch && firstQMatch.index > 0) {
        passageBeforeQ1 = cleanDoc.slice(0, firstQMatch.index).trim();
    } else {
        const q1Idx = cleanDoc.search(/(?:^|\n)Q1\./i);
        if (q1Idx > 0) {
            passageBeforeQ1 = cleanDoc.slice(0, q1Idx).trim();
        }
    }

    // Standalone single question fallback (e.g. user pasted 1 question without explicit Q number header)
    if (validMatches.length === 0) {
        const smartRes = splitOptionsSmart(cleanDoc);
        if (smartRes) {
            let answer = "A";
            let explanation = "";
            let questionPrompt = cleanDoc;

            const ansExpMatch = cleanDoc.match(/(?:Correct\s*Answer|சரியான\s*விடை|Answer|Ans|பதில்|விடை)[:\s]+(?:\(?([1-4A-Da-dஅஆஇஈ])\)?|\[([1-4A-Da-dஅஆஇஈ])\])(?:\s*([^\n]+))?\s*(?:(?:(?:Short\s*)?Explanation|விளக்கம்|குறுகிய\s*விளக்கம்)[:\s]+([\s\S]*))?$/i);
            if (ansExpMatch) {
                const rawLetter = (ansExpMatch[1] || ansExpMatch[2] || "A").toUpperCase();
                const tamilMap = { "அ": "A", "ஆ": "B", "இ": "C", "ஈ": "D" };
                answer = tamilMap[rawLetter] || (rawLetter === "1" ? "A" : rawLetter === "2" ? "B" : rawLetter === "3" ? "C" : rawLetter === "4" ? "D" : rawLetter);
                if (ansExpMatch[4]) explanation = ansExpMatch[4].trim();
            }

            questionPrompt = smartRes.body;
            questionPrompt = formatStatementsVertical(questionPrompt);

            return [{
                id: 1,
                number: 1,
                section: "Tamil Paper 2",
                question: questionPrompt,
                text: questionPrompt,
                options: smartRes.options,
                optionLabels: smartRes.optionLabels || { A: "A", B: "B", C: "C", D: "D" },
                correctAnswer: answer,
                answer: answer,
                explanation: explanation
            }];
        }
    }

    // Dynamic Passage and Directions scanner (e.g. Questions 16-20, Questions 1-5, வினாக்கள் 1 முதல் 5)
    const passageList = [];
    const passageFinderRegex = /(?:Directions[:\s]+[^\n]*?(?:Questions?|வினாக்கள்?)\s*(\d+)\s*(?:to|[-–—]|முதல்)\s*(\d+)[^\n]*|Passage\s*[:\n])[^\n]*\n([\s\S]*?)(?=(?:^|\n)\s*(?:Q\s*\d+|Question\s*\d+|(?:வினா(?:\s*எண்)?)\s*\d+|\d+[\.:\)]))/gi;
    let pm;
    while ((pm = passageFinderRegex.exec(cleanDoc)) !== null) {
        let startQ = parseInt(pm[1], 10);
        let endQ = parseInt(pm[2], 10);
        let pText = pm[0].trim();

        // Check where this passage physically appears in the document relative to questions
        const nextQ = validMatches.find(m => m.index > pm.index);
        const prevQ = [...validMatches].reverse().find(m => m.index < pm.index);

        // If the passage is before Q1, passageBeforeQ1 already handles Q1-Q5
        if (!prevQ && validMatches.length > 0 && pm.index < validMatches[0].index) {
            continue;
        }

        if (nextQ) {
            // If the document copy-pasted a template like "Questions 1-5" after question 15 (e.g., between Q15 and Q16),
            // the passage belongs to the upcoming questions (e.g., Q16-Q20), NEVER to previous questions!
            if (prevQ && startQ && startQ <= prevQ.num) {
                const span = (endQ && endQ >= startQ) ? (endQ - startQ) : 4;
                const actualStart = nextQ.num;
                const actualEnd = actualStart + span;
                pText = pText.replace(/(?:Questions?|வினாக்கள்?)\s*\d+\s*(?:to|[-–—]|முதல்)\s*\d+/i, `Questions ${actualStart}–${actualEnd}`);
                startQ = actualStart;
                endQ = actualEnd;
            } else if (!startQ || !endQ) {
                startQ = nextQ.num;
                endQ = nextQ.num + 4;
            }
        }

        if (startQ && endQ) {
            passageList.push({ startQ, endQ, text: pText });
        }
    }

    const questions = [];

    for (let i = 0; i < validMatches.length; i++) {
        const curr = validMatches[i];
        const next = validMatches[i + 1];
        let rawChunk = cleanDoc.slice(curr.index + curr.len, next ? next.index : cleanDoc.length).trim();
        const qNum = curr.num;

        let answer = "A";
        let explanation = "";

        // Merge faculty key if present
        if (facultyKeys.has(qNum)) {
            const fk = facultyKeys.get(qNum);
            answer = fk.answer || answer;
            explanation = fk.explanation || explanation;
        }

        // Inline answer and explanation
        const ansExpMatch = rawChunk.match(/(?:Correct\s*Answer|சரியான\s*விடை|Answer|Ans|பதில்|விடை)[:\s]+(?:\(?([1-4A-Da-dஅஆஇஈ])\)?|\[([1-4A-Da-dஅஆஇஈ])\])(?:\s*([^\n]+))?\s*(?:(?:(?:Short\s*)?Explanation|விளக்கம்|குறுகிய\s*விளக்கம்)[:\s]+([\s\S]*))?$/i);
        if (ansExpMatch) {
            const rawLetter = (ansExpMatch[1] || ansExpMatch[2] || "A").toUpperCase();
            const tamilMap = { "அ": "A", "ஆ": "B", "இ": "C", "ஈ": "D" };
            answer = tamilMap[rawLetter] || (rawLetter === "1" ? "A" : rawLetter === "2" ? "B" : rawLetter === "3" ? "C" : rawLetter === "4" ? "D" : rawLetter);
            if (!explanation && ansExpMatch[4]) {
                explanation = ansExpMatch[4].trim();
            }
            rawChunk = rawChunk.slice(0, ansExpMatch.index).trim();
        }

        // Remove options label e.g. விருப்பங்கள் / தெரிவுகள்
        rawChunk = rawChunk.replace(/(?:விருப்பங்கள்|தெரிவுகள்)\s*[:\s]+/gi, "\n");

        let options = { A: "Option A", B: "Option B", C: "Option C", D: "Option D" };
        let optionLabels = { A: "A", B: "B", C: "C", D: "D" };
        let questionPrompt = rawChunk;

        const smartRes = splitOptionsSmart(rawChunk);
        if (smartRes) {
            options = smartRes.options;
            optionLabels = smartRes.optionLabels || optionLabels;
            questionPrompt = smartRes.body;
        }

        // Attach header line if it contains title info (like "பொருத்துக (சங்க இலக்கியச் சொற்களும் பொருள்களும்)")
        const headerInfo = curr.headerText.replace(/^(?:Q\s*\d+[\.:\)]|Question\s*\d+[\.:\)]|\d+\.\s+|\d+\s*[:\.]\s*|(?:வினா(?:\s*எண்)?)\s*\d+[:\.]?)\s*/i, "").trim();
        if (headerInfo && !questionPrompt.startsWith(headerInfo)) {
            questionPrompt = headerInfo + "\n\n" + questionPrompt;
        }

        // Attach passageBeforeQ1 only to Q1–Q5 (or matched range)
        if (qNum <= 5 && passageBeforeQ1 && !questionPrompt.includes(passageBeforeQ1.slice(0, 50))) {
            questionPrompt = passageBeforeQ1 + "\n\n" + questionPrompt;
        }

        // Attach any dynamically found passage that covers this question
        for (const p of passageList) {
            if (qNum >= p.startQ && qNum <= p.endQ && !questionPrompt.includes(p.text.slice(0, 50))) {
                questionPrompt = p.text + "\n\n" + questionPrompt;
            }
        }

        // Clean out any trailing SECTION headers
        questionPrompt = questionPrompt.replace(/\n\s*SECTION\s+[B-Z][\s\S]*$/i, "").trim();

        const section = qNum <= 50 ? "Paper 1" : "Tamil Paper 2";

        // Format statements vertically line by line if merged together on the same line
        questionPrompt = formatStatementsVertical(questionPrompt);

        questions.push({
            id: qNum,
            number: qNum,
            section: section,
            question: questionPrompt,
            text: questionPrompt,
            options: options,
            optionLabels: optionLabels,
            correctAnswer: answer,
            answer: answer,
            explanation: explanation
        });
    }

    // Attach reading passage between Q15 and Q16 if present in doc
    const q15Match = validMatches.find(x => x.num === 15);
    const q16Match = validMatches.find(x => x.num === 16);
    if (q15Match && q16Match) {
        const between15and16 = cleanDoc.slice(q15Match.index, q16Match.index);
        const passMatch = between15and16.match(/(?:Directions:\s*Read\s+the\s+following\s+passage|Passage\s*\n\s*Educational\s+success)[\s\S]*$/i);
        if (passMatch) {
            const passageText = passMatch[0].trim().replace(/Questions\s+1[–-]5/i, "Questions 16–20");
            for (const q of questions) {
                if (q.number >= 16 && q.number <= 20 && !q.question.includes("Educational success")) {
                    q.question = passageText + "\n\n" + q.question;
                    q.text = q.question;
                }
            }
        }
    }

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
            const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });
            if (htmlResult && htmlResult.value) {
                questions = parseMcqText(convertHtmlTablesToMarkdown(htmlResult.value));
            } else {
                const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
                questions = parseMcqText(docxResult.value);
            }
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

    if (Array.isArray(questions)) {
        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });
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

        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

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
        const { userId, password, candidateName, email, phone, role } = req.body;

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
        const candidatePhone = phone && phone.trim() ? phone.trim() : "";
        const candidateRole = role === "Admin" ? "Admin" : "Student";

        const created = await unifiedDb.createCandidate({
            userId: cleanUserId,
            passwordHash,
            candidateName: candidateName.trim(),
            email: candidateEmail,
            phone: candidatePhone,
            role: candidateRole
        });

        if (candidatePhone) {
            sendWhatsAppWelcomeMessage({
                phone: candidatePhone,
                candidateName: candidateName.trim(),
                userId: cleanUserId
            }).catch((err) => console.warn("[WHATSAPP] Admin student dispatch notice:", err.message));
        }

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

        // Guarantee unique sequential IDs and numbers for client examination engines
        questions.forEach((q, idx) => {
            q.id = idx + 1;
            q.number = idx + 1;
        });

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

// Authoring Guide PDF redirect
app.get(["/authoring-guide.html", "/authoring-guide"], (req, res) => {
    res.redirect("/QUESTION_AUTHORING_BLUEPRINT.pdf");
});

// Serve existing website files
app.use(express.static(ROOT, { index: false }));

// Start server (HTTPS if certificates exist, otherwise HTTP for local development)
if (!process.env.VERCEL) {
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
}

module.exports = app;
