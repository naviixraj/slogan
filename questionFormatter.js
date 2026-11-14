/**
 * SLOGON ACADEMY - UNIVERSAL NEAT QUESTION FORMATTER
 * Automatically parses and structures any competitive exam question:
 * - Data Interpretation Tables (single or multiple tables with auto-detected columns)
 * - Match the Following (List I vs. List II)
 * - Statements (Statement I, Statement II) & Assertion-Reason
 * - Passages & Directions
 * - Standard MCQs
 */
"use strict";

(function () {
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderNeatQuestion(raw) {
        if (!raw || typeof raw !== "string") return "";

        const text = raw.trim();

        // If the question already contains raw HTML tables or custom layout divs, return directly inside wrapper
        if (/<table[\s>]/i.test(text) || /<div[\s>]/i.test(text)) {
            return `<div class="neat-question-root">${text}</div>`;
        }

        const lines = text.split(/\r?\n/);
        const blocks = [];
        let currentTable = null;
        let currentPassage = [];
        let currentNormal = [];

        function flushTable() {
            if (currentTable && currentTable.rows.length > 0) {
                blocks.push({
                    type: "table",
                    caption: currentTable.caption,
                    headers: currentTable.headers,
                    rows: currentTable.rows
                });
                currentTable = null;
            }
        }

        function flushPassage() {
            if (currentPassage.length > 0) {
                blocks.push({ type: "passage", text: currentPassage.join(" ") });
                currentPassage = [];
            }
        }

        function flushNormal() {
            if (currentNormal.length > 0) {
                blocks.push({ type: "normal", text: currentNormal.join("\n") });
                currentNormal = [];
            }
        }

        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();

            if (!line) {
                i++;
                continue;
            }

            // Detect table caption: e.g. "Table-1: ...", "Table 1: ...", "Table-2: ..."
            const tableCaptionMatch = line.match(/^(Table\s*[-:\s]\s*\d+[:\s].*|Table\s+\d+[:\s].*)/i);
            if (tableCaptionMatch) {
                flushPassage();
                flushNormal();
                flushTable();

                currentTable = {
                    caption: line,
                    headers: null,
                    rows: []
                };
                i++;
                continue;
            }

            // Detect pipe-separated table rows (contains '|')
            if (line.includes("|")) {
                // Ignore standard markdown divider rows like |---|---|
                if (/^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) {
                    i++;
                    continue;
                }

                const cells = line.split("|").map(c => c.trim()).filter((c, idx, arr) => {
                    // Ignore leading/trailing empty cells from formatted markdown | Cell | Cell |
                    if ((idx === 0 || idx === arr.length - 1) && c === "") return false;
                    return true;
                });

                if (cells.length > 1) {
                    flushPassage();
                    flushNormal();
                    if (!currentTable) {
                        currentTable = {
                            caption: null,
                            headers: cells,
                            rows: []
                        };
                    } else if (!currentTable.headers) {
                        currentTable.headers = cells;
                    } else {
                        currentTable.rows.push(cells);
                    }
                    i++;
                    continue;
                }
            }

            // If we were parsing a table and encounter a non-pipe line, flush table
            if (currentTable) {
                flushTable();
            }

            // Detect Data Passage / Directions header
            if (/^(?:Data passage:|Directions?:|Based on the data|Read the following passage|Consider the following)/i.test(line)) {
                flushNormal();
                currentPassage.push(line);
                i++;
                continue;
            }

            // Continue gathering passage lines until question prompt is reached
            if (currentPassage.length > 0 && !line.includes("?") && !/^(?:What|Which|Find|Calculate|From the year|Considering|In the year|The difference|If|Choose)/i.test(line)) {
                currentPassage.push(line);
                i++;
                continue;
            }

            flushPassage();
            currentNormal.push(line);
            i++;
        }

        flushPassage();
        flushTable();
        flushNormal();

        // Assemble clean, structured, non-congested HTML
        let html = `<div class="neat-question-root">`;

        for (const block of blocks) {
            if (block.type === "passage") {
                html += `
                    <div class="neat-passage-box">
                        <div class="neat-passage-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            DATA PASSAGE / DIRECTIONS
                        </div>
                        <div class="neat-passage-body">${escapeHtml(block.text)}</div>
                    </div>
                `;
            } else if (block.type === "table") {
                html += `<div class="neat-table-section">`;
                if (block.caption) {
                    html += `<div class="neat-table-caption"><span class="neat-table-tag">TABLE</span> ${escapeHtml(block.caption)}</div>`;
                }
                html += `
                    <div class="neat-table-scroll-wrapper">
                        <table class="neat-exam-table">
                `;
                if (block.headers && block.headers.length > 0) {
                    html += `<thead><tr>`;
                    block.headers.forEach((h, hIdx) => {
                        html += `<th class="${hIdx === 0 ? 'col-first' : ''}">${escapeHtml(h)}</th>`;
                    });
                    html += `</tr></thead>`;
                }
                if (block.rows && block.rows.length > 0) {
                    html += `<tbody>`;
                    block.rows.forEach(r => {
                        html += `<tr>`;
                        r.forEach((c, cIdx) => {
                            html += `<td class="${cIdx === 0 ? 'col-first' : 'col-val'}">${escapeHtml(c)}</td>`;
                        });
                        html += `</tr>`;
                    });
                    html += `</tbody>`;
                }
                html += `
                        </table>
                    </div>
                </div>`;
            } else if (block.type === "normal") {
                const subLines = block.text.split("\n");
                subLines.forEach(l => {
                    const trimmed = l.trim();
                    if (!trimmed) return;

                    const stmtMatch = trimmed.match(/^(Statement\s+[I|V|X|\d]+|Assertion\s*\(?[A-Z]?\)?|Reason\s*\(?[A-Z]?\)?|List\s+[I|V|X|\d]+)[:\s\-]+(.*)/i);
                    if (stmtMatch) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">${escapeHtml(stmtMatch[1])}</span>
                                <span class="neat-statement-text">${escapeHtml(stmtMatch[2])}</span>
                            </div>
                        `;
                    } else if (trimmed.includes("?") || /^(?:What|Which|Find|Calculate|The difference|From the year|Considering|In the year|If)/i.test(trimmed)) {
                        html += `<div class="neat-question-query">${escapeHtml(trimmed)}</div>`;
                    } else {
                        html += `<p class="neat-paragraph">${escapeHtml(trimmed)}</p>`;
                    }
                });
            }
        }

        html += `</div>`;
        return html;
    }

    // Attach to global window scope
    if (typeof window !== "undefined") {
        window.renderNeatQuestion = renderNeatQuestion;
    }

    // CommonJS support for testing
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { renderNeatQuestion };
    }
})();
