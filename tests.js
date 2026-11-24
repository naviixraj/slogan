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

const testGrid = document.getElementById("testGrid");
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
    const filter = currentHomeFilter || (statusFilter ? statusFilter.value : "all");

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

    testGrid.innerHTML = "";

    resultCount.textContent =
        `Showing ${matches.length} of ${mockTests.length} examinations`;

    if (!matches.length) {
        testGrid.innerHTML =
            '<div class="empty">No examinations match your search.</div>';
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
        testGrid.appendChild(card);
    });
}

// Wire Home filter chips (All, Available, Upcoming)
const homeFilterChips = document.querySelectorAll(".home-filter-chip");
homeFilterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        homeFilterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        currentHomeFilter = chip.getAttribute("data-home-filter") || "all";
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
            if (pic && typeof pic === "string" && pic.startsWith("http")) {
                elem.innerHTML = `<img src="${pic}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${text}';">`;
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

searchInput.addEventListener("input", renderTests);
statusFilter.addEventListener("change", renderTests);

/* -----------------------------------------------------
   GRID / LIST VIEW TOGGLE (WITH ROTATION)
   ----------------------------------------------------- */

function setDashboardView(isList) {
    if (!testGrid || !viewToggleButton) return;

    testGrid.classList.toggle("list-view", isList);
    viewToggleButton.classList.toggle("is-list", isList);

    const label = isList ? "Switch to Grid view" : "Switch to List view";
    viewToggleButton.title = label;
    viewToggleButton.setAttribute("aria-label", label);

    localStorage.setItem("slogonPreferredView", isList ? "list" : "grid");
}

if (viewToggleButton) {
    viewToggleButton.addEventListener("click", () => {
        const isCurrentlyList = testGrid.classList.contains("list-view");
        setDashboardView(!isCurrentlyList);
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
    }

    if (tabName === "profile") {
        document.body.classList.add("in-profile-tab");
    } else {
        document.body.classList.remove("in-profile-tab");
    }

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

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
   INITIALIZE DASHBOARD
   ----------------------------------------------------- */

loadCandidate();
loadStudentTests();

