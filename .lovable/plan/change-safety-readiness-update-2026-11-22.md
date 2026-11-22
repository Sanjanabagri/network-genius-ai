# Change Safety Readiness Update

## Goal
Add a practical change-readiness layer that helps network teams catch incomplete plans before review, differentiating NetAssist AI with evidence-based guardrails rather than claiming unsupported live device automation.

## What will change
- Extend the existing Change Approvals screen with a live readiness checklist while drafting and a readiness summary on submitted requests.
- Assess concrete evidence already present in the request and inventory: change purpose, named inventory targets, pre-checks, implementation steps, post-change verification, rollback steps, and a scheduled window for high-risk work.
- Show a clear ready / needs-attention result and the exact missing items to requestors and reviewers. Keep the current separate-reviewer approval rule and allow submission of incomplete drafts, while making gaps visible before approval.
- Keep results honest: inventory matching confirms recorded device names only; it does not claim devices are reachable or that a change was simulated or applied.

## Technical approach
- Add a small pure readiness evaluator and unit tests for the concrete checks and high-risk scheduling rule.
- Use the existing change-request and device-inventory data; no new tables, migration, auth changes, AI calls, or external integrations.
- Preserve the current approval and audit-trail flows; do not add live config push/pull.
- Update the project roadmap to mark this release complete while retaining the connector-dependent device push/pull item as blocked.

## Validation
- Run the readiness unit tests and TypeScript typecheck.
- Verify the Change Approvals screen in the live preview, including draft feedback, readiness on saved requests, and a narrow viewport.
- Confirm the latest preview build status is clean.
