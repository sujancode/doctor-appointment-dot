# Clinic front desk

An example voice agent project: the phone front desk of Maple Street Family Clinic, a doctor's
office that books appointments.

- `agent.config.ts`: who the agent is and what it does (and never does: medical advice)
- `knowledge/`: what it knows (hours, doctors, insurance, what to bring)
- `tools/index.ts`: `find_slots` and `book_appointment`, your own code run during a call
- `tests/`: scripted calls judged on every build; production only takes a deployment that passed

Import this repository as a new project in the dashboard: every push to `main` is built,
deployed to test and tested. Promote a passing deployment to go live.

The tools answer from a demo schedule until you point them at your scheduling system, per
environment: `SCHEDULING_API_URL` (`GET /slots?day=YYYY-MM-DD` → `{ times }`,
`POST /appointments` → `{ reference }`) and `SCHEDULING_API_KEY`, in Variables on the project's
page or with `npx voiceagent vars set`.

From a terminal instead: `npm install`, `npx voiceagent login --key va_test_…`,
`npx voiceagent deploy`, `npx voiceagent test`.
