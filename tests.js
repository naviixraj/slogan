"use strict";

// If opened via VS Code Live Server (port 5500/5501/etc.), auto-redirect to the Express server on port 3000
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "5502") {
        window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}`);
    }
}

/* =====================================================
   SLOGON ACADEMY - EXAMINATION DASHBOARD
   Mock Test 01 is available.
   Mock Tests 02-10 are coming soon.
   ===================================================== */

const candidateName = document.getElementById("sidebarName");
const candidateAvatar = document.getElementById("sidebarAvatar");
const topAvatar = document.getElementById("topAvatar");
const topAvatarButton = document.getElementById("topAvatarButton");
const profileDropdownMenu = document.getElementById("profileDropdownMenu");
const dropdownAvatar = document.getElementById("dropdownAvatar");
const dropdownCandidateName = document.getElementById("dropdownCandidateName");
const dropdownUserId = document.getElementById("dropdownUserId");
const dropdownRole = document.getElementById("dropdownRole");
const dropdownEmail = document.getElementById("dropdownEmail");
const dropdownLogoutButton = document.getElementById("dropdownLogoutButton");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const cancelLogoutButton = document.getElementById("cancelLogoutButton");
const confirmLogoutButton = document.getElementById("confirmLogoutButton");
const logoutCloseIconButton = document.getElementById("logoutCloseIconButton");

const availableExamsSection = document.getElementById("availableExamsSection");
const availableCarouselTrack = document.getElementById("availableCarouselTrack");
const availableCountBadge = document.getElementById("availableCountBadge");
const availableCarouselControls = document.getElementById("availableCarouselControls");
const availablePrevBtn = document.getElementById("availablePrevBtn");
const availableNextBtn = document.getElementById("availableNextBtn");
const availableCarouselDots = document.getElementById("availableCarouselDots");

const upcomingExamsSection = document.getElementById("upcomingExamsSection");
const upcomingCarouselTrack = document.getElementById("upcomingCarouselTrack");
const upcomingCountBadge = document.getElementById("upcomingCountBadge");
const upcomingCarouselControls = document.getElementById("upcomingCarouselControls");
const upcomingPrevBtn = document.getElementById("upcomingPrevBtn");
const upcomingNextBtn = document.getElementById("upcomingNextBtn");
const upcomingCarouselDots = document.getElementById("upcomingCarouselDots");
const emptyTestsState = document.getElementById("emptyTestsState");
const pageMessage = document.getElementById("pageMessage");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const resultCount = document.getElementById("resultCount");
const viewToggleButton = document.getElementById("viewToggleButton");
const examSection = document.getElementById("examSection");
const helpSection = document.getElementById("helpSection");
const examinationsNav = document.getElementById("examinationsNav");
const helpNav = document.getElementById("helpNav");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

/* -----------------------------------------------------
   MOCK TEST DATA
   ----------------------------------------------------- */

let mockTests = Array.from({ length: 10 }, (_, i) => ({
    id: `MOCK${String(i + 1).padStart(2, "0")}`,
    title: `UGC NET Full-Length Mock Test ${String(i + 1).padStart(2, "0")}`,
    status: "coming"
}));

async function loadStudentTests() {
    try {
        const res = await fetch("/api/student/tests", {
            credentials: "same-origin"
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.tests)) {
                const dbTests = data.tests.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status || "available",
                    subject: t.subject || "All",
                    questionsCount: t.questions_count,
                    duration: t.duration,
                    isDb: true
                }));
                // Filter out any unwanted/dummy MOCK01 so only real admin uploaded sets appear as available
                const existingIds = new Set(dbTests.map(t => t.id.toUpperCase()));
                existingIds.add("MOCK01");
                const upcoming = mockTests
                    .filter(m => !existingIds.has(m.id.toUpperCase()))
                    .map(m => ({ ...m, status: "coming" }));
                mockTests = [...dbTests, ...upcoming];
                renderTests();
                if (typeof performQuestionPaperSearch === "function") {
                    performQuestionPaperSearch();
                }
            }
        }
    } catch (e) {
        console.error("Could not load dynamic tests:", e);
    }
}

/* -----------------------------------------------------
   CANDIDATE INITIALS
   ----------------------------------------------------- */

function initials(name) {
    return String(name || "Student")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("") || "ST";
}

/* -----------------------------------------------------
   RENDER MOCK TEST CARDS
   ----------------------------------------------------- */

let currentHomeFilter = "all";

function renderTests() {

    const term = searchInput.value.trim().toLowerCase();
    const filter = currentHomeFilter || "all";

    // Dynamic stats for Hero Card & Chips
    const activeTotal = mockTests.filter(t => t.status === "available").length;
    const upcomingTotal = mockTests.filter(t => t.status !== "available").length;
    const allTotal = mockTests.length;

    const heroActive = document.getElementById("heroActiveCount");
    const heroUpcoming = document.getElementById("heroUpcomingCount");
    const heroTotal = document.getElementById("heroTotalCount");
    if (heroActive) heroActive.textContent = activeTotal;
    if (heroUpcoming) heroUpcoming.textContent = upcomingTotal;
    if (heroTotal) heroTotal.textContent = allTotal;

    const chipAll = document.getElementById("chipAllCount");
    const chipAvail = document.getElementById("chipAvailCount");
    const chipUp = document.getElementById("chipUpCount");
    if (chipAll) chipAll.textContent = allTotal;
    if (chipAvail) chipAvail.textContent = activeTotal;
    if (chipUp) chipUp.textContent = upcomingTotal;

    const matches = mockTests.filter(test => {

        const matchesSearch =
            !term ||
            test.title.toLowerCase().includes(term) ||
            test.id.toLowerCase().includes(term);

        const matchesFilter =
            filter === "all" ||
            (filter === "coming" && test.status !== "available") ||
            (filter === "available" && test.status === "available");

        return matchesSearch && matchesFilter;
    });

    // Sort examinations:
    // 1. Currently AVAILABLE questions/tests ALWAYS show on the TOP
    // 2. Database question sets uploaded by admin show before static mock tests
    // 3. Within each group, clean sequential order (SET01, SET02... / MOCK01, MOCK02...)
    matches.sort((a, b) => {
        const isAvailA = a.status === "available" ? 1 : 0;
        const isAvailB = b.status === "available" ? 1 : 0;
        if (isAvailA !== isAvailB) {
            return isAvailB - isAvailA;
        }

        const isDbA = a.isDb ? 1 : 0;
        const isDbB = b.isDb ? 1 : 0;
        if (isDbA !== isDbB) {
            return isDbB - isDbA;
        }

        const idA = String(a.id || "").trim();
        const idB = String(b.id || "").trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (resultCount) {
        resultCount.textContent = `Showing ${matches.length} of ${mockTests.length} examinations`;
    }

    const availableList = matches.filter(t => t.status === "available");
    const upcomingList = matches.filter(t => t.status !== "available");

    if (availableCountBadge) {
        availableCountBadge.textContent = `${availableList.length} ${availableList.length === 1 ? "EXAM" : "EXAMS"}`;
    }
    if (upcomingCountBadge) {
        upcomingCountBadge.textContent = `${upcomingList.length} ${upcomingList.length === 1 ? "EXAM" : "EXAMS"}`;
    }

    if (emptyTestsState) {
        emptyTestsState.style.display = matches.length === 0 ? "block" : "none";
    }

    if (availableExamsSection) {
        availableExamsSection.style.display = (availableList.length > 0 && filter !== "coming") ? "block" : "none";
    }
    if (upcomingExamsSection) {
        upcomingExamsSection.style.display = (upcomingList.length > 0 && filter !== "available") ? "block" : "none";
    }

    // Helper: create Available Exam structured card
    function buildAvailableCard(test) {
        const qCount = test.questionsCount || test.questions_count || 150;
        const dur = test.duration || 180;
        const subj = test.subject || "General Paper";
        const codeLabel = `EXAM ${String(test.id || "SET01").toUpperCase()}`;

        const card = document.createElement("article");
        card.className = "avail-exam-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("title", `Click to start ${test.title}`);

        card.innerHTML = `
            <svg class="avail-card-watermark" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <rect x="20" y="14" width="46" height="58" rx="8" fill="rgba(251,222,199,0.12)" stroke="rgba(251,222,199,0.35)" stroke-width="2"/>
                <rect x="33" y="9" width="20" height="9" rx="4" fill="rgba(251,222,199,0.22)" stroke="rgba(251,222,199,0.42)" stroke-width="1.5"/>
                <path d="M30 33l4 4 8-8M30 46l4 4 8-8M30 59h20" stroke="rgba(253,244,238,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="64" cy="64" r="16" fill="#BD8B7F" stroke="#FDF4EE" stroke-width="2"/>
                <path d="M64 56v9l6 3" stroke="#3A010D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        const top = document.createElement("div");
        top.className = "avail-card-top";

        const codePill = document.createElement("span");
        codePill.className = "avail-code-pill";
        codePill.textContent = codeLabel;

        const statusPill = document.createElement("span");
        statusPill.className = "avail-status-pill";
        const dot = document.createElement("span");
        dot.className = "avail-status-dot";
        statusPill.append(dot, document.createTextNode("AVAILABLE"));

        top.append(codePill, statusPill);

        const body = document.createElement("div");
        body.className = "avail-card-body";

        const title = document.createElement("h3");
        title.className = "avail-card-title";
        title.textContent = test.title;

        const desc = document.createElement("p");
        desc.className = "avail-card-desc";
        desc.textContent = "Ready to begin. Complete the instructions before starting your examination.";

        body.append(title, desc);

        const inner = document.createElement("div");
        inner.className = "avail-inner-panel";

        const metricsGrid = document.createElement("div");
        metricsGrid.className = "avail-metrics-grid";

        const m1 = document.createElement("div");
        m1.className = "avail-metric-item";
        m1.innerHTML = `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg>`;
        const m1Text = document.createElement("div");
        m1Text.className = "avail-metric-text";
        const m1Strong = document.createElement("strong");
        m1Strong.textContent = String(qCount);
        const m1Sub = document.createElement("span");
        m1Sub.textContent = "Questions";
        m1Text.append(m1Strong, m1Sub);
        m1.appendChild(m1Text);

        const m2 = document.createElement("div");
        m2.className = "avail-metric-item";
        m2.innerHTML = `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
        const m2Text = document.createElement("div");
        m2Text.className = "avail-metric-text";
        const m2Strong = document.createElement("strong");
        m2Strong.textContent = String(dur);
        const m2Sub = document.createElement("span");
        m2Sub.textContent = "Minutes";
        m2Text.append(m2Strong, m2Sub);
        m2.appendChild(m2Text);

        const m3 = document.createElement("div");
        m3.className = "avail-metric-item";
        m3.innerHTML = `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
        const m3Text = document.createElement("div");
        m3Text.className = "avail-metric-text is-subject";
        const m3Strong = document.createElement("strong");
        m3Strong.textContent = subj;
        m3Text.appendChild(m3Strong);
        m3.appendChild(m3Text);

        metricsGrid.append(m1, m2, m3);

        const startBtn = document.createElement("button");
        startBtn.type = "button";
        startBtn.className = "avail-start-btn";
        startBtn.innerHTML = `<span>▶ START EXAMINATION &rarr;</span>`;

        const launchExam = () => {
            const testIdClean = String(test.id || "MOCK01").toLowerCase();
            localStorage.setItem("selectedMockTest", testIdClean);
            localStorage.setItem("selectedTestDetails", JSON.stringify({
                id: test.id,
                title: test.title,
                subject: subj,
                duration: dur,
                questionsCount: qCount
            }));
            localStorage.setItem("examDuration", String(dur * 60));
            localStorage.setItem("currentExamTitle", test.title);
            localStorage.setItem("currentExamSubject", subj);
            window.location.href = "instructions";
        };

        card.addEventListener("click", launchExam);
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                launchExam();
            }
        });
        startBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            launchExam();
        });

        inner.append(metricsGrid, startBtn);
        card.append(top, body, inner);
        return card;
    }

    // Helper: create Upcoming Exam card
    function getStoredAlerts() {
        try {
            return JSON.parse(localStorage.getItem("slogonUpcomingAlerts") || "[]");
        } catch {
            return [];
        }
    }

    function buildUpcomingCard(test, idx) {
        const qCount = test.questionsCount || test.questions_count || 150;
        const dur = test.duration || 180;
        const subj = test.subject || "General Paper";
        const codeLabel = `EXAM ${String(test.id || "MOCK02").toUpperCase()}`;
        const indexLabel = String(idx + 1).padStart(2, "0");

        const card = document.createElement("article");
        card.className = "upcoming-exam-card";

        const top = document.createElement("div");
        top.className = "upcoming-card-top";

        const badges = document.createElement("div");
        badges.className = "upcoming-badges";

        const codePill = document.createElement("span");
        codePill.className = "upcoming-code-pill";
        codePill.textContent = codeLabel;

        const soonPill = document.createElement("span");
        soonPill.className = "upcoming-soon-pill";
        soonPill.innerHTML = `<svg class="hourglass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h12M6 22h12"/><path d="M7 2v5.5a5 5 0 0 0 2.2 4.15L12 13.5l2.8-1.85A5 5 0 0 0 17 7.5V2"/><path d="M7 22v-5.5a5 5 0 0 1 2.2-4.15L12 10.5l2.8 1.85A5 5 0 0 1 17 16.5V22"/><path d="M9.2 6h5.6L12 9.5 9.2 6Z" fill="#570215" stroke="none"/><path d="M9.2 19h5.6L12 15.5 9.2 19Z" fill="#570215" stroke="none"/></svg><span>COMING SOON</span>`;

        badges.append(codePill, soonPill);

        const idxSpan = document.createElement("span");
        idxSpan.className = "upcoming-index-num";
        idxSpan.textContent = indexLabel;

        top.append(badges, idxSpan);

        const title = document.createElement("h3");
        title.className = "upcoming-card-title";
        title.textContent = test.title;

        const desc = document.createElement("p");
        desc.className = "upcoming-card-desc";
        desc.textContent = "This examination will be available once its question bank is ready.";

        const statBoxes = document.createElement("div");
        statBoxes.className = "upcoming-stat-boxes";

        const specs = [
            {
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
                label: "ITEMS",
                val: String(qCount),
                sub: "Questions"
            },
            {
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
                label: "DURATION",
                val: String(dur),
                sub: "Minutes"
            },
            {
                icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
                label: "STREAM",
                val: subj,
                sub: "Mandatory"
            }
        ];

        specs.forEach(sp => {
            const box = document.createElement("div");
            box.className = "upcoming-stat-box";
            const head = document.createElement("div");
            head.className = "upcoming-stat-head";
            head.innerHTML = sp.icon;
            const headLbl = document.createElement("span");
            headLbl.textContent = sp.label;
            head.appendChild(headLbl);

            const val = document.createElement("strong");
            val.className = "upcoming-stat-val";
            val.textContent = sp.val;

            const sub = document.createElement("span");
            sub.className = "upcoming-stat-sub";
            sub.textContent = sp.sub;

            box.append(head, val, sub);
            statBoxes.appendChild(box);
        });

        const footer = document.createElement("div");
        footer.className = "upcoming-card-footer";

        const alerts = getStoredAlerts();
        let isAlerted = alerts.includes(String(test.id));

        const alertBtn = document.createElement("button");
        alertBtn.type = "button";
        alertBtn.className = isAlerted ? "upcoming-alert-btn is-alerted" : "upcoming-alert-btn";
        const updateAlertLabel = () => {
            alertBtn.className = isAlerted ? "upcoming-alert-btn is-alerted" : "upcoming-alert-btn";
            alertBtn.textContent = isAlerted ? "✓ ALERT ENABLED" : "🔔 ALERT WHEN UNLOCKED";
        };
        updateAlertLabel();

        alertBtn.addEventListener("click", () => {
            const current = getStoredAlerts();
            const idStr = String(test.id);
            if (current.includes(idStr)) {
                localStorage.setItem("slogonUpcomingAlerts", JSON.stringify(current.filter(x => x !== idStr)));
                isAlerted = false;
            } else {
                current.push(idStr);
                localStorage.setItem("slogonUpcomingAlerts", JSON.stringify(current));
                isAlerted = true;
            }
            updateAlertLabel();
        });

        footer.appendChild(alertBtn);
        card.append(top, title, desc, statBoxes, footer);
        return card;
    }

    // Render carousels and wire navigation controls
    function setupCarousel(trackEl, items, builderFn, dotsEl, prevBtn, nextBtn, controlsEl) {
        if (!trackEl) return;
        trackEl.innerHTML = "";
        items.forEach((item, i) => trackEl.appendChild(builderFn(item, i)));

        if (dotsEl) dotsEl.innerHTML = "";
        if (controlsEl) {
            controlsEl.style.display = items.length > 1 ? "flex" : "none";
        }
        if (items.length <= 1 || !dotsEl) return;

        const dots = items.map((_, i) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = i === 0 ? "carousel-dot active" : "carousel-dot";
            dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
            dot.addEventListener("click", () => {
                const targetCard = trackEl.children[i];
                if (targetCard) {
                    trackEl.scrollTo({ left: targetCard.offsetLeft - trackEl.offsetLeft, behavior: "smooth" });
                }
            });
            dotsEl.appendChild(dot);
            return dot;
        });

        const getCurrentIndex = () => {
            let bestIdx = 0;
            let bestDist = Infinity;
            const left = trackEl.scrollLeft + trackEl.offsetLeft;
            Array.from(trackEl.children).forEach((child, i) => {
                const dist = Math.abs(child.offsetLeft - left);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            });
            return bestIdx;
        };

        const syncControls = () => {
            const idx = getCurrentIndex();
            dots.forEach((d, i) => d.classList.toggle("active", i === idx));
            if (prevBtn) prevBtn.disabled = idx <= 0;
            if (nextBtn) nextBtn.disabled = idx >= items.length - 1;
        };

        trackEl.onscroll = () => {
            syncControls();
        };

        if (prevBtn) {
            prevBtn.onclick = () => {
                const idx = Math.max(0, getCurrentIndex() - 1);
                const targetCard = trackEl.children[idx];
                if (targetCard) {
                    trackEl.scrollTo({ left: targetCard.offsetLeft - trackEl.offsetLeft, behavior: "smooth" });
                }
            };
        }
        if (nextBtn) {
            nextBtn.onclick = () => {
                const idx = Math.min(items.length - 1, getCurrentIndex() + 1);
                const targetCard = trackEl.children[idx];
                if (targetCard) {
                    trackEl.scrollTo({ left: targetCard.offsetLeft - trackEl.offsetLeft, behavior: "smooth" });
                }
            };
        }

        syncControls();
    }

    setupCarousel(
        availableCarouselTrack,
        availableList,
        buildAvailableCard,
        availableCarouselDots,
        availablePrevBtn,
        availableNextBtn,
        availableCarouselControls
    );

    setupCarousel(
        upcomingCarouselTrack,
        upcomingList,
        buildUpcomingCard,
        upcomingCarouselDots,
        upcomingPrevBtn,
        upcomingNextBtn,
        upcomingCarouselControls
    );

    // Study Material Carousel (same design as Available Exams, placed before Available Exams)
    const studyMaterialTrack = document.getElementById("studyMaterialTrack");
    const studyMaterialDots = document.getElementById("studyMaterialDots");
    const studyMaterialPrevBtn = document.getElementById("studyMaterialPrevBtn");
    const studyMaterialNextBtn = document.getElementById("studyMaterialNextBtn");
    const studyMaterialControls = document.getElementById("studyMaterialControls");
    const studyMaterialCountBadge = document.getElementById("studyMaterialCountBadge");

    const studyMaterials = [
        {
            code: "MAT 01",
            title: "Paper 1 — General Paper Mastery",
            desc: "Structured notes covering Teaching & Research Aptitude, DI, Logical Reasoning, and ICT.",
            units: "10",
            unitsLabel: "Units",
            paper: "Paper 1",
            paperLabel: "Module",
            format: "Notes",
            topics: [
                "Unit 1–2: Teaching & Research Aptitude Fundamentals",
                "Unit 3–4: Comprehension & Effective Communication",
                "Unit 5–7: Mathematical, Logical Reasoning & Data Interpretation",
                "Unit 8–10: ICT, People & Environment, Higher Education System"
            ]
        },
        {
            code: "MAT 02",
            title: "Paper 2 — Tamil Literature & Grammar",
            desc: "Comprehensive unit-wise reference for Sangam texts, Ilakkanam, and Modern Tamil literature.",
            units: "10",
            unitsLabel: "Units",
            paper: "Paper 2",
            paperLabel: "Subject",
            format: "Guide",
            topics: [
                "Classical Sangam & Ettuthogai / Pathuppattu Overview",
                "Tolkappiyam & Nannool Grammar Key Rules",
                "Bhakti Movement, Epics & Ethical Literature",
                "Modern Tamil Prose, Poetry & Literary Criticism"
            ]
        },
        {
            code: "MAT 03",
            title: "Quick Revision — DI & PYQ Briefs",
            desc: "High-yield shortcuts, percentage tables, logical fallacies, and last-minute recall sheets.",
            units: "50+",
            unitsLabel: "Topics",
            paper: "All",
            paperLabel: "Papers",
            format: "Briefs",
            topics: [
                "Data Interpretation Ratio & Percentage Speed Tables",
                "Indian Logic (Pramanas & Hetvabhasa) Quick Chart",
                "ICT Abbreviations, Protocols & Digital Initiatives",
                "Research Designs, Sampling & Hypothesis Testing Summary"
            ]
        }
    ];

    if (studyMaterialCountBadge) {
        studyMaterialCountBadge.textContent = `${studyMaterials.length} ${studyMaterials.length === 1 ? "SET" : "SETS"}`;
    }

    function openStudyMaterialModal(item) {
        const modal = document.getElementById("studyMaterialModal");
        const codeEl = document.getElementById("studyModalCode");
        const titleEl = document.getElementById("studyModalTitle");
        const metaEl = document.getElementById("studyModalMeta");
        const bodyEl = document.getElementById("studyModalBody");
        if (!modal || !titleEl || !bodyEl) return;

        if (codeEl) codeEl.textContent = item.code;
        titleEl.textContent = item.title;
        if (metaEl) metaEl.textContent = `${item.units} ${item.unitsLabel} • ${item.paper} • ${item.format}`;

        bodyEl.innerHTML = "";
        const intro = document.createElement("p");
        intro.style.marginBottom = "10px";
        intro.textContent = item.desc;
        bodyEl.appendChild(intro);

        const list = document.createElement("ul");
        list.style.paddingLeft = "18px";
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.gap = "6px";
        item.topics.forEach(t => {
            const li = document.createElement("li");
            li.textContent = t;
            list.appendChild(li);
        });
        bodyEl.appendChild(list);

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function buildStudyMaterialCard(item) {
        const card = document.createElement("article");
        card.className = "avail-exam-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("title", `Open ${item.title}`);

        card.innerHTML = `
            <svg class="avail-card-watermark" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <path d="M18 22C18 18 22 15 26 15H46V73H26C22 73 18 76 18 80V22Z" fill="rgba(251,222,199,0.12)" stroke="rgba(251,222,199,0.38)" stroke-width="2"/>
                <path d="M78 22C78 18 74 15 70 15H50V73H70C74 73 78 76 78 80V22Z" fill="rgba(251,222,199,0.12)" stroke="rgba(251,222,199,0.38)" stroke-width="2"/>
                <path d="M26 30h12M26 42h12M58 30h12M58 42h12" stroke="rgba(253,244,238,0.48)" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;

        const top = document.createElement("div");
        top.className = "avail-card-top";

        const codePill = document.createElement("span");
        codePill.className = "avail-code-pill";
        codePill.textContent = item.code;

        const statusPill = document.createElement("span");
        statusPill.className = "avail-status-pill";
        const dot = document.createElement("span");
        dot.className = "avail-status-dot";
        statusPill.append(dot, document.createTextNode("READY"));

        top.append(codePill, statusPill);

        const body = document.createElement("div");
        body.className = "avail-card-body";

        const title = document.createElement("h3");
        title.className = "avail-card-title";
        title.textContent = item.title;

        const desc = document.createElement("p");
        desc.className = "avail-card-desc";
        desc.textContent = item.desc;

        body.append(title, desc);

        const inner = document.createElement("div");
        inner.className = "avail-inner-panel";

        const metricsGrid = document.createElement("div");
        metricsGrid.className = "avail-metrics-grid";

        const specs = [
            {
                icon: `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
                val: item.units,
                lbl: item.unitsLabel
            },
            {
                icon: `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`,
                val: item.paper,
                lbl: item.paperLabel
            },
            {
                icon: `<svg class="avail-metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
                val: item.format,
                lbl: "Material",
                isSubject: true
            }
        ];

        specs.forEach(sp => {
            const m = document.createElement("div");
            m.className = "avail-metric-item";
            m.innerHTML = sp.icon;
            const mText = document.createElement("div");
            mText.className = sp.isSubject ? "avail-metric-text is-subject" : "avail-metric-text";
            const mStrong = document.createElement("strong");
            mStrong.textContent = sp.val;
            const mSub = document.createElement("span");
            mSub.textContent = sp.lbl;
            mText.append(mStrong, mSub);
            m.appendChild(mText);
            metricsGrid.appendChild(m);
        });

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "avail-start-btn";
        openBtn.innerHTML = `<span>▶ OPEN STUDY MATERIAL &rarr;</span>`;

        const handleOpen = () => openStudyMaterialModal(item);
        card.addEventListener("click", handleOpen);
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen();
            }
        });
        openBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            handleOpen();
        });

        inner.append(metricsGrid, openBtn);
        card.append(top, body, inner);
        return card;
    }

    setupCarousel(
        studyMaterialTrack,
        studyMaterials,
        buildStudyMaterialCard,
        studyMaterialDots,
        studyMaterialPrevBtn,
        studyMaterialNextBtn,
        studyMaterialControls
    );

    const studyModalEl = document.getElementById("studyMaterialModal");
    const closeStudyModalBtn = document.getElementById("closeStudyModalBtn");
    if (closeStudyModalBtn && studyModalEl) {
        closeStudyModalBtn.addEventListener("click", () => {
            studyModalEl.classList.remove("show");
            studyModalEl.setAttribute("aria-hidden", "true");
        });
    }
    if (studyModalEl) {
        studyModalEl.addEventListener("click", (e) => {
            if (e.target === studyModalEl) {
                studyModalEl.classList.remove("show");
                studyModalEl.setAttribute("aria-hidden", "true");
            }
        });
    }
}

// Wire Home filter chips (All, Available, Upcoming)
const homeFilterChips = document.querySelectorAll(".home-filter-chip");
homeFilterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        homeFilterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentHomeFilter = chip.getAttribute("data-home-filter") || "all";
        if (statusFilter) {
            statusFilter.value = currentHomeFilter;
        }
        renderTests();
    });
});

/* -----------------------------------------------------
   DASHBOARD NAVIGATION
   ----------------------------------------------------- */

function showExaminations() {

    examSection.style.display = "block";
    helpSection.style.display = "none";

    examinationsNav.classList.add("active");
    helpNav.classList.remove("active");

    pageTitle.textContent = "Examinations";
    pageSubtitle.textContent =
        "Browse your available examinations and choose a test to begin.";
}

function showHelp() {

    examSection.style.display = "none";
    const mobProf = document.getElementById("profileSection");
    const mobSearch = document.getElementById("searchSection");
    const mobLeader = document.getElementById("leaderboardSection");
    if (mobProf) mobProf.style.display = "none";
    if (mobSearch) mobSearch.style.display = "none";
    if (mobLeader) mobLeader.style.display = "none";

    const tabBtns = document.querySelectorAll(".mobile-tab-bar .tab-btn");
    tabBtns.forEach(btn => btn.classList.remove("active"));

    helpSection.style.display = "block";

    helpNav.classList.add("active");
    examinationsNav.classList.remove("active");

    pageTitle.textContent = "Help";
    pageSubtitle.textContent =
        "Find information about your candidate account and mock examinations.";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* -----------------------------------------------------
   LOAD AUTHENTICATED CANDIDATE
   ----------------------------------------------------- */

async function loadCandidate() {

    try {

        const response = await fetch("/api/me", {
            credentials: "same-origin"
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.candidate) {
            window.location.replace("login");
            return;
        }

        const name = result.candidate.name || "Student";
        const userId = result.candidate.userId || "";
        const role = result.candidate.role || "Student";
        const email = result.candidate.email || `${userId}@slogon.edu`;

        const tag = initials(name);
        const picture = result.candidate.picture || "";

        function renderAvatar(elem, pic, text) {
            if (!elem) return;
            elem.textContent = "";
            if (pic && typeof pic === "string" && /^https?:\/\//i.test(pic)) {
                const img = document.createElement("img");
                img.src = pic;
                img.alt = "Profile";
                img.style.cssText = "width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;";
                img.addEventListener("error", () => {
                    elem.textContent = text;
                }, { once: true });
                elem.appendChild(img);
                elem.style.padding = "0";
                elem.style.overflow = "hidden";
            } else {
                elem.textContent = text;
            }
        }

        candidateName.textContent = name;
        renderAvatar(candidateAvatar, picture, tag);
        renderAvatar(topAvatar, picture, tag);
        renderAvatar(dropdownAvatar, picture, tag);

        // Populate Profile Dropdown dynamically for any logged-in user
        if (dropdownCandidateName) dropdownCandidateName.textContent = name;
        if (dropdownUserId) dropdownUserId.textContent = userId;
        if (dropdownRole) dropdownRole.textContent = role;
        if (dropdownEmail) dropdownEmail.textContent = email;

        const candidateCombo = result.candidate.examCombination || result.candidate.exam_combination || "Paper 1 - General Paper";

        // Populate Mobile Profile view & Leaderboard User card
        const mobileProfileAvatar = document.getElementById("mobileProfileAvatar");
        const mobileProfileName = document.getElementById("mobileProfileName");
        const mobileProfileUserId = document.getElementById("mobileProfileUserId");
        const mobileProfileStream = document.getElementById("mobileProfileStream");
        const mobileProfileEmail = document.getElementById("mobileProfileEmail");
        const leaderUserAvatar = document.getElementById("leaderUserAvatar");
        const leaderUserName = document.getElementById("leaderUserName");

        if (mobileProfileName) mobileProfileName.textContent = name;
        if (mobileProfileUserId) mobileProfileUserId.textContent = userId;
        if (mobileProfileStream) mobileProfileStream.textContent = candidateCombo;
        if (mobileProfileEmail) mobileProfileEmail.textContent = email;
        const mobileProfileRole = document.getElementById("mobileProfileRole");
        if (mobileProfileRole) mobileProfileRole.textContent = role || "Student Candidate";
        renderAvatar(mobileProfileAvatar, picture, tag);
        renderAvatar(leaderUserAvatar, picture, tag);
        if (leaderUserName) leaderUserName.textContent = name;

        // Dynamically adapt profile hero color according to profile picture / reference colors
        function applyAdaptiveProfileTheme(picUrl) {
            const hero = document.getElementById("mobileProfileHero");
            if (!hero) return;
            const defaultBg = "linear-gradient(135deg, #1E3A8A 0%, #172554 60%, #0F172A 100%)";
            const defaultShadow = "0 12px 30px rgba(30, 58, 138, 0.25)";

            if (!picUrl || typeof picUrl !== "string") {
                hero.style.background = defaultBg;
                hero.style.boxShadow = defaultShadow;
                return;
            }

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                try {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = 30;
                    canvas.height = 30;
                    ctx.drawImage(img, 0, 0, 30, 30);
                    const p = ctx.getImageData(0, 0, 30, 30).data;
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let i = 0; i < p.length; i += 16) {
                        const cr = p[i], cg = p[i+1], cb = p[i+2], ca = p[i+3];
                        if (ca < 100) continue;
                        const br = (cr * 299 + cg * 587 + cb * 114) / 1000;
                        if (br > 235 || br < 20) continue;
                        r += cr; g += cg; b += cb; count++;
                    }
                    if (count > 0) {
                        r = Math.round(r / count);
                        g = Math.round(g / count);
                        b = Math.round(b / count);
                        const darkR = Math.max(10, r - 35);
                        const darkG = Math.max(15, g - 35);
                        const darkB = Math.max(30, b - 45);
                        hero.style.background = `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${darkR}, ${darkG}, ${darkB}) 100%)`;
                        hero.style.boxShadow = `0 12px 30px rgba(${r}, ${g}, ${b}, 0.28)`;
                        return;
                    }
                } catch (e) {
                    // Fallback to default reference palette
                }
                hero.style.background = defaultBg;
                hero.style.boxShadow = defaultShadow;
            };
            img.onerror = function() {
                hero.style.background = defaultBg;
                hero.style.boxShadow = defaultShadow;
            };
            img.src = picUrl;
        }

        applyAdaptiveProfileTheme(picture);
        // Save candidate info for instructions and exam pages
        localStorage.setItem("candidateInfo", JSON.stringify({
            name: name,
            registerNumber: userId,
            email: email,
            role: role,
            picture: picture,
            examCombination: candidateCombo,
            subject: candidateCombo,
            exam: "UGC NET Mock Test 01"
        }));

        renderTests();

    } catch (error) {

        console.error("Dashboard loading error:", error);

        pageMessage.textContent =
            "Unable to connect to the server. Please refresh the page.";
    }
}

/* -----------------------------------------------------
   PROFILE DROPDOWN CONTROLS
   ----------------------------------------------------- */

function openProfileDropdown() {
    if (!profileDropdownMenu) return;
    profileDropdownMenu.classList.add("open");
    if (topAvatarButton) {
        topAvatarButton.classList.add("active");
        topAvatarButton.setAttribute("aria-expanded", "true");
    }
}

function closeProfileDropdown() {
    if (!profileDropdownMenu) return;
    profileDropdownMenu.classList.remove("open");
    if (topAvatarButton) {
        topAvatarButton.classList.remove("active");
        topAvatarButton.setAttribute("aria-expanded", "false");
    }
}

function toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    const isOpen = profileDropdownMenu && profileDropdownMenu.classList.contains("open");
    if (isOpen) {
        closeProfileDropdown();
    } else {
        openProfileDropdown();
    }
}

if (topAvatarButton) {
    topAvatarButton.addEventListener("click", toggleProfileDropdown);
}

// Close dropdown on click outside
document.addEventListener("click", (e) => {
    if (!profileDropdownMenu || !topAvatarButton) return;
    if (!profileDropdownMenu.contains(e.target) && !topAvatarButton.contains(e.target)) {
        closeProfileDropdown();
    }
});

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeProfileDropdown();
        closeLogoutModal();
    }
});

/* -----------------------------------------------------
   LOGOUT WITH CONFIRMATION MODAL
   ----------------------------------------------------- */

function openLogoutModal() {
    closeProfileDropdown();
    if (logoutConfirmModal) {
        logoutConfirmModal.classList.add("show");
        logoutConfirmModal.setAttribute("aria-hidden", "false");
    }
}

function closeLogoutModal() {
    if (logoutConfirmModal) {
        logoutConfirmModal.classList.remove("show");
        logoutConfirmModal.setAttribute("aria-hidden", "true");
    }
}

if (dropdownLogoutButton) {
    dropdownLogoutButton.addEventListener("click", openLogoutModal);
}

if (cancelLogoutButton) {
    cancelLogoutButton.addEventListener("click", closeLogoutModal);
}

if (logoutCloseIconButton) {
    logoutCloseIconButton.addEventListener("click", closeLogoutModal);
}

if (logoutConfirmModal) {
    logoutConfirmModal.addEventListener("click", (e) => {
        if (e.target === logoutConfirmModal) closeLogoutModal();
    });
}

if (confirmLogoutButton) {
    confirmLogoutButton.addEventListener("click", async () => {
        confirmLogoutButton.disabled = true;
        confirmLogoutButton.textContent = "Logging out...";

        try {
            const response = await fetch("/api/logout", {
                method: "POST",
                credentials: "same-origin"
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Logout failed.");
            }

            window.location.replace("login");

        } catch (error) {
            alert("Logout error: " + error.message);
            confirmLogoutButton.disabled = false;
            confirmLogoutButton.textContent = "Log out";
        }
    });
}

/* -----------------------------------------------------
   SEARCH AND FILTER
   ----------------------------------------------------- */

if (searchInput) {
    searchInput.addEventListener("input", renderTests);
}
if (statusFilter) {
    statusFilter.addEventListener("change", () => {
        currentHomeFilter = statusFilter.value || "all";
        homeFilterChips.forEach(c => {
            if (c.getAttribute("data-home-filter") === currentHomeFilter) {
                c.classList.add("active");
            } else {
                c.classList.remove("active");
            }
        });
        renderTests();
    });
}

/* -----------------------------------------------------
   GRID / LIST VIEW TOGGLE (WITH ROTATION)
   ----------------------------------------------------- */

function setDashboardView(isGrid) {
    if (!viewToggleButton) return;

    if (availableCarouselTrack) availableCarouselTrack.classList.toggle("is-grid-mode", isGrid);
    if (upcomingCarouselTrack) upcomingCarouselTrack.classList.toggle("is-grid-mode", isGrid);
    viewToggleButton.classList.toggle("is-list", isGrid);

    const label = isGrid ? "Switch to Horizontal Carousel" : "Switch to Grid view";
    viewToggleButton.title = label;
    viewToggleButton.setAttribute("aria-label", label);

    localStorage.setItem("slogonPreferredView", isGrid ? "list" : "grid");
}

if (viewToggleButton) {
    viewToggleButton.addEventListener("click", () => {
        const isCurrentlyGrid = availableCarouselTrack
            ? availableCarouselTrack.classList.contains("is-grid-mode")
            : false;
        setDashboardView(!isCurrentlyGrid);
    });

    // Restore saved view preference
    const savedView = localStorage.getItem("slogonPreferredView");
    if (savedView === "list") {
        setDashboardView(true);
    }
}

/* -----------------------------------------------------
   SIDEBAR NAVIGATION
   ----------------------------------------------------- */

examinationsNav.addEventListener("click", showExaminations);
helpNav.addEventListener("click", showHelp);

/* -----------------------------------------------------
   MOBILE NAVIGATION DRAWER (OPTION A)
   ----------------------------------------------------- */

const mobileMenuButton = document.getElementById("mobileMenuButton");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const mobileSidebarEl = document.getElementById("sidebar") || document.querySelector(".sidebar");

function openMobileDrawer() {
    if (mobileSidebarEl) mobileSidebarEl.classList.add("open");
    if (sidebarBackdrop) sidebarBackdrop.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeMobileDrawer() {
    if (mobileSidebarEl) mobileSidebarEl.classList.remove("open");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
    document.body.style.overflow = "";
}

if (mobileMenuButton) mobileMenuButton.addEventListener("click", openMobileDrawer);
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeMobileDrawer);
if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileDrawer);

document.querySelectorAll(".sidebar .nav-link").forEach(link => {
    link.addEventListener("click", () => {
        if (window.innerWidth <= 900) {
            closeMobileDrawer();
        }
    });
});

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileSidebarEl && mobileSidebarEl.classList.contains("open")) {
        closeMobileDrawer();
    }
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && mobileSidebarEl && mobileSidebarEl.classList.contains("open")) {
        closeMobileDrawer();
    }
});

/* =====================================================
   MOBILE BOTTOM TAB BAR NAVIGATION (HOME, SEARCH, PROFILE, LEADERBOARD)
   ===================================================== */

const tabHomeBtn = document.getElementById("tabHomeBtn");
const tabSearchBtn = document.getElementById("tabSearchBtn");
const tabProfileBtn = document.getElementById("tabProfileBtn");
const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");

const mobileSearchSection = document.getElementById("searchSection");
const mobileProfileSection = document.getElementById("profileSection");
const mobileLeaderboardSection = document.getElementById("leaderboardSection");

function switchStudentTab(tabName) {
    const tabMap = {
        home: { btn: tabHomeBtn, section: examSection },
        search: { btn: tabSearchBtn, section: mobileSearchSection },
        profile: { btn: tabProfileBtn, section: mobileProfileSection },
        leaderboard: { btn: tabLeaderboardBtn, section: mobileLeaderboardSection }
    };

    Object.keys(tabMap).forEach(key => {
        const item = tabMap[key];
        if (item.btn) {
            if (key === tabName) {
                item.btn.classList.add("active");
            } else {
                item.btn.classList.remove("active");
            }
        }
        if (item.section) {
            item.section.style.display = (key === tabName) ? "block" : "none";
        }
    });

    if (helpSection) helpSection.style.display = "none";
    if (examinationsNav) {
        if (tabName === "home") examinationsNav.classList.add("active");
        else examinationsNav.classList.remove("active");
    }

    // Automatically clear search input and reset filter when switching to other tabs
    if (tabName !== "search") {
        const searchInput = document.getElementById("mobileQuestionSearchInput");
        const clearBtn = document.getElementById("clearQuestionSearchBtn");
        if (searchInput) searchInput.value = "";
        if (clearBtn) clearBtn.style.display = "none";
        currentSearchFilter = "all";
        const filterChips = document.querySelectorAll(".search-filter-chip");
        filterChips.forEach(c => {
            if (c.getAttribute("data-filter") === "all") c.classList.add("active");
            else c.classList.remove("active");
        });
    }

    if (tabName === "home") {
        pageTitle.textContent = "Examinations";
        pageSubtitle.textContent = "Browse your available examinations and choose a test to begin.";
    } else if (tabName === "search") {
        pageTitle.textContent = "Question Papers";
        pageSubtitle.textContent = "Search and launch full examination question papers.";
        if (typeof performQuestionPaperSearch === "function") {
            performQuestionPaperSearch();
        }
    } else if (tabName === "profile") {
        pageTitle.textContent = "Candidate Profile";
        pageSubtitle.textContent = "View your registered credentials and examination details.";
    } else if (tabName === "leaderboard") {
        pageTitle.textContent = "Exam Leaderboard";
        pageSubtitle.textContent = "Candidate performance standings ordered by scores.";
        if (typeof loadLeaderboard === "function") {
            loadLeaderboard();
        }
    }

    document.body.classList.toggle("in-home-tab", tabName === "home");
    document.body.classList.toggle("in-search-tab", tabName === "search");
    document.body.classList.toggle("in-leaderboard-tab", tabName === "leaderboard");
    document.body.classList.toggle("in-profile-tab", tabName === "profile");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

if (tabHomeBtn) tabHomeBtn.addEventListener("click", () => switchStudentTab("home"));
if (tabSearchBtn) tabSearchBtn.addEventListener("click", () => switchStudentTab("search"));
if (tabProfileBtn) tabProfileBtn.addEventListener("click", () => switchStudentTab("profile"));
if (tabLeaderboardBtn) tabLeaderboardBtn.addEventListener("click", () => switchStudentTab("leaderboard"));

const mobileProfileLogoutBtn = document.getElementById("mobileProfileLogoutBtn");
if (mobileProfileLogoutBtn) {
    mobileProfileLogoutBtn.addEventListener("click", openLogoutModal);
}

const profileContactUsBtn = document.getElementById("profileContactUsBtn");
if (profileContactUsBtn) {
    profileContactUsBtn.addEventListener("click", () => {
        window.location.href = "mailto:contact@slogonacademy.com?subject=SLOGON%20Academy%20Candidate%20Support";
    });
}

const profileHelpBtn = document.getElementById("profileHelpBtn");
if (profileHelpBtn) {
    profileHelpBtn.addEventListener("click", () => {
        showHelp();
    });
}

// 4 Quick Action Buttons on Profile (matching reference screenshots 2, 3, 4, 5)
const profileQuickExamBtn = document.getElementById("profileQuickExamBtn");
if (profileQuickExamBtn) {
    profileQuickExamBtn.addEventListener("click", () => {
        switchStudentTab("home");
    });
}

const profileQuickRanksBtn = document.getElementById("profileQuickRanksBtn");
if (profileQuickRanksBtn) {
    profileQuickRanksBtn.addEventListener("click", () => {
        switchStudentTab("leaderboard");
    });
}

const profileQuickContactBtn = document.getElementById("profileQuickContactBtn");
if (profileQuickContactBtn) {
    profileQuickContactBtn.addEventListener("click", () => {
        if (profileContactUsBtn) profileContactUsBtn.click();
    });
}

const profileQuickHelpBtn = document.getElementById("profileQuickHelpBtn");
if (profileQuickHelpBtn) {
    profileQuickHelpBtn.addEventListener("click", () => {
        if (profileHelpBtn) profileHelpBtn.click();
    });
}

// Quick action tooltips: show on tap/click and automatically disappear after exactly 2 seconds
let quickTooltipTimeout = null;

function triggerQuickTooltip(item) {
    if (!item) return;

    if (quickTooltipTimeout) {
        clearTimeout(quickTooltipTimeout);
        quickTooltipTimeout = null;
    }

    document.querySelectorAll(".quick-action-item").forEach(other => {
        other.classList.remove("active-tooltip");
    });

    item.classList.add("active-tooltip");

    quickTooltipTimeout = setTimeout(() => {
        item.classList.remove("active-tooltip");
        const btn = item.querySelector("button");
        if (btn) btn.blur();
    }, 2000);
}

document.querySelectorAll(".quick-action-item").forEach(item => {
    item.addEventListener("click", () => {
        triggerQuickTooltip(item);
    });
});

// Dismiss any active tooltip immediately when tapping anywhere else
document.addEventListener("click", (e) => {
    if (!e.target.closest(".quick-action-item")) {
        if (quickTooltipTimeout) {
            clearTimeout(quickTooltipTimeout);
            quickTooltipTimeout = null;
        }
        document.querySelectorAll(".quick-action-item").forEach(el => {
            el.classList.remove("active-tooltip");
            const btn = el.querySelector("button");
            if (btn) btn.blur();
        });
    }
});

const profileNavBackBtn = document.getElementById("profileNavBackBtn");
if (profileNavBackBtn) {
    profileNavBackBtn.addEventListener("click", () => {
        switchStudentTab("home");
    });
}

/* =====================================================
   SEARCH QUESTION PAPERS & EXAM SETS (EXACT SKELETON)
   ===================================================== */

const mobileQuestionSearchInput = document.getElementById("mobileQuestionSearchInput");
const clearQuestionSearchBtn = document.getElementById("clearQuestionSearchBtn");
const paperSearchResults = document.getElementById("paperSearchResults");
let questionPaperSearchTimeout = null;
let currentSearchFilter = "all";

function performQuestionPaperSearch() {
    const rawQuery = mobileQuestionSearchInput ? mobileQuestionSearchInput.value.trim().toLowerCase() : "";
    if (clearQuestionSearchBtn) {
        clearQuestionSearchBtn.style.display = rawQuery ? "flex" : "none";
    }
    if (!paperSearchResults) return;

    // Filter by query and active filter chip (All / Available / Upcoming)
    const matches = mockTests.filter(test => {
        // Status filter
        const isAvailable = test.status === "available";
        if (currentSearchFilter === "available" && !isAvailable) return false;
        if (currentSearchFilter === "upcoming" && isAvailable) return false;

        // Query filter
        if (rawQuery) {
            const title = String(test.title || "").toLowerCase();
            const id = String(test.id || "").toLowerCase();
            const subj = String(test.subject || "").toLowerCase();
            return title.includes(rawQuery) || id.includes(rawQuery) || subj.includes(rawQuery);
        }
        return true;
    });

    matches.sort((a, b) => {
        const isAvailA = a.status === "available" ? 1 : 0;
        const isAvailB = b.status === "available" ? 1 : 0;
        if (isAvailA !== isAvailB) return isAvailB - isAvailA;
        const idA = String(a.id || "").trim();
        const idB = String(b.id || "").trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Update counter label
    const countLabel = document.getElementById("searchAssessmentCount");
    if (countLabel) {
        countLabel.textContent = `Showing ${matches.length} of ${mockTests.length} assessments`;
    }

    paperSearchResults.innerHTML = "";
    if (matches.length === 0) {
        paperSearchResults.innerHTML = `
            <div class="paper-search-empty">
                <strong>No result found</strong>
                <p style="margin: 6px 0 0; font-size: 12.5px; color: #64748B;">Try adjusting your search query or filter</p>
            </div>
        `;
        return;
    }

    matches.forEach(test => {
        const isAvailable = test.status === "available";
        const testNum = String(test.id || "01").replace(/\D/g, "");
        const testCode = `TEST ${testNum.padStart(2, "0")}`;
        const qCount = test.questionsCount || test.questions_count || 150;
        const dur = test.duration || 180;
        const subj = test.subject || "General Paper";
        const marks = test.totalMarks || (qCount * 2);

        const card = document.createElement("article");
        card.className = "assessment-card";

        // Header (TEST 02 pill + AVAILABLE badge)
        const header = document.createElement("div");
        header.className = "assessment-card-header";

        const codePill = document.createElement("span");
        codePill.className = "assessment-test-code";
        codePill.textContent = testCode;

        const statusBadge = document.createElement("span");
        statusBadge.className = isAvailable ? "assessment-status-badge available" : "assessment-status-badge upcoming";
        statusBadge.innerHTML = `<span class="assessment-status-dot"></span>${isAvailable ? "AVAILABLE" : "UPCOMING"}`;

        header.append(codePill, statusBadge);

        // Title
        const title = document.createElement("h2");
        title.className = "assessment-title";
        title.textContent = test.title;

        // Description
        const desc = document.createElement("p");
        desc.className = "assessment-desc";
        desc.textContent = isAvailable
            ? `Complete ${qCount}-question ${subj} simulation.`
            : "This examination will be available once its question bank is configured.";

        // Metrics row
        const metrics = document.createElement("div");
        metrics.className = "assessment-metrics";
        [`${qCount} Qs`, `${dur} Mins`, `${marks} Marks`].forEach(txt => {
            const pill = document.createElement("span");
            pill.className = "assessment-metric-pill";
            pill.textContent = txt;
            metrics.appendChild(pill);
        });

        // Start button
        const startBtn = document.createElement("button");
        startBtn.type = "button";
        startBtn.className = isAvailable ? "assessment-start-btn" : "assessment-start-btn is-disabled";
        startBtn.disabled = !isAvailable;
        startBtn.innerHTML = isAvailable
            ? `<span>Start Examination</span> <span style="font-size: 16px;">&rarr;</span>`
            : `<span>Coming Soon</span>`;

        if (isAvailable) {
            const launchExam = () => {
                const testIdClean = String(test.id || "MOCK01").toLowerCase();
                localStorage.setItem("selectedMockTest", testIdClean);
                localStorage.setItem("selectedTestDetails", JSON.stringify({
                    id: test.id,
                    title: test.title,
                    subject: subj,
                    duration: dur,
                    questionsCount: qCount
                }));
                localStorage.setItem("examDuration", String(dur * 60));
                localStorage.setItem("currentExamTitle", test.title);
                localStorage.setItem("currentExamSubject", subj);
                window.location.href = "instructions";
            };

            card.style.cursor = "pointer";
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("title", `Click to start ${test.title}`);
            card.addEventListener("click", launchExam);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    launchExam();
                }
            });
            startBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                launchExam();
            });
        }

        card.append(header, title, desc, metrics, startBtn);
        paperSearchResults.appendChild(card);
    });
}

if (mobileQuestionSearchInput) {
    mobileQuestionSearchInput.addEventListener("input", () => {
        clearTimeout(questionPaperSearchTimeout);
        questionPaperSearchTimeout = setTimeout(performQuestionPaperSearch, 180);
    });
}

if (clearQuestionSearchBtn) {
    clearQuestionSearchBtn.addEventListener("click", () => {
        if (mobileQuestionSearchInput) {
            mobileQuestionSearchInput.value = "";
            performQuestionPaperSearch();
            mobileQuestionSearchInput.focus();
        }
    });
}

// Bind filter chips (All, Available, Upcoming)
const filterChips = document.querySelectorAll(".search-filter-chip");
filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        filterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentSearchFilter = chip.getAttribute("data-filter") || "all";
        performQuestionPaperSearch();
    });
});

/* -----------------------------------------------------
   LIVE LEADERBOARD RENDERING
   ----------------------------------------------------- */

function renderLeaderboard(entries) {
    const container = document.getElementById("leaderboardItemsContainer");
    const list = Array.isArray(entries) ? entries : [];

    [1, 2, 3].forEach((pos, idx) => {
        const entry = list[idx];
        const avatarEl = document.getElementById(`podiumAvatar${pos}`);
        const nameEl = document.getElementById(`podiumName${pos}`);
        const testEl = document.getElementById(`podiumTest${pos}`);
        const scoreEl = document.getElementById(`podiumScore${pos}`);

        if (entry) {
            if (avatarEl) avatarEl.textContent = entry.initials || "ST";
            if (nameEl) nameEl.textContent = entry.name || "Candidate";
            if (testEl) testEl.textContent = entry.testTitle || "Mock Test";
            if (scoreEl) {
                scoreEl.textContent = `${entry.obtainedMarks} / ${entry.totalMarks} `;
                const pctSpan = document.createElement("span");
                pctSpan.className = "score-pct";
                pctSpan.textContent = `(${Math.round(entry.percentage)}%)`;
                scoreEl.appendChild(pctSpan);
            }
        } else {
            if (avatarEl) avatarEl.textContent = "—";
            if (nameEl) nameEl.textContent = "—";
            if (testEl) testEl.textContent = "No attempt yet";
            if (scoreEl) scoreEl.textContent = "—";
        }
    });

    if (!container) return;
    container.innerHTML = "";

    if (list.length === 0) {
        const emptyCard = document.createElement("div");
        emptyCard.className = "leader-card";
        const info = document.createElement("div");
        info.className = "leader-info";
        const title = document.createElement("strong");
        title.className = "leader-name";
        title.textContent = "No examination results yet";
        const sub = document.createElement("span");
        sub.className = "leader-test-tag";
        sub.textContent = "Complete an examination to appear on the leaderboard.";
        info.append(title, sub);
        emptyCard.appendChild(info);
        container.appendChild(emptyCard);
        return;
    }

    list.forEach((entry) => {
        const card = document.createElement("div");
        card.className = entry.isCurrentUser ? "leader-card is-current-user" : "leader-card";

        const rankNum = document.createElement("span");
        rankNum.className = "leader-rank-num";
        rankNum.textContent = String(entry.rank);

        const avatar = document.createElement("div");
        const topClass = entry.isCurrentUser
            ? "avatar-top-user"
            : (entry.rank <= 3 ? `avatar-top-${entry.rank}` : "avatar-top-5");
        avatar.className = `leader-avatar ${topClass}`;
        avatar.textContent = entry.initials || "ST";

        const info = document.createElement("div");
        info.className = "leader-info";
        if (entry.isCurrentUser) {
            const nameWrap = document.createElement("div");
            nameWrap.className = "leader-name-wrap";
            const nameStrong = document.createElement("strong");
            nameStrong.className = "leader-name";
            nameStrong.textContent = entry.name || "Student";
            const youPill = document.createElement("span");
            youPill.className = "badge-you-pill";
            youPill.textContent = "YOU";
            nameWrap.append(nameStrong, youPill);
            info.appendChild(nameWrap);
        } else {
            const nameStrong = document.createElement("strong");
            nameStrong.className = "leader-name";
            nameStrong.textContent = entry.name || "Candidate";
            info.appendChild(nameStrong);
        }
        const testTag = document.createElement("span");
        testTag.className = "leader-test-tag";
        testTag.textContent = entry.testTitle || "Mock Test";
        info.appendChild(testTag);

        const stats = document.createElement("div");
        stats.className = "leader-stats";
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "leader-score";
        const zap = document.createElement("span");
        zap.className = "zap-icon";
        zap.textContent = "⚡";
        scoreSpan.append(zap, document.createTextNode(` ${entry.obtainedMarks} / ${entry.totalMarks}`));

        const mins = Math.max(1, Math.round((entry.timeTakenSeconds || 0) / 60));
        const metaSub = document.createElement("span");
        metaSub.className = "leader-meta-sub";
        metaSub.textContent = `${Math.round(entry.percentage)}% • ${mins}m`;

        stats.append(scoreSpan, metaSub);
        card.append(rankNum, avatar, info, stats);
        container.appendChild(card);
    });
}

async function loadLeaderboard() {
    try {
        const res = await fetch("/api/student/leaderboard", {
            credentials: "same-origin"
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
            renderLeaderboard(data.entries || []);
        }
    } catch (err) {
        console.warn("Could not load leaderboard:", err);
    }
}

/* -----------------------------------------------------
   4-SLIDE HERO CARD CAROUSEL
   ----------------------------------------------------- */

function initHeroCardCarousel() {
    const track = document.getElementById("heroCarouselTrack");
    const dotsWrap = document.getElementById("heroCarouselDots");
    const prevBtn = document.getElementById("heroPrevBtn");
    const nextBtn = document.getElementById("heroNextBtn");
    if (!track || !dotsWrap) return;

    const realSlides = Array.from(track.querySelectorAll(".hero-slide-card"));
    const dots = Array.from(dotsWrap.querySelectorAll(".hero-carousel-dot"));
    const realCount = realSlides.length;
    if (realCount < 2) return;

    function makeClone(slideEl) {
        const clone = slideEl.cloneNode(true);
        clone.removeAttribute("id");
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("tabindex", "-1");
        clone.querySelectorAll("[id]").forEach(el => {
            el.setAttribute("data-mirror-id", el.id);
            el.removeAttribute("id");
        });
        return clone;
    }

    // Prepend clone of last slide, append clones of first two slides for seamless circular loop
    const headClone = makeClone(realSlides[realCount - 1]);
    const tailClone0 = makeClone(realSlides[0]);
    const tailClone1 = makeClone(realSlides[1]);

    track.insertBefore(headClone, realSlides[0]);
    track.appendChild(tailClone0);
    track.appendChild(tailClone1);

    // Sync live stat counts into cloned Slide 1 whenever updated
    ["heroActiveCount", "heroUpcomingCount", "heroTotalCount"].forEach(statId => {
        const src = document.getElementById(statId);
        if (!src) return;
        const syncMirror = () => {
            track.querySelectorAll(`[data-mirror-id="${statId}"]`).forEach(m => {
                m.textContent = src.textContent;
            });
        };
        syncMirror();
        new MutationObserver(syncMirror).observe(src, { childList: true, characterData: true, subtree: true });
    });

    const allCards = Array.from(track.querySelectorAll(".hero-slide-card"));
    // Track layout: [clone(last), real(0), real(1), ..., real(N-1), clone(0), clone(1)]
    let trackIdx = 1;
    let isProgrammatic = false;
    let snapTimeout = null;

    function getRealIdx(tIdx) {
        return ((tIdx - 1) % realCount + realCount) % realCount;
    }

    let cachedHalfW = track.clientWidth / 2;
    let cachedMaxDist = Math.max(260, track.clientWidth * 0.72);
    let cachedCenters = [];

    function measureTrackLayout() {
        cachedHalfW = track.clientWidth / 2;
        cachedMaxDist = Math.max(260, track.clientWidth * 0.72);
        cachedCenters = allCards.map(c => c.offsetLeft + c.offsetWidth / 2);
    }
    measureTrackLayout();
    window.addEventListener("resize", measureTrackLayout, { passive: true });

    function getCenterOffset(idx) {
        if (!cachedCenters.length) measureTrackLayout();
        return Math.max(0, (cachedCenters[idx] || 0) - cachedHalfW);
    }

    function applyDepthScales(scrollLeftPos) {
        const viewCenter = scrollLeftPos + cachedHalfW;
        for (let i = 0; i < allCards.length; i++) {
            const norm = Math.min(1, Math.abs(viewCenter - cachedCenters[i]) / cachedMaxDist);
            const scale = 1.03 - norm * 0.21;
            const opacity = 1 - norm * 0.28;
            const card = allCards[i];
            card.style.transform = `translate3d(0,0,0) scale(${scale.toFixed(3)})`;
            card.style.opacity = opacity.toFixed(3);
            const shouldBeActive = norm < 0.35;
            if (card.classList.contains("is-active") !== shouldBeActive) {
                card.classList.toggle("is-active", shouldBeActive);
            }
        }
    }

    function updateActiveClasses(tIdx) {
        const rIdx = getRealIdx(tIdx);
        allCards.forEach((c, i) => c.classList.toggle("is-active", i === tIdx));
        dots.forEach((d, i) => d.classList.toggle("active", i === rIdx));
    }

    function jumpInstantTo(tIdx) {
        trackIdx = tIdx;
        measureTrackLayout();
        const targetLeft = getCenterOffset(trackIdx);
        track.style.scrollBehavior = "auto";
        track.scrollLeft = targetLeft;
        updateActiveClasses(trackIdx);
        applyDepthScales(targetLeft);
        requestAnimationFrame(() => {
            track.style.scrollBehavior = "";
        });
    }

    let animRaf = null;

    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    function goToTrackIndex(targetTrackIdx) {
        clearTimeout(snapTimeout);
        if (animRaf) cancelAnimationFrame(animRaf);

        measureTrackLayout();
        trackIdx = Math.max(0, Math.min(allCards.length - 1, targetTrackIdx));
        const rIdx = getRealIdx(trackIdx);
        dots.forEach((d, i) => d.classList.toggle("active", i === rIdx));
        isProgrammatic = true;

        const startLeft = track.scrollLeft;
        const targetLeft = getCenterOffset(trackIdx);
        const distance = targetLeft - startLeft;
        const duration = 950;
        let startTime = null;

        // Disable snap, CSS smooth, and CSS transform transition during rAF glide
        track.style.scrollSnapType = "none";
        track.style.scrollBehavior = "auto";
        allCards.forEach(c => { c.style.transition = "none"; });

        function step(now) {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const currentLeft = startLeft + distance * easeInOutQuart(progress);
            track.scrollLeft = currentLeft;
            applyDepthScales(currentLeft);

            if (progress < 1) {
                animRaf = requestAnimationFrame(step);
            } else {
                animRaf = null;
                track.style.scrollSnapType = "";
                track.style.scrollBehavior = "";
                allCards.forEach(c => { c.style.transition = ""; });
                isProgrammatic = false;
                if (trackIdx === 0) {
                    jumpInstantTo(realCount);
                } else if (trackIdx >= realCount + 1) {
                    jumpInstantTo(trackIdx - realCount);
                } else {
                    updateActiveClasses(trackIdx);
                    applyDepthScales(track.scrollLeft);
                }
            }
        }

        animRaf = requestAnimationFrame(step);
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            goToTrackIndex(trackIdx - 1);
            restartAutoPlay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            goToTrackIndex(trackIdx + 1);
            restartAutoPlay();
        });
    }

    allCards.forEach((card, idx) => {
        card.addEventListener("click", () => {
            if (idx !== trackIdx) {
                goToTrackIndex(idx);
                restartAutoPlay();
            } else if (getRealIdx(idx) === 2) {
                const ranksTab = document.getElementById("tabLeaderboardBtn");
                if (ranksTab && window.innerWidth <= 900) {
                    ranksTab.click();
                }
            }
        });
    });

    dots.forEach((dot, rIdx) => {
        dot.addEventListener("click", () => {
            // If currently on last slide and clicking dot 0, move forward rightward!
            if (getRealIdx(trackIdx) === realCount - 1 && rIdx === 0) {
                goToTrackIndex(realCount + 1);
            } else {
                goToTrackIndex(rIdx + 1);
            }
            restartAutoPlay();
        });
    });

    let autoTimer = null;
    let isPaused = false;

    function startAutoPlay() {
        clearInterval(autoTimer);
        autoTimer = setInterval(() => {
            if (isPaused || document.hidden) return;
            // Always advance forward to the right (circular)
            goToTrackIndex(trackIdx + 1);
        }, 5200);
    }

    function restartAutoPlay() {
        startAutoPlay();
    }

    track.addEventListener("mouseenter", () => { isPaused = true; });
    track.addEventListener("mouseleave", () => { isPaused = false; });
    track.addEventListener("touchstart", () => {
        isPaused = true;
        if (animRaf) {
            cancelAnimationFrame(animRaf);
            animRaf = null;
            track.style.scrollSnapType = "";
            track.style.scrollBehavior = "";
            allCards.forEach(c => { c.style.transition = ""; });
            isProgrammatic = false;
        }
    }, { passive: true });
    track.addEventListener("touchend", () => { isPaused = false; restartAutoPlay(); }, { passive: true });

    let scrollTimer = null;
    let scrollRaf = null;
    track.addEventListener("scroll", () => {
        if (isProgrammatic) return;
        if (!scrollRaf) {
            scrollRaf = requestAnimationFrame(() => {
                scrollRaf = null;
                applyDepthScales(track.scrollLeft);
            });
        }
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            measureTrackLayout();
            const center = track.scrollLeft + cachedHalfW;
            let closestIdx = 1;
            let closestDist = Infinity;
            for (let idx = 0; idx < cachedCenters.length; idx++) {
                const dist = Math.abs(center - cachedCenters[idx]);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = idx;
                }
            }
            if (closestIdx === 0) {
                jumpInstantTo(realCount);
            } else if (closestIdx >= realCount + 1) {
                jumpInstantTo(closestIdx - realCount);
            } else {
                trackIdx = closestIdx;
                updateActiveClasses(trackIdx);
                applyDepthScales(track.scrollLeft);
            }
        }, 160);
    }, { passive: true });

    // Start centered on real Slide 1 (index 1) so Slide 4 peeks on the left and Slide 2 on the right
    requestAnimationFrame(() => jumpInstantTo(1));
    startAutoPlay();
}

/* -----------------------------------------------------
   TOP BAR NOTIFICATIONS BELL & MODAL
   ----------------------------------------------------- */

function initNotificationsBell() {
    const bellBtns = Array.from(document.querySelectorAll(".hero-bell-btn"));
    const bellDots = Array.from(document.querySelectorAll(".hero-bell-dot"));
    const modal = document.getElementById("notificationsModal");
    const listEl = document.getElementById("notificationsList");
    const metaEl = document.getElementById("notifModalMeta");
    const closeBtn = document.getElementById("closeNotificationsBtn");
    const closeXBtn = document.getElementById("notifCloseXBtn");
    const modalCard = modal ? modal.querySelector(".notif-modal-card") : null;

    if (bellBtns.length === 0 || !modal || !listEl) return;

    function getAlertsSafe() {
        try {
            return JSON.parse(localStorage.getItem("slogonUpcomingAlerts") || "[]");
        } catch {
            return [];
        }
    }

    function buildNotificationItems() {
        const items = [];
        const availableTests = (typeof mockTests !== "undefined" ? mockTests : []).filter(t => t.status === "available");
        const alertIds = getAlertsSafe();

        availableTests.forEach(test => {
            const qCount = test.questionsCount || test.questions_count || 150;
            const dur = test.duration || 180;
            items.push({
                tag: "Live",
                title: `${test.title || "Mock Exam"} is Available`,
                desc: `${test.subject || "General Paper"} · ${qCount} Questions · ${dur} mins. Ready to attempt now.`,
                targetId: "availableExamsSection",
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
            });
        });

        if (alertIds.length > 0) {
            items.push({
                tag: "Alert On",
                title: `${alertIds.length} Upcoming Exam ${alertIds.length === 1 ? "Reminder" : "Reminders"} Active`,
                desc: "You will be notified here as soon as your alerted upcoming mock sets unlock.",
                targetId: "upcomingExamsSection",
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`
            });
        }

        items.push({
            tag: "Study",
            title: "Study Material Modules Ready",
            desc: "Browse Paper 1 & Paper 2 unit guides, grammar references, and quick revision notes.",
            targetId: "studyMaterialSection",
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
        });

        return items;
    }

    function renderNotifications() {
        const items = buildNotificationItems();
        if (metaEl) {
            metaEl.textContent = `${items.length} active ${items.length === 1 ? "notification" : "notifications"}`;
        }
        listEl.innerHTML = items.map(item => `
            <button type="button" class="notif-item" data-scroll-target="${item.targetId || ""}">
                <span class="notif-item-icon" aria-hidden="true">${item.icon}</span>
                <span class="notif-item-body">
                    <span class="notif-item-top">
                        <strong class="notif-item-title">${item.title}</strong>
                        <span class="notif-item-tag">${item.tag}</span>
                    </span>
                    <p class="notif-item-desc">${item.desc}</p>
                </span>
            </button>
        `).join("");

        listEl.querySelectorAll(".notif-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetId = btn.getAttribute("data-scroll-target");
                closeNotifications();
                if (targetId) {
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                }
            });
        });
    }

    function openNotifications(triggerBtn) {
        if (triggerBtn) {
            triggerBtn.classList.remove("is-ringing");
            void triggerBtn.offsetWidth;
            triggerBtn.classList.add("is-ringing");
        }
        renderNotifications();
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        bellDots.forEach(dot => dot.classList.add("is-hidden"));
    }

    function closeNotifications() {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }

    bellBtns.forEach(btn => {
        btn.addEventListener("click", () => openNotifications(btn));
    });
    if (closeBtn) closeBtn.addEventListener("click", closeNotifications);
    if (closeXBtn) closeXBtn.addEventListener("click", closeNotifications);
    modal.addEventListener("click", (e) => {
        if (!modalCard || !modalCard.contains(e.target)) {
            closeNotifications();
        }
    });
    document.addEventListener("pointerdown", (e) => {
        if (!modal.classList.contains("show")) return;
        const clickedInsideCard = modalCard && modalCard.contains(e.target);
        const clickedBell = e.target.closest && e.target.closest(".hero-bell-btn");
        if (!clickedInsideCard && !clickedBell) {
            closeNotifications();
        }
    }, true);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) {
            closeNotifications();
        }
    });
}

/* -----------------------------------------------------
   INITIALIZE DASHBOARD
   ----------------------------------------------------- */

document.body.classList.add("in-home-tab");
initHeroCardCarousel();
initNotificationsBell();
loadCandidate();
loadStudentTests();
loadLeaderboard();

