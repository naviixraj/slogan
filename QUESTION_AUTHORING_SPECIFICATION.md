# SLOGAN MCQ - STANDARD QUESTION AUTHORING SPECIFICATION & GUIDE
**For Content Authors, Educators & Administrators**

This document provides the standard authoring structure for all 7 question types supported by the Slogan MCQ Examination Platform. Following these structures ensures 100% fidelity when pasting questions or uploading Word (`.docx`), PDF (`.pdf`), Excel (`.xlsx`), CSV (`.csv`), or plain text files.

---

## 📌 TABLE OF CONTENTS
1. [Are All 7 Question Types Supported?](#1-are-all-7-question-types-supported)
2. [How Our Software Analyzes Questions](#2-how-our-software-analyzes-questions)
3. [Universal Question Header & Option Rules](#3-universal-question-header--option-rules)
4. [Standard Structure for Each Question Type](#4-standard-structure-for-each-question-type)
   - Type 1: Multiple Choice Questions (Standard MCQ)
   - Type 2: Match the Following
   - Type 3: Assertion and Reason
   - Type 4: Statement-based Questions
   - Type 5: Sequence / Chronological Order
   - Type 6: Passage-based Comprehension Questions
   - Type 7: Mathematical Problem Solving & Data Interpretation
5. [Answer Key & Explanation Formats](#5-answer-key--explanation-formats)
6. [Quick Checklist (Do's & Don'ts)](#6-quick-checklist-dos--donts)

---

## 1. ARE ALL 7 QUESTION TYPES SUPPORTED?

### **YES, 100% SUPPORTED.**
The platform natively detects, parses, and formats all 7 question types in both **English** and **Tamil**:

| # | Question Type | Supported in Software? | Display Layout in Exam Engine |
|---|---------------|-------------------------|--------------------------------|
| **1** | **Multiple Choice Questions (MCQ)** | ✅ **YES** | Standard prompt with interactive A–D choices |
| **2** | **Match the Following** | ✅ **YES** | Neat 2-Column Comparative Table (List I & List II) |
| **3** | **Assertion and Reason** | ✅ **YES** | Dedicated Dual Visual Cards (Assertion Box + Reason Box) |
| **4** | **Statement-based Questions** | ✅ **YES** | Vertical Statement Boxes with Badges `(i)`, `(ii)`, `(iii)`, `(iv)` |
| **5** | **Sequence / Chronological Order** | ✅ **YES** | Highlighted Sequence Header + Ordered Timeline Items |
| **6** | **Passage-based Questions** | ✅ **YES** | Enclosed Data Passage/Directions Card linked to child questions |
| **7** | **Mathematical Problem Solving** | ✅ **YES** | Formulas, Ratios, Data Tables & Step-by-Step Explanations |

---

## 2. HOW OUR SOFTWARE ANALYZES QUESTIONS

When an author pastes text or uploads a document, the software executes a 4-stage pipeline:

1. **Header Segmentation**: Identifies where each question starts using recognized prefixes:
   - English: `1.`, `2.`, `Q1:`, `Q1.`, `Question 1:`, `Question 1.`
   - Tamil: `வினா 1:`, `வினா எண்: 1`, `1 [உறுதிக்கூற்று]`, `1. கேள்வி`
2. **Body & Question Type Detection**:
   - Scans for **List I / List II** or **பட்டியல் I / பட்டியல் II** $\rightarrow$ Triggers **Match the Following Table Generator**.
   - Scans for **Assertion (A) / Reason (R)** or **கூற்று / காரணம்** $\rightarrow$ Triggers **Assertion-Reasoning Card Generator**.
   - Scans for **Roman numerals (i), (ii)** or **Statement 1, Statement 2** $\rightarrow$ Triggers **Statement Pill-Box Generator**.
   - Scans for **Passage / Directions** $\rightarrow$ Triggers **Reading Comprehension Passage Card Generator**.
   - Scans for **Table-1 / Markdown pipes `|` / Tabular streams** $\rightarrow$ Triggers **Data Interpretation Table Generator**.
3. **Option Isolation (`splitOptionsSmart`)**:
   - Isolates the four choices whether marked `(A)-(D)`, `A)-D)`, `A.-D.`, `(1)-(4)`, or Tamil `(அ)-(ஈ)`.
   - Protects internal labels (such as `(உ)` inside Assertion text) from being mistaken for question options.
4. **Answer Key & Faculty Explanation Extraction**:
   - Detects `Answer: B`, `Correct Answer: (3)`, `சரியான விடை: (3)`, or `பதில்: B`.
   - Captures detailed rationale from `Explanation: ...` or `விளக்கம்: ...`.

---

## 3. UNIVERSAL QUESTION HEADER & OPTION RULES

### Rule A: Question Numbers
Every question should begin with a clear number on a new line:
- ✅ `1.` or `1)` or `Q1:` or `Question 1:`
- ✅ `வினா 1:` or `வினா எண்: 1` or `1 [உறுதிக்கூற்று - காரணம்].`

### Rule B: Options
Always provide 4 distinct options on new lines or clearly separated:
- ✅ `(A)`, `(B)`, `(C)`, `(D)`
- ✅ `A)`, `B)`, `C)`, `D)`
- ✅ `(1)`, `(2)`, `(3)`, `(4)`
- ✅ `(அ)`, `(ஆ)`, `(இ)`, `(ஈ)`

### Rule C: Answer Key & Explanation
Place the answer and optional explanation at the end of each question:
- ✅ `Answer: C`
- ✅ `Correct Answer: (3)`
- ✅ `சரியான விடை: (3) (உ) தவறு, (கா) சரி`
- ✅ `Explanation: [Step-by-step calculation or reason]`

---

## 4. STANDARD STRUCTURE FOR EACH QUESTION TYPE

### TYPE 1: MULTIPLE CHOICE QUESTIONS (MCQ)
*Direct conceptual questions with one correct choice.*

#### English Example:
```text
1. Which layer of the OSI model does a network router operate on?
(A) Physical Layer
(B) Data Link Layer
(C) Network Layer
(D) Transport Layer
Answer: C
Explanation: Routers operate at Layer 3 (Network Layer) to route IP packets between distinct networks.
```

#### Tamil Example:
```text
வினா 1:
உலக சுற்றுச்சூழல் தினம் கொண்டாடப்படும் நாள் எது?
(A) ஜூன் 5
(B) ஜூலை 11
(C) செப்டம்பர் 16
(D) டிசம்பர் 1
சரியான விடை: A
விளக்கம்: ஐக்கிய நாடுகள் சபையின் சுற்றுச்சூழல் மாநாட்டை நினைவுகூரும் வகையில் ஒவ்வோர் ஆண்டும் ஜூன் 5 அன்று உலக சுற்றுச்சூழல் தினம் அனுசரிக்கப்படுகிறது.
```

---

### TYPE 2: MATCH THE FOLLOWING
*Pairs items from List I with List II. The software converts this directly into a clean, 2-column examination table.*

#### English Example (List I & List II):
```text
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
Explanation: HTTP defaults to Port 80, HTTPS to Port 443, SSH to Port 22, and DNS to Port 53.
```

#### Tamil Example (பட்டியல் I & பட்டியல் II):
```text
வினா 2:
தமிழ் அகராதியியல் நூல்களை அவர்தம் ஆசிரியர்களுடன் பொருத்துக:
பட்டியல் I (நூல்)
(A) சதுரகராதி
(B) தமிழ்-ஆங்கில அகராதி
(C) அபிதான சிந்தாமணி
(D) தமிழ் லெக்சிகன்
பட்டியல் II (ஆசிரியர் / தலைமைப் பதிப்பாசிரியர்)
(I) வீரமாமுனிவர்
(II) எம். வின்ஸ்லோ
(III) ஆ. சிங்காரவேலு முதலியார்
(IV) எஸ். வையாபுரிப் பிள்ளை

கீழே தரப்பெற்றுள்ள விருப்பங்களிலிருந்து சரியான பதிலத்தைத் தேர்ந்தெடுக்க:
(A) (A)-(I), (B)-(II), (C)-(III), (D)-(IV)
(B) (A)-(III), (B)-(IV), (C)-(I), (D)-(II)
(C) (A)-(II), (B)-(I), (C)-(IV), (D)-(III)
(D) (A)-(IV), (B)-(III), (C)-(II), (D)-(I)
சரியான விடை: A
விளக்கம்: சதுரகராதியை வீரமாமுனிவரும் (1732), தமிழ்-ஆங்கில அகராதியை வின்ஸ்லோவும் (1862), அபிதான சிந்தாமணியைச் சிங்காரவேலு முதலியாரும், தமிழ் லெக்சிகனை வையாபுரிப் பிள்ளையும் தொகுத்தனர்.
```

---

### TYPE 3: ASSERTION AND REASON
*Presents an Assertion statement and a Reason statement. The engine renders them inside dual styled visual cards.*

#### English Example:
```text
3. Assertion and Reason:
Assertion (A): Light travels faster in vacuum than in glass.
Reason (R): The refractive index of vacuum is 1, which is less than the refractive index of glass.

In the light of the above statements, choose the most appropriate answer:
(A) Both (A) and (R) are correct, and (R) is the correct explanation of (A).
(B) Both (A) and (R) are correct, but (R) is NOT the correct explanation of (A).
(C) (A) is correct, but (R) is incorrect.
(D) (A) is incorrect, but (R) is correct.
Answer: A
Explanation: The speed of light is inversely proportional to refractive index ($v = c/n$). Since $n_{vacuum} = 1 < n_{glass} \approx 1.5$, light travels fastest in vacuum.
```

#### Tamil Example:
```text
வினா 3 [உறுதிக்கூற்று - காரணம்]:
உறுதிக்கூற்று (உ): வீரமாமுனிவர் இயற்றிய தேம்பாவணி காப்பியத்தின் முதன்மைப் பாட்டுடைத் தலைவன் வளன் (சூசையப்பர்) ஆவார்.
காரணம் (கா): தேம்பாவணி 3 காண்டங்களையும் 36 படலங்களையும் 3,615 விருத்தப் பாடல்களையும் கொண்டக் கிறித்துவச் சமயக் காப்பியமாகும்.

கீழே தரப்பெற்றுள்ள விருப்பங்களிலிருந்து சரியான பதிலத்தைத் தேர்ந்தெடுக்க:
(1) (உ) சரி, (கா) சரி; (கா) என்பது (உ)-விற்குச் சரியான விளக்கமாகும்
(2) (உ) சரி, (கா) சரி; ஆனால் (கா) என்பது (உ)-விற்குச் சரியான விளக்கமன்று
(3) (உ) தவறு, (கா) சரி
(4) (உ) தவறு, (கா) தவறு
சரியான விடை: (2)
விளக்கம்: தேம்பாவணியின் முதன்மைப் பாட்டுடைத் தலைவன் வளன் என்பதும் உண்மை; நூல் 3 காண்டங்கள், 36 படலங்கள், 3,615 பாடல்களைக் கொண்டது என்பதும் உண்மை. ஆனால் நூலமைப்புக் காரணம் பாட்டுடைத் தலைவனுக்கான நேரடி விளக்கமன்று.
```

---

### TYPE 4: STATEMENT-BASED QUESTIONS
*Presents 2 to 5 distinct statements using Roman numerals `(i)`, `(ii)`, `(iii)`, `(iv)` or `Statement 1 & 2`. Renders as neat statement badges.*

#### English Example:
```text
4. Consider the following statements regarding the Reserve Bank of India (RBI):
(i) RBI was established on April 1, 1935 under the Reserve Bank of India Act.
(ii) The headquarters of RBI was permanently moved to Mumbai in 1937.
(iii) Sir Osborne Smith was the first Governor of RBI.
(iv) RBI was nationalized in the year 1969 along with 14 major commercial banks.

Which of the statements given above are correct?
(A) (i), (ii) and (iii) only
(B) (i) and (iv) only
(C) (ii), (iii) and (iv) only
(D) (i), (ii), (iii) and (iv)
Answer: A
Explanation: Statements (i), (ii), and (iii) are correct. Statement (iv) is incorrect because RBI was nationalized on January 1, 1949 (not 1969).
```

#### Tamil Example:
```text
வினா 4:
தெய்வச்சிலையார் பற்றிய கூற்றுகளை ஆராய்க:
(i) தொல்காப்பியச் சொல்லதிகாரத்திற்கு மட்டும் உரை இயற்றியவர்.
(ii) எச்சவியலின் இறுதி 3 நூற்பாக்களை வினையியலின் இறுதியில் வைத்து உரை எழுதியவர்.
(iii) தொல்காப்பிய எழுத்ததிகாரத்திற்கும் பொருளதிகாரத்திற்கும் விரிவான உரை இயற்றியவர்.
(iv) நச்சினார்க்கினியருக்குப் பின்வந்த 19-ஆம் நூற்றாண்டு உரையாசிரியர்.

கீழ்க்கண்டவற்றுள் சரியான விடையைத் தேர்ந்தெடுக்க:
(A) (i), (ii) மட்டுமே சரி
(B) (iii), (iv) மட்டுமே சரி
(C) (i), (ii), (iii), (iv) அனைத்தும் சரி
(D) (i), (ii), (iii) சரி; (iv) தவறு
சரியான விடை: A
விளக்கம்: தெய்வச்சிலையார் தொல்காப்பியச் சொல்லதிகாரத்திற்கு மட்டுமே உரை எழுதினார்; 13-ஆம் நூற்றாண்டைச் சேர்ந்த இவர் எச்சவியலின் இறுதி 3 நூற்பாக்களை வினையியலின் இறுதியில் வைத்து உரை வகுத்தார்.
```

---

### TYPE 5: SEQUENCE / CHRONOLOGICAL ORDER
*Requires arranging historical events, literary works, or scientific processes in correct order.*

#### English Example:
```text
5. Arrange the following landmark computer science developments in chronological order:
(i) Invention of the Transistor at Bell Labs
(ii) Launch of the World Wide Web (WWW) by Tim Berners-Lee
(iii) Introduction of the ENIAC computer
(iv) Development of the C Programming Language by Dennis Ritchie

Choose the correct sequence from the options below:
(A) (iii) -> (i) -> (iv) -> (ii)
(B) (i) -> (iii) -> (ii) -> (iv)
(C) (iii) -> (iv) -> (i) -> (ii)
(D) (i) -> (iv) -> (iii) -> (ii)
Answer: A
Explanation: ENIAC (1945) -> Transistor (1947) -> C Language (1972) -> World Wide Web (1989/1991).
```

#### Tamil Example:
```text
வினா 5 [காலவரிசை வினா]:
தமிழ்த் திறனாய்வு நூல்களை வெளியீட்டாண்டு அடிப்படையில் சரியான காலவரிசையில் அமைக்குக:
(i) இலக்கிய விமரிசனம் (தொ.மு.சி. ரகுநாதன்)
(ii) விமரிசனக்கலை (க.நா. சுப்பிரமணியம்)
(iii) இலக்கியக் கலை (அ.ச. ஞானசம்பந்தன்)
(iv) தமிழ் நாவல் இலக்கியம் (க. கைலாசபதி)

சரியான வரிசையைத் தேர்ந்தெடுக்க:
(A) (i) -> (ii) -> (iii) -> (iv)
(B) (ii) -> (i) -> (iv) -> (iii)
(C) (iii) -> (i) -> (ii) -> (iv)
(D) (iv) -> (iii) -> (ii) -> (i)
சரியான விடை: A
விளக்கம்: நூல்கள் வெளியான காலவரிசை: இலக்கிய விமரிசனம் (1948) -> விமரிசனக்கலை (1951) -> இலக்கியக் கலை (1953) -> தமிழ் நாவல் இலக்கியம் (1977).
```

---

### TYPE 6: PASSAGE-BASED COMPREHENSION QUESTIONS
*A reading passage or data set shared across multiple subsequent questions (e.g. Questions 6 to 10).*

```text
Directions: Read the following passage carefully and answer Questions 6 to 8:
Passage:
Photosynthesis is the fundamental biological process by which green plants, algae, and certain bacteria convert light energy into chemical energy stored in glucose molecules. This complex reaction takes place primarily in the chloroplasts of plant cells, utilizing the green pigment chlorophyll to capture photon energy. Water molecules are split in the light-dependent reactions to release oxygen as a byproduct, while carbon dioxide is fixed during the Calvin cycle into simple sugars.

6. In which organelle does photosynthesis primarily occur in plant cells?
(A) Mitochondria
(B) Chloroplast
(C) Ribosome
(D) Endoplasmic Reticulum
Answer: B
Explanation: Photosynthesis takes place inside chloroplasts containing chlorophyll.

7. What is released as a byproduct during the light-dependent reactions of photosynthesis?
(A) Carbon dioxide
(B) Oxygen
(C) Nitrogen
(D) Methane
Answer: B
Explanation: The photolysis of water molecules during the light reaction produces molecular oxygen ($O_2$).
```

---

### TYPE 7: MATHEMATICAL PROBLEM SOLVING & DATA INTERPRETATION
*Includes equations, ratios, percentages, and data tables.*

#### Table-Based Data Interpretation Example:
```text
8. The following table shows the production of cars (in thousands) by four companies from 2021 to 2023:
Company | 2021 | 2022 | 2023
Alpha | 40 | 55 | 70
Beta | 30 | 45 | 60
Gamma | 50 | 60 | 65
Delta | 20 | 35 | 50

What is the percentage increase in the production of cars by Company Alpha from 2021 to 2023?
(A) 50%
(B) 60%
(C) 75%
(D) 80%
Answer: C
Explanation: Production in 2021 = 40. Production in 2023 = 70.
Increase = 70 - 40 = 30.
Percentage Increase = (30 / 40) * 100 = 75%.
```

#### Mathematical Word Problem Example:
```text
9. Two numbers are in the ratio 3 : 5. If 6 is added to each number, the ratio becomes 2 : 3. What is the difference between the two numbers?
(A) 8
(B) 10
(C) 12
(D) 15
Answer: C
Explanation:
Let the numbers be $3x$ and $5x$.
$$\frac{3x + 6}{5x + 6} = \frac{2}{3}$$
$$3(3x + 6) = 2(5x + 6)$$
$$9x + 18 = 10x + 12 \implies x = 6$$
The numbers are $3(6) = 18$ and $5(6) = 30$.
Difference $= 30 - 18 = 12$.
```

---

## 5. ANSWER KEY & EXPLANATION FORMATS

The parser automatically detects any of these answer key formats:
- `Answer: B`
- `Ans: B`
- `Correct Answer: B`
- `Correct Answer: (2)`
- `சரியான விடை: B`
- `சரியான விடை: (2)`
- `பதில்: B`
- `விடை: B`

For explanation text, use any of:
- `Explanation: [Explanation text]`
- `Short Explanation: [Explanation text]`
- `விளக்கம்: [விளக்க உரை]`
- `குறுகிய விளக்கம்: [விளக்க உரை]`

---

## 6. QUICK CHECKLIST (DO'S & DON'TS)

| Action | DO ✅ | DON'T ❌ |
|---|---|---|
| **Question Numbering** | Use `1.`, `2.`, `Q1:`, or `வினா 1:` at the start of each question | Don't merge questions into the same paragraph without numbers |
| **Options** | Always provide exactly 4 options: `(A)-(D)` or `(1)-(4)` | Don't give only 2 or 3 options without updating question type |
| **Option Placement** | Put each option on a new line or separated by spaces: `(A) ... (B) ...` | Don't put option markers in the middle of a sentence without parentheses |
| **Match the Following** | Use clear headers `List I` / `List II` or `பட்டியல் I` / `பட்டியல் II` | Don't leave List items unlabeled without (A)-(D) and (I)-(IV) |
| **Assertion & Reason** | Clearly label `Assertion (A):` and `Reason (R):` or `உறுதிக்கூற்று (உ):` and `காரணம் (கா):` | Don't leave Assertion or Reason text completely empty |
| **Answer Key** | Include `Answer: X` or `சரியான விடை: X` at the end of each question | Don't omit the answer key |
