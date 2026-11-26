(function () {
    // Block right-click save/print/copy shortcuts in the protected viewer
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && ["s", "p", "u", "c"].includes(String(e.key || "").toLowerCase())) {
            e.preventDefault();
        }
    });

    const backBtn = document.getElementById("viewerBackBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            if (window.opener && !window.opener.closed) {
                window.close();
            } else {
                window.location.href = "tests.html";
            }
        });
    }

    const params = new URLSearchParams(window.location.search);
    const noteId = params.get("id");
    const titleEl = document.getElementById("viewerTitle");
    const subEl = document.getElementById("viewerSub");
    const pillEl = document.getElementById("viewerPaperUnit");
    const stageEl = document.getElementById("viewerStage");

    if (!noteId) {
        if (titleEl) titleEl.textContent = "Note Not Specified";
        if (stageEl) stageEl.innerHTML = `<div class="viewer-status">No study note ID was provided.</div>`;
        return;
    }

    async function loadNote() {
        try {
            const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`);
            const data = await res.json();
            if (!res.ok || !data.success || !data.note) {
                throw new Error((data && data.message) || "Unable to load study note.");
            }

            const note = data.note;
            document.title = `${note.title} — SLOGON ACADEMY`;
            if (titleEl) titleEl.textContent = note.title;
            const unitTxt = `${String(note.paper || "").toLowerCase() === "paper 2" ? "அலகு" : "UNIT"} ${note.unit}`;
            if (pillEl) pillEl.textContent = `${note.paper.toUpperCase()} • ${unitTxt}`;
            if (subEl) subEl.textContent = `${note.fileName} • View-only access (downloading disabled)`;

            const ext = String(note.fileType || "").toLowerCase();
            const mime = String(note.fileMime || "").toLowerCase();
            const inlineUrl = note.downloadUrl;

            if (ext === "pdf" || mime.includes("pdf")) {
                stageEl.innerHTML = `<iframe class="viewer-frame" src="${inlineUrl}#toolbar=0&navpanes=0&scrollbar=1" title="${note.title}"></iframe>`;
            } else if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(ext) || mime.startsWith("image/")) {
                stageEl.innerHTML = `<div style="padding:16px;"><img class="viewer-img" src="${inlineUrl}" alt="${note.title}" draggable="false"></div>`;
            } else if (["txt", "csv", "json", "md", "log"].includes(ext) || mime.startsWith("text/")) {
                const txtRes = await fetch(inlineUrl);
                const text = await txtRes.text();
                const pre = document.createElement("div");
                pre.className = "viewer-text";
                pre.textContent = text;
                stageEl.innerHTML = "";
                stageEl.appendChild(pre);
            } else {
                stageEl.innerHTML = `<iframe class="viewer-frame" src="${inlineUrl}" title="${note.title}"></iframe>`;
            }
        } catch (err) {
            if (titleEl) titleEl.textContent = "Unable to Open Note";
            if (stageEl) stageEl.innerHTML = `<div class="viewer-status">${err.message || "Error loading study note."}</div>`;
        }
    }

    loadNote();
})();
