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

    function parseMatchLists(text) {
        if (!text || typeof text !== "string") return null;

        // 1. Check for side-by-side header format: "List I    List II" followed by paired rows
        const sbsHeaderRegex = /(?:^|\n)\s*(List\s*[-–—:]?\s*(?:I|1|A|One)|பட்டியல்\s*[-–—:]?\s*(?:I|1|ஒன்று|முதல்)[^\n]*?)(?:\s{2,}|\t|\s+)(List\s*[-–—:]?\s*(?:II|2|B|Two)|பட்டியல்\s*[-–—:]?\s*(?:II|2|இரண்டு)[^\n]*)\s*\n([\s\S]*?)(?=(?:\n\s*(?:Options|விருப்பங்கள்|தெரிவுகள்|Choose\s+the\s+correct|கீழே\s+தரப்பெற்றுள்ள)|$))/i;
        const sbsMatch = text.match(sbsHeaderRegex);
        if (sbsMatch) {
            const titleI = sbsMatch[1].trim().replace(/[:\-\–—\s]+$/, "");
            const titleII = sbsMatch[2].trim().replace(/[:\-\–—\s]+$/, "");
            const body = sbsMatch[3].trim();
            const lines = body.split("\n").map(l => l.trim()).filter(Boolean);
            const rowRegex = /^\(?([A-Da-d\d]+)\)?[\.:\-\)]?\s*([^\n\(\)]+?)\s+\(?([A-Da-dI|V|X\d]+)\)?[\.:\-\)]?\s*([^\n]+)$/i;
            const sbsItemsI = [];
            const sbsItemsII = [];
            for (const l of lines) {
                const rm = l.match(rowRegex);
                if (rm) {
                    const t1 = rm[2].trim();
                    const t2 = rm[4].trim();
                    if (t1.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0 && t2.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0) {
                        sbsItemsI.push({ key: rm[1].toUpperCase(), text: t1 });
                        sbsItemsII.push({ key: rm[3].toUpperCase(), text: t2 });
                    }
                }
            }
            if (sbsItemsI.length >= 2 && sbsItemsII.length >= 2) {
                return {
                    preamble: text.slice(0, sbsMatch.index).trim(),
                    listI: { title: titleI, items: sbsItemsI },
                    listII: { title: titleII, items: sbsItemsII },
                    postamble: text.slice(sbsMatch.index + sbsMatch[0].length).trim()
                };
            }
        }

        // 2. Check for sequential format: "List I ... List II ..."
        const listRegex = /(?:^|\n)\s*(List\s*[-–—:]?\s*(?:I|1|A|One)|பட்டியல்\s*[-–—:]?\s*(?:I|1|ஒன்று|முதல்)(?:\s*\([^A-Da-dI|V|X\d\)]+\))?)[:\s\-]*\n?([\s\S]*?)(?:^|\n)\s*(List\s*[-–—:]?\s*(?:II|2|B|Two)|பட்டியல்\s*[-–—:]?\s*(?:II|2|இரண்டு)(?:\s*\([^A-Da-dI|V|X\d\)]+\))?)[:\s\-]*\n?([\s\S]*?)(?=(?:\n\s*(?:Choose\s+the\s+correct|கீழே\s+தரப்பெற்றுள்ள|விருப்பங்கள்|தெரிவுகள்|Options)|$))/i;
        const match = text.match(listRegex);
        if (!match) return null;

        const titleI = match[1].trim().replace(/[:\-\–—\s]+$/, "");
        const bodyI = match[2].trim().replace(/^[:\-\–—\s]+/, "");
        const titleII = match[3].trim().replace(/[:\-\–—\s]+$/, "");
        const bodyII = match[4].trim().replace(/^[:\-\–—\s]+/, "");

        function splitItems(str) {
            // First check line-by-line
            const rawLines = str.split("\n").map(l => l.trim()).filter(Boolean);
            const lines = rawLines.filter(l => l.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0);
            const items = [];

            for (const line of lines) {
                let m = line.match(/^\(?([A-Da-dI|V|X|\d]+)\)?[\.:\-\)]\s*(.*)/i);
                if (!m) {
                    m = line.match(/^([A-Da-dI|V|X|\d]+)\s+(.*)/i);
                }
                if (m) {
                    const itemText = m[2].trim();
                    if (itemText.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0) {
                        items.push({ key: m[1].toUpperCase(), text: itemText });
                    }
                } else if (line.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0) {
                    items.push({ key: "", text: line });
                }
            }

            if (items.length >= 2) return items;

            // Fallback for inline items: (A) Text (B) Text
            const inlineRegex = /(?:^|\n|\s{2,}|\s)(?:\(?([A-Da-dI|V|X|\d]+)\)?[\.:\-\)]|\(([A-Da-dI|V|X|\d]+)\))\s+/g;
            const matches = [];
            let im;
            while ((im = inlineRegex.exec(str)) !== null) {
                matches.push({ key: (im[1] || im[2]).toUpperCase(), index: im.index, len: im[0].length });
            }
            if (matches.length >= 2) {
                const inlineItems = [];
                for (let i = 0; i < matches.length; i++) {
                    const nextIdx = matches[i + 1] ? matches[i + 1].index : str.length;
                    const itemText = str.slice(matches[i].index + matches[i].len, nextIdx).trim();
                    if (itemText.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0) {
                        inlineItems.push({
                            key: matches[i].key,
                            text: itemText
                        });
                    }
                }
                return inlineItems;
            }

            return items;
        }

        const itemsI = splitItems(bodyI);
        const itemsII = splitItems(bodyII);

        if (itemsI.length < 2 || itemsII.length < 2) return null;

        return {
            preamble: text.slice(0, match.index).trim(),
            listI: { title: titleI, items: itemsI },
            listII: { title: titleII, items: itemsII },
            postamble: text.slice(match.index + match[0].length).trim()
        };
    }

    function parseAssertionReason(text) {
        if (!text || typeof text !== "string") return null;

        let workingText = text;
        const preambleParts = [];

        // 1. Detect and separate prompt headers such as:
        // "உறுதிக்கூற்று - காரணம் (கலித்தொகைத் திணை மரபு)"
        // "[உறுதிக்கூற்று - காரணம்]."
        // "கூற்று – காரணம் வினா"
        // "Assertion - Reason (...)"
        const headerMatch = workingText.match(/^\s*\[?\s*(?:Assertion|கூற்று|உறுதிக்கூற்று)\s*(?:[-–—:]|\s+மற்றும்\s+|\s+and\s+|&)\s*(?:Reason|காரணம்)[^\]\n]*\]?[\.:\s]*\n?/i);
        if (headerMatch) {
            preambleParts.push(headerMatch[0].trim());
            workingText = workingText.slice(headerMatch[0].length);
        }

        const arRegex = /(?:^|\n|\s*)(Assertion(?:\s*\([^)\n]+\))?|கூற்று(?:\s*\([^)\n]+\))?|உறுதிக்கூற்று(?:\s*\([^)\n]+\))?)[:\.\-\s]*:?\s*([\s\S]*?)(?:^|\n|\s*)(Reason(?:\s*\([^)\n]+\))?|காரணம்(?:\s*\([^)\n]+\))?)[:\.\-\s]*:?\s*([\s\S]*?)(?=(?:\n\s*(?:Choose\s+the\s+correct|விருப்பங்கள்|தெரிவுகள்|கீழே\s+தரப்பெற்றுள்ள)|\n\s*\([1-4A-Dஅஆஇஈ]\)|$))/i;
        const match = workingText.match(arRegex);
        if (!match) return null;

        const assertionText = match[2].trim().replace(/^[:\-\–—\s]+/, "");
        const reasonText = match[4].trim().replace(/^[:\-\–—\s]+/, "");

        // Safety: Assertion and Reason MUST both have non-empty, meaningful text
        if (assertionText.replace(/[:\-\–—\s\.\,\;]/g, "").length === 0 ||
            reasonText.replace(/[:\-\–—\s\.\,\;]/g, "").length === 0) {
            return null;
        }

        const inlinePreamble = workingText.slice(0, match.index).trim();
        if (inlinePreamble) preambleParts.push(inlinePreamble);

        return {
            preamble: preambleParts.join("\n").trim(),
            assertion: {
                badge: match[1].trim(),
                text: assertionText
            },
            reason: {
                badge: match[3].trim(),
                text: reasonText
            },
            postamble: workingText.slice(match.index + match[0].length).trim()
        };
    }

    function parseArrowMatch(text) {
        if (!text || (!text.includes("$\\leftrightarrow$") && !text.includes("<->") && !text.includes("↔"))) return null;

        const headerRegex = /([^\n]+?)\s*(?:\$\s*\\leftrightarrow\s*\$|<->|↔)\s*([^\n:]+):?/i;
        const headerMatch = text.match(headerRegex);

        const lineRegex = /(?:^|\n)\s*\(?([A-Da-dI|V|X|\d]+)\)?[\.:\-\s]*([^$\n↔<]+?)\s*(?:\$\s*\\leftrightarrow\s*\$|<->|↔)\s*\(?([A-Da-dI|V|X|\d]+)\)?[\.:\-\s]*([^\n]+)/g;

        const itemsI = [];
        const itemsII = [];
        let lm;
        let firstIdx = -1;
        let lastIdx = -1;

        while ((lm = lineRegex.exec(text)) !== null) {
            if (firstIdx === -1) firstIdx = lm.index;
            lastIdx = lm.index + lm[0].length;
            itemsI.push({ key: lm[1].toUpperCase(), text: lm[2].trim() });
            itemsII.push({ key: lm[3].toUpperCase(), text: lm[4].trim() });
        }

        if (itemsI.length < 2) return null;

        let preamble = "";
        let postamble = "";
        if (headerMatch && headerMatch.index < firstIdx) {
            preamble = text.slice(0, headerMatch.index).trim();
        } else {
            preamble = text.slice(0, firstIdx).trim();
        }
        postamble = text.slice(lastIdx).trim();

        const titleI = headerMatch ? headerMatch[1].trim() : "பட்டியல் I";
        const titleII = headerMatch ? headerMatch[2].trim() : "பட்டியல் II";

        return {
            preamble,
            listI: { title: titleI, items: itemsI },
            listII: { title: titleII, items: itemsII },
            postamble
        };
    }

    function parseMultiStatements(text) {
        if (!text || typeof text !== "string") return null;

        // Skip if this is a match-the-following or assertion-reason block
        if (/(?:List\s*[-–—:]?\s*(?:I|1|A|One)|பட்டியல்\s*[-–—:]?\s*(?:I|1|ஒன்று|முதல்))/i.test(text) &&
            /(?:List\s*[-–—:]?\s*(?:II|2|B|Two)|பட்டியல்\s*[-–—:]?\s*(?:II|2|இரண்டு))/i.test(text)) {
            return null;
        }
        if (/(?:Assertion\s*\(?[A-Z]?\)?|கூற்று\s*\(?[A-Za-z0-9]?\)?|உறுதிக்கூற்று)/i.test(text) &&
            /(?:Reason\s*\(?[A-Z]?\)?|காரணம்\s*\(?[A-Za-z0-9]?\)?)/i.test(text)) {
            return null;
        }

        // 0. Dedicated Statement 1 and Statement 2 / கூற்று 1 மற்றும் கூற்று 2 handler
        let cleanText = text;
        let titleLine = "";
        const headerTitleRegex = /^\s*\[?\s*(?:கூற்று\s*1\s*[-–—]\s*கூற்று\s*2|Statement\s*(?:1|I)\s*[-–—]\s*Statement\s*(?:2|II))[^\n\]]*\]?[\.:]?\s*/i;
        const hMatch = cleanText.match(headerTitleRegex);
        if (hMatch) {
            titleLine = hMatch[0].replace(/[\[\]]/g, "").trim();
            cleanText = cleanText.slice(hMatch[0].length).trim();
        }

        const stmtPairRegex = /(?:^|\n|\s*)(கூற்று\s*1|Statement\s*(?:1|I))[:\.]\s*([\s\S]*?)(?:\.\s+|\n\s*|\s{2,})(கூற்று\s*2|Statement\s*(?:2|II))[:\.]\s*([\s\S]*)$/i;
        const pairMatch = cleanText.match(stmtPairRegex);
        if (pairMatch) {
            let postamble = "";
            let s2Text = pairMatch[4].trim();
            const postMatchRegex = /(?:\n\s*|\s{2,}|\.\s+)(?:Which\s+of|Choose\s+the|கீழே\s+தரப்பெற்றுள்ள|கீழே\s+கொடுக்கப்பட்டுள்ள|மேற்கண்டவற்றுள்|சரியான\s*பதில்|சரியான\s*விடை)[\s\S]*$/i;
            const pm = s2Text.match(postMatchRegex);
            if (pm) {
                postamble = pm[0].replace(/^\.\s+/, "").trim().replace(/\n\s*/g, " ");
                s2Text = s2Text.slice(0, pm.index).trim();
            }
            return {
                preamble: titleLine,
                statements: [
                    { badge: pairMatch[1].trim(), text: pairMatch[2].trim().replace(/\s+/g, " ") },
                    { badge: pairMatch[3].trim(), text: s2Text.replace(/\s+/g, " ") }
                ],
                postamble
            };
        }

        const postMatchRegex = /(?:^|\n\s*|\s{2,}|\.\s+)(?:Which\s+(?:of\s+(?:the\s+)?(?:above|statements?|these)|statements?|one\s+of)|Choose\s+(?:the\s+)?correct|In\s+the\s+light\s+of\s+the\s+above|மேற்கண்டவற்றுள்|கீழ்க்கண்டவற்றுள்|கீழே\s+கொடுக்கப்பட்டுள்ள|சரியான\s*விடை)[\s\S]*$/i;

        // 1. Letters: A, B, C, D (or A., B., C., D. or (A), (B), (C), (D))
        const letterRegex = /(?:^|\n|\s{2,}|\s)(?:\(([A-D])\)|([A-D])[\.:\-\)])\s+/g;
        const lMatches = [];
        let lm;
        while ((lm = letterRegex.exec(text)) !== null) {
            lMatches.push({
                label: `(${lm[1] || lm[2]})`.toUpperCase(),
                raw: (lm[1] || lm[2]).toUpperCase(),
                index: lm.index,
                contentStart: lm.index + lm[0].length
            });
        }

        let startL = -1;
        for (let i = 0; i < lMatches.length; i++) {
            if (lMatches[i].raw === "A" && lMatches[i + 1] && lMatches[i + 1].raw === "B" && lMatches[i + 2] && lMatches[i + 2].raw === "C") {
                startL = i;
                break;
            }
        }

        if (startL !== -1) {
            const preamble = text.slice(0, lMatches[startL].index).trim().replace(/\n\s*/g, " ");
            const stmts = [];
            const chosen = lMatches.slice(startL);
            let postamble = "";

            for (let i = 0; i < chosen.length; i++) {
                const curr = chosen[i];
                const next = chosen[i + 1];
                let rawChunk = text.slice(curr.contentStart, next ? next.index : text.length).trim();
                
                if (!next) {
                    const pm = rawChunk.match(postMatchRegex);
                    if (pm) {
                        postamble = pm[0].replace(/^\.\s+/, "").trim().replace(/\n\s*/g, " ");
                        rawChunk = rawChunk.slice(0, pm.index).trim();
                    }
                }

                rawChunk = rawChunk.replace(/\s+/g, " ").trim();
                stmts.push({
                    badge: curr.label,
                    text: rawChunk
                });
            }
            return { preamble, statements: stmts, postamble };
        }

        // 2. Statements: Statement I, Statement II or கூற்று 1, கூற்று 2
        const stmtWordRegex = /(?:^|\n|\s{2,}|\s)(Statement\s+(?:I|II|III|IV|1|2|3|4)|கூற்று\s*(?:I|II|III|IV|1|2|3|4|ஒன்று|இரண்டு))[:\s\-]+/gi;
        const sMatches = [];
        let sm;
        while ((sm = stmtWordRegex.exec(text)) !== null) {
            sMatches.push({
                label: sm[1].trim(),
                index: sm.index,
                contentStart: sm.index + sm[0].length
            });
        }
        if (sMatches.length >= 2) {
            const preamble = text.slice(0, sMatches[0].index).trim().replace(/\n\s*/g, " ");
            const stmts = [];
            let postamble = "";
            for (let i = 0; i < sMatches.length; i++) {
                const curr = sMatches[i];
                const next = sMatches[i + 1];
                let rawChunk = text.slice(curr.contentStart, next ? next.index : text.length).trim();
                if (!next) {
                    const pm = rawChunk.match(postMatchRegex);
                    if (pm) {
                        postamble = pm[0].replace(/^\.\s+/, "").trim().replace(/\n\s*/g, " ");
                        rawChunk = rawChunk.slice(0, pm.index).trim();
                    }
                }
                rawChunk = rawChunk.replace(/\s+/g, " ").trim();
                stmts.push({
                    badge: curr.label,
                    text: rawChunk
                });
            }
            return { preamble, statements: stmts, postamble };
        }

        // 3. Roman numerals: (i), (ii), (iii), (iv)
        const romanRegex = /(?:^|\n|\s{2,}|\s)(?:\(([i|v|x]+)\)|([i|v|x]+)[\.:\-\)])\s+/gi;
        const rMatches = [];
        let rm;
        while ((rm = romanRegex.exec(text)) !== null) {
            const val = (rm[1] || rm[2]).toLowerCase();
            rMatches.push({
                label: `(${val})`,
                raw: val,
                index: rm.index,
                contentStart: rm.index + rm[0].length
            });
        }
        let startR = -1;
        for (let i = 0; i < rMatches.length; i++) {
            if (rMatches[i].raw === "i" && rMatches[i + 1] && rMatches[i + 1].raw === "ii") {
                startR = i;
                break;
            }
        }
        if (startR !== -1) {
            const preamble = text.slice(0, rMatches[startR].index).trim();
            const stmts = [];
            const chosen = rMatches.slice(startR);
            let postamble = "";
            for (let i = 0; i < chosen.length; i++) {
                const curr = chosen[i];
                const next = chosen[i + 1];
                let rawChunk = text.slice(curr.contentStart, next ? next.index : text.length).trim();
                if (!next) {
                    const pm = rawChunk.match(postMatchRegex);
                    if (pm) {
                        postamble = pm[0].replace(/^\.\s+/, "").trim().replace(/\n\s*/g, " ");
                        rawChunk = rawChunk.slice(0, pm.index).trim();
                    }
                }
                rawChunk = rawChunk.replace(/\s+/g, " ").trim();
                stmts.push({
                    badge: curr.label,
                    text: rawChunk
                });
            }
            return { preamble, statements: stmts, postamble };
        }

        return null;
    }

    function renderPassageBlock(rawText) {
        if (!rawText) return "";
        let s = rawText.trim();
        let directions = "";
        let heading = "";
        let tableNote = "";

        // 1. Separate Directions if present
        const dirMatch = s.match(/^(?:#+\s*)?(Directions?:|வழிமுறைகள்?:?)\s*([^\n]*?\b(?:Questions?|வினாக்கள்?)\s*\d+[\s\S]*?\d+\.?)(?=\s*(?:Passage|பத்தி)|\n|$)/i);
        if (dirMatch) {
            directions = (dirMatch[1] + " " + dirMatch[2]).trim();
            s = s.slice(dirMatch[0].length).trim();
        } else {
            const dirSimpleMatch = s.match(/^(?:#+\s*)?(Directions?:|வழிமுறைகள்?:?)\s*(Read the following passage[^\n\.]*\.?|பின்வரும் பத்தியைப் படித்து[^\n\.]*\.?)(?=\s*(?:Passage|பத்தி)|\n|$)/i);
            if (dirSimpleMatch) {
                directions = (dirSimpleMatch[1] + " " + dirSimpleMatch[2]).trim();
                s = s.slice(dirSimpleMatch[0].length).trim();
            }
        }

        // 2. Separate Heading if present
        const headMatch = s.match(/^(?:#+\s*)?(Passage|பத்தி)[:\s]*/i);
        if (headMatch) {
            heading = headMatch[1].trim();
            s = s.slice(headMatch[0].length).trim();
        } else if (directions && !heading) {
            heading = /வழிமுறைகள்/i.test(directions) ? "பத்தி" : "Passage";
        }

        // 3. Separate Table Context / Introduction Note if present at the end
        const tableNoteMatch = s.match(/\s*((?:The following (?:Table|Data|Chart|Information)|பின்வரும் (?:அட்டவணை|தகவல்))[\s\S]*)$/i);
        if (tableNoteMatch) {
            tableNote = tableNoteMatch[1].trim();
            s = s.slice(0, tableNoteMatch.index).trim();
        }

        // 4. Split body into paragraphs
        let paragraphs = s.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        if (paragraphs.length <= 1) {
            const lineSplit = s.split(/\n+/).map(p => p.trim()).filter(Boolean);
            if (lineSplit.length > 1) {
                paragraphs = lineSplit;
            }
        }
        if (paragraphs.length === 0 && s) {
            paragraphs = [s];
        }

        let out = `<div class="neat-passage-box">`;

        // Directions Banner
        if (directions) {
            const isTamil = /வழிமுறைகள்/i.test(directions);
            const tag = isTamil ? "வழிமுறைகள்" : "Directions";
            const textOnly = directions.replace(/^(?:Directions?:|வழிமுறைகள்?:?)\s*/i, "").trim();
            out += `
                <div class="neat-passage-directions">
                    <span class="neat-directions-tag">${escapeHtml(tag)}</span>
                    <span class="neat-directions-text">${escapeHtml(textOnly || directions)}</span>
                </div>
            `;
        }

        // Passage Content Card
        if (heading || paragraphs.length > 0) {
            out += `<div class="neat-passage-content-card">`;
            if (heading) {
                out += `<h4 class="neat-passage-heading">${escapeHtml(heading)}</h4>`;
            }
            if (paragraphs.length > 0) {
                out += `<div class="neat-passage-body">`;
                for (const p of paragraphs) {
                    out += `<p class="neat-passage-paragraph">${escapeHtml(p)}</p>`;
                }
                out += `</div>`;
            }
            out += `</div>`;
        }

        // Table Note Card
        if (tableNote) {
            out += `
                <div class="neat-passage-table-note">
                    <div class="neat-table-note-header">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        Data Reference Note
                    </div>
                    <p class="neat-passage-paragraph" style="margin-bottom:0;">${escapeHtml(tableNote)}</p>
                </div>
            `;
        }

        out += `</div>`;
        return out;
    }

    function renderNeatQuestion(raw, options) {
        if (!raw || typeof raw !== "string") return "";

        let text = raw.trim();

        // Normalize split prompt headers like "பல்கூற்று \n\n த் தேர்வு வினா" or "காலவரிசை \n\n வினா"
        text = text.replace(/^(?:\[?\s*)?(பல்கூற்று|பல்நோக்கு|காலவரிசை|நிரல்படுத்துக|பொருத்துக|கூற்று)\s*\n+\s*(?:த்?\s*தேர்வு\s*)?(வினா|காரணம்)[^\]\n]*\]?/im, (match, p1, p2) => {
            if (/தேர்வு/i.test(match)) return `${p1}த் தேர்வு ${p2}`;
            return `${p1} ${p2}`;
        });
        text = text.replace(/^பல்கூற்று\s*\n+\s*த்\s*தேர்வு\s*வினா/im, "பல்கூற்றுத் தேர்வு வினா");

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
                blocks.push({ type: "passage", text: currentPassage.join("\n\n") });
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
            if (/^(?:#+\s*(?:Reading Comprehension|Passage|பத்தி)|\*\*Directions|\*\*Passage|The following Table|Based on the data|Data passage:|Directions?:|வழிமுறைகள்?:?|Read the following passage|பின்வரும் பத்தியைப் படித்து|Consider the following|பத்தியைப் படித்து|^Passage\b|^பத்தி\b)/i.test(line)) {
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
                html += renderPassageBlock(block.text);
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
                        const hasContent = r.some(c => c && c.replace(/[:\-\–—\s\.\,\;]/g, "").length > 0);
                        if (!hasContent) return;
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
                const blockText = block.lines.join("\n");
                const matchLists = parseMatchLists(blockText) || parseArrowMatch(blockText);
                const ar = !matchLists ? parseAssertionReason(blockText) : null;
                const multiStmts = (!matchLists && !ar) ? parseMultiStatements(blockText) : null;

                if (matchLists) {
                    if (matchLists.preamble) {
                        html += `<div class="neat-question-query">${escapeHtml(matchLists.preamble)}</div>`;
                    }
                    const maxRows = Math.max(matchLists.listI.items.length, matchLists.listII.items.length);
                    html += `
                        <div class="neat-table-section">
                            <div class="neat-table-scroll-wrapper">
                                <table class="neat-exam-table">
                                    <thead>
                                        <tr>
                                            <th class="col-first">${escapeHtml(matchLists.listI.title)}</th>
                                            <th class="col-val">${escapeHtml(matchLists.listII.title)}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;
                    for (let r = 0; r < maxRows; r++) {
                        const item1 = matchLists.listI.items[r];
                        const item2 = matchLists.listII.items[r];
                        const text1 = item1 ? (item1.key ? `<strong>(${escapeHtml(item1.key)})</strong> ${escapeHtml(item1.text)}` : escapeHtml(item1.text)) : "";
                        const text2 = item2 ? (item2.key ? `<strong>(${escapeHtml(item2.key)})</strong> ${escapeHtml(item2.text)}` : escapeHtml(item2.text)) : "";
                        
                        // Safety: ignore any row where BOTH cells are empty or only punctuation
                        const clean1 = text1.replace(/<[^>]*>/g, "").replace(/[:\-\–—\s\.\,\;]/g, "");
                        const clean2 = text2.replace(/<[^>]*>/g, "").replace(/[:\-\–—\s\.\,\;]/g, "");
                        if (!clean1 && !clean2) continue;

                        html += `
                            <tr>
                                <td class="col-first">${text1}</td>
                                <td class="col-val">${text2}</td>
                            </tr>
                        `;
                    }
                    html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                    if (matchLists.postamble) {
                        html += `<div class="neat-question-query">${escapeHtml(matchLists.postamble)}</div>`;
                    }
                } else if (ar) {
                    if (ar.preamble) {
                        html += `<div class="neat-question-query">${escapeHtml(ar.preamble)}</div>`;
                    }
                    html += `
                        <div class="neat-ar-wrapper">
                            <div class="neat-ar-card neat-ar-assertion">
                                <span class="neat-ar-badge">${escapeHtml(ar.assertion.badge)}</span>
                                <div class="neat-ar-text">${escapeHtml(ar.assertion.text)}</div>
                            </div>
                            <div class="neat-ar-card neat-ar-reason">
                                <span class="neat-ar-badge">${escapeHtml(ar.reason.badge)}</span>
                                <div class="neat-ar-text">${escapeHtml(ar.reason.text)}</div>
                            </div>
                        </div>
                    `;
                    if (ar.postamble) {
                        html += `<div class="neat-question-query">${escapeHtml(ar.postamble)}</div>`;
                    }
                } else if (multiStmts) {
                    if (multiStmts.preamble) {
                        const pLines = multiStmts.preamble.split(/\n+/).map(l => l.trim()).filter(Boolean);
                        let pQuery = multiStmts.preamble;
                        if (pLines.length > 1 && /^(?:\[[^\]]+\]|பல்கூற்றுத்?\s*தேர்வு\s*வினா|பல்கூற்று\s*வினா|பல்நோக்கு\s*வினா|காலவரிசை\s*வினா|நிரல்படுத்துக\s*வினா|பொருத்துக\s*வினா|கூற்று\s*–?\s*காரணம்\s*வினா|காலவரிசை|நிரல்படுத்துக|பொருத்துக|கூற்று)/i.test(pLines[0])) {
                            html += `
                                <div class="neat-prompt-header">
                                    <span class="neat-prompt-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        ${escapeHtml(pLines[0])}
                                    </span>
                                </div>
                            `;
                            pQuery = pLines.slice(1).join(" ");
                        }
                        if (pQuery) {
                            html += `<div class="neat-question-query">${escapeHtml(pQuery)}</div>`;
                        }
                    }
                    html += `<div class="neat-statements-container" style="display: flex; flex-direction: column; gap: 8px; margin: 12px 0;">`;
                    multiStmts.statements.forEach(stmt => {
                        html += `
                            <div class="neat-statement-box">
                                <span class="neat-statement-badge">${escapeHtml(stmt.badge)}</span>
                                <span class="neat-statement-text">${escapeHtml(stmt.text)}</span>
                            </div>
                        `;
                    });
                    html += `</div>`;
                    if (multiStmts.postamble) {
                        html += `<div class="neat-question-query">${escapeHtml(multiStmts.postamble)}</div>`;
                    }
                } else {
                    const rawLines = block.lines;

                    let startIdx = 0;
                    const promptHeaderRegex = /^(?:\[[^\]]+\]|பல்கூற்றுத்?\s*தேர்வு\s*வினா|பல்கூற்று\s*வினா|பல்நோக்கு\s*வினா|கீழ்க்காணும்\s+கூற்றுகளைக்\s+கருத்தில்\s+கொள்க|காலவரிசை\s+வினா|நிரல்படுத்துக\s+வினா|பொருத்துக\s+வினா|காலவரிசை|நிரல்படுத்துக|பொருத்துக|கூற்று\s*–?\s*காரணம்\s*வினா|சரியான\s+கூற்றைத்\s+தேர்ந்தெடுக்க|Consider\s+the\s+following(?:\s+statements)?|Match\s+the\s+following)[:\s\-]*$/i;
                    
                    if (rawLines[0] && promptHeaderRegex.test(rawLines[0])) {
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

                    function isQueryOrInstruction(str) {
                        if (!str) return false;
                        const s = str.trim();
                        if (s.endsWith(":") || s.endsWith("?")) return true;
                        if (/(?:ஆராய்க|கருத்தில்\s+கொள்க|சீரமைக்க|அமைக்குக|வரிசைப்படுத்துக|தேர்ந்தெடுக்க|விடையளிக்கவும்|தேர்வு\s+செய்க)[:\s\-]*$/i.test(s)) return true;
                        if (/(?:பின்வரும்|கீழ்க்காணும்|கீழே\s+தரப்பெற்றுள்ள|கீழே\s+கொடுக்கப்பட்டுள்ள|மேற்கண்ட|Read\s+the|Consider|Which|What|In\s+the\s+light|சரியான\s+கூற்றைத்)/i.test(s)) return true;
                        return false;
                    }

                    const candidateStatements = remaining.filter(l => !isQueryOrInstruction(l) && !promptHeaderRegex.test(l));
                    const needsAutoRoman = optionsMentionRoman && candidateStatements.length >= 2 && candidateStatements.length <= 8 && !candidateStatements.some(l => /^\(?([i|v|x]+)\)/i.test(l));

                    let autoRomanIdx = 0;

                    remaining.forEach((lineText) => {
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
                        } else if (promptHeaderRegex.test(trimmed)) {
                            html += `
                                <div class="neat-prompt-header">
                                    <span class="neat-prompt-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                        ${escapeHtml(trimmed)}
                                    </span>
                                </div>
                            `;
                        } else if (isQueryOrInstruction(trimmed)) {
                            html += `<div class="neat-question-query">${escapeHtml(trimmed)}</div>`;
                        } else if (needsAutoRoman && autoRomanIdx < romanMap.length) {
                            html += `
                                <div class="neat-statement-box">
                                    <span class="neat-statement-badge">${romanMap[autoRomanIdx++]}</span>
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
