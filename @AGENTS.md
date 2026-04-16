# @AGENTS.md — Session Protocol

## Read Order

1. `CLAUDE.md` — project identity, n8n config, sandbox rules
2. `@AGENTS.md` (this file) — beads workflow, session lifecycle
3. `AGENTS.md` — n8nac technical protocol (GitOps, validation, testing)
4. relevant docs (`docs/SESSION-KICKOFF.md` for build plan)
5. `bd ready` — find available work

## Workflow

Beads (`bd`) is the task ledger and durable shared memory for this repo.

```bash
bd ready                              # Find available work
bd show <id>                          # Review issue details before starting
bd update <id> --claim                # Claim work before implementation
bd note <id> "progress note"          # Record progress during execution
bd create --title="..." --description="..." --type=task --priority=2  # New work
bd dep add <issue> <depends-on>       # Real sequencing when needed
bd blocked                            # Inspect waits
bd remember "fact" --key <name>       # Durable repo facts (NOT MEMORY.md)
bd memories <keyword>                 # Search repo knowledge
bd close <id> --reason "completed"    # Only on real completion
```

## Authority Model

- **Beads** = task state and durable repo memory (authoritative)
- **`main` branch** = merged code truth (integration branch)
- **Local memory/handoff files** = convenience only, never authoritative

## Conventions

**Claim before implementation.** Always `bd show` then `bd update --claim` before starting work. Makes ownership visible, prevents duplicate effort across sessions.

**Note incomplete work in Beads.** Use `bd note <id> "..."` for progress, not just local files. When pausing mid-task, the note is what the next session sees. Local handoff context is a convenience — Beads is the record.

**Close only on real completion.** Close a bead when the work is merged/done or explicitly superseded. Never close on commit alone. Never close on session end if work remains.

**Smallest relevant validation first.** Don't run the full test suite reflexively. Choose the smallest meaningful check for the area touched (`npm run validate:workflows` for workflow changes, specific test files for code changes). Widen validation when risk justifies it.

**Maintenance hygiene.** At natural boundaries (before session end, after a cluster of work), run `bd stale` to surface forgotten work. Not every session — just when the queue feels noisy.

## Landing the Plane (Session Completion)

When ending a work session, complete ALL steps. Work is NOT complete until `git push` succeeds.

1. **File issues** for remaining work (`bd create`)
2. **Run quality gates** if code changed (tests, linters, `npm run validate:workflows`)
3. **Update issue status** — close finished work, update in-progress items
4. **Push to remote** (MANDATORY):
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Verify** — all changes committed AND pushed

**Rules:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing — that leaves work stranded locally
- NEVER say "ready to push when you are" — YOU must push
- If push fails, resolve and retry until it succeeds
