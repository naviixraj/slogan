/**
 * SLOGON ACADEMY - UNIVERSAL NEAT QUESTION & TABLE FORMATTER
 * Faithfully formats questions exactly as they appear in uploaded documents:
 * - Data Interpretation Tables (vertical cell streams, markdown tables, HTML tables)
 * - Match the Following & Chronology questions
 * - Statement lists: Roman numerals (i)-(x), Arabic (1)-(4), English/Tamil Assertion & Reason
 * - Passages & Direction Cards
 * - Clean prompt headers and stray metadata filtering
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

    function isNumericValue(val) {
        if (!val) return false;
        const s = String(val).trim().replace(/,/g, "");
        return /^[-+]?\d+(\.\d+)?%?$/.test(s);
    }

    function isHeaderCell(str) {
        if (!str || typeof str !== "string") return false;
        const s = str.trim();
        if (s.length > 50) return false;
        if (s.split(/\s+/).length > 6) return false;
        if (/[;\.\?!]/.test(s) && !/^\d+\.\d+$/.test(s) && !/^\([A-Za-z0-9]+\)$/.test(s)) return false;
        return true;
    }

    // Helper: detect vertical table dump (headers followed by repeating rows of N items)
    function detectVerticalTable(lines, startIdx) {
        if (startIdx >= lines.length) return null;

        if (!isHeaderCell(lines[startIdx])) return null;

        let firstNumIdx = -1;
        for (let j = startIdx; j < Math.min(lines.length, startIdx + 30); j++) {
            if (isNumericValue(lines[j])) {
                firstNumIdx = j;
                break;
            }
            if (!isHeaderCell(lines[j])) {
                return null;
            }
        }

        if (firstNumIdx <= startIdx + 1) return null;

        const row1LabelIdx = firstNumIdx - 1;
        const headers = lines.slice(startIdx, row1LabelIdx);
        const colCount = headers.length;

        if (colCount < 2 || colCount > 15) return null;

        let currIdx = row1LabelIdx;
        const rows = [];

        while (currIdx + colCount <= lines.length) {
            const potentialRow = lines.slice(currIdx, currIdx + colCount);
            const remainingCells = potentialRow.slice(1);
            const numCount = remainingCells.filter(isNumericValue).length;

            if (numCount >= Math.floor((colCount - 1) * 0.6)) {
                rows.push(potentialRow);
                currIdx += colCount;
            } else {
                break;
            }
        }

        if (rows.length >= 1) {
            return {
                headers,
                rows,
                consumedCount: currIdx - startIdx
            };
        }

        return null;
    }

    function renderNeatQuestion(raw, options) {
        if (!raw || typeof raw !== "string") return "";

        const text = raw.trim();

        // If the question already contains clean HTML tables, return wrapped
        if (/<table[\s>]/i.test(text) && /<\/table>/i.test(text)) {
            return `<div class="neat-question-root">${text}</div>`;
        }

        let lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // Filter out stray page headers/footers (e.g. "நிரல்படுத்துக வினாக்கள்", "Page 1 of 5")
        lines = lines.filter(l => !/^(?:நிரல்படுத்துக வினாக்கள்|Page\s+\d+|--\s*\d+\s*--)$/i.test(l));

        // Check if options refer to Roman numerals (i), (ii), etc.
        let optionsMentionRoman = false;
        if (options && typeof options === "object") {
            const optValues = Object.values(options).join(" ");
            optionsMentionRoman = /\(?([i|v|x]+)\)/i.test(optValues);
        } else {
            optionsMentionRoman = /\(i\).*\(ii\)/i.test(text);
        }

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
                blocks.push({ type: "normal", lines: currentNormal });
                currentNormal = [];
            }
        }

        let i = 0;
        while (i < lines.length) {
            const line = lines[i];

            // 1. Detect table caption: e.g. "Table-1: ...", "Table 1: ...", "அட்டவணை 1: ..."
            const tableCaptionMatch = line.match(/^(Table\s*[-:\s]\s*\d+[:\s].*|Table\s+\d+[:\s].*|அட்டவணை\s*[-:\s]?\s*\d+[:\s].*)/i);
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

            // 2. Check for vertical table stream
            const vertTable = detectVerticalTable(lines, i);
            if (vertTable) {
                flushPassage();
                flushNormal();
                
                const caption = currentTable ? currentTable.caption : null;
                blocks.push({
                    type: "table",
                    caption: caption,
                    headers: vertTable.headers,
                    rows: vertTable.rows
                });
                currentTable = null;
                i += vertTable.consumedCount;
                continue;
            }

            // 3. Detect pipe-separated markdown table rows (contains '|')
            if (line.includes("|")) {
                if (/^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) {
                    i++;
                    continue;
                }

                const cells = line.split("|").map(c => c.trim()).filter((c, idx, arr) => {
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

            if (currentTable) {
                flushTable();
            }

            // 4. Detect Data Passage / Directions header
            if (/^(?:The following Table|Based on the data|Data passage:|Directions?:|Read the following passage|Consider the following|பத்தியைப் படித்து)/i.test(line)) {
                flushNormal();
                currentPassage.push(line);
                i++;
                continue;
            }

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

        // Assemble clean, structured HTML
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
                        html += `<th class="${hIdx === 0 ? 'col-first' : 'col-val'}">${escapeHtml(h)}</th>`;
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
                const rawLines = block.lines;

                let startIdx = 0;
                const promptHeaderMatch = rawLines[0] && rawLines[0].match(/^(கீழ்க்காணும் கூற்றுகளைக் கருத்தில் கொள்க|காலவரிசை வினா|பொருத்துக|சரியான கூற்றைத் தேர்ந்தெடுக்க|Consider the following statements|Match the following)[:\s\-]*$/i);
                
                if (promptHeaderMatch) {
                    html += `
                        <div class="neat-prompt-header">
                            <span class="neat-prompt-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                ${escapeHtml(rawLines[0])}
                            </span>
                        </div>
                    `;
                    startIdx = 1;
                }

                const remaining = rawLines.slice(startIdx);
                const romanMap = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)"];
                const needsAutoRoman = optionsMentionRoman && remaining.length >= 2 && remaining.length <= 8 && !remaining.some(l => /^\(?([i|v|x]+)\)/i.test(l));

                remaining.forEach((lineText, idx) => {
                    const trimmed = lineText.trim();
                    if (!trimmed) return;

                    const romanMatch = trimmed.match(/^\(?([i|v|x]+)\)[\.\:\-\s]+(.*)/i);
                    const tamilStmtMatch = trimmed.match(/^(கூற்று\s*\(?[A-Za-z0-9]?\)?|காரணம்\s*\(?[A-Za-z0-9]?\)?|பட்டியல்\s+[I|V|X|\d]+)[:\s\-]+(.*)/i);
                    const engStmtMatch = trimmed.match(/^(Statement\s+[I|V|X|\d]+|Assertion\s*\(?[A-Z]?\)?|Reason\s*\(?[A-Z]?\)?|List\s+[I|V|X|\d]+)[:\s\-]+(.*)/i);
                    const letterMatch = trimmed.match(/^\(([a-d])\)[\.\:\-\s]+(.*)/i);

                    if (romanMatch) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">(${romanMatch[1].toLowerCase()})</span>
                                <span class="neat-statement-text">${escapeHtml(romanMatch[2])}</span>
                            </div>
                        `;
                    } else if (tamilStmtMatch) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">${escapeHtml(tamilStmtMatch[1])}</span>
                                <span class="neat-statement-text">${escapeHtml(tamilStmtMatch[2])}</span>
                            </div>
                        `;
                    } else if (engStmtMatch) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">${escapeHtml(engStmtMatch[1])}</span>
                                <span class="neat-statement-text">${escapeHtml(engStmtMatch[2])}</span>
                            </div>
                        `;
                    } else if (letterMatch) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">(${letterMatch[1].toLowerCase()})</span>
                                <span class="neat-statement-text">${escapeHtml(letterMatch[2])}</span>
                            </div>
                        `;
                    } else if (needsAutoRoman && idx < romanMap.length) {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">${romanMap[idx]}</span>
                                <span class="neat-statement-text">${escapeHtml(trimmed)}</span>
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
