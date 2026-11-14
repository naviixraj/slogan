const fs = require('fs');
const path = require('path');

async function fullWebsiteAudit() {
    const baseUrl = 'http://localhost:3000';
    const errors = [];
    const warnings = [];
    const passes = [];

    console.log("==========================================");
    console.log("🔍 FULL PLATFORM AUDIT STARTING...");
    console.log("==========================================\n");

    // 1. Check all HTML files and their asset references
    console.log("--- 1. AUDITING HTML PAGES & ASSETS ---");
    const htmlFiles = ['login.html', 'admin.html', 'tests.html', 'exam.html'];
    
    for (const file of htmlFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
            errors.push(`File missing: ${file}`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');

        // Check <script src="...">
        const scriptMatches = [...content.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)];
        for (const m of scriptMatches) {
            const scriptSrc = m[1];
            if (!scriptSrc.startsWith('http') && !scriptSrc.startsWith('//')) {
                const cleanSrc = scriptSrc.split('?')[0];
                const assetPath = path.join(__dirname, '..', cleanSrc);
                if (!fs.existsSync(assetPath)) {
                    errors.push(`In ${file}: Broken script tag -> ${scriptSrc}`);
                } else {
                    passes.push(`${file} -> Script exists: ${scriptSrc}`);
                }
            }
        }

        // Check <link href="..."> (CSS)
        const cssMatches = [...content.matchAll(/<link\s+[^>]*href=["']([^"']+)["']/gi)];
        for (const m of cssMatches) {
            const cssHref = m[1];
            if (!cssHref.startsWith('http') && !cssHref.startsWith('//') && !cssHref.startsWith('data:')) {
                const cleanHref = cssHref.split('?')[0];
                const assetPath = path.join(__dirname, '..', cleanHref);
                if (!fs.existsSync(assetPath)) {
                    errors.push(`In ${file}: Broken stylesheet/icon link -> ${cssHref}`);
                } else {
                    passes.push(`${file} -> Stylesheet exists: ${cssHref}`);
                }
            }
        }

        // Check <img> src
        const imgMatches = [...content.matchAll(/<img\s+[^>]*src=["']([^"']+)["']/gi)];
        for (const m of imgMatches) {
            const imgSrc = m[1];
            if (!imgSrc.startsWith('http') && !imgSrc.startsWith('//') && !imgSrc.startsWith('data:')) {
                const cleanSrc = imgSrc.split('?')[0];
                const assetPath = path.join(__dirname, '..', cleanSrc);
                if (!fs.existsSync(assetPath)) {
                    warnings.push(`In ${file}: Broken <img> src -> ${imgSrc}`);
                } else {
                    passes.push(`${file} -> Image exists: ${imgSrc}`);
                }
            }
        }

        // Check CSS url(...)
        const urlMatches = [...content.matchAll(/url\(["']?([^"')]+)["']?\)/gi)];
        for (const m of urlMatches) {
            const bgUrl = m[1];
            if (!bgUrl.startsWith('http') && !bgUrl.startsWith('//') && !bgUrl.startsWith('data:') && !bgUrl.startsWith('#')) {
                const cleanUrl = bgUrl.split('?')[0];
                const assetPath = path.join(__dirname, '..', cleanUrl);
                if (!fs.existsSync(assetPath)) {
                    warnings.push(`In ${file}: Background image referenced not found on disk -> ${bgUrl}`);
                } else {
                    passes.push(`${file} -> Background asset exists: ${bgUrl}`);
                }
            }
        }
    }

    // 2. Test HTTP Routes on Server
    console.log("\n--- 2. AUDITING LIVE HTTP ENDPOINTS ---");
    for (const page of ['/', '/login.html']) {
        try {
            const res = await fetch(`${baseUrl}${page}`);
            if (res.status === 200) {
                passes.push(`Live route ${page} returned 200 OK`);
            } else {
                errors.push(`Live route ${page} returned status ${res.status}`);
            }
        } catch (err) {
            errors.push(`Live route ${page} failed: ${err.message}`);
        }
    }

    // 3. Test Authentication & Route Guards
    console.log("\n--- 3. TESTING ROUTE GUARDS & SECURITY ---");
    // Admin page without login must redirect to login
    try {
        const unauthAdmin = await fetch(`${baseUrl}/admin.html`, { redirect: 'manual' });
        if (unauthAdmin.status === 302 && unauthAdmin.headers.get('location')?.includes('login.html')) {
            passes.push("Security: Unauthenticated access to admin.html redirects to login.html (302)");
        } else {
            warnings.push(`Security check: admin.html returned status ${unauthAdmin.status}`);
        }
    } catch (err) {
        errors.push(`Route guard test failed: ${err.message}`);
    }

    // Tests page without login must redirect to login
    try {
        const unauthTests = await fetch(`${baseUrl}/tests.html`, { redirect: 'manual' });
        if (unauthTests.status === 302 && unauthTests.headers.get('location')?.includes('login.html')) {
            passes.push("Security: Unauthenticated access to tests.html redirects to login.html (302)");
        } else {
            warnings.push(`Security check: tests.html returned status ${unauthTests.status}`);
        }
    } catch (err) {
        errors.push(`Route guard test failed: ${err.message}`);
    }

    // 4. Test Student Login & Session Verification
    console.log("\n--- 4. TESTING STUDENT WORKFLOW ---");
    let studentCookie = '';
    try {
        const sLogin = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'navi', password: 'navii007' })
        });
        const sData = await sLogin.json();
        if (sLogin.status === 200 && sData.success && sData.candidate.role === 'Student') {
            studentCookie = sLogin.headers.get('set-cookie');
            passes.push("Student login: 'navi' authenticated successfully with role 'Student'");
        } else {
            errors.push(`Student login failed: ${sData.message || sLogin.status}`);
        }

        // Test /api/me with student session
        const meRes = await fetch(`${baseUrl}/api/me`, {
            headers: { 'cookie': studentCookie }
        });
        const meData = await meRes.json();
        if (meRes.status === 200 && meData.candidate.userId === 'navi') {
            passes.push("Student session: /api/me verified candidate identity successfully");
        } else {
            errors.push("Student session /api/me verification failed");
        }

        // Test Student Tests Catalog
        const testsRes = await fetch(`${baseUrl}/api/student/tests`, {
            headers: { 'cookie': studentCookie }
        });
        const testsData = await testsRes.json();
        if (testsRes.status === 200 && testsData.tests && testsData.tests.length > 0) {
            passes.push(`Student catalog: Loaded ${testsData.tests.length} available test set(s)`);
        } else {
            errors.push("Student catalog failed to load available tests");
        }

        // Test Student Exam Questions Loader
        const qRes = await fetch(`${baseUrl}/api/mock-tests/MOCK01/questions`, {
            headers: { 'cookie': studentCookie }
        });
        const qData = await qRes.json();
        if (qRes.status === 200 && qData.success && qData.totalQuestions === 150) {
            passes.push(`Exam questions loader: MOCK01 loaded all ${qData.totalQuestions} questions successfully`);
        } else {
            errors.push(`Exam questions loader failed: questions count is ${qData.totalQuestions}`);
        }
    } catch (err) {
        errors.push(`Student workflow test error: ${err.message}`);
    }

    // 5. Test Admin Login & Admin Operations
    console.log("\n--- 5. TESTING ADMIN WORKFLOW ---");
    let adminCookie = '';
    try {
        const aLogin = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'admin', password: 'admin123' })
        });
        const aData = await aLogin.json();
        if (aLogin.status === 200 && aData.success && aData.candidate.role === 'Admin') {
            adminCookie = aLogin.headers.get('set-cookie');
            passes.push("Admin login: 'admin' authenticated successfully with role 'Admin'");
        } else {
            errors.push(`Admin login failed: ${aData.message || aLogin.status}`);
        }

        // Test Admin Sets API
        const adminSets = await fetch(`${baseUrl}/api/admin/sets`, {
            headers: { 'cookie': adminCookie }
        });
        const adminSetsData = await adminSets.json();
        if (adminSets.status === 200 && adminSetsData.sets) {
            passes.push(`Admin sets: Retrieved ${adminSetsData.sets.length} question sets`);
        } else {
            errors.push(`Admin sets API failed: HTTP ${adminSets.status} - ${JSON.stringify(adminSetsData)}`);
        }

        // Test Admin Students API
        const adminStudents = await fetch(`${baseUrl}/api/admin/students`, {
            headers: { 'cookie': adminCookie }
        });
        const adminStudentsData = await adminStudents.json();
        if (adminStudents.status === 200 && adminStudentsData.students) {
            passes.push(`Admin students: Retrieved ${adminStudentsData.students.length} candidates from Supabase`);
        } else {
            errors.push(`Admin students API failed: HTTP ${adminStudents.status} - ${JSON.stringify(adminStudentsData)}`);
        }

        // Test Inspect Questions
        const inspectRes = await fetch(`${baseUrl}/api/admin/sets/MOCK01`, {
            headers: { 'cookie': adminCookie }
        });
        const inspectData = await inspectRes.json();
        if (inspectRes.status === 200 && inspectData.set && inspectData.set.questions?.length === 150) {
            passes.push(`Admin Inspect Questions: All 150 questions retrieved cleanly`);
        } else {
            errors.push(`Admin Inspect Questions failed: HTTP ${inspectRes.status} - ${JSON.stringify(inspectData)}`);
        }
    } catch (err) {
        errors.push(`Admin workflow test error: ${err.message}`);
    }

    // 6. Test Logout
    console.log("\n--- 6. TESTING LOGOUT ---");
    try {
        const logoutRes = await fetch(`${baseUrl}/api/logout`, {
            method: 'POST',
            headers: { 'cookie': studentCookie }
        });
        const logoutData = await logoutRes.json();
        if (logoutRes.status === 200 && logoutData.success) {
            passes.push("Logout: Session successfully invalidated");
        } else {
            errors.push("Logout failed");
        }
    } catch (err) {
        errors.push(`Logout test error: ${err.message}`);
    }

    // SUMMARY REPORT
    console.log("\n==========================================");
    console.log("📊 AUDIT RESULTS SUMMARY");
    console.log("==========================================");
    console.log(`✅ PASSED CHECKS: ${passes.length}`);
    passes.forEach(p => console.log(`  ✓ ${p}`));

    console.log(`\n⚠️ WARNINGS: ${warnings.length}`);
    warnings.forEach(w => console.log(`  ! ${w}`));

    console.log(`\n❌ ERRORS FOUND: ${errors.length}`);
    errors.forEach(e => console.log(`  ✗ ${e}`));

    console.log("==========================================");
}

fullWebsiteAudit();
