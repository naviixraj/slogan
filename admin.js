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

// Initial default question sets (loaded dynamically from database via /api/admin/sets)
const DEFAULT_SETS = [];

// Initial default student records
const DEFAULT_STUDENTS = [
    { id: 6, user_id: "navi", candidate_name: "Navi", email: "navi@slogon.edu", role: "Student", active: 1 },
    { id: 2, user_id: "admin", candidate_name: "Master Administrator", email: "admin@slogon.edu", role: "Admin", active: 1 }
];

// Active State
let activeSets = [...DEFAULT_SETS];
let activeStudents = [...DEFAULT_STUDENTS];

// -----------------------------------------------------
// DOM ELEMENTS
// -----------------------------------------------------

// Sidebar Nav
const questionsNav = document.getElementById("questionsNav");
const studentsNav = document.getElementById("studentsNav");
const helpNav = document.getElementById("helpNav");

// Workspaces
const examSection = document.getElementById("examSection");
const studentsSection = document.getElementById("studentsSection");
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
const selectedFileNameLabel = document.getElementById("selectedFileNameLabel");
const uploadExamTitle = document.getElementById("uploadExamTitle");
const uploadSubject = document.getElementById("uploadSubject");
const uploadDuration = document.getElementById("uploadDuration");

// Upload Modal Tabs & Paste Pane
const tabUploadFileBtn = document.getElementById("tabUploadFileBtn");
const tabPasteTextBtn = document.getElementById("tabPasteTextBtn");
const uploadFilePane = document.getElementById("uploadFilePane");
const pasteTextPane = document.getElementById("pasteTextPane");
const pasteQuestionsText = document.getElementById("pasteQuestionsText");
const loadSamplePasteBtn = document.getElementById("loadSamplePasteBtn");
const pasteDetectSummary = document.getElementById("pasteDetectSummary");

// Rich Selected File Card
const selectedFileCard = document.getElementById("selectedFileCard");
const fileTypeBadge = document.getElementById("fileTypeBadge");
const fileCardName = document.getElementById("fileCardName");
const fileCardSize = document.getElementById("fileCardSize");
const changeFileBtn = document.getElementById("changeFileBtn");

let currentUploadMode = "file"; // "file" or "paste"

// Students Directory
const studentTableBody = document.getElementById("studentTableBody");
const studentSearchInput = document.getElementById("studentSearchInput");
const openStudentModalButton = document.getElementById("openStudentModalButton");
const studentModal = document.getElementById("studentModal");
const closeStudentModalButton = document.getElementById("closeStudentModalButton");
const cancelStudentButton = document.getElementById("cancelStudentButton");
const createStudentBtn = document.getElementById("createStudentBtn");
const newUserId = document.getElementById("newUserId");
const newName = document.getElementById("newName");
const newEmail = document.getElementById("newEmail");
const newPass = document.getElementById("newPass");

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
    [questionsNav, studentsNav, helpNav].forEach(btn => {
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
    resetSearchBar(studentSearchInput, renderStudents);
    resetSearchBar(searchInput, renderSets);
    if (examSection) examSection.style.display = "block";
    if (studentsSection) studentsSection.style.display = "none";
    if (helpSection) helpSection.style.display = "none";
    backToSets();
}

function showStudentsSection() {
    setActiveNav(studentsNav);
    resetSearchBar(searchInput, renderSets);
    resetSearchBar(studentSearchInput, renderStudents);
    if (examSection) examSection.style.display = "none";
    if (studentsSection) studentsSection.style.display = "block";
    if (helpSection) helpSection.style.display = "none";
    if (pageTitle) pageTitle.textContent = "Students Directory";
    if (pageSubtitle) pageSubtitle.textContent = "Manage registered candidates and generate examination logins.";
    renderStudents();
}

function showHelpSection() {
    setActiveNav(helpNav);
    resetSearchBar(searchInput, renderSets);
    resetSearchBar(studentSearchInput, renderStudents);
    if (examSection) examSection.style.display = "none";
    if (studentsSection) studentsSection.style.display = "none";
    if (helpSection) helpSection.style.display = "block";
    if (pageTitle) pageTitle.textContent = "Administrator Help";
    if (pageSubtitle) pageSubtitle.textContent = "Guidance on Excel question formats, auto-splitting, and student access.";
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
    window.location.replace("login.html");
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
// MODALS (UPLOAD & STUDENT)
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
    if (!testGrid) return;

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

    // Sort question sets in constructed sequential order (SET01, SET02, SET03, ...)
    matches.sort((a, b) => {
        const idA = String(a.id || "").trim();
        const idB = String(b.id || "").trim();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

    testGrid.innerHTML = "";
    if (resultCount) {
        resultCount.textContent = `Showing ${matches.length} of ${activeSets.length} question sets`;
    }

    if (!matches.length) {
        testGrid.innerHTML = '<div style="grid-column: 1 / -1; background: #FFFFFF; border: 1px dashed #D8DED7; border-radius: 10px; padding: 35px; text-align: center; color: var(--muted); font-size: 12px;">No question sets match your search. Click "+ Upload Set" to create one.</div>';
        return;
    }

    matches.forEach(set => {
        const card = document.createElement("article");
        card.className = "test-card";

        const fileBadge = (set.file_type || set.fileType || "SET").toUpperCase();
        const fName = set.file_name || set.fileName || "File";
        const qCount = set.questions_count !== undefined ? set.questions_count : (set.questionsCount || (set.questions ? set.questions.length : 0));
        const dur = set.duration || 180;
        const isAvailable = set.status !== "coming";

        const accent = document.createElement("div");
        accent.className = "accent";

        const body = document.createElement("div");
        body.className = "card-body";

        const top = document.createElement("div");
        top.className = "card-top";

        const codeSpan = document.createElement("span");
        codeSpan.className = "test-code";
        codeSpan.textContent = `EXAM ${String(set.id).toUpperCase()}`;

        const statusSpan = document.createElement("span");
        statusSpan.className = isAvailable ? "status available" : "status coming";
        statusSpan.textContent = isAvailable ? "AVAILABLE" : "COMING SOON";

        top.append(codeSpan, statusSpan);

        const titleH2 = document.createElement("h2");
        titleH2.textContent = set.title;

        const metaDiv = document.createElement("div");
        metaDiv.className = "meta";
        const subj = set.subject || "Paper 1 (General) & Paper 2 (Subject)";
        [`${qCount} Questions`, subj, `${dur} Minutes`].forEach(text => {
            const item = document.createElement("span");
            item.textContent = text;
            metaDiv.appendChild(item);
        });

        const inspectBtn = document.createElement("button");
        inspectBtn.className = "start";
        inspectBtn.type = "button";
        inspectBtn.textContent = isAvailable ? "INSPECT QUESTIONS" : "COMING SOON";
        inspectBtn.disabled = !isAvailable;
        inspectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            inspectSet(set.id);
        });

        const actionsCluster = document.createElement("div");
        actionsCluster.className = "card-actions-cluster";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "card-icon-action card-icon-edit";
        editBtn.title = `Edit details for "${set.title}"`;
        editBtn.setAttribute("aria-label", `Edit details for "${set.title}"`);
        editBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        `;
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditSetModal(set);
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "card-icon-action card-icon-delete bin-btn";
        delBtn.title = `Delete Question Set "${set.title}"`;
        delBtn.setAttribute("aria-label", `Delete Question Set "${set.title}"`);
        delBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSet(set.id);
        });

        actionsCluster.append(editBtn, delBtn);

        body.append(top, titleH2, metaDiv, inspectBtn, actionsCluster);
        card.append(accent, body);

        // Enable clicking anywhere on the card/tab in both grid and list views
        card.classList.add("is-clickable");
        card.style.cursor = "pointer";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("title", `Click anywhere to inspect questions in "${set.title}"`);

        card.addEventListener("click", (e) => {
            if (e.target.closest(".card-icon-action")) return;
            inspectSet(set.id);
        });

        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inspectSet(set.id);
            }
        });

        testGrid.appendChild(card);
    });
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
                window.location.replace("login.html?next=admin.html");
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
                    const qNum = q.number || q.id || (idx + 1);
                    const qText = q.question || q.text || "";
                    const optA = q.options?.A || "";
                    const optB = q.options?.B || "";
                    const optC = q.options?.C || "";
                    const optD = q.options?.D || "";
                    const correct = String(q.correctAnswer || q.answer || "A").trim().toUpperCase();
                    const exp = q.explanation || "No solution explanation provided.";
                    const isSelected = selectedQuestionNumbers.has(Number(qNum));

                    const labelA = q.optionLabels?.A || "A";
                    const labelB = q.optionLabels?.B || "B";
                    const labelC = q.optionLabels?.C || "C";
                    const labelD = q.optionLabels?.D || "D";

                    return `
                        <div class="question-card ${isSelected ? 'is-selected' : ''}" data-qnum="${qNum}" data-original-qnum="${qNum}" data-setid="${set.id}" draggable="true">
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
                                <span class="q-section-tag"><span class="q-section-full">Single Split Question • </span>${q.section || "Paper 1"}</span>
                            </div>
                            <div class="q-title">${typeof window.renderNeatQuestion === "function" ? window.renderNeatQuestion(qText, q.options || { A: optA, B: optB, C: optC, D: optD }) : qText}</div>
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
                                <button type="button" class="btn-edit-single-q" data-setid="${set.id}" data-qnum="${qNum}" title="Edit Question ${qNum}" aria-label="Edit Question ${qNum}">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="bin-btn btn-delete-single-q" data-setid="${set.id}" data-qnum="${qNum}" title="Delete Question ${qNum}" aria-label="Delete Question ${qNum}">
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

function selectAllQuestions() {
    if (!currentInspectedQuestions || currentInspectedQuestions.length === 0) return;
    currentInspectedQuestions.forEach((q, idx) => {
        const qNum = q.number || q.id || (idx + 1);
        selectedQuestionNumbers.add(Number(qNum));
    });
    if (inspectorQuestionsContainer) {
        const cards = inspectorQuestionsContainer.querySelectorAll(".question-card");
        cards.forEach(card => card.classList.add("is-selected"));
    }
    updateBulkActionBar();
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

// -----------------------------------------------------
// MODAL TABS & BULK PASTE LOGIC
// -----------------------------------------------------

function switchUploadTab(mode) {
    currentUploadMode = mode;
    if (tabUploadFileBtn) tabUploadFileBtn.classList.toggle("active", mode === "file");
    if (tabPasteTextBtn) tabPasteTextBtn.classList.toggle("active", mode === "paste");

    if (uploadFilePane) uploadFilePane.style.display = mode === "file" ? "block" : "none";
    if (pasteTextPane) pasteTextPane.style.display = mode === "paste" ? "block" : "none";
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

function updatePasteDetection() {
    if (!pasteQuestionsText || !pasteDetectSummary) return;
    const text = pasteQuestionsText.value.trim();
    if (!text) {
        pasteDetectSummary.className = "paste-detect-summary";
        pasteDetectSummary.innerHTML = "⚡ Live Question Detector: Paste question set text above to preview";
        return;
    }

    const regex = /(?:^|\n)(?=(?:(?:Question|Q|வினா(?:\s*எண்)?)\s*[:\.-]?\s*\d+[\.:\)\s\-\]]+|\d+[\.\)]\s+|\d+\s*[:\.\-]?\s*(?:\[|\(|பொருத்துக|காலவரிசை|நிரல்படுத்துக|உறுதிக்கூற்று)))/gi;
    let blocks = text.split(regex).map(b => b.trim()).filter(b => b.length > 5);

    // If split produced 0 blocks, check if the pasted text is a standalone single question
    if (blocks.length === 0 && /(?:^|\n|\s{2,})(?:\(?([A-Da-d1-4அஆஇஈ])[\.\)\:\-\]]|\(([A-Da-d1-4அஆஇஈ])\))/g.test(text)) {
        blocks = [text];
    }

    if (blocks.length === 0) {
        pasteDetectSummary.className = "paste-detect-summary has-error";
        pasteDetectSummary.innerHTML = "⚠️ No questions detected yet. Please ensure questions start with numbers like '1.' or 'Q1.' or 'வினா 1:'";
        return;
    }

    let validCount = 0;
    blocks.forEach(block => {
        const hasOptions = /(?:^|\n|\s{2,})(?:\(?([A-Da-d1-4])[\.\)\:\-\]]|\(([A-Da-d1-4])\))/g.test(block);
        if (hasOptions) validCount++;
    });

    pasteDetectSummary.className = "paste-detect-summary has-questions";
    pasteDetectSummary.innerHTML = `✅ <strong>${blocks.length} question(s) detected</strong> (${validCount} with verified A-D options)`;
}

function loadSampleQuestionTemplate() {
    if (!pasteQuestionsText) return;
    const sample = `1. Which layer of the OSI model does a network router operate on?
(A) Physical Layer
(B) Data Link Layer
(C) Network Layer
(D) Transport Layer
Answer: C
Explanation: Routers operate at Layer 3 (Network Layer) to direct IP packet traffic.

2. Match the Computer Protocols in List I with their Default Ports in List II:
List I (Protocols)
(A) HTTP
(B) HTTPS
(C) SSH
(D) DNS
List II (Port Numbers)
(I) 22
(II) 53
(III) 80
(IV) 443

Choose the correct answer from the options given below:
(A) (A)-(III), (B)-(IV), (C)-(I), (D)-(II)
(B) (A)-(I), (B)-(II), (C)-(III), (D)-(IV)
(C) (A)-(IV), (B)-(III), (C)-(II), (D)-(I)
(D) (A)-(II), (B)-(I), (C)-(IV), (D)-(III)
Answer: A
Explanation: HTTP = 80, HTTPS = 443, SSH = 22, DNS = 53.

3. Assertion and Reason:
Assertion (A): Light travels faster in vacuum than in glass.
Reason (R): The refractive index of vacuum is 1, which is less than the refractive index of glass.

In the light of the above statements, choose the most appropriate answer:
(A) Both (A) and (R) are correct, and (R) is the correct explanation of (A).
(B) Both (A) and (R) are correct, but (R) is NOT the correct explanation of (A).
(C) (A) is correct, but (R) is incorrect.
(D) (A) is incorrect, but (R) is correct.
Answer: A
Explanation: Light velocity is maximum in vacuum where refractive index is 1.

வினா 4 [உறுதிக்கூற்று - காரணம்].
உறுதிக்கூற்று (உ): வீரமாமுனிவர் இயற்றிய தேம்பாவணி காப்பியத்தின் முதன்மைப் பாட்டுடைத் தலைவன் இயேசு பெருமான் ஆவார். 
காரணம் (கா): தேம்பாவணி 3 காண்டங்களையும் 36 படலங்களையும் 3,615 விருத்தப் பாடல்களையும் கொண்டக் கிறித்துவச் சமயக் காப்பியமாகும்.

கீழே தரப்பெற்றுள்ள விருப்பங்களிலிருந்து சரியான பதிலத்தைத் தேர்ந்தெடுக்க: 
(1) (உ) சரி, (கா) சரி; (கா) என்பது (உ)-விற்குச் சரியான விளக்கமாகும் 
(2) (உ) சரி, (கா) தவறு 
(3) (உ) தவறு, (கா) சரி 
(4) (உ) தவறு, (கா) தவறு
சரியான விடை: (3) (உ) தவறு, (கா) சரி
விளக்கம்: தேம்பாவணியின் முதன்மைப் பாட்டுடைத் தலைவன் வளன் (சூசையப்பர்) ஆவார் (இயேசு பெருமான் அல்ல). எனவே உறுதிக்கூற்று தவறு, காரணம் சரி.

5. Consider the following statements regarding the Indian Constitution:
(i) The original Constitution contained 395 Articles and 8 Schedules.
(ii) Dr. B.R. Ambedkar was the Chairman of the Drafting Committee.
(iii) The Constitution was adopted on January 26, 1950.
(iv) The Preamble is an integral part of the Constitution.

Which of the statements given above are correct?
(A) (i), (ii) and (iv) only
(B) (i) and (iii) only
(C) (ii), (iii) and (iv) only
(D) (i), (ii), (iii) and (iv)
Answer: A
Explanation: The Constitution was adopted on November 26, 1949 and enacted on January 26, 1950.

6. Arrange the following computer innovations in chronological order:
(i) Invention of the Transistor
(ii) Release of the World Wide Web
(iii) Development of the C Programming Language
(iv) Invention of the Microprocessor

Choose the correct chronological sequence:
(A) (i) -> (iv) -> (iii) -> (ii)
(B) (i) -> (iii) -> (iv) -> (ii)
(C) (iv) -> (i) -> (iii) -> (ii)
(D) (ii) -> (i) -> (iii) -> (iv)
Answer: A
Explanation: Transistor (1947) -> Microprocessor (1971) -> C Language (1972) -> World Wide Web (1989).

7. The following table shows the number of students enrolled in three courses from 2021 to 2023:
Course | 2021 | 2022 | 2023
Physics | 120 | 150 | 180
Chemistry | 80 | 100 | 140
Mathematics | 100 | 120 | 160

What is the percentage increase in total student enrollment from 2021 to 2023?
(A) 40%
(B) 50%
(C) 60%
(D) 70%
Answer: C
Explanation: Total in 2021 = 300. Total in 2023 = 480. Increase = 180. Percentage = (180/300)*100 = 60%.`;

    pasteQuestionsText.value = sample;
    updatePasteDetection();
}

// -----------------------------------------------------
// SAVE QUESTION SET (FILE UPLOAD OR BULK PASTE)
// -----------------------------------------------------

async function handleUploadSetSubmit() {
    const title = uploadExamTitle ? uploadExamTitle.value.trim() : "";
    const subject = uploadSubject ? uploadSubject.value.trim() : "General Paper";
    const duration = uploadDuration ? uploadDuration.value.trim() : "180";

    if (!title) {
        alert("Please enter the Examination Display Title (how students will see it).");
        return;
    }

    const prevText = submitUploadButton ? submitUploadButton.textContent : "";

    // 1. BULK PASTE MODE
    if (currentUploadMode === "paste") {
        const textContent = pasteQuestionsText ? pasteQuestionsText.value.trim() : "";
        if (!textContent) {
            alert("Please paste your complete question set text before saving.");
            return;
        }

        if (submitUploadButton) {
            submitUploadButton.disabled = true;
            submitUploadButton.textContent = "Parsing & Saving Set...";
        }

        try {
            const res = await fetch("/api/admin/sets/paste", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    subject: subject || "General Paper",
                    duration: duration || "180",
                    textContent: textContent
                }),
                credentials: "same-origin"
            });

            const rawText = await res.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                if (res.status === 413) {
                    throw new Error("The pasted question set exceeds the allowed payload size.");
                }
                if (res.status === 401 || res.status === 403) {
                    throw new Error("Your session has expired. Please refresh the page and log in again.");
                }
                throw new Error(`Server returned unexpected response (${res.status}). Please make sure you are logged in.`);
            }

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to parse and save question set.");
            }

            closeModal(uploadModal);
            alert(`🎉 ${data.message}\nThis set is now active and ready for students!`);
            if (pasteQuestionsText) pasteQuestionsText.value = "";
            if (pasteDetectSummary) {
                pasteDetectSummary.className = "paste-detect-summary";
                pasteDetectSummary.innerHTML = "⚡ Live Question Detector: Paste question set text above to preview";
            }
            await fetchSets();
        } catch (err) {
            alert("Error saving pasted question set: " + err.message);
        } finally {
            if (submitUploadButton) {
                submitUploadButton.disabled = false;
                submitUploadButton.textContent = prevText;
            }
        }
        return;
    }

    // 2. FILE UPLOAD MODE
    if (!setFileInput || !setFileInput.files || setFileInput.files.length === 0) {
        alert("Please select a question file (Word, PDF, Excel, CSV, TXT, or JSON) to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject || "General Paper");
    formData.append("duration", duration || "180");
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
// RENDER STUDENTS & MANAGE
// -----------------------------------------------------

function renderStudents() {
    if (!studentTableBody) return;

    const term = (studentSearchInput && studentSearchInput.value ? studentSearchInput.value : "").trim().toLowerCase();
    const filtered = activeStudents.filter(s => {
        const idMatch = (s.user_id || "").toLowerCase().includes(term);
        const nameMatch = (s.candidate_name || "").toLowerCase().includes(term);
        const emailMatch = (s.email || "").toLowerCase().includes(term);
        const phoneMatch = (s.phone || "").toLowerCase().includes(term);
        return idMatch || nameMatch || emailMatch || phoneMatch;
    });

    if (!filtered.length) {
        studentTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 25px;">No students match your query.</td></tr>`;
        return;
    }

    studentTableBody.innerHTML = "";
    filtered.forEach(s => {
        const tr = document.createElement("tr");

        const idTd = document.createElement("td");
        idTd.innerHTML = `<strong>${s.user_id}</strong>`;

        const nameTd = document.createElement("td");
        nameTd.textContent = s.candidate_name;

        const emailTd = document.createElement("td");
        emailTd.textContent = s.email || "—";

        const phoneTd = document.createElement("td");
        phoneTd.textContent = s.phone || "—";

        const roleTd = document.createElement("td");
        roleTd.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: ${s.role === 'Admin' ? '#D97706' : 'var(--emerald-dark)'};">${s.role || 'Student'}</span>`;

        const statusTd = document.createElement("td");
        statusTd.innerHTML = `<span class="status available">${s.active === 1 ? 'Active' : 'Disabled'}</span>`;

        const actionTd = document.createElement("td");
        if (s.role !== "Admin") {
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "bin-btn";
            delBtn.title = `Delete Student Account "${s.user_id}"`;
            delBtn.setAttribute("aria-label", `Delete Student Account "${s.user_id}"`);
            delBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            `;
            delBtn.addEventListener("click", () => deleteStudent(s.id, s.user_id));
            actionTd.appendChild(delBtn);
        } else {
            actionTd.innerHTML = `<span style="font-size: 11px; color: var(--muted); font-weight: 600;">Master Account</span>`;
        }

        tr.append(idTd, nameTd, emailTd, phoneTd, roleTd, statusTd, actionTd);
        studentTableBody.appendChild(tr);
    });
}

async function handleCreateStudentSubmit() {
    const userIdVal = newUserId ? newUserId.value.trim() : "";
    const nameVal = newName ? newName.value.trim() : "";
    const emailVal = newEmail ? newEmail.value.trim() : "";
    const passVal = newPass ? newPass.value.trim() : "";

    if (!userIdVal || !nameVal || !passVal) {
        alert("User ID, Full Name, and Password are required to create a student account.");
        return;
    }

    const prevText = createStudentBtn ? createStudentBtn.textContent : "";
    if (createStudentBtn) {
        createStudentBtn.disabled = true;
        createStudentBtn.textContent = "Creating Account...";
    }

    try {
        const res = await fetch("/api/admin/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
                userId: userIdVal,
                candidateName: nameVal,
                email: emailVal,
                password: passVal,
                role: "Student"
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            if (res.status === 401 || res.status === 403) {
                alert("Session Expired: Master Administrator privileges required. Please log in with your Admin credentials.");
                window.location.replace("login.html?next=admin.html");
                return;
            }
            throw new Error(data.message || "Failed to create student account.");
        }

        closeModal(studentModal);
        alert(`🎉 ${data.message}\nThe student can now immediately log in with User ID: ${userIdVal}`);
        if (newUserId) newUserId.value = "";
        if (newName) newName.value = "";
        if (newEmail) newEmail.value = "";
        if (newPass) newPass.value = "";
        await fetchStudents();
    } catch (err) {
        if (err.name === "TypeError" && (err.message || "").toLowerCase().includes("fetch")) {
            alert("❌ Connection Error: Unable to reach the server.\n\nThe server was momentarily restarting to load new PDF capabilities. Please refresh the page (F5) and try again.");
        } else {
            alert(`❌ Enrollment Failed: ${err.message}`);
        }
    } finally {
        if (createStudentBtn) {
            createStudentBtn.disabled = false;
            createStudentBtn.textContent = prevText;
        }
    }
}

async function deleteStudent(id, userIdStr) {
    if (!confirm(`Are you sure you want to permanently delete student account "${userIdStr}"? This will remove the student account totally from the system.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/admin/students/${id}`, {
            method: "DELETE",
            credentials: "same-origin"
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to delete student.");
        }

        alert(`Student account "${userIdStr}" has been completely deleted.`);
        await fetchStudents();
    } catch (err) {
        alert("Failed to delete candidate: " + err.message);
    }
}

// -----------------------------------------------------
// SERVER SYNC
// -----------------------------------------------------

async function loadAdminProfile() {
    try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (!res.ok) {
            window.location.replace("login.html?next=admin.html");
            return;
        }

        const data = await res.json();
        if (!data.success || !data.candidate) {
            window.location.replace("login.html?next=admin.html");
            return;
        }

        if (data.candidate.role !== "Admin") {
            alert("Access restricted: You are currently signed in as a student candidate. Redirecting to Candidate Examination Dashboard.");
            window.location.replace("tests.html");
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
            if (pic && typeof pic === "string" && pic.startsWith("http")) {
                elem.innerHTML = `<img src="${pic}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.textContent='${text}';">`;
                elem.style.padding = "0";
                elem.style.overflow = "hidden";
            } else {
                elem.textContent = text;
            }
        }

        renderAvatar(sidebarAvatar, picture, inits);
        renderAvatar(topAvatar, picture, inits);
        renderAvatar(dropdownAvatar, picture, inits);
    } catch (e) {
        console.log("Profile verification error:", e);
        window.location.replace("login.html?next=admin.html");
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

async function fetchStudents() {
    try {
        const res = await fetch("/api/admin/students", { credentials: "same-origin" });
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.students)) {
                activeStudents = data.students;
                renderStudents();
            }
        }
    } catch (e) {
        console.log("Students offline");
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
    if (editSetSubject) editSetSubject.value = setObj.subject || "General Paper";
    if (editSetDuration) editSetDuration.value = setObj.duration || 180;

    openModal(editSetModal);
}

function closeEditSetModal() {
    closeModal(editSetModal);
}

async function handleSaveSetDetails() {
    const setId = editSetId ? editSetId.value.trim() : "";
    const newTitle = editSetTitle ? editSetTitle.value.trim() : "";
    const newSubject = editSetSubject ? editSetSubject.value.trim() : "";
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
                subject: newSubject || "General Paper",
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
            targetSet.subject = newSubject || "General Paper";
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
    if (studentsNav) studentsNav.addEventListener("click", showStudentsSection);
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

    // Upload Modal Tabs & Bulk Paste
    if (tabUploadFileBtn) tabUploadFileBtn.addEventListener("click", () => switchUploadTab("file"));
    if (tabPasteTextBtn) tabPasteTextBtn.addEventListener("click", () => switchUploadTab("paste"));
    if (pasteQuestionsText) {
        pasteQuestionsText.addEventListener("input", updatePasteDetection);
        pasteQuestionsText.addEventListener("paste", () => setTimeout(updatePasteDetection, 50));
    }
    if (loadSamplePasteBtn) loadSamplePasteBtn.addEventListener("click", loadSampleQuestionTemplate);

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

    // Student Modal & Table
    if (openStudentModalButton) openStudentModalButton.addEventListener("click", () => openModal(studentModal));
    if (closeStudentModalButton) closeStudentModalButton.addEventListener("click", () => closeModal(studentModal));
    if (cancelStudentButton) cancelStudentButton.addEventListener("click", () => closeModal(studentModal));
    if (createStudentBtn) createStudentBtn.addEventListener("click", handleCreateStudentSubmit);
    if (studentSearchInput) {
        studentSearchInput.addEventListener("input", renderStudents);
        studentSearchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                resetSearchBar(studentSearchInput, renderStudents);
            }
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
// INITIALIZE
// -----------------------------------------------------

function initAdminPortal() {
    renderSets();
    renderStudents();
    bindEventListeners();
    loadAdminProfile();
    fetchSets();
    fetchStudents();
}

// Run immediately
initAdminPortal();
