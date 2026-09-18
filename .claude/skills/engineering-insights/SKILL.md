---
name: engineering-insights
description: Captures the durable insights from a work session and appends them to the right module's insights.md in DevDigest. Use when wrapping up a session, when finishing a non-trivial task, when the user asks what we learned or says to record the learnings, when /engineering-insights is invoked, and also mid-task the moment something non-obvious surfaces — a user correction, an abandoned approach, a repeated error, a decision and its reason, or surprising dependency or tooling behaviour. Routes each insight to the module file it belongs to (server, client, reviewer-core, e2e, or the cross-package root file), applies a quality bar that drops anything already visible in the code or already written down, proposes the survivors for approval, and appends only what the user keeps. A quick question, a typo fix, or a routine config edit is not an insight and exits having written nothing.
---

# Engineering insights

Turn what this session learned into entries in DevDigest's `insights.md` files, so the
next session starts where this one ended.

Routing, section choice, and entry shape are **strict** — a wrong file silently loses the
entry, and a sprawling entry stops being read. Judging what counts as significant is
**loose** — the lists below are heuristics, not rules.

Terms used throughout, and nowhere varied: an **insight** is the thing learned, an
**entry** is the line that records it, a **section** is the fixed heading it lives under,
a **module** is the package whose file it belongs to.

## Step 0 — gate check (silent)

Judge by signal, not by clock — elapsed time is not measurable from here. Mine a session
that hit errors, drew corrections, or argued about approach. A quick question, a typo fix,
a routine config edit, or a task that went right the first time exits **here**: say
"nothing worth recording" in one line and stop.

## Step 1 — extract candidates

Scan the session for candidates, ranked by signal strength:

1. **User corrections** — "no, do it this way". Highest signal: something the agent got
   wrong that the codebase does not reveal.
2. **Approaches tried and abandoned**, and workarounds applied to get past something.
3. **Something repeated** — the same error hit twice, or the same manual step needed again.
4. **A decision made, with its reason** — especially one a future session would re-litigate.
5. **Surprising dependency or tooling behaviour** — a command that had to be run first, a
   lockfile that fought back, a generated file that must not be edited.

Cap at **5 candidates per session**; a file past a couple of hundred entries stops being
read at all.

## Step 2 — route each candidate

Resolve every path from the repo root.

| What the task touched | File |
|---|---|
| `server/**` (incl. `src/modules/repo-intel/`) | `server/insights.md` |
| `client/**` | `client/insights.md` |
| `reviewer-core/**` | `reviewer-core/insights.md` |
| `e2e/**` | `e2e/insights.md` |
| `scripts/`, `.github/workflows/`, root config, or anything true across ≥2 packages | `insights.md` (root) |

Two routings are easy to get wrong:

- A `vendor/shared` contract change touches server **and** client, so it is a root-file
  insight.
- When the **symptom is in one module and the cause in another**, the insight is true of
  both — file it at root, not under either one. A `server/` typecheck that fails because of
  `reviewer-core/`'s install state is a root-file insight; filing it under `reviewer-core`
  hides it from the session that will actually hit it.

**Never write into `server/clones/**` or `.claude/worktrees/**`.** Both hold full copies of
this repo, each with its own `insights.md` (`CLAUDE.md` → *Do not touch*). An entry written
there is silently lost. Check the path before editing.

Then pick the section. The seven are fixed; never invent a heading:

| Section | What belongs there |
|---|---|
| `## What Works` | An approach that proved out and should be reached for again |
| `## What Doesn't Work` | An approach that failed, and why it failed |
| `## Codebase Patterns` | A convention or structural fact true of this code but not stated in it |
| `## Tool & Library Notes` | Behaviour of a dependency, CLI, or generator |
| `## Recurring Errors & Fixes` | An error message paired with what actually fixes it |
| `## Session Notes` | What a session settled, when it doesn't reduce to one claim |
| `## Open Questions` | Something unresolved that the next session should decide |

## Step 3 — apply the quality bar, then drop

Draft each entry, check it against the bar, revise or discard. Only survivors proceed.

**Shape is the bar most often failed.** The entry is *one sentence* of claim, then its
evidence — not a paragraph, not a write-up of the investigation:

```
- **YYYY-MM-DD** — <claim in one sentence>. Evidence: <path:line>.
```

Three or four lines is a healthy entry. If the draft runs past about six, it is a session
report, not an entry: cut it to the single claim a future agent must act on and let the
cited `path:line` carry the detail. Mechanism, reproduction narrative, and "here is what I
checked" all belong in the reply to the user, not in the file.

*Session Notes* is the one exception in form: `### YYYY-MM-DD`, then one or two lines on
what the session settled.

The rest of the bar:

- **Cold-read test.** An agent reading this entry with no memory of the session knows what
  to do differently. If it only makes sense to someone who was here, rewrite it.
- **If it's obvious to anyone reading the code, don't write it.** The file is for what the
  code cannot tell you.
- **Evidence is required** — a `path:line`, a command, or a diff, so the next session
  re-verifies in seconds instead of trusting the claim.
- **Dedup, and check `CLAUDE.md` too.** Read the target file's sections before drafting —
  but also check `CLAUDE.md` (*Conventions*, *Gotchas*, *Do not touch*), because a fact
  already stated there needs no entry. Confirming a documented gotcha is not an insight;
  only a correction to it, or a mechanism that changes what someone does, earns an entry.
  On overlap: drop the candidate, or extend the existing entry with a dated note beneath
  it. Never add a near-duplicate sibling.

## Step 4 — propose, don't write

Present the survivors as a short list — each with its **target file**, **section**, and the
**entry text** — and ask which to keep. Nothing is appended before the user answers.

This is not ceremony. An agent summarising its own session is exactly where the wrong
lesson gets written down confidently, and a human spot-check is the cheapest place to catch
it.

## Step 5 — append the approved entries

Read the target file again immediately before editing — it may have changed. Append with
`Edit`, inside the right heading, at the end of that section.

**Append-only.** Never rewrite or delete an existing entry, even a wrong one; correct a
stale entry with a dated note beneath it. The history of what we believed is itself useful,
and rewriting a shared file produces merge conflicts that silently drop other people's
lessons.

Close by reporting which files gained which entries.

## Examples

A raw session moment, and the entry it should become.

**Moment:** the API booted but every request 500'd with `relation "repos" does not exist`;
migrations had never been run.

- Rejected — *"Migrations can be tricky, remember to run them."* Fails the cold-read test:
  no error text, no command, no evidence.
- Rejected — a 20-line entry walking through the boot sequence, which file was checked, and
  what `tsc` printed. Right finding, wrong artifact: that is the reply, not the entry.
- Rejected on dedup — `CLAUDE.md` → *Gotchas* already says migrations do not run on boot.
  Re-confirming it earns nothing.
- Kept, only because it corrects the documented claim — `server/insights.md` →
  *Recurring Errors & Fixes*:
  `- **2026-09-18** — `pnpm db:migrate` exits 0 without applying anything when `DATABASE_URL`
  points at the wrong port, so `relation … does not exist` survives a migrate that looked
  successful. Evidence: `server/src/db/migrate.ts:14`; `scripts/dev.sh:31`.`

**Moment:** a field added to a `@devdigest/shared` contract compiled on the server and
failed on the client, because the client's vendored copy is hand-maintained.

- Rejected — *"Be careful with the vendored code."* States no claim and names no path.
- Rejected on dedup — `client/insights.md` already records this drift in detail. Extend
  that entry with a dated note if there is something new; do not add a sibling.
- Kept — root `insights.md` → *What Doesn't Work*, had it not already been recorded:
  `- **2026-09-18** — A contract change lands in `server/src/vendor/shared/` only;
  `client/src/vendor/shared/` is hand-mirrored with no sync script, so the client keeps
  compiling against the old shape until someone copies it across.
  Evidence: `diff -rq server/src/vendor/shared client/src/vendor/shared`.`

**Moment:** the user said "don't run `pnpm install` in `reviewer-core/`".

- Kept, if not already recorded — root `insights.md` → *Recurring Errors & Fixes*. A user
  correction about a convention the code does not state is the highest-signal candidate
  there is.
