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
        const res = await fetch("/api/student/tests");
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.tests) && data.tests.length > 0) {
                const dbTests = data.tests.map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status || "available",
                    subject: t.subject,
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

function renderTests() {

    const term = searchInput.value.trim().toLowerCase();
    const filter = statusFilter.value;

    const matches = mockTests.filter(test => {

        const matchesSearch =
            test.title.toLowerCase().includes(term) ||
            test.id.toLowerCase().includes(term);

        const matchesFilter =
            filter === "all" ||
            (filter === "coming" && test.status === "coming") ||
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

        const card = document.createElement("article");
        card.className = "test-card";

        const accent = document.createElement("div");
        accent.className = "accent";

        const body = document.createElement("div");
        body.className = "card-body";

        const top = document.createElement("div");
        top.className = "card-top";

        const code = document.createElement("span");
        code.className = "test-code";
        code.textContent = `EXAM ${test.id}`;

        const status = document.createElement("span");
        status.className = isAvailable
    ? "status available"
    : "status coming";
        status.textContent = isAvailable ? "AVAILABLE" : "COMING SOON";

        top.append(code, status);

        const title = document.createElement("h2");
        title.textContent = test.title;

        const description = document.createElement("p");
        description.textContent = isAvailable
            ? "Ready to begin. Complete the instructions before starting your examination."
            : "This examination will be available once its question bank is ready.";

        const meta = document.createElement("div");
        meta.className = "meta";

        const qCount = test.questionsCount || test.questions_count || 150;
        const subj = test.subject || "General Paper";
        const dur = test.duration || 180;

        [`${qCount} Questions`, subj, `${dur} Minutes`].forEach(text => {
            const item = document.createElement("span");
            item.textContent = text;
            meta.appendChild(item);
        });

        const start = document.createElement("button");
        start.className = "start";
        start.type = "button";
        start.disabled = !isAvailable;

        start.textContent = isAvailable
            ? "START EXAMINATION"
            : "COMING SOON";

        if (isAvailable) {
            const launchExam = () => {
                // Store the selected examination details
                const testIdClean = String(test.id || "MOCK01").toLowerCase();
                localStorage.setItem("selectedMockTest", testIdClean);
                localStorage.setItem("selectedTestDetails", JSON.stringify({
                    id: test.id,
                    title: test.title,
                    subject: subj,
                    duration: dur,
                    questionsCount: qCount
                }));
                // Set exact exam duration in seconds
                localStorage.setItem("examDuration", String(dur * 60));
                localStorage.setItem("currentExamTitle", test.title);
                localStorage.setItem("currentExamSubject", subj);

                // Continue to the examination instructions.
                window.location.href = "instructions";
            };

            // Enable whole-card clicking across grid and list views
            card.classList.add("is-clickable");
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

            start.addEventListener("click", (e) => {
                e.stopPropagation();
                launchExam();
            });
        }

        body.append(top, title, description, meta, start);
        card.append(accent, body);

        testGrid.appendChild(card);
    });
}

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
    helpSection.style.display = "block";

    helpNav.classList.add("active");
    examinationsNav.classList.remove("active");

    pageTitle.textContent = "Help";
    pageSubtitle.textContent =
        "Find information about your candidate account and mock examinations.";
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

        // Save candidate info for instructions and exam pages
        localStorage.setItem("candidateInfo", JSON.stringify({
            name: name,
            registerNumber: userId,
            email: email,
            role: role,
            picture: picture,
            subject: "Tamil",
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

/* -----------------------------------------------------
   INITIALIZE DASHBOARD
   ----------------------------------------------------- */

loadCandidate();
loadStudentTests();

