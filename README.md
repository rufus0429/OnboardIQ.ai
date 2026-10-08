# OnboardIQ.ai

OnboardIQ is an autonomous AI recovery system designed to monitor SaaS onboarding funnels, diagnose the root causes of user drop-off, and automatically generate and send highly personalized, causal interventions (nudges) to stalled users.

This project uses an agentic workflow powered by Gemini 2.5 to move beyond simple rule-based emails, acting as an autonomous product manager and growth marketer.

## Architecture & Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Recharts, Lucide React, Zod.
- **Backend**: Node.js, Express, Firebase Admin (Firestore), Zod.
- **AI Agent**: `@google/genai` (Gemini 2.5 Flash) utilizing strict JSON schemas and tool-calling capabilities.
- **Authentication**: Firebase Auth (Email/Password, Google Sign-In).
- **Email Delivery**: Resend API.
- **Data Layer**: Firestore (collections: `workspaces`, `endUsers`, `events`, `diagnoses`, `interventions`, `outcomes`, `outcomeSummaries`).

## Data Flow & Execution Loop

1. **Simulation & Data Generation**: 
   The backend includes a stateful simulator (`POST /api/workspaces/:id/simulator/bootstrap`) that generates cohorts of users with hidden personas. As time progresses (`POST /api/workspaces/:id/simulator/advance-time`), users organically progress through the funnel or become stuck based on probabilistic rules.
2. **Diagnosis (Agentic Loop)**:
   The user triggers an analysis (`POST /api/workspaces/:id/analyze`). The backend spawns a Gemini agent equipped with a `query_funnel` tool. The agent investigates the data, identifies the worst drop-off step, forms a hypothesis, gathers evidence, and outputs a structured diagnosis stored in Firestore.
3. **Autonomous Recovery**:
   When time is advanced, the system detects stuck users and generates highly personalized nudges using Gemini. The model is given rich context (the user's first name, plan, recent events, and the global diagnosis) to craft exactly one clear CTA without guilt or manipulation.
4. **Causal Outcomes**:
   Interventions are sent (via Resend or mock). As simulated time advances again, the system evaluates the success of the interventions deterministically. Nudged users have a significantly higher probability (~60%) of progressing compared to the un-nudged control group (~10%).
5. **AI Summarization**:
   The outcomes are analyzed globally by another AI prompt (`POST /api/workspaces/:id/outcomes/summarize`), generating a high-level summary of "What Worked", "What Didn't Work", and "Recommended Next Actions".

## Demo Script (End-to-End Workflow)

Follow these steps to demonstrate OnboardIQ in a local or production environment.

### 1. Authentication
1. Navigate to the application root.
2. Click **Try Demo Account** on the login page (ensure `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` are set in your `.env`) or use **Google Sign-In**.

### 2. Populate the Workspace
1. Go to the **Simulator** page.
2. If the workspace is empty, click **Bootstrap Workspace** to generate 400 simulated users.
3. Advance time by **48 hours**. You will see users progress and eventually drop off, becoming `stuck`.

### 3. Review the Funnel
1. Go to the **Dashboard**.
2. Observe the Recharts Funnel chart. Identify the step with the highest drop-off rate (e.g., `connect_data_source`).

### 4. Run AI Diagnosis
1. Go to the **Diagnosis** page.
2. Click **Run Analysis**. 
3. The system will display an **Agent Reasoning Trace** showing exactly how Gemini queried the database, followed by a detailed structured hypothesis and evidence for the root cause of the drop-off.

### 5. Generate & Approve Interventions
1. Go to the **Simulator** page and click **Run Autonomous Recovery**.
2. The AI will generate highly contextual drafts for a subset of stuck users (up to your concurrency limits).
3. Go to the **Interventions** page.
4. Review the personalized AI-generated emails. You can click **View Email** or **Edit** them.
5. Select multiple interventions and click **Manual Approve** to mark them as `sent`.

### 6. Measure Causal Outcomes
1. Go to the **Simulator** page and advance time by **48 hours** again.
2. Go to the **Results** page.
3. You will see a clear A/B test experimental outcome comparing the recovery rate of the **Nudged** group vs the **Un-nudged (Control)** group.
4. Click **Generate AI Summary** to receive actionable insights on what worked and what didn't.

## Local Development Setup

1. **Clone the repository.**
2. **Install dependencies**:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
3. **Configure Environment Variables**:
   See `client/.env.example` and `server/.env.example`. You will need Firebase credentials, a Gemini API Key, and optionally a Resend API Key.
4. **Run Locally**:
   - Backend: `npm start` in `server/` (runs on port 10000)
   - Frontend: `npm run dev` in `client/` (runs on port 5173)