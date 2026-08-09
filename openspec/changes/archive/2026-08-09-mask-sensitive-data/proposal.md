## Why

Development sessions are streamed and recorded, so a value printed into a
session is published. An account email reached a Vids.Tube broadcast VOD on
8-Aug-2026 that way.

This repository is worked on during the same broadcasts, against the same kind
of production data, with the same tools. It carries the identical exposure and
has no safeguard.

The counterpart change in `../Vids.Tube` establishes the design and holds the
reasoning. This change carries the same safeguard here, deliberately as a copy:
the two repositories are separate, and a shared dependency between them would be
a heavier commitment than a file that changes about once a year.

## What Changes

- The masking rules, byte-identical to the Vids.Tube copy, covering email
  addresses, JSON Web Tokens, prefixed keys, secrets adjacent to a key-like
  name, phone numbers and postal addresses.
- A `PostToolUse` hook that rewrites a tool's result before the result reaches
  the session, so a sensitive value never enters the transcript.
- The first `.claude/settings.json` in this repository, registering that hook.
- A guidance section in `CLAUDE.md` covering what the session itself writes, as
  opposed to what tools return.

## Capabilities

### New Capabilities
- `sensitive-data-masking`: what counts as sensitive, where masking is enforced,
  and how a value is deliberately revealed.

### Modified Capabilities

## Impact

- Adds the first hook and the first `.claude/settings.json` to this repository.
- Affects tool results only. No application behaviour, no schema, nothing a
  visitor to the site can observe.
- No test runner exists in this repository, so the rules are proven by the test
  in Vids.Tube. That test is authoritative for both copies precisely because the
  rule file is byte-identical; a drift check is a single comparison.
