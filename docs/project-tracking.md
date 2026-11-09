# Project tracking

Tero is built in public, but progress must be supported by evidence. Code merged,
automated checks passed, physical devices tested and safe to release are four
different statements.

## Stage sequence

- **0 · Inventory and decisions:** source ownership, data preservation and platform constraints. Documented; revisit when assumptions change.
- **1 · Tauri foundation:** web build, desktop and mobile packaging, and representative device confirmation. Build foundations exist; device evidence remains open.
- **2 · Identity and storage:** read and restore existing vaults, protected native keys, safe migrations and recovery. In progress; never replace live test data.
- **3 · Peer networking:** authenticated discovery and delivery on separate networks without the Worker. Not yet demonstrated end to end.
- **4 · Sync and messaging:** local journal, OpenMLS compatibility, offline and restart recovery, receipts, expiry and notifications. Partial legacy evidence; Tauri parity remains open.
- **5 · Product parity:** restore the established Gathering, Circles, Messages, Help, You and admin experiences without changing their navigation. In progress.
- **6 · Safety and stewardship:** blocking, reports, moderation, revocation, governance and incident response. Requires decisions and tested enforcement.
- **7 · Hardening and invited beta:** accessibility, performance, release signing, independent audit and a bounded, consent-based trial. Not approved for release.

These stages describe workstreams, not deadlines or claims that Tero is safe for
at-risk use. Refer to the [migration map](development/migration.md) and
[security audit](status-audit-2026-10-20.md) for detailed gates.

## Issue stages

Issue titles use an unambiguous area, for example `[Identity] Restore legacy
vault on Tauri`. The issue body records one of these stages:

1. **Backlog:** defined but not scheduled.
2. **Ready:** owner, dependencies and acceptance checks are explicit.
3. **In progress:** someone is actively implementing or investigating.
4. **Needs evidence:** implemented, but awaiting tests, physical-device proof or review.
5. **Done:** acceptance checks are linked, limitations recorded and regressions considered.

Use **Blocked** as a reason on any stage, with the exact dependency and a
resumption condition. Do not mark a stage complete merely because a commit
landed. Do not close an issue with an unverified security or device claim.

## How work moves

- An issue should describe the problem, scope, dependencies, acceptance evidence and risk of changing existing data.
- Link related commits or PRs, but do not automatically close issues solely from commit references.
- Decisions with lasting architecture or community-safety impact belong in `docs/decisions/` and should be linked from the issue.
- Bug reports must avoid real member data, private keys, recovery phrases, locations or identifying screenshots. Report sensitive matters privately to [pherus@pherus.org](mailto:pherus@pherus.org).
- Review the tracking issues when starting a work session and update the status only when evidence changes.

## Automation policy

Documentation and branding changes should not launch full CI. General checks
run on relevant source changes; heavyweight Android/iOS builds are manual. The
Tauri and native Rust workflows remain scoped to their own source paths. Manual
builds are required for release candidates or when an issue's acceptance plan
specifically asks for them. Successful checks are evidence, not release approval.

## Community discussion

Use a proposal issue for a change that needs an engineering decision. Keep
personal safety situations, referrals and confidential community reports out
of public GitHub issues. A GitHub Discussions space can be enabled separately
for general Q&A, ideas and announcements once moderation rules and responsible
reviewers are established.
