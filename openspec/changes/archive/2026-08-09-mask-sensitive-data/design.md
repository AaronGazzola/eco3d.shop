## Context

The design decisions, the alternatives weighed and the leak measurement all live
in `../Vids.Tube/openspec/changes/archive/*-mask-sensitive-data/design.md`. That
document is the source of truth and is not restated here.

What matters locally is that this repository is worked on during the same
streamed sessions, so it carries the same exposure and takes the same safeguard.

## Goals / Non-Goals

**Goals:**
- A sensitive value returned by a tool never enters this repository's sessions.
- The rule file stays byte-identical to the Vids.Tube copy, so the two cannot
  quietly diverge in what they protect.

**Non-Goals:**
- Re-deriving the design. Changing the approach means changing it in Vids.Tube
  first, then copying the result here.
- Adding a test runner to this repository in order to test the rules. The rules
  are tested where a runner already exists.

## Decisions

**Copy, do not share.** A published package or a git submodule would couple two
repositories that are otherwise independent, for one file that changes rarely.
The cost of copying is a periodic comparison; the cost of sharing is a release
process.

**The rule file is byte-identical, and that is the drift check.** Any difference
at all is drift, which makes verification a single comparison rather than a
review.

**The rules are proven in Vids.Tube.** This repository has no test runner. Adding
one in order to test a copied file would be a larger change than the safeguard
itself, and identical files cannot behave differently.

## Risks / Trade-offs

- **The two copies drift** → Detected by comparing the files, which is one
  command and is a task in this change.
- **A rule is fixed in one repository and not the other** → Mitigated by the
  guidance in both repositories stating that the Vids.Tube copy is authoritative
  and changes are copied here.
- **The hook is broken here and nothing catches it** → The hook is exercised
  against a known payload as an implementation task, so a broken registration is
  found when it is made rather than during a broadcast.

## Migration Plan

- Additive. Rollback is deleting the hook registration.

## Open Questions

None.
