# CLAUDE.md — Project Operating Instructions

Read this file at the start of every chat.

## Startup Protocol

Every new session:
1. Read `policies/project-policy.yaml` — project name, prefix, risk tolerance, critical assets. If a `suite` block is present, note sibling repos and check for any open cross-cutting markers before starting new work.
2. Read `docs/work-index.md` — active work and status
3. Read `docs/session-log.md` — last session state and next actions
4. Propose the next marker ID (scan work-index for the highest existing `WB-<TRACK>-NNNN` and increment) and state exact acceptance criteria
5. Unless told otherwise, implement in the smallest useful slice, verify, update docs

## Markers

Format: `WB-<TRACK>-<NNNN>` — example: `WB-DX-0001`

Common tracks: `ARCH` `API` `DATA` `SEC` `OBS` `DX` `FIX`

Status values: `PLANNED | IN_PROGRESS | BLOCKED | DONE | DROPPED`

Rules:
- Every active work item has a marker in `docs/work-index.md`
- Every commit references a marker ID
- `docs/session-log.md` entries include marker IDs
- `work-index.md` columns: ID, Title, Status, Priority (high/med/low), Parent refs (related marker or DEC IDs), Updated

## Lifecycle

Work moves through six stages. Each stage has gate checkpoints — see the Gates table.

### 1. DISCOVER
- Confirm baseline behavior and constraints
- Scan for prior art and reusable patterns before building

### 2. DECIDE
- Copy a decision-record template to `docs/decisions/DEC-NNNN.md`; fill the Intake section first
- Classify risk: **low / medium / high** (see Risk section)
- Low risk work without a non-obvious design choice: a work-index entry is sufficient, skip the DEC file
- → Gates 1 & 2

### 3. BUILD
- Implement the smallest vertical slice first
- Flag deviations from approved design in `docs/session-log.md`
- → Gate 3

### 4. VERIFY
- Run `npm run lint` and `npm test`; attach output as evidence artifacts
- No prose-only claims — if you can't attach evidence, the verification didn't happen
- → Gate 4

### 5. CONSOLIDATE
- Promote stable outcomes into `docs/decisions/` or architecture docs
- Prune temporary working notes from the repo

### 6. HANDOFF
- Write a session log entry with exact next actions
- → Gates 5 & 6 (required before any release)

## Gates

| # | Name | Stage | Requires |
|---|------|-------|----------|
| 1 | Coherence | DECIDE | task-intake complete, scope bounded, DEC-NNNN.md written |
| 2 | Security | DECIDE *(medium/high only)* | threat-model complete before BUILD begins |
| 3 | Engineering Fundamentals | BUILD | checklist below satisfied |
| 4 | Verification | VERIFY | lint + tests pass, evidence attached |
| 5 | Safety | HANDOFF | rollback plan documented |
| 6 | Release Readiness | HANDOFF | release-readiness.md all gates pass |

**Block conditions:** any failed gate blocks release until resolved or explicitly risk-accepted with rationale documented.

## Risk Classification

**Low** — reversible, no critical asset impact → fast-path, Gate 2 not required

**Medium** — cross-service impact, user data touched, non-trivial blast radius → Gate 2 required

**High** — auth/crypto/infra boundaries, regulated data, irreversible migrations → Gate 2 required, explicit approval needed

## Engineering Fundamentals Checklist

Before marking any work DONE:

- [ ] Objective and success criteria defined before building
- [ ] Inputs validated at all trust boundaries
- [ ] Error paths implemented and tested, not just happy path
- [ ] Names convey intent; control flow is easy to follow
- [ ] Tests appropriate for risk level; evidence attached
- [ ] Rollback or containment path exists for risky changes
- [ ] Logs/metrics sufficient for diagnosis in production

## Security Defaults

Always apply:
- No plaintext secrets in the repo
- Least privilege for service accounts, API tokens, credentials
- Explicit authz checks on sensitive operations
- Dependency vulnerability scanning enabled

## Files

| Path | Purpose |
|------|---------|
| `docs/work-index.md` | Active work items — update every session |
| `docs/session-log.md` | Append-only continuity log |
| `docs/decisions/` | DEC-NNNN.md records |
| `docs/experiments/` | EXP-NNNN.md records |
| `policies/project-policy.yaml` | Project name, marker prefix, risk tolerance, critical assets, suite block |
| `src/` | React source (components, hooks, utils) |
| `index.html` | App entry point |
| `vite.config.js` | Build config |

**Template usage:** copy a template to its destination — never edit the source template in-place.
