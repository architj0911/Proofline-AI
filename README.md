# Proofline AI — Interview Defense Platform

> **Azisly.ai National Level AI Hackathon**  
> **Problem Statement 4:** Open Innovation (Student Pain Points)  
> **Objective:** AI-powered interview defense platform that helps students verify and substantiate technical claims on their resumes through progressive probing questions, interactive claim-to-evidence graph mapping, and actionable remediation plans.

---

## 1. Architecture Overview

Proofline AI is designed as a modular, decoupled full-stack TypeScript application:

```
├── src/
│   ├── app/                      # Application entry & shell layout (App.tsx)
│   ├── components/               # Shared reusable presentation components
│   ├── features/
│   │   ├── claims/               # Resume claims view, selection, and status indicators
│   │   ├── defense-session/      # Progressive interview challenge UI & live feedback
│   │   ├── evidence-graph/       # Claim-to-evidence interactive graph (@xyflow/react)
│   │   └── defense-plan/         # Prioritized remediation action plan & readiness scoring
│   ├── data/                     # Benchmark dataset (Spring Boot, JWT, Gateway, PostgreSQL)
│   ├── services/                 # Frontend API client (api.ts)
│   ├── styles/                   # Tailwind CSS styling & design tokens
│   └── types/                    # Shared domain models & API request/response contracts
├── server/
│   ├── middleware/               # Centralized error handler & Zod validation
│   ├── routes/                   # REST routes (/api/health, /api/claims, /api/defense)
│   ├── services/                 # Decoupled mock AI provider, OpenRouter provider, & session store
│   ├── types/                    # Server type re-exports
│   ├── index.ts                  # Express server entry point
│   └── test-health.ts            # Programmatic API smoke & contract test suite
├── .env.example                  # Environment configuration template
├── .gitignore                    # Secrets & build artifact exclusion
└── package.json                  # Unified full-stack dependencies & scripts
```

### Key Architectural Pillars

1. **Separation of Concerns:**  
   The data access layer (`server/services/session-store.ts`) uses a clean repository interface (`SessionRepository`). It currently runs an in-memory adapter for rapid local hackathon development, allowing PostgreSQL / Supabase persistence to be plugged in later without altering route logic.

2. **Decoupled AI Providers:**  
   - `MockAIProvider` (`server/services/mock-provider.ts`): Fully deterministic provider supporting all extraction, probing, and defense plan compilation endpoints without requiring external API keys.
   - `OpenRouterProvider` (`server/services/openrouter-provider.ts`): Live LLM integration with strict JSON schema validation, timeout safeguards, and rate-limit handling.
   - `AIService` (`server/services/ai-service.ts`): Automatically switches between mock and live modes depending on `USE_MOCK_AI` and `OPENROUTER_API_KEY`.

3. **Integrity & Fairness Safeguards:**  
   - *Status Rubric:* Claims use explicit statuses: `Unverified`, `Needs evidence`, `Demonstrated understanding`, `Needs improvement`.
   - *Weak answers do not equal fraud:* A weak interview answer reflects that understanding `Needs improvement`, not that a claim is fabricated.
   - *Evidence verification boundary:* External project evidence is never marked as verified based merely on self-reported candidate text.

---

## 2. Google Stitch Design Reference & Integration Strategy

- **Google Stitch Project Reference:**  
  `https://stitch.withgoogle.com/projects/11316214815449627283`

### Stitch Status & Integration Approach

- **Current Status:**  
  The Stitch link requires an active Google authenticated browser session to view web components directly. Because headless fetch returns the Google authentication shell, the design is currently being drafted/exported on the designated workstation.
- **Integration Readiness:**  
  The frontend codebase has been intentionally scaffolded with modular feature folders:
  - `src/features/claims/`: Ready to adopt Stitch claim card layouts, status badges, and typography.
  - `src/features/defense-session/`: Ready to adopt Stitch questioning screen, difficulty pills, and response layout.
  - `src/features/evidence-graph/`: Structured with `@xyflow/react` to map into Stitch's graph aesthetic.
  - `src/features/defense-plan/`: Prepared for Stitch's executive report card and prioritized action timeline.
- **How to Integrate Exported Stitch Files:**
  1. Place exported CSS/Tailwind color tokens or style variables into `src/styles/index.css` and `tailwind.config.js`.
  2. Map Stitch screen components into the respective feature folders under `src/features/`.
  3. Wire the designed buttons and input fields to the type-safe methods in `src/services/api.ts`.

---

## 3. Shared Domain Models & Status Types

Defined in `src/types/index.ts`:

- `ResumeClaim`: ID, original statement, category, related technologies, evidence references, interview questions, assessment status, knowledge gaps, and confidence score.
- `ClaimStatus`: `'Unverified' | 'Needs evidence' | 'Demonstrated understanding' | 'Needs improvement'`.
- `EvidenceItem`: Evidence ID, type (`github_repo`, `commit`, `code_snippet`, `system_design`, `live_demo`, `text_description`), verification state.
- `InterviewQuestion`: Difficulty (`basic`, `intermediate`, `advanced`, `stress_test`), question text, probing objective, expected concepts.
- `DefenseAnswer`: Question ID, claim ID, answer text, timestamp, and structured evaluation.
- `DefenseSession`: Session ID, selected claims, current question, answers list, status, report, and defense plan.
- `DefensePlanItem`: Priority (`high`, `medium`, `low`), topic, gap summary, recommended action, curated resources, target milestone.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check returning status, uptime, and mock mode |
| `GET` | `/api/claims/default` | Fetches hackathon benchmark resume claims |
| `POST` | `/api/claims/extract` | Extracts structured claims and questions from resume text |
| `POST` | `/api/defense/start` | Creates a defense session and returns the first question |
| `POST` | `/api/defense/answer` | Evaluates student answer and generates follow-up question |
| `POST` | `/api/defense/finish` | Generates readiness score, summary report, and defense plan |
| `GET` | `/api/defense/session/:id` | Retrieves current session state |

---

## 5. Getting Started

### Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+`

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd c:\Users\raghav\Desktop\back
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(By default, `.env` runs in `USE_MOCK_AI=true` mode, enabling full local testing without an API key).*

3. Dependencies are installed using:
   ```bash
   npm install
   ```

### Running the Application

- **Run Full-Stack (Server + Client concurrently):**
  ```bash
  npm run dev
  ```
  - Backend API: `http://localhost:3001`
  - Frontend UI: `http://localhost:5173`

- **Run Server Only:**
  ```bash
  npm run dev:server
  ```

- **Run Frontend Client Only:**
  ```bash
  npm run dev:client
  ```

---

## 6. Build, Typecheck, & Tests

- **Run TypeScript Typecheck:**
  ```bash
  npm run typecheck
  ```

- **Run Production Build:**
  ```bash
  npm run build
  ```
  *(Produces client bundle in `dist/` and server bundle in `dist-server/`)*

- **Run Programmatic Backend Contract & Mock Tests:**
  ```bash
  npm run test:health
  ```
  *(Validates `/api/health`, `/api/claims/extract`, `/api/defense/start`, `/api/defense/answer`, and `/api/defense/finish`)*

---

## 7. Supabase Authentication Setup

Proofline AI is configured with Supabase for user authentication and session management:

- **Client Implementation:** [`src/lib/supabase.ts`](file:///c:/Users/raghav/Desktop/back/src/lib/supabase.ts) initializes the client using Vite environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Graceful Fallback:** If credentials are not supplied, the platform automatically runs in Local Mode without disabling or degrading the interview defense experience.
- **Google OAuth:** Integrated using the official `@supabase/supabase-js` browser SDK (`signInWithOAuth`), preserving local session state upon redirect.
- **Security:** Secret service-role keys and database credentials are never stored in `VITE_` variables or exposed to the browser bundle. Real credentials reside exclusively in `.env`, which is strictly ignored by Git.

---

## 8. Groq AI Integration & Provider Selection

Proofline AI features a dedicated, low-latency Groq AI integration using Groq's OpenAI-compatible completions endpoint:

### Provider Modes

Configure provider via `.env`:
- `AI_PROVIDER=mock`: Deterministic offline mode requiring zero external API keys. Ideal for local UI development and testing.
- `AI_PROVIDER=groq`: Live Groq inference using server-side `GROQ_API_KEY` and `GROQ_MODEL=openai/gpt-oss-20b`.
- `AI_PROVIDER=openrouter`: Live OpenRouter fallback using `OPENROUTER_API_KEY`.

### Quota & Cost Protection
- Strict token limits (`max_tokens: 1024` for extraction, `max_tokens: 600` for evaluation).
- Minimal context forwarding (only the specific question, claim, and answer are transmitted).
- No automated recursive retries on HTTP 429 quota exhaustion.
- Timeout protection capped at 25 seconds.

### Provider Testing Scripts
```bash
# Run 10 offline unit tests with mocked HTTP responses
npm run test:groq:offline

# Run end-to-end contract smoke tests
npm run test:health
```
