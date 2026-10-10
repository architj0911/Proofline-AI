# Proofline AI — Project Report

## 1. Executive summary

**Proofline AI** is an AI-powered technical resume defense platform for students preparing for internships and placement interviews. It helps students practise explaining technical claims from their own resumes, identify gaps in their understanding, connect claims to supporting source evidence, and create a personalized preparation plan.

The core idea is that a resume should be more than a list of technologies: students should be able to explain the projects, implementation decisions, and technical concepts behind their claims.

According to the implementation report supplied for Milestones 4 and 5, the application now supports real resume ingestion and a resume-driven workflow. Automated tests were reported as passing for parsing, extraction, data isolation, API upload, type checking, and production build. These are reported results, not an independent re-run; rerun relevant tests on the exact build used for evaluation.

## 2. Problem

Students may list projects and technologies on resumes but struggle to explain implementation details or answer follow-up questions. Generic interview preparation may not expose the specific gaps connected to an individual's project.

The initial student survey offers preliminary evidence:
- 6 of 8 respondents (75%) said they frequently or sometimes struggled to explain technical project details.
- 5 of 8 (62.5%) selected identifying knowledge gaps as a preparation challenge.
- 5 of the 7 respondents who answered the tool-interest question (71.4%) said they would definitely or probably use a tool like this.
- YouTube tutorials were selected by 7 of 8 respondents (87.5%) as a current preparation method.

The survey was small, self-reported, and not representative. It supports further testing but does not prove broad market demand.

## 3. Solution and workflow

1. **Ingest:** Upload PDF, DOCX, or TXT, or paste resume text.
2. **Extract:** Parse the document and identify profile details, skills, projects, technical claims, and source snippets.
3. **Select:** Choose a specific claim or project to defend.
4. **Question:** Generate questions related to that claim and its technologies.
5. **Evaluate:** Assess answers against the question asked, including correctness, relevance, depth, and reasoning.
6. **Map evidence:** Connect claims, source evidence, questions, and knowledge gaps in an evidence graph.
7. **Improve:** Generate a personalized plan with concepts and practice tasks to review.

Different resumes should produce different claims, questions, feedback, graph content, and plans. The system should never silently replace a supplied resume with demo data.

## 4. Main features

- PDF, DOCX, TXT, and pasted-text ingestion.
- Candidate profile extraction, including skills, projects, and education where present.
- Technical claims linked to source snippets from the resume.
- Adaptive technical questions and follow-up questions.
- Question-specific answer evaluation.
- Dynamic evidence graph.
- Personalized defense plan.
- Upload validation and clear error handling.
- Configurable AI-provider architecture and mock mode for development.

## 5. Technical architecture

The reported stack includes:
- **Frontend:** React, Vite, TypeScript, Tailwind CSS.
- **Graph visualization:** React Flow via `@xyflow/react`.
- **Backend:** Node.js, Express, TypeScript.
- **Validation:** Zod schemas.
- **Document processing:** `pdf-parse` for PDFs, `mammoth` for DOCX, and UTF-8 decoding for TXT.
- **Authentication:** Supabase client and Google OAuth support.
- **AI providers:** Mock and Groq implementations were reported. OpenRouter is present in the project context. Gemini integration and automatic fallback must only be described as complete after the exact build is tested with real provider requests.
- **Session storage:** The reported implementation uses an in-memory session repository; data may not survive a backend restart unless persistence has since been implemented.

**Data flow:** `Resume file/text → Backend validation and parsing → Structured extraction → Claim selection → Adaptive questions → Answer evaluation → Evidence graph → Personalized defense plan`

Resume text is untrusted input. Claims should remain connected to source snippets, and AI interpretations should not be presented as facts explicitly stated in the resume.

## 6. Assessment and safety principles

Proofline AI is a learning and preparation tool, not an automated fraud detector.

- A weak answer means understanding has not yet been demonstrated; it does not prove the resume claim is false.
- A strong answer does not independently prove that the student built the project.
- Answers should be assessed against the question asked, not penalized for omitting unrelated topics.
- Missing resume details should remain unknown rather than be invented.
- Uploaded documents should be validated, provider credentials kept server-side, and unnecessary personal-data logging avoided.
- Mock responses should be limited to development/demo mode and never presented as genuine analysis of a supplied resume.

## 7. Student validation

Eight Google Forms responses were collected. All respondents identified as third-year students.

| Finding | Result |
|---|---:|
| Frequently or sometimes struggled to explain technical project details | 6/8 (75%) |
| Selected identifying knowledge gaps as a challenge | 5/8 (62.5%) |
| Selected follow-up technical questions as a challenge | 3/8 (37.5%) |
| Definitely or probably interested in using the tool, among those answering | 5/7 (71.4%) |
| Selected YouTube tutorials as a preparation method | 7/8 (87.5%) |

These results are an initial signal, not a representative market study. One respondent skipped the tool-interest question. Suggested priorities include clear knowledge-gap reporting, project-specific follow-up questions, transparent evaluation, and privacy-aware handling of resumes.

## 8. Implementation and reported tests

The Milestone 4 + 5 report states that:
- Hardcoded banking claims were removed from automatic initial loading.
- PDF, DOCX, TXT, and pasted text are supported.
- A multipart upload endpoint was added.
- Extracted claims include source snippets.
- Separate synthetic resumes were used to test data isolation.
- The frontend retains the extracted Stitch design language.
- Type checking, 10 offline Groq tests, 6 backend smoke/contract tests, 33 resume-flow tests, and the production build reportedly passed.

These are results reported by the implementation agent, not an independent test execution. Before the evaluation, rerun relevant offline tests on the final build. Confirm whether any health or smoke test makes live provider calls before running it.

## 9. Differentiation

Proofline AI combines:
1. Resume-specific technical questioning.
2. Traceable source snippets for claims.
3. Evaluation aligned to the question asked.
4. A graph connecting claims, evidence, and demonstrated knowledge gaps.
5. A personalized practice plan.

Its purpose is to help students improve technical explanations and prepare evidence, rather than simply generate generic interview questions.

## 10. Limitations and evaluation readiness

Before presenting, verify the exact build and provider configuration:
- Test two distinct resumes end to end.
- Confirm no stale demo claims or cross-session data appear.
- Verify Gemini and OpenRouter fallback with configured real providers if claiming the feature is live.
- Confirm how session data behaves after a backend restart.
- Check Google OAuth manually in the target browser if required.
- Do not claim production deployment unless a live deployment has been tested.

The plan is to freeze feature development after Milestone 6 until the evaluation round. Prioritize a stable demo and clear explanation over adding features.

## 11. Suggested 60–90 second project explanation

“Proofline AI helps students prepare to defend the technical claims on their resumes. Instead of asking only generic interview questions, a student uploads their own resume, and the system extracts projects, technologies, claims, and supporting source snippets. The student chooses a claim and answers adaptive technical questions about it. The system evaluates the answer against the question asked, highlights concepts that need improvement, maps claims and evidence in a graph, and generates a personalized defense plan. We also surveyed eight students: six said they frequently or sometimes struggled to explain project details, and five of the seven who answered the interest question said they would probably or definitely use a tool like this. This is preliminary feedback, so the next step is to validate the experience with more students. Proofline AI is designed to support learning and evidence preparation—not to label students fraudulent based on an AI score.”
