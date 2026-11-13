"use strict";

/* =====================================================
   SLOGON ACADEMY - MASTER ADMINISTRATOR PORTAL
   File: admin.js
   Architecture: Exact Match to Student Portal (tests.js)
   ===================================================== */

// Initial default question sets (ensures instant display even offline)
// Question Set source: Real question set loaded from data/mock01.json (150 questions)
const DEFAULT_SETS = [
    {
        id: "MOCK01",
        title: "UGC NET Full-Length Mock Test 01",
        subject: "Paper 1 (General) & Paper 2 (Subject)",
        fileType: "json",
        file_type: "json",
        fileName: "mock01.json",
        file_name: "mock01.json",
        questionsCount: 150,
        questions_count: 150,
        duration: 180,
        status: "available",
        questions: []
    }
];

// Initial default student records
const DEFAULT_STUDENTS = [
    { id: 1, user_id: "naveenraj", candidate_name: "Naveen Raj", email: "naveenraj@slogon.edu", role: "Student", active: 1 },
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

function showQuestionsSection() {
    setActiveNav(questionsNav);
    if (examSection) examSection.style.display = "block";
    if (studentsSection) studentsSection.style.display = "none";
    if (helpSection) helpSection.style.display = "none";
    backToSets();
}

function showStudentsSection() {
    setActiveNav(studentsNav);
    if (examSection) examSection.style.display = "none";
    if (studentsSection) studentsSection.style.display = "block";
    if (helpSection) helpSection.style.display = "none";
    if (pageTitle) pageTitle.textContent = "Students Directory";
    if (pageSubtitle) pageSubtitle.textContent = "Manage registered candidates and generate examination logins.";
    renderStudents();
}

function showHelpSection() {
    setActiveNav(helpNav);
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
        const matchesFilter = filter === "all" || fileType === filter;
        return matchesSearch && matchesFilter;
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
        const statusLabel = set.status === "available" ? "Published" : "Draft";

        const accent = document.createElement("div");
        accent.className = "accent";

        const body = document.createElement("div");
        body.className = "card-body";

        const top = document.createElement("div");
        top.className = "card-top";

        const codeSpan = document.createElement("span");
        codeSpan.className = "test-code";
        codeSpan.textContent = `${set.id} • ${fileBadge}`;

        const statusSpan = document.createElement("span");
        statusSpan.className = "status available";
        statusSpan.textContent = statusLabel;

        top.append(codeSpan, statusSpan);

        const titleH2 = document.createElement("h2");
        titleH2.textContent = set.title;

        const subP = document.createElement("p");
        subP.textContent = `${set.subject || "General Paper"} — Parsed from ${fName}`;

        const metaDiv = document.createElement("div");
        metaDiv.className = "meta";
        metaDiv.innerHTML = `
            <span>${qCount} Questions</span>
            <span>${dur} Mins</span>
            <span>Auto-split ready</span>
        `;

        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.alignItems = "center";
        btnRow.style.gap = "8px";
        btnRow.style.marginTop = "auto";

        const inspectBtn = document.createElement("button");
        inspectBtn.className = "start";
        inspectBtn.style.flex = "1";
        inspectBtn.type = "button";
        inspectBtn.textContent = "Inspect Questions ➔";
        inspectBtn.addEventListener("click", () => inspectSet(set.id));

        btnRow.appendChild(inspectBtn);

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "bin-btn";
        delBtn.title = `Delete Question Set "${set.title}"`;
        delBtn.setAttribute("aria-label", `Delete Question Set "${set.title}"`);
        delBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        delBtn.addEventListener("click", () => deleteSet(set.id));
        btnRow.appendChild(delBtn);

        body.append(top, titleH2, subP, metaDiv, btnRow);
        card.append(accent, body);
        testGrid.appendChild(card);
    });
}

// -----------------------------------------------------
// INSPECT SPLIT QUESTIONS
// -----------------------------------------------------

async function inspectSet(setId) {
    try {
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
        const fName = set.file_name || set.fileName || "mock01.json";
        const badge = (set.file_type || set.fileType || "JSON").toUpperCase();

        if (pageTitle) pageTitle.textContent = set.title;
        if (pageSubtitle) pageSubtitle.textContent = `File: ${fName} • ${qList.length} single split questions evaluated.`;
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

                    return `
                        <div class="question-card">
                            <div class="q-header">
                                <span class="q-badge">QUESTION ${String(qNum).padStart(2, '0')}</span>
                                <span style="font-size: 11px; color: var(--muted); font-weight: 600;">Single Split Question • ${q.section || "Paper 1"}</span>
                            </div>
                            <div class="q-title">${qText}</div>
                            <div class="options-grid">
                                <div class="option-box ${correct === 'A' ? 'is-correct' : ''}">
                                    <span class="opt-circle">A</span>
                                    <span>${optA} ${correct === 'A' ? '<strong style="color: var(--emerald-dark); margin-left: 6px;">(Correct Answer ✓)</strong>' : ''}</span>
                                </div>
                                <div class="option-box ${correct === 'B' ? 'is-correct' : ''}">
                                    <span class="opt-circle">B</span>
                                    <span>${optB} ${correct === 'B' ? '<strong style="color: var(--emerald-dark); margin-left: 6px;">(Correct Answer ✓)</strong>' : ''}</span>
                                </div>
                                <div class="option-box ${correct === 'C' ? 'is-correct' : ''}">
                                    <span class="opt-circle">C</span>
                                    <span>${optC} ${correct === 'C' ? '<strong style="color: var(--emerald-dark); margin-left: 6px;">(Correct Answer ✓)</strong>' : ''}</span>
                                </div>
                                <div class="option-box ${correct === 'D' ? 'is-correct' : ''}">
                                    <span class="opt-circle">D</span>
                                    <span>${optD} ${correct === 'D' ? '<strong style="color: var(--emerald-dark); margin-left: 6px;">(Correct Answer ✓)</strong>' : ''}</span>
                                </div>
                            </div>
                            <div class="q-explanation">
                                <strong>💡 Solution Explanation:</strong>
                                ${exp}
                            </div>
                            <div class="q-footer">
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
    if (questionsInspectorView) questionsInspectorView.style.display = "none";
    if (setsDirectoryView) setsDirectoryView.style.display = "block";
    if (pageTitle) pageTitle.textContent = "Examinations";
    if (pageSubtitle) pageSubtitle.textContent = "Browse your available question sets and split question banks.";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// -----------------------------------------------------
// UPLOAD QUESTION SET FILE
// -----------------------------------------------------

async function handleUploadSetSubmit() {
    const title = uploadExamTitle ? uploadExamTitle.value.trim() : "";
    const subject = uploadSubject ? uploadSubject.value.trim() : "General Paper";

    if (!title) {
        alert("Please enter the Examination Display Title (how students will see it).");
        return;
    }

    if (!setFileInput || !setFileInput.files || setFileInput.files.length === 0) {
        alert("Please select an Excel (.xlsx, .xls), CSV, or JSON file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subject", subject || "General Paper");
    formData.append("duration", "180");
    formData.append("file", setFileInput.files[0]);

    const prevText = submitUploadButton ? submitUploadButton.textContent : "";
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

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to upload question set.");
        }

        closeModal(uploadModal);
        alert(`🎉 ${data.message}\nThis set is now immediately active and visible in the student portal!`);
        setFileInput.value = "";
        if (selectedFileNameLabel) selectedFileNameLabel.textContent = "Auto-splits each row into an interactive question";
        await fetchSets();
    } catch (err) {
        // Local fallback
        const fName = setFileInput.files[0].name;
        const newLocalSet = {
            id: `SET0${activeSets.length + 1}`,
            title: title,
            subject: subject || "General Paper",
            file_type: fName.endsWith(".csv") ? "csv" : (fName.endsWith(".json") ? "json" : "excel"),
            file_name: fName,
            questions_count: 50,
            duration: 180,
            status: "available",
            questions: [
                {
                    number: 1,
                    text: `Sample Question 1 split from ${fName}: Which protocol is used for secure web browsing?`,
                    options: { A: "HTTP", B: "HTTPS", C: "FTP", D: "SMTP" },
                    answer: "B",
                    explanation: "HTTPS encrypts communications over computer networks."
                }
            ]
        };
        activeSets.unshift(newLocalSet);
        renderSets();
        closeModal(uploadModal);
        alert(`🎉 Question Set "${title}" added and split into single questions!`);
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
        return idMatch || nameMatch || emailMatch;
    });

    if (!filtered.length) {
        studentTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted); padding: 25px;">No students match your query.</td></tr>`;
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

        const roleTd = document.createElement("td");
        roleTd.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: ${s.role === 'Admin' ? '#D97706' : 'var(--emerald-dark)'};">${s.role || 'Student'}</span>`;

        const statusTd = document.createElement("td");
        statusTd.innerHTML = `<span class="status available">${s.active === 1 ? 'Active' : 'Disabled'}</span>`;

        const actionTd = document.createElement("td");
        if (s.role !== "Admin") {
            const delBtn = document.createElement("button");
            delBtn.style.cssText = "background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 6px; color: #C53030; padding: 4px 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;";
            delBtn.textContent = "Remove";
            delBtn.addEventListener("click", () => deleteStudent(s.id, s.user_id));
            actionTd.appendChild(delBtn);
        } else {
            actionTd.innerHTML = `<span style="font-size: 11px; color: var(--muted);">Master Account</span>`;
        }

        tr.append(idTd, nameTd, emailTd, roleTd, statusTd, actionTd);
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
        await fetchStudents();
    } catch (err) {
        alert(`❌ Enrollment Failed: ${err.message}`);
    } finally {
        if (createStudentBtn) {
            createStudentBtn.disabled = false;
            createStudentBtn.textContent = prevText;
        }
    }
}

async function deleteStudent(id, userIdStr) {
    if (!confirm(`Are you sure you want to remove student "${userIdStr}"?`)) {
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

        alert(`Candidate "${userIdStr}" has been removed.`);
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
        if (sidebarAvatar) sidebarAvatar.textContent = inits;
        if (topAvatar) topAvatar.textContent = inits;
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
// EVENT LISTENERS BINDING
// -----------------------------------------------------

function bindEventListeners() {
    // Navigation
    if (questionsNav) questionsNav.addEventListener("click", showQuestionsSection);
    if (studentsNav) studentsNav.addEventListener("click", showStudentsSection);
    if (helpNav) helpNav.addEventListener("click", showHelpSection);

    // Inspector
    if (backToSetsButton) backToSetsButton.addEventListener("click", backToSets);
    if (inspectorQuestionsContainer) {
        inspectorQuestionsContainer.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-delete-single-q");
            if (!btn) return;
            const qNum = Number(btn.getAttribute("data-qnum"));
            const setId = btn.getAttribute("data-setid");
            if (setId && qNum) {
                deleteSingleQuestion(setId, qNum);
            }
        });
    }

    // Toolbar
    if (searchInput) searchInput.addEventListener("input", renderSets);
    if (statusFilter) statusFilter.addEventListener("change", renderSets);
    if (viewToggleButton) viewToggleButton.addEventListener("click", toggleDashboardView);

    // Upload Modal
    if (openUploadModalButton) openUploadModalButton.addEventListener("click", () => openModal(uploadModal));
    if (closeUploadModalButton) closeUploadModalButton.addEventListener("click", () => closeModal(uploadModal));
    if (cancelUploadButton) cancelUploadButton.addEventListener("click", () => closeModal(uploadModal));
    if (submitUploadButton) submitUploadButton.addEventListener("click", handleUploadSetSubmit);

    // File Selector & Drop Box
    if (dropBoxArea && setFileInput) {
        dropBoxArea.addEventListener("click", () => setFileInput.click());
    }
    if (setFileInput) {
        setFileInput.addEventListener("change", () => {
            if (selectedFileNameLabel && setFileInput.files.length > 0) {
                selectedFileNameLabel.textContent = "Selected: " + setFileInput.files[0].name;
            }
        });
    }

    // Student Modal & Table
    if (openStudentModalButton) openStudentModalButton.addEventListener("click", () => openModal(studentModal));
    if (closeStudentModalButton) closeStudentModalButton.addEventListener("click", () => closeModal(studentModal));
    if (cancelStudentButton) cancelStudentButton.addEventListener("click", () => closeModal(studentModal));
    if (createStudentBtn) createStudentBtn.addEventListener("click", handleCreateStudentSubmit);
    if (studentSearchInput) studentSearchInput.addEventListener("input", renderStudents);

    // Profile & Logout
    if (topAvatarButton) topAvatarButton.addEventListener("click", toggleProfileDropdown);
    if (dropdownLogoutButton) dropdownLogoutButton.addEventListener("click", openLogoutModal);
    if (cancelLogoutButton) cancelLogoutButton.addEventListener("click", closeLogoutModal);
    if (logoutCloseIconButton) logoutCloseIconButton.addEventListener("click", closeLogoutModal);
    if (confirmLogoutButton) confirmLogoutButton.addEventListener("click", confirmLogout);

    document.addEventListener("click", (e) => {
        if (profileDropdownWrapper && !profileDropdownWrapper.contains(e.target)) {
            profileDropdownWrapper.classList.remove("open");
        }
    });

    // Restore view mode preference
    try {
        const saved = localStorage.getItem("adminViewMode");
        if (saved === "list") setDashboardView(true);
    } catch (e) {}
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
