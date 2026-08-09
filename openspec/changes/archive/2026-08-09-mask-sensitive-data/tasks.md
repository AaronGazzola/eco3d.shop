## 1. Carry the safeguard across

- [x] 1.1 Copy `.claude/hooks/sensitive-mask.mjs` from `../Vids.Tube`, unchanged.
- [x] 1.2 Copy `.claude/hooks/mask-sensitive.mjs` from `../Vids.Tube`, unchanged.
- [x] 1.3 Confirm both copies are byte-identical to their sources, so drift is detectable by comparison alone.

## 2. Register it

- [x] 2.1 Create `.claude/settings.json`, which does not exist here, registering the hook on `PostToolUse` for `Bash`, `Read` and the Supabase MCP query tool.
- [x] 2.2 Exercise the hook against a payload holding a synthetic address and a prefixed key, and confirm the output is masked and the notice names both categories.
- [x] 2.3 Exercise the reveal switch and confirm the same payload passes through unmasked for that one command.
- [x] 2.4 Exercise a malformed payload and confirm the hook degrades to no masking rather than to an error.

## 3. The written rule

- [x] 3.1 Add the sensitive-data section to `CLAUDE.md`, matching the Vids.Tube wording, and stating that the Vids.Tube copy is authoritative and that rule changes are made there and copied here.
