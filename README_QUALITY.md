# Quality Standard — This Repo

This repo follows the **Universal Quality Standard** (established 2026-04-09 after the n8n outage).

## What's in place

- **CodeRabbit** — AI code review on every PR (`.coderabbit.yaml`)
- **Pre-commit hooks** — Ruff, Gitleaks, hygiene checks (`.pre-commit-config.yaml`)
- **Dependabot** — Weekly vulnerability scans (`.github/dependabot.yml`)
- **CI Pipeline** — Lint + tests + security on every PR (`.github/workflows/ci.yml`)
- **Branch protection** — Main is protected, PRs required
- **CODEOWNERS** — Auto-assigns reviewers

## Setup (first time clone)

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# Run hooks on all files (first time)
pre-commit run --all-files
```

## Development workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes
3. Commit — pre-commit hooks run automatically
4. Push — CI runs
5. Open PR — CodeRabbit reviews automatically
6. Address feedback, get approval, merge

## Never

- Push directly to `main` (branch protection blocks this)
- Use `--no-verify` to bypass pre-commit hooks
- Merge with failing CI
- Ignore Dependabot PRs for more than a week

See `quality_standard_universal.md` in Claude's memory for the full standard.
