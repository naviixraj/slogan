"use strict";

// If opened via VS Code Live Server (port 5500/5501/etc.), auto-redirect to the Express server on port 3000
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    if (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "5502") {
        window.location.replace(`http://localhost:3000${window.location.pathname}${window.location.search}`);
    }
}

/* =====================================================
   SLOGON ACADEMY - MASTER ADMINISTRATOR PORTAL
   File: admin.js
   Architecture: Exact Match to Student Portal (tests.js)
   ===================================================== */

// Active State
let activeSets = [];

// -----------------------------------------------------
// DOM ELEMENTS
// -----------------------------------------------------

// Sidebar Nav
const questionsNav = document.getElementById("questionsNav");
const helpNav = document.getElementById("helpNav");

// Workspaces
const examSection = document.getElementById("examSection");
const helpSection = document.getElementById("helpSection");

// Sets Directory vs Question Inspector
const setsDirectoryView = document.getElementById("setsDirectoryView");
const questionsInspectorView = document.getElementById("questionsInspectorView");
const backToSetsButton = document.getElementById("backToSetsButton");
const inspectorQuestionsContainer = document.getElementById("inspectorQuestionsContainer");
const inspectorMetaBadge = document.getElementById("inspectorMetaBadge");

// Bulk Delete In-Place Topbar Controls & Selection State
const bulkDeleteBinButton = document.getElementById("bulkDeleteBinButton");
const bulkBinCountBadge = document.getElementById("bulkBinCountBadge");
const bulkCancelButton = document.getElementById("bulkCancelButton");

let currentInspectedSetId = null;
let currentInspectedQuestions = [];
let selectedQuestionNumbers = new Set();
let didLongPress = false;
let touchTimer = null;
let touchStartX = 0;
let touchStartY = 0;

// Reorder & Drag State
let draggedCard = null;
let isDraggingQuestion = false;
let isGroupDrag = false;
let reorderToastTimer = null;
let touchDragActive = false;
let autoScrollRaf = null;
let autoScrollSpeed = 0;

// Headings
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

// Catalog Toolbar
const testGrid = document.getElementById("testGrid");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const resultCount = document.getElementById("resultCount");
const viewToggleButton = document.getElementById("viewToggleButton");

// Upload Modal
const openUploadModalButton = document.getElementById("openUploadModalButton");
const uploadModal = document.getElementById("uploadModal");
const closeUploadModalButton = document.getElementById("closeUploadModalButton");
const cancelUploadButton = document.getElementById("cancelUploadButton");
const submitUploadButton = document.getElementById("submitUploadButton");
const setFileInput = document.getElementById("setFileInput");
const dropBoxArea = document.getElementById("dropBoxArea");
const uploadExamTitle = document.getElementById("uploadExamTitle");
const uploadSubject = document.getElementById("uploadSubject");
const uploadDuration = document.getElementById("uploadDuration");

// Rich Selected File Card
const selectedFileCard = document.getElementById("selectedFileCard");
const fileTypeBadge = document.getElementById("fileTypeBadge");
const fileCardName = document.getElementById("fileCardName");
const fileCardSize = document.getElementById("fileCardSize");
const changeFileBtn = document.getElementById("changeFileBtn");


// Edit Question Set Modal
const editSetModal = document.getElementById("editSetModal");
const closeEditSetModalButton = document.getElementById("closeEditSetModalButton");
const cancelEditSetButton = document.getElementById("cancelEditSetButton");
const saveSetDetailsButton = document.getElementById("saveSetDetailsButton");
const editSetId = document.getElementById("editSetId");
const editSetTitle = document.getElementById("editSetTitle");
const editSetSubject = document.getElementById("editSetSubject");
const editSetDuration = document.getElementById("editSetDuration");
const editSetFromInspectorButton = document.getElementById("editSetFromInspectorButton");

// Edit Single Question Modal
const editQuestionModal = document.getElementById("editQuestionModal");
const closeEditQuestionModalButton = document.getElementById("closeEditQuestionModalButton");
const cancelEditQuestionButton = document.getElementById("cancelEditQuestionButton");
const saveQuestionButton = document.getElementById("saveQuestionButton");
const editQuestionModalTitle = document.getElementById("editQuestionModalTitle");
const editQuestionSetId = document.getElementById("editQuestionSetId");
const editQuestionNum = document.getElementById("editQuestionNum");
const editQuestionStatement = document.getElementById("editQuestionStatement");
const editOptA = document.getElementById("editOptA");
const editOptB = document.getElementById("editOptB");
const editOptC = document.getElementById("editOptC");
const editOptD = document.getElementById("editOptD");
const editCorrectAnswer = document.getElementById("editCorrectAnswer");
const editExplanation = document.getElementById("editExplanation");

// Topbar Profile & Logout
const topAvatarButton = document.getElementById("topAvatarButton");
const profileDropdownWrapper = document.getElementById("profileDropdownWrapper");
const dropdownLogoutButton = document.getElementById("dropdownLogoutButton");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const cancelLogoutButton = document.getElementById("cancelLogoutButton");
const confirmLogoutButton = document.getElementById("confirmLogoutButton");
const logoutCloseIconButton = document.getElementById("logoutCloseIconButton");

// Profile tags
const sidebarName = document.getElementById("sidebarName");
const sidebarAvatar = document.getElementById("sidebarAvatar");
const topAvatar = document.getElementById("topAvatar");
const dropdownAvatar = document.getElementById("dropdownAvatar");
const dropdownCandidateName = document.getElementById("dropdownCandidateName");
const dropdownUserId = document.getElementById("dropdownUserId");
const dropdownRole = document.getElementById("dropdownRole");
const dropdownEmail = document.getElementById("dropdownEmail");

// -----------------------------------------------------
// NAVIGATION WORKSPACES
// -----------------------------------------------------

function setActiveNav(activeBtn) {
    [questionsNav, helpNav].forEach(btn => {
        if (btn) btn.classList.remove("active");
    });
    if (activeBtn) activeBtn.classList.add("active");
}

/**
 * Universal Search Bar Reset Standard
 * Erases query string and restores full unfiltered dataset.
 * @param {HTMLInputElement} inputEl 
 * @param {Function} renderFn 
 */
function resetSearchBar(inputEl, renderFn) {
    if (inputEl) {
        const hadValue = inputEl.value !== "";
        inputEl.value = "";
        if (hadValue && typeof renderFn === "function") {
            renderFn();
        }
    }
}

function showQuestionsSection() {
    setActiveNav(questionsNav);
    resetSearchBar(searchInput, renderSets);
    if (examSection) examSection.style.display = "block";
    if (helpSection) helpSection.style.display = "none";
    backToSets();
}

function showHelpSection() {
    setActiveNav(helpNav);
    resetSearchBar(searchInput, renderSets);
    if (examSection) examSection.style.display = "none";
    if (helpSection) helpSection.style.display = "block";
    if (pageTitle) pageTitle.textContent = "Administrator Help";
    if (pageSubtitle) pageSubtitle.textContent = "Guidance on Excel question formats, auto-splitting, and paper stream assignments.";
}

// -----------------------------------------------------
// PROFILE DROPDOWN & LOGOUT
// -----------------------------------------------------

function toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    if (profileDropdownWrapper) {
        profileDropdownWrapper.classList.toggle("open");
    }
}

function openLogoutModal() {
    if (profileDropdownWrapper) profileDropdownWrapper.classList.remove("open");
    if (logoutConfirmModal) logoutConfirmModal.classList.add("open");
}

function closeLogoutModal() {
    if (logoutConfirmModal) logoutConfirmModal.classList.remove("open");
}

async function confirmLogout() {
    try {
        await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch (e) {}
    window.location.replace("login");
}

// -----------------------------------------------------
// DASHBOARD VIEW TOGGLE (GRID / LIST)
// -----------------------------------------------------

function setDashboardView(isList) {
    if (!testGrid || !viewToggleButton) return;
    testGrid.classList.toggle("list-view", isList);
    viewToggleButton.classList.toggle("is-list", isList);
    const label = isList ? "Switch to Grid view" : "Switch to List view";
    viewToggleButton.title = label;
    viewToggleButton.setAttribute("aria-label", label);
    try { localStorage.setItem("adminViewMode", isList ? "list" : "grid"); } catch (e) {}
}

function toggleDashboardView() {
    if (!testGrid) return;
    const isCurrentlyList = testGrid.classList.contains("list-view");
    setDashboardView(!isCurrentlyList);
}

// -----------------------------------------------------
// MODAL CONTROLS
// -----------------------------------------------------

function openModal(modalEl) {
    if (modalEl) modalEl.classList.add("open");
}

function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove("open");
}

// -----------------------------------------------------
// RENDER QUESTION SETS
// -----------------------------------------------------

function renderSets() {
    const availableExamsSection = document.getElementById("availableExamsSection");
    const availableCarouselTrack = document.getElementById("availableCarouselTrack");
    const availableCountBadge = document.getElementById("availableCountBadge");
    const availableCarouselControls = document.getElementById("availableCarouselControls");
    const availableCarouselDots = document.getElementById("availableCarouselDots");
    const availablePrevBtn = document.getElementById("availablePrevBtn");
    const availableNextBtn = document.getElementById("availableNextBtn");

    const upcomingExamsSection = document.getElementById("upcomingExamsSection");
    const upcomingCarouselTrack = document.getElementById("upcomingCarouselTrack");
    const upcomingCountBadge = document.getElementById("upcomingCountBadge");
    const upcomingCarouselControls = document.getElementById("upcomingCarouselControls");
    const upcomingCarouselDots = document.getElementById("upcomingCarouselDots");
    const upcomingPrevBtn = document.getElementById("upcomingPrevBtn");
    const upcomingNextBtn = document.getElementById("upcomingNextBtn");

    const emptySetsState = document.getElementById("emptySetsState");

    if (!availableCarouselTrack && !testGrid) return;

    const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const filter = statusFilter ? statusFilter.value : "all";

    const matches = activeSets.filter(s => {
        const titleStr = (s.title || "").toLowerCase();
        const idStr = (s.id || "").toLowerCase();
        const subjStr = (s.subject || "").toLowerCase();
        const matchesSearch = titleStr.includes(term) || idStr.includes(term) || subjStr.includes(term);
        const fileType = (s.file_type || s.fileType || "").toLowerCase();
        const matchesFilter = filter === "all" || fileType === filter || (filter === "excel" && (fileType === "xlsx" || fileType === "xls"));
        return matchesSearch && matchesFilter;
    });

    // Sort question sets in sequential order (SET01, SET02, SET03, ...)
    matches.sort((a, b) => {
        const idA = String(a.id || "").trim();
        const idB = String(b.id || "").trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

    if (resultCount) {
        resultCount.textContent = `Showing ${matches.length} of ${activeSets.length} question sets`;
    }
    const adminHeroSetCount = document.getElementById("adminHeroSetCount");
    const adminHeroQCount = document.getElementById("adminHeroQCount");
    if (adminHeroSetCount) adminHeroSetCount.textContent = String(activeSets.length);
    if (adminHeroQCount) {
        const totalQs = activeSets.reduce((sum, s) => {
            const c = s.questions_count !== undefined ? s.questions_count : (s.questionsCount || (s.questions ? s.questions.length : 0));
            return sum + (Number(c) || 0);
        }, 0);
        adminHeroQCount.textContent = String(totalQs);
    }

    const isSetAvailable = (s) => {
        const relVal = s.releaseAt || s.release_at || null;
        const relMs = relVal ? Date.parse(relVal) : NaN;
        const isScheduledFuture = !Number.isNaN(relMs) && relMs > Date.now();
        return s.status !== "coming" && !isScheduledFuture;
    };

    const availableList = matches.filter(isSetAvailable);
    const upcomingList = matches.filter(s => !isSetAvailable(s));

    if (availableCountBadge) {
        availableCountBadge.textContent = `${availableList.length} ${availableList.length === 1 ? "EXAM" : "EXAMS"}`;
    }
    if (upcomingCountBadge) {
        upcomingCountBadge.textContent = `${upcomingList.length} ${upcomingList.length === 1 ? "EXAM" : "EXAMS"}`;
    }
    if (emptySetsState) {
        emptySetsState.style.display = matches.length === 0 ? "block" : "none";
    }
    if (availableExamsSection) {
        availableExamsSection.style.display = availableList.length > 0 ? "block" : "none";
    }
    if (upcomingExamsSection) {
        upcomingExamsSection.style.display = upcomingList.length > 0 ? "block" : "none";
    }

    const buildAdminActionButtons = (set) => {
        const row = document.createElement("div");
        row.className = "admin-card-footer-row";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "admin-card-icon-btn";
        editBtn.title = `Edit details for "${set.title}"`;
        editBtn.setAttribute("aria-label", `Edit details for "${set.title}"`);
        editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditSetModal(set);
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "admin-card-icon-btn is-delete";
        delBtn.title = `Delete Question Set "${set.title}"`;
        delBtn.setAttribute("aria-label", `Delete Question Set "${set.title}"`);
        delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSet(set.id);
        });

        row.append(editBtn, delBtn);
        return row;
    };

    const buildAvailableCard = (set) => {
        const qCount = set.questions_count !== undefined ? set.questions_count : (set.questionsCount || (set.questions ? set.questions.length : 0));
        const dur = set.duration || 180;
        const subj = set.subject || "All";
        const codeLabel = `EXAM ${String(set.id || "SET01").toUpperCase()}`;

        const card = document.createElement("article");
        card.className = "avail-exam-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("title", `Inspect questions in "${set.title}"`);

        card.innerHTML = `
            <svg class="avail-card-watermark" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <rect x="16" y="16" width="52" height="64" rx="7" fill="none" stroke="#6E1226" stroke-width="5"/>
                <path d="M31 16v-2a4 4 0 0 1 4-4h2a6 6 0 0 1 10 0h2a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3H34a3 3 0 0 1-3-3Z" fill="#FDF7F1" stroke="#6E1226" stroke-width="4.5" stroke-linejoin="round"/>
                <path d="M26 32l3.5 3.5 5.5-6" stroke="#6E1226" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M26 43l3.5 3.5 5.5-6" stroke="#6E1226" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M26 54l3.5 3.5 5.5-6" stroke="#6E1226" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M26 65l3.5 3.5 5.5-6" stroke="#6E1226" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M40 33h17M40 44h17M40 55h17M40 66h12" stroke="#6E1226" stroke-width="4.2" stroke-linecap="round"/>
                <circle cx="67" cy="69" r="19" fill="#FDF7F1"/>
                <circle cx="67" cy="69" r="15.5" fill="#FDF7F1" stroke="#6E1226" stroke-width="4.8"/>
                <path d="M60.5 69.5l4.5 4.5 8.5-9" stroke="#6E1226" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
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
        title.textContent = set.title;

        const desc = document.createElement("p");
        desc.className = "avail-card-desc";
        desc.textContent = "Published and live for students. Inspect or manage questions below.";

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

        const inspectBtn = document.createElement("button");
        inspectBtn.type = "button";
        inspectBtn.className = "avail-start-btn";
        inspectBtn.innerHTML = `<span>▶ INSPECT QUESTIONS &rarr;</span>`;
        inspectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            inspectSet(set.id);
        });

        inner.append(metricsGrid, inspectBtn);
        card.append(top, body, inner, buildAdminActionButtons(set));

        card.addEventListener("click", (e) => {
            if (e.target.closest(".admin-card-icon-btn")) return;
            inspectSet(set.id);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inspectSet(set.id);
            }
        });
        return card;
    };

    const buildUpcomingCard = (set, idx) => {
        const qCount = set.questions_count !== undefined ? set.questions_count : (set.questionsCount || (set.questions ? set.questions.length : 0));
        const dur = set.duration || 180;
        const subj = set.subject || "All";
        const codeLabel = `EXAM ${String(set.id || "SET01").toUpperCase()}`;
        const indexLabel = String(idx + 1).padStart(2, "0");

        const card = document.createElement("article");
        card.className = "upcoming-exam-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("title", `Inspect upcoming questions in "${set.title}"`);

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
        title.textContent = set.title;

        const desc = document.createElement("p");
        desc.className = "upcoming-card-desc";
        const relVal = set.releaseAt || set.release_at;
        if (relVal) {
            const relDate = new Date(relVal);
            const relLabel = Number.isNaN(relDate.getTime())
                ? ""
                : relDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
            desc.textContent = relLabel
                ? `Scheduled release: ${relLabel}. Inspect or edit questions before launch.`
                : "Scheduled for upcoming release. Inspect or edit questions before launch.";
        } else {
            desc.textContent = "Scheduled for upcoming release. Inspect or edit questions before launch.";
        }

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

        const inspectBtn = document.createElement("button");
        inspectBtn.type = "button";
        inspectBtn.className = "avail-start-btn";
        inspectBtn.innerHTML = `<span>▶ INSPECT QUESTIONS &rarr;</span>`;
        inspectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            inspectSet(set.id);
        });

        card.append(top, title, desc, statBoxes, inspectBtn, buildAdminActionButtons(set));

        card.addEventListener("click", (e) => {
            if (e.target.closest(".admin-card-icon-btn")) return;
            inspectSet(set.id);
        });
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inspectSet(set.id);
            }
        });
        return card;
    };

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

        trackEl.onscroll = syncControls;

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
}

// -----------------------------------------------------
// INSPECT SPLIT QUESTIONS
// -----------------------------------------------------

async function inspectSet(setId) {
    try {
        currentInspectedSetId = setId;
        clearSelection();

        if (setsDirectoryView) setsDirectoryView.style.display = "none";
        if (questionsInspectorView) questionsInspectorView.style.display = "block";

        let set = activeSets.find(s => s.id === setId);

        if (pageTitle) pageTitle.textContent = (set && set.title) || "Examination Questions";
        if (pageSubtitle) pageSubtitle.textContent = "Loading single split questions from database...";
        if (inspectorQuestionsContainer) {
            inspectorQuestionsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--muted); font-size: 13px;">⏳ Loading all single split questions from database...</div>';
        }

        try {
            const res = await fetch(`/api/admin/sets/${setId}`, { credentials: "same-origin" });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.set) {
                    set = data.set;
                }
            } else if (res.status === 401 || res.status === 403) {
                alert("Session expired. Please log in as Master Administrator.");
                window.location.replace("login?next=admin");
                return;
            } else {
                const res2 = await fetch(`/api/mock-tests/${setId}/questions`, { credentials: "same-origin" });
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (data2.success && Array.isArray(data2.questions)) {
                        set = {
                            id: setId,
                            title: data2.testTitle || (set && set.title) || "UGC NET Full-Length Mock Test 01",
                            fileName: "mock01.json",
                            fileType: "json",
                            questionsCount: data2.questions.length,
                            duration: 180,
                            questions: data2.questions
                        };
                    }
                }
            }
        } catch (e) {
            console.log("Error loading questions:", e);
        }

        if (!set) return;

        const qList = set.questions || [];
        currentInspectedQuestions = qList;
        const fName = set.file_name || set.fileName || "mock01.json";
        const badge = (set.file_type || set.fileType || "JSON").toUpperCase();

        if (pageTitle) pageTitle.textContent = set.title;
        if (pageSubtitle) pageSubtitle.textContent = `File: ${fName} • ${qList.length} single split questions. (Click to select for bulk delete, or hold & drag to reorder)`;
        if (inspectorMetaBadge) inspectorMetaBadge.textContent = `${badge} • Duration: ${set.duration || 180} Mins • Total ${qList.length} Questions`;

        if (inspectorQuestionsContainer) {
            if (qList.length === 0) {
                inspectorQuestionsContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--muted);">No split questions found in this set.</div>';
            } else {
                inspectorQuestionsContainer.innerHTML = qList.map((q, idx) => {
                    const esc = (v) => String(v ?? "")
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");

                    const qNum = esc(q.number || q.id || (idx + 1));
                    const setIdSafe = esc(set.id);
                    const qText = q.question || q.text || "";
                    const optA = esc(q.options?.A || "");
                    const optB = esc(q.options?.B || "");
                    const optC = esc(q.options?.C || "");
                    const optD = esc(q.options?.D || "");
                    const correct = String(q.correctAnswer || q.answer || "A").trim().toUpperCase();
                    const exp = esc(q.explanation || "No solution explanation provided.");
                    const sectionSafe = esc(q.section || "Paper 1");
                    const isSelected = selectedQuestionNumbers.has(Number(q.number || q.id || (idx + 1)));

                    const labelA = esc(q.optionLabels?.A || "A");
                    const labelB = esc(q.optionLabels?.B || "B");
                    const labelC = esc(q.optionLabels?.C || "C");
                    const labelD = esc(q.optionLabels?.D || "D");

                    return `
                        <div class="question-card ${isSelected ? 'is-selected' : ''}" data-qnum="${qNum}" data-original-qnum="${qNum}" data-setid="${setIdSafe}" draggable="true">
                            <div class="q-header">
                                <div class="q-header-left">
                                    <div class="q-drag-handle" title="Hold and drag to reorder questions" aria-label="Hold and drag to reorder">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="9" cy="5" r="2"></circle>
                                            <circle cx="15" cy="5" r="2"></circle>
                                            <circle cx="9" cy="12" r="2"></circle>
                                            <circle cx="15" cy="12" r="2"></circle>
                                            <circle cx="9" cy="19" r="2"></circle>
                                            <circle cx="15" cy="19" r="2"></circle>
                                        </svg>
                                    </div>
                                    <div class="q-select-indicator" title="Click to select for bulk deletion">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <span class="q-badge" title="Question ${qNum}">
                                        <span class="q-badge-prefix">Question </span><span class="q-badge-num">${qNum}</span>
                                    </span>
                                </div>
                                <span class="q-section-tag"><span class="q-section-full">Single Split Question • </span>${sectionSafe}</span>
                            </div>
                            <div class="q-title">${typeof window.renderNeatQuestion === "function" ? window.renderNeatQuestion(qText, q.options || { A: q.options?.A || "", B: q.options?.B || "", C: q.options?.C || "", D: q.options?.D || "" }) : esc(qText)}</div>
                            <div class="options-grid">
                                <div class="option-box ${correct === 'A' ? 'is-correct' : ''}">
                                    <span class="opt-circle">${labelA}</span>
                                    <span class="opt-text">${optA}</span>
                                    ${correct === 'A' ? '<strong class="correct-badge-tag">(Correct Answer ✓)</strong>' : ''}
                                </div>
                                <div class="option-box ${correct === 'B' ? 'is-correct' : ''}">
                                    <span class="opt-circle">${labelB}</span>
                                    <span class="opt-text">${optB}</span>
                                    ${correct === 'B' ? '<strong class="correct-badge-tag">(Correct Answer ✓)</strong>' : ''}
                                </div>
                                <div class="option-box ${correct === 'C' ? 'is-correct' : ''}">
                                    <span class="opt-circle">${labelC}</span>
                                    <span class="opt-text">${optC}</span>
                                    ${correct === 'C' ? '<strong class="correct-badge-tag">(Correct Answer ✓)</strong>' : ''}
                                </div>
                                <div class="option-box ${correct === 'D' ? 'is-correct' : ''}">
                                    <span class="opt-circle">${labelD}</span>
                                    <span class="opt-text">${optD}</span>
                                    ${correct === 'D' ? '<strong class="correct-badge-tag">(Correct Answer ✓)</strong>' : ''}
                                </div>
                            </div>
                            <div class="q-explanation">
                                <strong>💡 Solution Explanation:</strong>
                                ${exp}
                            </div>
                            <div class="q-footer">
                                <button type="button" class="btn-edit-single-q" data-setid="${setIdSafe}" data-qnum="${qNum}" title="Edit Question ${qNum}" aria-label="Edit Question ${qNum}">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="bin-btn btn-delete-single-q" data-setid="${setIdSafe}" data-qnum="${qNum}" title="Delete Question ${qNum}" aria-label="Delete Question ${qNum}">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
        alert("Could not load questions: " + err.message);
        backToSets();
    }
}

function backToSets() {
    stopAutoScroll();
    isDraggingQuestion = false;
    draggedCard = null;
    clearSelection();
    currentInspectedSetId = null;
    currentInspectedQuestions = [];
    resetSearchBar(searchInput, renderSets);
    if (questionsInspectorView) questionsInspectorView.style.display = "none";
    if (setsDirectoryView) setsDirectoryView.style.display = "block";
    if (pageTitle) pageTitle.textContent = "Examinations";
    if (pageSubtitle) pageSubtitle.textContent = "Browse your available question sets and split question banks.";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// -----------------------------------------------------
// BULK QUESTION SELECTION & DELETION LOGIC
// -----------------------------------------------------

function updateBulkActionBar() {
    const count = selectedQuestionNumbers.size;
    if (count > 0) {
        // Bulk Delete Mode active:
        // Left (black circle): Back to Sets is hidden, Bin button is shown with count badge
        if (backToSetsButton) backToSetsButton.style.display = "none";
        if (bulkDeleteBinButton) bulkDeleteBinButton.style.display = "inline-flex";
        if (bulkBinCountBadge) bulkBinCountBadge.textContent = String(count);

        // Right (red circle): Edit Details is hidden, Cancel button is shown
        if (editSetFromInspectorButton) editSetFromInspectorButton.style.display = "none";
        if (bulkCancelButton) bulkCancelButton.style.display = "inline-flex";
    } else {
        // Normal Mode:
        // Left: Back to Sets is restored, Bin button is hidden
        if (backToSetsButton) backToSetsButton.style.display = "inline-flex";
        if (bulkDeleteBinButton) bulkDeleteBinButton.style.display = "none";

        // Right: Edit Details is restored, Cancel button is hidden
        if (editSetFromInspectorButton) editSetFromInspectorButton.style.display = "inline-flex";
        if (bulkCancelButton) bulkCancelButton.style.display = "none";
    }
}

function clearSelection() {
    selectedQuestionNumbers.clear();
    if (inspectorQuestionsContainer) {
        const cards = inspectorQuestionsContainer.querySelectorAll(".question-card");
        cards.forEach(card => card.classList.remove("is-selected"));
    }
    updateBulkActionBar();
}

function isClickOnInteractiveControl(target) {
    if (!target) return false;

    // Active modal dialogs and their controls
    if (target.closest(".modal")) return true;

    // Topbar bulk action buttons (Bin button & Cancel button)
    if (target.closest("#bulkDeleteBinButton") || target.closest("#bulkCancelButton")) return true;

    // Topbar inspector navigation & edit details buttons
    if (target.closest("#backToSetsButton") || target.closest("#editSetFromInspectorButton")) return true;

    // Card-level action buttons (single delete, single edit, drag handle)
    if (target.closest(".btn-delete-single-q") || 
        target.closest(".btn-edit-single-q") || 
        target.closest(".bin-btn") || 
        target.closest(".q-drag-handle")) {
        return true;
    }

    // Profile dropdown
    if (target.closest("#profileDropdownWrapper")) return true;

    // Form inputs, textareas, selects, or modal submit buttons
    if (target.closest("input, textarea, select, button[type='submit']")) return true;

    // Mobile drawer controls and sidebar
    if (target.closest("#mobileMenuButton, #sidebarCloseBtn, #sidebarBackdrop, #sidebar")) return true;

    return false;
}

function handleUniversalOpenSpaceDeselect(e) {
    if (!selectedQuestionNumbers || selectedQuestionNumbers.size === 0) return;

    // Don't deselect if clicking interactive action controls
    if (isClickOnInteractiveControl(e.target)) return;

    // Don't deselect if clicking inside a question card (card handles its own toggle)
    if (e.target.closest(".question-card")) return;

    // Clicking ANY open space on the screen (page background, body, main, content,
    // topbar title/empty area, inspector empty canvas, sidebar, margins, headers):
    clearSelection();
}

function toggleQuestionSelection(qNum, cardEl) {
    const num = Number(qNum);
    if (!num) return;

    if (selectedQuestionNumbers.has(num)) {
        selectedQuestionNumbers.delete(num);
        if (cardEl) cardEl.classList.remove("is-selected");
    } else {
        selectedQuestionNumbers.add(num);
        if (cardEl) cardEl.classList.add("is-selected");
    }
    updateBulkActionBar();
}

async function deleteSelectedQuestions() {
    const count = selectedQuestionNumbers.size;
    if (count === 0 || !currentInspectedSetId) {
        alert("Please select at least one question to delete.");
        return;
    }

    const confirmed = confirm(`Are you sure you want to delete the ${count} selected question${count > 1 ? "s" : ""} from this set? This cannot be undone.`);
    if (!confirmed) return;

    if (bulkDeleteBinButton) {
        bulkDeleteBinButton.disabled = true;
        bulkDeleteBinButton.style.opacity = "0.5";
    }

    try {
        const res = await fetch(`/api/admin/sets/${encodeURIComponent(currentInspectedSetId)}/questions/bulk-delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ questionNumbers: Array.from(selectedQuestionNumbers) })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to bulk delete questions.");
        }

        selectedQuestionNumbers.clear();
        updateBulkActionBar();

        await inspectSet(currentInspectedSetId);
        await fetchSets();
    } catch (err) {
        alert("Bulk delete failed: " + err.message);
    } finally {
        if (bulkDeleteBinButton) {
            bulkDeleteBinButton.disabled = false;
            bulkDeleteBinButton.style.opacity = "1";
        }
    }
}

// -----------------------------------------------------
// DRAG & DROP QUESTION REORDERING LOGIC
// -----------------------------------------------------

function showReorderToast(msg = "Question order saved") {
    const toast = document.getElementById("reorderToast");
    if (!toast) return;
    const span = toast.querySelector("span");
    if (span) span.textContent = msg;
    toast.classList.add("show");
    if (reorderToastTimer) clearTimeout(reorderToastTimer);
    reorderToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function updateCardNumbersInDom() {
    if (!inspectorQuestionsContainer) return;
    const cards = inspectorQuestionsContainer.querySelectorAll(".question-card");
    cards.forEach((card, idx) => {
        const newNum = idx + 1;
        card.setAttribute("data-qnum", String(newNum));
        const numEl = card.querySelector(".q-badge-num");
        if (numEl) {
            numEl.textContent = String(newNum);
        } else {
            const badge = card.querySelector(".q-badge");
            if (badge) badge.textContent = `Question ${newNum}`;
        }
        const delBtn = card.querySelector(".btn-delete-single-q");
        if (delBtn) {
            delBtn.setAttribute("data-qnum", String(newNum));
            delBtn.setAttribute("title", `Delete Question ${newNum}`);
            delBtn.setAttribute("aria-label", `Delete Question ${newNum}`);
        }
        const editBtn = card.querySelector(".btn-edit-single-q");
        if (editBtn) {
            editBtn.setAttribute("data-qnum", String(newNum));
            editBtn.setAttribute("title", `Edit Question ${newNum}`);
            editBtn.setAttribute("aria-label", `Edit Question ${newNum}`);
        }
    });
}

async function saveQuestionOrder() {
    if (!currentInspectedSetId || !inspectorQuestionsContainer) return;
    const cards = inspectorQuestionsContainer.querySelectorAll(".question-card");
    if (cards.length === 0) return;

    // Read the current DOM sequence using original question numbers
    const orderedQuestionNumbers = Array.from(cards).map(card => {
        return Number(card.getAttribute("data-original-qnum") || card.getAttribute("data-qnum"));
    });

    // Re-index UI numbers immediately to 1, 2, 3...
    updateCardNumbersInDom();

    try {
        const res = await fetch(`/api/admin/sets/${encodeURIComponent(currentInspectedSetId)}/questions/reorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ orderedQuestionNumbers })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to save reordered questions.");
        }

        if (Array.isArray(data.questions)) {
            currentInspectedQuestions = data.questions;
            // Update data-original-qnum to reflect the saved reindexed order
            const updatedCards = inspectorQuestionsContainer.querySelectorAll(".question-card");
            updatedCards.forEach((c, idx) => {
                c.setAttribute("data-original-qnum", String(idx + 1));
                c.setAttribute("data-qnum", String(idx + 1));
            });
        }

        showReorderToast("Question sequence saved ✓");
    } catch (err) {
        console.error("Save question order failed:", err);
        showReorderToast("Failed to save order: " + err.message);
    }
}

// -----------------------------------------------------
// AUTO-SCROLL DURING DRAG & DROP (EDGE SCROLLING)
// -----------------------------------------------------

function handleDragAutoScroll(clientY) {
    if (!isDraggingQuestion) {
        stopAutoScroll();
        return;
    }

    const viewportHeight = window.innerHeight;
    const threshold = 140; // 140px zone from top or bottom of viewport

    if (clientY < threshold) {
        // Dragging near top edge -> scroll page up
        const distance = Math.max(0, threshold - clientY);
        const intensity = Math.min(1, distance / threshold);
        // Scaled speed: -6px up to -28px per animation frame
        autoScrollSpeed = -Math.round(6 + intensity * 22);
    } else if (clientY > viewportHeight - threshold) {
        // Dragging near bottom edge -> scroll page down
        const distance = Math.max(0, clientY - (viewportHeight - threshold));
        const intensity = Math.min(1, distance / threshold);
        // Scaled speed: +6px up to +28px per animation frame
        autoScrollSpeed = Math.round(6 + intensity * 22);
    } else {
        autoScrollSpeed = 0;
    }

    if (autoScrollSpeed !== 0) {
        if (!autoScrollRaf) {
            autoScrollStep();
        }
    } else {
        stopAutoScroll();
    }
}

function autoScrollStep() {
    if (autoScrollSpeed !== 0 && isDraggingQuestion) {
        window.scrollBy(0, autoScrollSpeed);
        autoScrollRaf = requestAnimationFrame(autoScrollStep);
    } else {
        stopAutoScroll();
    }
}

function stopAutoScroll() {
    autoScrollSpeed = 0;
    if (autoScrollRaf) {
        cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
    }
}


function handleFileSelected() {
    if (!setFileInput || !setFileInput.files || setFileInput.files.length === 0) {
        resetFileInputUI();
        return;
    }

    const file = setFileInput.files[0];
    const fileName = file.name;
    const parts = fileName.split(".");
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : "txt";

    // Format file size
    let formattedSize = "";
    if (file.size < 1024) {
        formattedSize = `${file.size} B`;
    } else if (file.size < 1024 * 1024) {
        formattedSize = `${(file.size / 1024).toFixed(1)} KB`;
    } else {
        formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Determine badge text and class
    let badgeText = ext.toUpperCase().slice(0, 5);
    let badgeClass = `badge-${ext}`;

    if (ext === "docx" || ext === "doc") {
        badgeText = "DOCX";
        badgeClass = "badge-docx";
    } else if (ext === "xlsx" || ext === "xls") {
        badgeText = "XLSX";
        badgeClass = "badge-xlsx";
    } else if (ext === "csv" || ext === "tsv") {
        badgeText = "CSV";
        badgeClass = "badge-csv";
    } else if (ext === "pdf") {
        badgeText = "PDF";
        badgeClass = "badge-pdf";
    } else if (ext === "json") {
        badgeText = "JSON";
        badgeClass = "badge-json";
    } else if (ext === "txt" || ext === "text" || ext === "md" || ext === "rtf") {
        badgeText = "TXT";
        badgeClass = "badge-txt";
    }

    if (fileTypeBadge) {
        fileTypeBadge.textContent = badgeText;
        fileTypeBadge.className = `file-type-badge ${badgeClass}`;
    }

    if (fileCardName) {
        fileCardName.textContent = fileName;
        fileCardName.title = fileName;
    }

    if (fileCardSize) {
        fileCardSize.textContent = formattedSize;
    }

    if (dropBoxArea) dropBoxArea.style.display = "none";
    if (selectedFileCard) selectedFileCard.style.display = "flex";
}

function resetFileInputUI() {
    if (setFileInput) setFileInput.value = "";
    if (selectedFileCard) selectedFileCard.style.display = "none";
    if (dropBoxArea) dropBoxArea.style.display = "block";
}


// -----------------------------------------------------
// SAVE QUESTION SET (FILE UPLOAD)
// -----------------------------------------------------

async function handleUploadSetSubmit() {
    const title = uploadExamTitle ? uploadExamTitle.value.trim() : "";
    const subject = uploadSubject ? uploadSubject.value.trim() : "All";
    const duration = uploadDuration ? uploadDuration.value.trim() : "180";

    if (!title) {
        alert("Please enter the Examination Display Title (how students will see it).");
        return;
    }

    const prevText = submitUploadButton ? submitUploadButton.textContent : "";

    if (!setFileInput || !setFileInput.files || setFileInput.files.length === 0) {
        alert("Please select a question file (Word, PDF, Excel, CSV, TXT, or JSON) to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject || "All");
    formData.append("duration", duration || "180");

    const releaseScheduleBtn = document.getElementById("releaseScheduleBtn");
    const uploadReleaseAt = document.getElementById("uploadReleaseAt");
    const isScheduled = releaseScheduleBtn && releaseScheduleBtn.classList.contains("active");
    if (isScheduled) {
        const rawDt = uploadReleaseAt ? uploadReleaseAt.value : "";
        const parsedMs = Date.parse(rawDt);
        if (!rawDt || Number.isNaN(parsedMs) || parsedMs <= Date.now()) {
            alert("Please select a future date and time for the scheduled release timer.");
            return;
        }
        formData.append("releaseMode", "scheduled");
        formData.append("releaseAt", new Date(parsedMs).toISOString());
    } else {
        formData.append("releaseMode", "immediate");
    }

    formData.append("file", setFileInput.files[0]);

    if (submitUploadButton) {
        submitUploadButton.disabled = true;
        submitUploadButton.textContent = "Parsing & Splitting...";
    }

    try {
        const res = await fetch("/api/admin/sets/upload", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        });

        const rawText = await res.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            if (res.status === 413) {
                throw new Error("The uploaded file exceeds the allowed payload size.");
            }
            if (res.status === 401 || res.status === 403) {
                throw new Error("Your session has expired. Please refresh the page and log in again.");
            }
            throw new Error(`Server returned unexpected response (${res.status}). Please make sure you are logged in.`);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to upload question set.");
        }

        closeModal(uploadModal);
        alert(`🎉 ${data.message}\nThis set is now immediately active and visible in the student portal!`);
        resetFileInputUI();
        await fetchSets();
    } catch (err) {
        alert("Upload failed: " + err.message);
    } finally {
        if (submitUploadButton) {
            submitUploadButton.disabled = false;
            submitUploadButton.textContent = prevText;
        }
    }
}

async function deleteSet(setId) {
    if (!confirm(`Are you sure you want to delete Question Set "${setId}"? This will remove all its split questions.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/sets/${setId}`, {
            method: "DELETE",
            credentials: "same-origin"
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to delete set.");
        }
        await fetchSets();
    } catch (err) {
        activeSets = activeSets.filter(s => s.id !== setId);
        renderSets();
    }
}

async function deleteSingleQuestion(setId, qNum) {
    if (!confirm(`Are you sure you want to delete Question ${String(qNum).padStart(2, '0')}?`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/sets/${encodeURIComponent(setId)}/questions/${qNum}`, {
            method: "DELETE",
            credentials: "same-origin"
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to delete question.");
        }

        await inspectSet(setId);
        await fetchSets();
    } catch (err) {
        alert("Failed to delete question: " + err.message);
    }
}


// -----------------------------------------------------
// SERVER SYNC
// -----------------------------------------------------

async function loadAdminProfile() {
    try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (!res.ok) {
            window.location.replace("login?next=admin");
            return;
        }

        const data = await res.json();
        if (!data.success || !data.candidate) {
            window.location.replace("login?next=admin");
            return;
        }

        if (data.candidate.role !== "Admin") {
            alert("Access restricted: You are currently signed in as a student candidate. Redirecting to Candidate Examination Dashboard.");
            window.location.replace("tests");
            return;
        }

        const name = data.candidate.name || "Master Administrator";
        const id = data.candidate.userId || "admin";
        const role = data.candidate.role || "Admin";
        const email = data.candidate.email || "admin@slogon.edu";

        if (sidebarName) sidebarName.textContent = name;
        if (dropdownCandidateName) dropdownCandidateName.textContent = name;
        if (dropdownUserId) dropdownUserId.textContent = id;
        if (dropdownRole) dropdownRole.textContent = role;
        if (dropdownEmail) dropdownEmail.textContent = email;

        const inits = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "MA";
        const picture = data.candidate.picture || "";

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

        renderAvatar(sidebarAvatar, picture, inits);
        renderAvatar(topAvatar, picture, inits);
        renderAvatar(dropdownAvatar, picture, inits);

        const adminMobileName = document.getElementById("adminMobileName");
        const adminMobileEmail = document.getElementById("adminMobileEmail");
        const adminMobileId = document.getElementById("adminMobileId");
        const adminMobileRole = document.getElementById("adminMobileRole");
        const adminMobileAvatar = document.getElementById("adminMobileAvatar");
        if (adminMobileName) adminMobileName.textContent = name;
        if (adminMobileEmail) adminMobileEmail.textContent = email;
        if (adminMobileId) adminMobileId.textContent = id;
        if (adminMobileRole) adminMobileRole.textContent = role;
        renderAvatar(adminMobileAvatar, picture, inits);
    } catch (e) {
        console.log("Profile verification error:", e);
        window.location.replace("login?next=admin");
    }
}

async function fetchSets() {
    try {
        const res = await fetch("/api/admin/sets", { credentials: "same-origin" });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.sets) && data.sets.length > 0) {
                activeSets = data.sets;
                renderSets();
            }
        }
    } catch (e) {
        console.log("Sets offline");
    }
}


// -----------------------------------------------------
// EDIT QUESTION SET DETAILS
// -----------------------------------------------------

function openEditSetModal(setOrId) {
    let setObj = null;
    if (typeof setOrId === "object" && setOrId !== null) {
        setObj = setOrId;
    } else if (typeof setOrId === "string") {
        setObj = activeSets.find(s => String(s.id).toUpperCase() === String(setOrId).toUpperCase());
    }

    if (!setObj && currentInspectedSetId) {
        setObj = activeSets.find(s => String(s.id).toUpperCase() === String(currentInspectedSetId).toUpperCase());
    }

    if (!setObj) {
        alert("Unable to locate question set details.");
        return;
    }

    if (editSetId) editSetId.value = setObj.id;
    if (editSetTitle) editSetTitle.value = setObj.title || "";
    if (editSetSubject) {
        editSetSubject.value = setObj.subject || "All";
        if (!editSetSubject.value) editSetSubject.value = "All";
    }
    if (editSetDuration) editSetDuration.value = setObj.duration || 180;

    openModal(editSetModal);
}

function closeEditSetModal() {
    closeModal(editSetModal);
}

async function handleSaveSetDetails() {
    const setId = editSetId ? editSetId.value.trim() : "";
    const newTitle = editSetTitle ? editSetTitle.value.trim() : "";
    const newSubject = editSetSubject ? editSetSubject.value.trim() : "All";
    const newDuration = editSetDuration ? parseInt(editSetDuration.value, 10) : 180;

    if (!setId) {
        alert("Missing question set identifier.");
        return;
    }

    if (!newTitle) {
        alert("Examination title cannot be empty.");
        if (editSetTitle) editSetTitle.focus();
        return;
    }

    if (isNaN(newDuration) || newDuration <= 0) {
        alert("Please specify a valid time duration in minutes (e.g. 60).");
        if (editSetDuration) editSetDuration.focus();
        return;
    }

    const prevBtnText = saveSetDetailsButton ? saveSetDetailsButton.textContent : "Save Changes";
    if (saveSetDetailsButton) {
        saveSetDetailsButton.disabled = true;
        saveSetDetailsButton.textContent = "Saving...";
    }

    try {
        const res = await fetch(`/api/admin/sets/${encodeURIComponent(setId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                title: newTitle,
                subject: newSubject || "All",
                duration: newDuration
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to update question set details.");
        }

        // Update local dataset
        const targetSet = activeSets.find(s => String(s.id).toUpperCase() === String(setId).toUpperCase());
        if (targetSet) {
            targetSet.title = newTitle;
            targetSet.subject = newSubject || "All";
            targetSet.duration = newDuration;
        }

        // If currently in inspector view for this set, update page titles and metadata
        if (currentInspectedSetId && String(currentInspectedSetId).toUpperCase() === String(setId).toUpperCase()) {
            if (pageTitle) pageTitle.textContent = newTitle;
            if (pageSubtitle) {
                const count = currentInspectedQuestions ? currentInspectedQuestions.length : 0;
                pageSubtitle.textContent = `Set ${setId} • ${count} Questions • ${newDuration} Mins • ${newSubject || "General Paper"}`;
            }
        }

        closeEditSetModal();
        renderSets();
        showReorderToast("Examination details updated successfully ✓");
    } catch (err) {
        alert("Failed to save changes: " + err.message);
    } finally {
        if (saveSetDetailsButton) {
            saveSetDetailsButton.disabled = false;
            saveSetDetailsButton.textContent = prevBtnText;
        }
    }
}

// -----------------------------------------------------
// EDIT INDIVIDUAL QUESTION
// -----------------------------------------------------

function openEditQuestionModal(setId, qNum) {
    const targetQNum = Number(qNum);
    const qObj = currentInspectedQuestions.find((q, idx) => {
        const num = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
        return Number(num) === targetQNum || idx + 1 === targetQNum;
    });

    if (!qObj) {
        alert(`Question ${targetQNum} not found.`);
        return;
    }

    if (editQuestionSetId) editQuestionSetId.value = setId;
    if (editQuestionNum) editQuestionNum.value = String(targetQNum);
    if (editQuestionModalTitle) editQuestionModalTitle.textContent = `Edit Question ${String(targetQNum).padStart(2, "0")}`;

    if (editQuestionStatement) editQuestionStatement.value = qObj.question || "";
    if (editOptA) editOptA.value = qObj.options?.A || "";
    if (editOptB) editOptB.value = qObj.options?.B || "";
    if (editOptC) editOptC.value = qObj.options?.C || "";
    if (editOptD) editOptD.value = qObj.options?.D || "";

    const correct = String(qObj.correctAnswer || qObj.answer || "A").trim().toUpperCase();
    if (editCorrectAnswer) editCorrectAnswer.value = ["A", "B", "C", "D"].includes(correct) ? correct : "A";

    if (editExplanation) editExplanation.value = qObj.explanation || "";

    openModal(editQuestionModal);
}

function closeEditQuestionModal() {
    closeModal(editQuestionModal);
}

async function handleSaveQuestion() {
    const setId = editQuestionSetId ? editQuestionSetId.value.trim() : currentInspectedSetId;
    const qNum = editQuestionNum ? Number(editQuestionNum.value) : 0;
    const qStatement = editQuestionStatement ? editQuestionStatement.value.trim() : "";
    const optA = editOptA ? editOptA.value.trim() : "";
    const optB = editOptB ? editOptB.value.trim() : "";
    const optC = editOptC ? editOptC.value.trim() : "";
    const optD = editOptD ? editOptD.value.trim() : "";
    const correctAns = editCorrectAnswer ? editCorrectAnswer.value : "A";
    const explanation = editExplanation ? editExplanation.value.trim() : "";

    if (!setId || !qNum) {
        alert("Missing question identifier.");
        return;
    }

    if (!qStatement) {
        alert("Question statement cannot be empty.");
        if (editQuestionStatement) editQuestionStatement.focus();
        return;
    }

    const prevBtnText = saveQuestionButton ? saveQuestionButton.textContent : "Save Question";
    if (saveQuestionButton) {
        saveQuestionButton.disabled = true;
        saveQuestionButton.textContent = "Saving...";
    }

    try {
        const res = await fetch(`/api/admin/sets/${encodeURIComponent(setId)}/questions/${encodeURIComponent(qNum)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                question: qStatement,
                options: { A: optA, B: optB, C: optC, D: optD },
                correctAnswer: correctAns,
                explanation: explanation
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to update question.");
        }

        // Update local object in currentInspectedQuestions
        const qIndex = currentInspectedQuestions.findIndex((q, idx) => {
            const num = q.number !== undefined ? q.number : (q.id !== undefined ? q.id : idx + 1);
            return Number(num) === qNum || idx + 1 === qNum;
        });

        if (qIndex !== -1 && data.question) {
            currentInspectedQuestions[qIndex] = data.question;
        }

        closeEditQuestionModal();
        await inspectSet(setId);
        showReorderToast(`Question ${qNum} updated successfully ✓`);
    } catch (err) {
        alert("Failed to save question: " + err.message);
    } finally {
        if (saveQuestionButton) {
            saveQuestionButton.disabled = false;
            saveQuestionButton.textContent = prevBtnText;
        }
    }
}

// -----------------------------------------------------
// EVENT LISTENERS BINDING
// -----------------------------------------------------

function bindEventListeners() {
    // Navigation
    if (questionsNav) questionsNav.addEventListener("click", showQuestionsSection);
    if (helpNav) helpNav.addEventListener("click", showHelpSection);

    // Inspector & Bulk Actions
    if (backToSetsButton) backToSetsButton.addEventListener("click", backToSets);

    if (bulkDeleteBinButton) bulkDeleteBinButton.addEventListener("click", deleteSelectedQuestions);
    if (bulkCancelButton) bulkCancelButton.addEventListener("click", clearSelection);

    if (inspectorQuestionsContainer) {
        // Desktop left-click selection & single delete
        inspectorQuestionsContainer.addEventListener("click", (e) => {
            // Ignore click if user was dragging
            if (isDraggingQuestion) {
                return;
            }

            const deleteBtn = e.target.closest(".btn-delete-single-q");
            if (deleteBtn) {
                const qNum = Number(deleteBtn.getAttribute("data-qnum"));
                const setId = deleteBtn.getAttribute("data-setid");
                if (setId && qNum) {
                    deleteSingleQuestion(setId, qNum);
                }
                return;
            }

            // Single question edit
            const editBtn = e.target.closest(".btn-edit-single-q");
            if (editBtn) {
                const qNum = Number(editBtn.getAttribute("data-qnum"));
                const setId = editBtn.getAttribute("data-setid") || currentInspectedSetId;
                if (setId && qNum) {
                    openEditQuestionModal(setId, qNum);
                }
                return;
            }

            // Ignore drag handle clicks
            if (e.target.closest(".q-drag-handle")) {
                return;
            }

            if (didLongPress) {
                didLongPress = false;
                return;
            }

            const card = e.target.closest(".question-card");
            if (card) {
                const qNum = Number(card.getAttribute("data-qnum"));
                if (qNum) {
                    toggleQuestionSelection(qNum, card);
                }
            } else {
                // Clicked in the open space / blank area outside question cards: unselect all
                if (selectedQuestionNumbers.size > 0) {
                    clearSelection();
                }
            }
        });

        // -----------------------------------------------------
        // DESKTOP HTML5 DRAG & DROP REORDERING
        // -----------------------------------------------------

        inspectorQuestionsContainer.addEventListener("dragstart", (e) => {
            const card = e.target.closest(".question-card");
            if (!card) return;

            // Don't drag if initiated on action buttons
            if (e.target.closest(".btn-delete-single-q") || e.target.closest(".btn-edit-single-q") || e.target.closest(".bin-btn")) {
                e.preventDefault();
                return;
            }

            draggedCard = card;
            isDraggingQuestion = true;

            const qNum = Number(card.getAttribute("data-qnum"));
            // Check if user is dragging a card that is part of a selected multi-question group
            if (card.classList.contains("is-selected") || selectedQuestionNumbers.has(qNum)) {
                if (selectedQuestionNumbers.size > 1) {
                    isGroupDrag = true;
                } else {
                    isGroupDrag = false;
                }
            } else {
                isGroupDrag = false;
            }

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", card.getAttribute("data-qnum") || "");

            setTimeout(() => {
                if (isGroupDrag) {
                    const selectedCards = inspectorQuestionsContainer.querySelectorAll(".question-card.is-selected");
                    selectedCards.forEach(c => c.classList.add("is-dragging"));
                } else if (draggedCard) {
                    draggedCard.classList.add("is-dragging");
                }
            }, 0);
        });

        inspectorQuestionsContainer.addEventListener("dragover", (e) => {
            if (!draggedCard) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            // Trigger smooth auto-scroll when near top or bottom viewport edges
            handleDragAutoScroll(e.clientY);

            const targetCard = e.target.closest(".question-card");
            if (!targetCard || targetCard === draggedCard) return;

            // If group dragging, don't show insertion lines over other selected cards
            if (isGroupDrag && targetCard.classList.contains("is-selected")) return;

            // Clear previous hover indicators on other cards
            const allCards = inspectorQuestionsContainer.querySelectorAll(".question-card");
            allCards.forEach(c => {
                if (c !== targetCard) {
                    c.classList.remove("drag-over-above", "drag-over-below");
                }
            });

            const rect = targetCard.getBoundingClientRect();
            const mid = rect.top + rect.height / 2;
            if (e.clientY < mid) {
                targetCard.classList.add("drag-over-above");
                targetCard.classList.remove("drag-over-below");
            } else {
                targetCard.classList.add("drag-over-below");
                targetCard.classList.remove("drag-over-above");
            }
        });

        inspectorQuestionsContainer.addEventListener("dragleave", (e) => {
            const targetCard = e.target.closest(".question-card");
            if (targetCard) {
                targetCard.classList.remove("drag-over-above", "drag-over-below");
            }
        });

        inspectorQuestionsContainer.addEventListener("drop", (e) => {
            if (!draggedCard) return;
            e.preventDefault();
            stopAutoScroll();

            const targetCard = e.target.closest(".question-card");
            if (targetCard && targetCard !== draggedCard) {
                const rect = targetCard.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const isAbove = e.clientY < mid;

                if (isGroupDrag) {
                    // Move entire selected group together in their current relative order
                    const selectedCards = Array.from(inspectorQuestionsContainer.querySelectorAll(".question-card.is-selected"));
                    if (!selectedCards.includes(targetCard)) {
                        const insertRef = isAbove ? targetCard : targetCard.nextSibling;
                        selectedCards.forEach(c => {
                            inspectorQuestionsContainer.insertBefore(c, insertRef);
                        });
                        saveQuestionOrder();
                    }
                } else {
                    // Single card drop
                    if (isAbove) {
                        inspectorQuestionsContainer.insertBefore(draggedCard, targetCard);
                    } else {
                        inspectorQuestionsContainer.insertBefore(draggedCard, targetCard.nextSibling);
                    }
                    saveQuestionOrder();
                }
            }

            const allCards = inspectorQuestionsContainer.querySelectorAll(".question-card");
            allCards.forEach(c => c.classList.remove("drag-over-above", "drag-over-below", "is-dragging"));

            setTimeout(() => {
                isDraggingQuestion = false;
                isGroupDrag = false;
                draggedCard = null;
            }, 100);
        });

        inspectorQuestionsContainer.addEventListener("dragend", () => {
            stopAutoScroll();
            const allCards = inspectorQuestionsContainer.querySelectorAll(".question-card");
            allCards.forEach(c => c.classList.remove("drag-over-above", "drag-over-below", "is-dragging"));

            setTimeout(() => {
                isDraggingQuestion = false;
                isGroupDrag = false;
                draggedCard = null;
            }, 100);
        });

        // Global window drag listeners to ensure smooth scrolling anywhere in the viewport
        window.addEventListener("dragover", (e) => {
            if (isDraggingQuestion) {
                handleDragAutoScroll(e.clientY);
            }
        });

        window.addEventListener("dragend", () => {
            stopAutoScroll();
        });

        // -----------------------------------------------------
        // TOUCH & MOBILE: HOLD & MOVE REORDERING + 500ms SELECTION
        // -----------------------------------------------------

        inspectorQuestionsContainer.addEventListener("touchstart", (e) => {
            // Check if user specifically touched the drag handle
            const handle = e.target.closest(".q-drag-handle");
            if (handle) {
                const card = handle.closest(".question-card");
                if (card) {
                    touchDragActive = true;
                    isDraggingQuestion = true;
                    draggedCard = card;
                    card.classList.add("is-dragging");
                    if (navigator.vibrate) {
                        try { navigator.vibrate(40); } catch (_) {}
                    }
                }
                return;
            }

            const card = e.target.closest(".question-card");
            if (!card) {
                if (selectedQuestionNumbers.size > 0 && !isClickOnInteractiveControl(e.target)) {
                    clearSelection();
                }
                return;
            }
            if (e.target.closest(".btn-delete-single-q") || e.target.closest(".btn-edit-single-q")) return;

            didLongPress = false;
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;

            if (touchTimer) clearTimeout(touchTimer);
            touchTimer = setTimeout(() => {
                didLongPress = true;
                const qNum = Number(card.getAttribute("data-qnum"));
                if (qNum) {
                    toggleQuestionSelection(qNum, card);
                    if (navigator.vibrate) {
                        try { navigator.vibrate(50); } catch (_) {}
                    }
                }
            }, 500);
        }, { passive: false });

        inspectorQuestionsContainer.addEventListener("touchmove", (e) => {
            if (touchDragActive && draggedCard) {
                e.preventDefault(); // Prevent native scroll while reordering
                const touch = e.touches[0];
                handleDragAutoScroll(touch.clientY);
                const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetCard = elem ? elem.closest(".question-card") : null;
                if (targetCard && targetCard !== draggedCard) {
                    const rect = targetCard.getBoundingClientRect();
                    const mid = rect.top + rect.height / 2;
                    if (touch.clientY < mid) {
                        inspectorQuestionsContainer.insertBefore(draggedCard, targetCard);
                    } else {
                        inspectorQuestionsContainer.insertBefore(draggedCard, targetCard.nextSibling);
                    }
                }
                return;
            }

            if (!touchTimer) return;
            const touch = e.touches[0];
            if (Math.abs(touch.clientX - touchStartX) > 10 || Math.abs(touch.clientY - touchStartY) > 10) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: false });

        inspectorQuestionsContainer.addEventListener("touchend", () => {
            stopAutoScroll();
            if (touchDragActive && draggedCard) {
                touchDragActive = false;
                draggedCard.classList.remove("is-dragging");
                saveQuestionOrder();
                setTimeout(() => {
                    isDraggingQuestion = false;
                    draggedCard = null;
                }, 100);
                return;
            }

            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: true });

        inspectorQuestionsContainer.addEventListener("touchcancel", () => {
            stopAutoScroll();
            if (touchDragActive && draggedCard) {
                touchDragActive = false;
                draggedCard.classList.remove("is-dragging");
                setTimeout(() => {
                    isDraggingQuestion = false;
                    draggedCard = null;
                }, 100);
            }
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: true });
    }

    // Toolbar
    if (searchInput) {
        searchInput.addEventListener("input", renderSets);
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                resetSearchBar(searchInput, renderSets);
            }
        });
    }
    if (statusFilter) statusFilter.addEventListener("change", renderSets);
    if (viewToggleButton) viewToggleButton.addEventListener("click", toggleDashboardView);

    // Upload Modal
    if (openUploadModalButton) openUploadModalButton.addEventListener("click", () => openModal(uploadModal));
    if (closeUploadModalButton) closeUploadModalButton.addEventListener("click", () => {
        closeModal(uploadModal);
        resetFileInputUI();
    });
    if (cancelUploadButton) cancelUploadButton.addEventListener("click", () => {
        closeModal(uploadModal);
        resetFileInputUI();
    });
    if (submitUploadButton) submitUploadButton.addEventListener("click", handleUploadSetSubmit);

    // File Selector, Drop Box & Rich Selected Card
    if (dropBoxArea && setFileInput) {
        dropBoxArea.addEventListener("click", () => setFileInput.click());
    }
    if (setFileInput) {
        setFileInput.addEventListener("change", handleFileSelected);
    }
    if (changeFileBtn && setFileInput) {
        changeFileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setFileInput.click();
        });
    }


    // Edit Question Set Modal
    if (editSetFromInspectorButton) editSetFromInspectorButton.addEventListener("click", () => openEditSetModal(currentInspectedSetId));
    if (closeEditSetModalButton) closeEditSetModalButton.addEventListener("click", closeEditSetModal);
    if (cancelEditSetButton) cancelEditSetButton.addEventListener("click", closeEditSetModal);
    if (saveSetDetailsButton) saveSetDetailsButton.addEventListener("click", handleSaveSetDetails);

    // Edit Question Modal
    if (closeEditQuestionModalButton) closeEditQuestionModalButton.addEventListener("click", closeEditQuestionModal);
    if (cancelEditQuestionButton) cancelEditQuestionButton.addEventListener("click", closeEditQuestionModal);
    if (saveQuestionButton) saveQuestionButton.addEventListener("click", handleSaveQuestion);

    // Profile & Logout
    if (topAvatarButton) topAvatarButton.addEventListener("click", toggleProfileDropdown);
    if (dropdownLogoutButton) dropdownLogoutButton.addEventListener("click", openLogoutModal);
    if (cancelLogoutButton) cancelLogoutButton.addEventListener("click", closeLogoutModal);
    if (logoutCloseIconButton) logoutCloseIconButton.addEventListener("click", closeLogoutModal);
    if (confirmLogoutButton) confirmLogoutButton.addEventListener("click", confirmLogout);

    // Universal Open-Space Deselection across all canvas/viewport areas
    let globalTouchMoved = false;
    let globalTouchStartX = 0;
    let globalTouchStartY = 0;

    document.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 1) {
            globalTouchStartX = e.touches[0].clientX;
            globalTouchStartY = e.touches[0].clientY;
            globalTouchMoved = false;
        }
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches.length === 1) {
            const dx = Math.abs(e.touches[0].clientX - globalTouchStartX);
            const dy = Math.abs(e.touches[0].clientY - globalTouchStartY);
            if (dx > 8 || dy > 8) {
                globalTouchMoved = true;
            }
        }
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        if (globalTouchMoved) return; // User was scrolling/swiping
        handleUniversalOpenSpaceDeselect(e);
    }, { passive: true });

    document.addEventListener("click", (e) => {
        if (profileDropdownWrapper && !profileDropdownWrapper.contains(e.target)) {
            profileDropdownWrapper.classList.remove("open");
        }
        handleUniversalOpenSpaceDeselect(e);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && selectedQuestionNumbers && selectedQuestionNumbers.size > 0) {
            clearSelection();
        }
    });

    // Restore view mode preference
    try {
        const saved = localStorage.getItem("adminViewMode");
        if (saved === "list") setDashboardView(true);
    } catch (e) {}

    // Mobile Navigation Drawer (Option A)
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
}

// -----------------------------------------------------
// MOBILE 5-TAB NAVIGATION, NOTES & STUDENT RANKS
// -----------------------------------------------------

const adminNotesCatalog = [
    {
        code: "P1 NOTE 01",
        title: "Paper 1 — Teaching & Research Aptitude",
        desc: "Core concepts of learner characteristics, teaching methods, research ethics, and hypothesis design.",
        units: "Unit 1–2",
        paper: "Paper 1",
        topics: [
            "Levels of Teaching: Memory, Understanding & Reflective",
            "Research Types, Positivism & Post-Positivistic Approaches",
            "Sampling Techniques & Research Ethics Guidelines"
        ]
    },
    {
        code: "P1 NOTE 02",
        title: "Paper 1 — Reasoning, DI & Logical Fallacies",
        desc: "High-yield shortcuts for Data Interpretation, percentage tables, syllogisms, and Indian Logic.",
        units: "Unit 5–7",
        paper: "Paper 1",
        topics: [
            "Ratio, Average & Percentage Speed Tables for DI",
            "Classical Square of Opposition & Mood/Figure",
            "Indian Logic: Pramanas & Hetvabhasa Summary"
        ]
    },
    {
        code: "P1 NOTE 03",
        title: "Paper 1 — ICT, Environment & Higher Education",
        desc: "Digital initiatives, networking protocols, environmental treaties, and NEP 2020 highlights.",
        units: "Unit 8–10",
        paper: "Paper 1",
        topics: [
            "ICT Abbreviations, Memory Hierarchy & Cyber Security",
            "Kyoto Protocol, Paris Agreement & SDG Goals",
            "Ancient Indian Universities & NEP 2020 Framework"
        ]
    },
    {
        code: "P2 NOTE 01",
        title: "Paper 2 — Classical Sangam Literature",
        desc: "Comprehensive unit-wise reference covering Ettuthogai, Pathuppattu, and Sangam poetic conventions.",
        units: "Unit 1–3",
        paper: "Paper 2",
        topics: [
            "Akam & Puram Thinai Classification & Uripporul",
            "Ettuthogai Anthologies & Key Poets",
            "Pathuppattu Long Poems & Historical Context"
        ]
    },
    {
        code: "P2 NOTE 02",
        title: "Paper 2 — Tolkappiyam & Nannool Grammar",
        desc: "Structured grammar notes for Ezhuthu, Sol, Porul, Yappu, and Ani Ilakkanam rules.",
        units: "Unit 4–6",
        paper: "Paper 2",
        topics: [
            "Tolkappiyam Ezhuthathikaram & Sollathikaram Essentials",
            "Porulathikaram Meiypaadu & Uvamai",
            "Yapparunkalakkarikai & Dandi Alankaram Rules"
        ]
    },
    {
        code: "P2 NOTE 03",
        title: "Paper 2 — Bhakti, Epics & Modern Tamil",
        desc: "Revision notes on Twin Epics, Panniru Thirumurai, Nalayira Divya Prabandham, and Modern Prose.",
        units: "Unit 7–10",
        paper: "Paper 2",
        topics: [
            "Silappathikaram, Manimekalai & Kambaramayanam",
            "Saiva & Vaishnava Bhakti Literature Milestones",
            "Modern Tamil Poetry, Short Stories & Literary Criticism"
        ]
    }
];

async function loadAdminLeaderboard() {
    const itemsEl = document.getElementById("adminLeaderboardItems");
    if (!itemsEl) return;
    try {
        const res = await fetch("/api/leaderboard", { credentials: "same-origin" });
        const data = await res.json();
        const rows = (data && data.success && Array.isArray(data.leaderboard)) ? data.leaderboard : [];

        for (let r = 1; r <= 3; r++) {
            const entry = rows[r - 1];
            const av = document.getElementById(`adminPodiumAvatar${r}`);
            const nm = document.getElementById(`adminPodiumName${r}`);
            const sc = document.getElementById(`adminPodiumScore${r}`);
            if (entry) {
                const name = entry.studentName || entry.name || "Candidate";
                const inits = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "C";
                if (av) av.textContent = inits;
                if (nm) nm.textContent = name;
                if (sc) sc.textContent = `${entry.score ?? 0} / ${entry.total ?? 0}`;
            } else {
                if (av) av.textContent = "—";
                if (nm) nm.textContent = "—";
                if (sc) sc.textContent = "0 / 0";
            }
        }

        if (!rows.length) {
            itemsEl.innerHTML = `<div class="leader-card"><span style="font-size:13px; color:#5C3A3E;">No examination results yet.</span></div>`;
            return;
        }

        itemsEl.innerHTML = rows.map((entry, idx) => {
            const name = entry.studentName || entry.name || "Candidate";
            const testTitle = entry.testTitle || entry.examTitle || "Mock Test";
            const pct = entry.total ? Math.round((entry.score / entry.total) * 100) : 0;
            return `
                <div class="leader-card">
                    <div>
                        <strong style="display:block; font-size:13.5px; color:#3A010D;">#${idx + 1} &bull; ${name}</strong>
                        <span style="font-size:11.5px; color:#6E4A4E;">${testTitle}</span>
                    </div>
                    <strong style="font-size:13px; color:#5B1024;">${entry.score ?? 0}/${entry.total ?? 0} (${pct}%)</strong>
                </div>
            `;
        }).join("");
    } catch {
        itemsEl.innerHTML = `<div class="leader-card"><span style="font-size:13px; color:#5C3A3E;">Unable to load student standings right now.</span></div>`;
    }
}

function initAdminMobileTabs() {
    const tabHomeBtn = document.getElementById("tabHomeBtn");
    const tabNotesBtn = document.getElementById("tabNotesBtn");
    const tabAddQuestionBtn = document.getElementById("tabAddQuestionBtn");
    const tabRanksBtn = document.getElementById("tabRanksBtn");
    const tabProfileBtn = document.getElementById("tabProfileBtn");

    const notesSection = document.getElementById("adminNotesSection");
    const addQuestionSection = document.getElementById("adminAddQuestionSection");
    const ranksSection = document.getElementById("adminRanksSection");
    const profileSection = document.getElementById("adminProfileSection");

    const notesPaperView = document.getElementById("adminNotesPaperView");
    const notesListView = document.getElementById("adminNotesListView");
    const notesListEl = document.getElementById("adminNotesList");
    const notesBackBtn = document.getElementById("adminNotesBackBtn");
    const studyModal = document.getElementById("adminStudyModal");
    const closeStudyModalBtn = document.getElementById("closeAdminStudyModalBtn");

    const tabBtns = [tabHomeBtn, tabNotesBtn, tabAddQuestionBtn, tabRanksBtn, tabProfileBtn];

    function setActiveAdminTab(activeBtn) {
        tabBtns.forEach(b => {
            if (b) b.classList.toggle("active", b === activeBtn);
        });
    }

    function hideAllAdminSections() {
        if (examSection) examSection.style.display = "none";
        if (helpSection) helpSection.style.display = "none";
        if (notesSection) notesSection.style.display = "none";
        if (addQuestionSection) addQuestionSection.style.display = "none";
        if (ranksSection) ranksSection.style.display = "none";
        if (profileSection) profileSection.style.display = "none";
    }

    if (tabHomeBtn) {
        tabHomeBtn.addEventListener("click", () => {
            setActiveAdminTab(tabHomeBtn);
            hideAllAdminSections();
            if (examSection) examSection.style.display = "block";
            backToSets();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (tabNotesBtn) {
        tabNotesBtn.addEventListener("click", () => {
            setActiveAdminTab(tabNotesBtn);
            hideAllAdminSections();
            if (notesSection) notesSection.style.display = "block";
            const addPanel = document.getElementById("adminAddNotePanel");
            const listPanel = document.getElementById("adminManageNotesPanel");
            const addTab = document.getElementById("adminNoteTabAddBtn");
            const listTab = document.getElementById("adminNoteTabListBtn");
            if (addPanel) addPanel.style.display = "block";
            if (listPanel) listPanel.style.display = "none";
            if (addTab) addTab.classList.add("active");
            if (listTab) listTab.classList.remove("active");
            if (typeof loadAdminUploadedNotes === "function") loadAdminUploadedNotes();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (tabAddQuestionBtn) {
        tabAddQuestionBtn.addEventListener("click", () => {
            setActiveAdminTab(tabAddQuestionBtn);
            hideAllAdminSections();
            if (addQuestionSection) {
                addQuestionSection.style.display = "block";
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                if (examSection) examSection.style.display = "block";
                const uploadBtn = document.getElementById("openUploadModalButton");
                if (uploadBtn) uploadBtn.click();
            }
        });
    }

    // Wire dedicated Upload Question Set Page controls
    const pageReleaseNowBtn = document.getElementById("pageReleaseNowBtn");
    const pageReleaseScheduleBtn = document.getElementById("pageReleaseScheduleBtn");
    const pageReleaseDatetimeWrap = document.getElementById("pageReleaseDatetimeWrap");
    const pageUploadReleaseAt = document.getElementById("pageUploadReleaseAt");
    const pageSetFileInput = document.getElementById("pageSetFileInput");
    const pageDropBoxArea = document.getElementById("pageDropBoxArea");
    const pageSelectedFileCard = document.getElementById("pageSelectedFileCard");
    const pageChangeFileBtn = document.getElementById("pageChangeFileBtn");
    const pageSubmitUploadButton = document.getElementById("pageSubmitUploadButton");

    if (pageReleaseNowBtn && pageReleaseScheduleBtn && pageReleaseDatetimeWrap) {
        pageReleaseNowBtn.addEventListener("click", () => {
            pageReleaseNowBtn.classList.add("active");
            pageReleaseScheduleBtn.classList.remove("active");
            pageReleaseDatetimeWrap.classList.remove("show");
        });
        pageReleaseScheduleBtn.addEventListener("click", () => {
            pageReleaseScheduleBtn.classList.add("active");
            pageReleaseNowBtn.classList.remove("active");
            pageReleaseDatetimeWrap.classList.add("show");
            if (pageUploadReleaseAt && !pageUploadReleaseAt.value) {
                const d = new Date(Date.now() + 60 * 60 * 1000);
                const pad = n => String(n).padStart(2, "0");
                pageUploadReleaseAt.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        });
    }

    if (pageDropBoxArea && pageSetFileInput) {
        pageDropBoxArea.addEventListener("click", () => pageSetFileInput.click());
    }
    if (pageChangeFileBtn && pageSetFileInput) {
        pageChangeFileBtn.addEventListener("click", () => pageSetFileInput.click());
    }
    if (pageSetFileInput) {
        pageSetFileInput.addEventListener("change", () => {
            const file = pageSetFileInput.files && pageSetFileInput.files[0];
            if (!file) return;
            const ext = (file.name.split(".").pop() || "FILE").toUpperCase();
            const badge = document.getElementById("pageFileTypeBadge");
            const nameEl = document.getElementById("pageFileCardName");
            const sizeEl = document.getElementById("pageFileCardSize");
            if (badge) badge.textContent = ext.slice(0, 4);
            if (nameEl) nameEl.textContent = file.name;
            if (sizeEl) sizeEl.textContent = `${Math.max(1, Math.round(file.size / 1024))} KB`;
            if (pageDropBoxArea) pageDropBoxArea.style.display = "none";
            if (pageSelectedFileCard) pageSelectedFileCard.style.display = "flex";
        });
    }

    if (pageSubmitUploadButton) {
        pageSubmitUploadButton.addEventListener("click", async () => {
            const titleEl = document.getElementById("pageUploadExamTitle");
            const subjEl = document.getElementById("pageUploadSubject");
            const durEl = document.getElementById("pageUploadDuration");
            const title = titleEl ? titleEl.value.trim() : "";
            const subject = subjEl ? subjEl.value : "All";
            const duration = durEl ? durEl.value : "180";

            if (!title) {
                alert("Please enter the Examination Display Title.");
                return;
            }
            if (!pageSetFileInput || !pageSetFileInput.files || pageSetFileInput.files.length === 0) {
                alert("Please select a question bank file to upload.");
                return;
            }

            const formData = new FormData();
            formData.append("title", title);
            formData.append("subject", subject || "All");
            formData.append("duration", duration || "180");

            const isScheduled = pageReleaseScheduleBtn && pageReleaseScheduleBtn.classList.contains("active");
            if (isScheduled) {
                const rawDt = pageUploadReleaseAt ? pageUploadReleaseAt.value : "";
                const parsedMs = Date.parse(rawDt);
                if (!rawDt || Number.isNaN(parsedMs) || parsedMs <= Date.now()) {
                    alert("Please select a future date and time for the scheduled release timer.");
                    return;
                }
                formData.append("releaseMode", "scheduled");
                formData.append("releaseAt", new Date(parsedMs).toISOString());
            } else {
                formData.append("releaseMode", "immediate");
            }
            formData.append("file", pageSetFileInput.files[0]);

            const origHtml = pageSubmitUploadButton.innerHTML;
            pageSubmitUploadButton.disabled = true;
            pageSubmitUploadButton.textContent = "Uploading & Splitting...";

            try {
                const res = await fetch("/api/admin/sets/upload", {
                    method: "POST",
                    body: formData,
                    credentials: "same-origin"
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error((data && data.message) || "Failed to upload question set.");
                }
                alert(`🎉 ${data.message}`);
                if (titleEl) titleEl.value = "";
                if (pageSetFileInput) pageSetFileInput.value = "";
                if (pageSelectedFileCard) pageSelectedFileCard.style.display = "none";
                if (pageDropBoxArea) pageDropBoxArea.style.display = "block";
                await fetchSets();
                if (tabHomeBtn) tabHomeBtn.click();
            } catch (err) {
                alert(err.message || "Upload failed.");
            } finally {
                pageSubmitUploadButton.disabled = false;
                pageSubmitUploadButton.innerHTML = origHtml;
            }
        });
    }

    if (tabRanksBtn) {
        tabRanksBtn.addEventListener("click", () => {
            setActiveAdminTab(tabRanksBtn);
            hideAllAdminSections();
            if (ranksSection) ranksSection.style.display = "block";
            loadAdminLeaderboard();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    if (tabProfileBtn) {
        tabProfileBtn.addEventListener("click", () => {
            setActiveAdminTab(tabProfileBtn);
            hideAllAdminSections();
            if (profileSection) profileSection.style.display = "block";
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    const adminNoteTabAddBtn = document.getElementById("adminNoteTabAddBtn");
    const adminNoteTabListBtn = document.getElementById("adminNoteTabListBtn");
    const adminAddNotePanel = document.getElementById("adminAddNotePanel");
    const adminManageNotesPanel = document.getElementById("adminManageNotesPanel");
    const adminNotesCountBadge = document.getElementById("adminNotesCountBadge");

    const noteTitleInput = document.getElementById("noteTitleInput");
    const notePaperSelect = document.getElementById("notePaperSelect");
    const noteUnitSelect = document.getElementById("noteUnitSelect");

    if (notePaperSelect && noteUnitSelect) {
        const syncAdminUnitLabels = () => {
            const isPaper2 = String(notePaperSelect.value || "").toLowerCase() === "paper 2";
            const prefix = isPaper2 ? "அலகு" : "Unit";
            Array.from(noteUnitSelect.options).forEach((opt, idx) => {
                opt.textContent = `${prefix} ${idx + 1}`;
            });
        };
        notePaperSelect.addEventListener("change", syncAdminUnitLabels);
        syncAdminUnitLabels();
    }
    const noteDropBoxArea = document.getElementById("noteDropBoxArea");
    const noteFileInput = document.getElementById("noteFileInput");
    const noteSelectedFileCard = document.getElementById("noteSelectedFileCard");
    const noteSelectedFileName = document.getElementById("noteSelectedFileName");
    const noteSelectedFileMeta = document.getElementById("noteSelectedFileMeta");
    const noteChangeFileBtn = document.getElementById("noteChangeFileBtn");

    const noteCoverFixedBtn = document.getElementById("noteCoverFixedBtn");
    const noteCoverCustomBtn = document.getElementById("noteCoverCustomBtn");
    const noteCoverCustomControls = document.getElementById("noteCoverCustomControls");
    const notePickCoverBtn = document.getElementById("notePickCoverBtn");
    const noteCoverInput = document.getElementById("noteCoverInput");
    const noteCoverPreviewImg = document.getElementById("noteCoverPreviewImg");
    const noteCoverFixedLabel = document.getElementById("noteCoverFixedLabel");

    const noteReleaseNowBtn = document.getElementById("noteReleaseNowBtn");
    const noteReleaseScheduleBtn = document.getElementById("noteReleaseScheduleBtn");
    const noteReleaseDatetimeWrap = document.getElementById("noteReleaseDatetimeWrap");
    const noteReleaseAt = document.getElementById("noteReleaseAt");
    const noteUploadStatusBanner = document.getElementById("noteUploadStatusBanner");
    const noteSubmitUploadBtn = document.getElementById("noteSubmitUploadBtn");

    let selectedNoteFile = null;
    let selectedCoverFile = null;

    if (adminNoteTabAddBtn && adminNoteTabListBtn && adminAddNotePanel && adminManageNotesPanel) {
        adminNoteTabAddBtn.addEventListener("click", () => {
            adminNoteTabAddBtn.classList.add("active");
            adminNoteTabListBtn.classList.remove("active");
            adminAddNotePanel.style.display = "block";
            adminManageNotesPanel.style.display = "none";
        });
        adminNoteTabListBtn.addEventListener("click", () => {
            adminNoteTabListBtn.classList.add("active");
            adminNoteTabAddBtn.classList.remove("active");
            adminAddNotePanel.style.display = "none";
            adminManageNotesPanel.style.display = "block";
            if (typeof window.loadAdminUploadedNotes === "function") window.loadAdminUploadedNotes();
        });
    }

    const showNoteFileSelected = (file) => {
        selectedNoteFile = file || null;
        if (!selectedNoteFile) {
            if (noteDropBoxArea) noteDropBoxArea.style.display = "block";
            if (noteSelectedFileCard) noteSelectedFileCard.style.display = "none";
            return;
        }
        const ext = (file.name.split(".").pop() || "FILE").toUpperCase();
        const kb = Math.max(1, Math.round(file.size / 1024));
        if (noteSelectedFileName) noteSelectedFileName.textContent = file.name;
        if (noteSelectedFileMeta) noteSelectedFileMeta.textContent = `${ext} • ${kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : kb + " KB"}`;
        if (noteDropBoxArea) noteDropBoxArea.style.display = "none";
        if (noteSelectedFileCard) noteSelectedFileCard.style.display = "flex";
    };

    if (noteDropBoxArea && noteFileInput) {
        noteDropBoxArea.addEventListener("click", () => noteFileInput.click());
        noteFileInput.addEventListener("change", () => {
            if (noteFileInput.files && noteFileInput.files[0]) showNoteFileSelected(noteFileInput.files[0]);
        });
    }
    if (noteChangeFileBtn && noteFileInput) {
        noteChangeFileBtn.addEventListener("click", () => noteFileInput.click());
    }

    if (noteCoverFixedBtn && noteCoverCustomBtn) {
        noteCoverFixedBtn.addEventListener("click", () => {
            noteCoverFixedBtn.classList.add("active");
            noteCoverCustomBtn.classList.remove("active");
            if (noteCoverCustomControls) noteCoverCustomControls.style.display = "none";
            if (noteCoverPreviewImg) noteCoverPreviewImg.style.display = "none";
            if (noteCoverFixedLabel) noteCoverFixedLabel.style.display = "block";
            selectedCoverFile = null;
        });
        noteCoverCustomBtn.addEventListener("click", () => {
            noteCoverCustomBtn.classList.add("active");
            noteCoverFixedBtn.classList.remove("active");
            if (noteCoverCustomControls) noteCoverCustomControls.style.display = "block";
            if (selectedCoverFile && noteCoverPreviewImg) {
                noteCoverPreviewImg.style.display = "block";
                if (noteCoverFixedLabel) noteCoverFixedLabel.style.display = "none";
            }
        });
    }

    if (notePickCoverBtn && noteCoverInput) {
        notePickCoverBtn.addEventListener("click", () => noteCoverInput.click());
        noteCoverInput.addEventListener("change", () => {
            const file = noteCoverInput.files && noteCoverInput.files[0];
            if (!file) return;
            selectedCoverFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (noteCoverPreviewImg) {
                    noteCoverPreviewImg.src = ev.target.result;
                    noteCoverPreviewImg.style.display = "block";
                }
                if (noteCoverFixedLabel) noteCoverFixedLabel.style.display = "none";
            };
            reader.readAsDataURL(file);
        });
    }

    if (noteReleaseNowBtn && noteReleaseScheduleBtn && noteReleaseDatetimeWrap) {
        noteReleaseNowBtn.addEventListener("click", () => {
            noteReleaseNowBtn.classList.add("active");
            noteReleaseScheduleBtn.classList.remove("active");
            noteReleaseDatetimeWrap.classList.remove("show");
            if (noteSubmitUploadBtn) noteSubmitUploadBtn.innerHTML = `<span>Publish Study Note</span><span>&rarr;</span>`;
        });
        noteReleaseScheduleBtn.addEventListener("click", () => {
            noteReleaseScheduleBtn.classList.add("active");
            noteReleaseNowBtn.classList.remove("active");
            noteReleaseDatetimeWrap.classList.add("show");
            if (noteSubmitUploadBtn) noteSubmitUploadBtn.innerHTML = `<span>Schedule Study Note</span><span>&rarr;</span>`;
            if (noteReleaseAt && !noteReleaseAt.value) {
                const d = new Date(Date.now() + 3600000);
                const pad = (n) => String(n).padStart(2, "0");
                noteReleaseAt.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        });
    }

    const setNoteStatus = (msg, isErr) => {
        if (!noteUploadStatusBanner) return;
        if (!msg) {
            noteUploadStatusBanner.style.display = "none";
            return;
        }
        noteUploadStatusBanner.style.display = "block";
        noteUploadStatusBanner.style.background = isErr ? "#FEF2F2" : "#ECFDF5";
        noteUploadStatusBanner.style.color = isErr ? "#991B1B" : "#166534";
        noteUploadStatusBanner.style.border = isErr ? "1px solid #FECACA" : "1px solid #BBF7D0";
        noteUploadStatusBanner.textContent = msg;
    };

    if (noteSubmitUploadBtn) {
        noteSubmitUploadBtn.addEventListener("click", async () => {
            setNoteStatus("", false);
            const title = noteTitleInput ? noteTitleInput.value.trim() : "";
            const paper = notePaperSelect ? notePaperSelect.value : "Paper 1";
            const unit = noteUnitSelect ? noteUnitSelect.value : "1";
            const isScheduled = noteReleaseScheduleBtn && noteReleaseScheduleBtn.classList.contains("active");
            const isCustomCover = noteCoverCustomBtn && noteCoverCustomBtn.classList.contains("active");

            if (!title) {
                setNoteStatus("Please enter a Note Name.", true);
                return;
            }
            if (!selectedNoteFile) {
                setNoteStatus("Please select a note file to upload.", true);
                return;
            }
            if (isCustomCover && !selectedCoverFile) {
                setNoteStatus("Please choose a cover image or switch to Fixed Academy Cover.", true);
                return;
            }

            const formData = new FormData();
            formData.append("title", title);
            formData.append("paper", paper);
            formData.append("unit", unit);
            formData.append("file", selectedNoteFile);
            formData.append("coverMode", isCustomCover ? "custom" : "fixed");
            if (isCustomCover && selectedCoverFile) {
                formData.append("cover", selectedCoverFile);
            }

            if (isScheduled) {
                const rawDt = noteReleaseAt ? noteReleaseAt.value : "";
                const parsedMs = rawDt ? Date.parse(rawDt) : NaN;
                if (!rawDt || Number.isNaN(parsedMs) || parsedMs <= Date.now()) {
                    setNoteStatus("Please choose a future date and time for scheduled release.", true);
                    return;
                }
                formData.append("releaseMode", "scheduled");
                formData.append("releaseAt", new Date(parsedMs).toISOString());
            } else {
                formData.append("releaseMode", "now");
            }

            noteSubmitUploadBtn.disabled = true;
            noteSubmitUploadBtn.innerHTML = `<span>Uploading Note...</span>`;

            try {
                const res = await fetch("/api/admin/notes/upload", {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.message || "Failed to upload note.");
                }

                setNoteStatus(data.message || "Study note saved!", false);
                if (noteTitleInput) noteTitleInput.value = "";
                if (noteFileInput) noteFileInput.value = "";
                if (noteCoverInput) noteCoverInput.value = "";
                showNoteFileSelected(null);
                if (noteCoverFixedBtn) noteCoverFixedBtn.click();
                if (noteReleaseNowBtn) noteReleaseNowBtn.click();
                if (typeof window.loadAdminUploadedNotes === "function") await window.loadAdminUploadedNotes();
            } catch (err) {
                setNoteStatus(err.message || "Upload failed.", true);
            } finally {
                noteSubmitUploadBtn.disabled = false;
                const sched = noteReleaseScheduleBtn && noteReleaseScheduleBtn.classList.contains("active");
                noteSubmitUploadBtn.innerHTML = sched ? `<span>Schedule Study Note</span><span>&rarr;</span>` : `<span>Publish Study Note</span><span>&rarr;</span>`;
            }
        });
    }

    window.loadAdminUploadedNotes = async function () {
        if (!notesListEl) return;
        try {
            const res = await fetch("/api/admin/notes");
            const data = await res.json();
            const notes = (data && data.notes) ? data.notes : [];
            if (adminNotesCountBadge) adminNotesCountBadge.textContent = String(notes.length);

            if (!notes.length) {
                notesListEl.innerHTML = `<div style="background:rgba(255,255,255,0.88); border:1.5px dashed #E2B887; border-radius:18px; padding:24px; text-align:center; color:#6E4A4E; font-size:13px; font-weight:600;">No notes uploaded yet. Switch to "+ Add Note" to upload one.</div>`;
                return;
            }

            notesListEl.innerHTML = "";
            notes.forEach(note => {
                const card = document.createElement("article");
                card.className = "notes-list-card";
                const isSched = note.status === "scheduled";
                const statusBadge = isSched
                    ? `<span style="background:#F6DFC4; color:#6E1A2E; border:1px solid rgba(218,175,122,0.78); font-size:10px; font-weight:800; padding:3px 9px; border-radius:999px;">SCHEDULED</span>`
                    : `<span style="background:#DCFCE7; color:#15803D; font-size:10px; font-weight:800; padding:3px 9px; border-radius:999px;">PUBLISHED</span>`;
                const coverHtml = note.hasCustomCover && note.coverUrl
                    ? `<img src="${note.coverUrl}" alt="${note.title}" style="width:100%; height:110px; object-fit:cover; border-radius:14px; border:1px solid rgba(226,184,135,0.5);">`
                    : `<div style="width:100%; height:54px; border-radius:12px; background:linear-gradient(135deg,#7C1B34 0%,#5B1024 100%); display:flex; align-items:center; justify-content:space-between; padding:0 14px; color:#FDF4EE;"><span style="font-size:10.5px; font-weight:800; letter-spacing:0.6px; color:#E8C088;">SLOGON ACADEMY COVER</span><span style="font-size:11px; font-weight:700;">${String(note.fileType || "FILE").toUpperCase()}</span></div>`;

                card.innerHTML = `
                    ${coverHtml}
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px;">
                        <span style="background:linear-gradient(135deg,#7C1B34,#5B1024); color:#FDF4EE; font-size:10.5px; font-weight:800; padding:4px 10px; border-radius:999px;">${note.paper} &bull; ${String(note.paper || "").toLowerCase() === "paper 2" ? "அலகு" : "UNIT"} ${note.unit}</span>
                        ${statusBadge}
                    </div>
                    <h3 class="notes-list-title">${note.title}</h3>
                    <p class="notes-list-desc">${note.fileName}${isSched && note.releaseAt ? ` &bull; Launches ${new Date(note.releaseAt).toLocaleString()}` : ""}</p>
                    <div style="display:flex; gap:8px; margin-top:4px;">
                        <a href="${note.downloadUrl}" target="_blank" class="notes-list-cta" style="text-decoration:none; flex:1;"><span>Open File</span><span>&rarr;</span></a>
                        <button type="button" class="admin-card-icon-btn is-delete" data-delete-note="${note.id}" title="Delete Note" aria-label="Delete Note" style="width:42px; height:42px; border-radius:999px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </div>
                `;
                const delBtn = card.querySelector("[data-delete-note]");
                if (delBtn) {
                    delBtn.addEventListener("click", async () => {
                        if (!confirm(`Delete "${note.title}"?`)) return;
                        await fetch(`/api/admin/notes/${encodeURIComponent(note.id)}`, { method: "DELETE" });
                        window.loadAdminUploadedNotes();
                    });
                }
                notesListEl.appendChild(card);
            });
        } catch (err) {
            console.error("Failed to load admin notes:", err);
        }
    };

    if (closeStudyModalBtn && studyModal) {
        closeStudyModalBtn.addEventListener("click", () => studyModal.classList.remove("open"));
        studyModal.addEventListener("click", (e) => {
            if (e.target === studyModal) studyModal.classList.remove("open");
        });
    }

    const releaseNowBtn = document.getElementById("releaseNowBtn");
    const releaseScheduleBtn = document.getElementById("releaseScheduleBtn");
    const releaseDatetimeWrap = document.getElementById("releaseDatetimeWrap");
    const uploadReleaseAt = document.getElementById("uploadReleaseAt");

    if (releaseNowBtn && releaseScheduleBtn && releaseDatetimeWrap) {
        releaseNowBtn.addEventListener("click", () => {
            releaseNowBtn.classList.add("active");
            releaseScheduleBtn.classList.remove("active");
            releaseDatetimeWrap.classList.remove("show");
        });
        releaseScheduleBtn.addEventListener("click", () => {
            releaseScheduleBtn.classList.add("active");
            releaseNowBtn.classList.remove("active");
            releaseDatetimeWrap.classList.add("show");
            if (uploadReleaseAt && !uploadReleaseAt.value) {
                const d = new Date(Date.now() + 60 * 60 * 1000);
                const pad = n => String(n).padStart(2, "0");
                uploadReleaseAt.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        });
    }

    const adminMobileHelpBtn = document.getElementById("adminMobileHelpBtn");
    const adminMobileLogoutBtn = document.getElementById("adminMobileLogoutBtn");
    if (adminMobileHelpBtn) {
        adminMobileHelpBtn.addEventListener("click", () => {
            hideAllAdminSections();
            if (helpSection) helpSection.style.display = "block";
            setActiveAdminTab(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
    if (adminMobileLogoutBtn) {
        adminMobileLogoutBtn.addEventListener("click", openLogoutModal);
    }
}

// -----------------------------------------------------
// INITIALIZE
// -----------------------------------------------------

function initAdminPortal() {
    renderSets();
    bindEventListeners();
    initAdminMobileTabs();
    loadAdminProfile();
    fetchSets();
}

// Run immediately
initAdminPortal();
