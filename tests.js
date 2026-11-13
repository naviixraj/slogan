"use strict";

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
    status: i === 0 ? "available" : "coming"
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
                    duration: t.duration
                }));
                const existingIds = new Set(dbTests.map(t => t.id.toUpperCase()));
                const upcoming = mockTests.filter(m => !existingIds.has(m.id.toUpperCase()));
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

        ["150 Questions", "Paper 1 + Paper 2", "180 Minutes"].forEach(text => {
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
            start.addEventListener("click", () => {

                // Store the selected examination.
                localStorage.setItem("selectedMockTest", "mock01");

                // Continue to the examination instructions.
                window.location.href = "instructions.html";

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
            window.location.replace("login.html");
            return;
        }

        const name = result.candidate.name || "Student";
        const userId = result.candidate.userId || "";
        const role = result.candidate.role || "Student";
        const email = result.candidate.email || `${userId}@slogon.edu`;

        const tag = initials(name);

        candidateName.textContent = name;
        candidateAvatar.textContent = tag;
        topAvatar.textContent = tag;

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

            window.location.replace("login.html");

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
   INITIALIZE DASHBOARD
   ----------------------------------------------------- */

loadCandidate();
loadStudentTests();

