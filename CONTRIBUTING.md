# Contributing to google-ads-audit

Thanks for helping make this skill better. Everyone is welcome to contribute: marketers, consultants, founders and developers. Every contribution has to work for *someone else's* Google Ads account, not just yours.

## Ways to contribute

- **Report a problem**: open an Issue with the bug template (a script error, a wrong number, a misleading recommendation).
- **Propose a check or rule**: open an Issue with the check template. The best proposals come with the evidence: what you saw in a real account, what the rule should be, and why.
- **Ask questions, share results, discuss ideas**: [GitHub Discussions](https://github.com/Felixxxxs/google-ads-audit/discussions).
- **Send a pull request**: a fix, a new check in the methodology, a better template, documentation, a translation of the README.

Issues labelled `good first issue` are a good start.

## Workflow

1. Fork the repo and create a branch: `feat/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
2. Make your change. One concern per pull request.
3. Check your change (see below).
4. Add a line to `CHANGELOG.md` under `## Unreleased`.
5. Open a pull request and fill in the template. The maintainer reviews it; expect questions, not rubber stamps.

## Where things belong

| You want to change | Edit |
|---|---|
| The procedure Claude follows | `skills/google-ads-audit/SKILL.md` (keep it short; details go into references) |
| A check, threshold or decision rule | `skills/google-ads-audit/references/methodology.md` |
| The setup checklist or the experiment rules | the matching file in `skills/google-ads-audit/references/` |
| The report layout | `skills/google-ads-audit/templates/` |
| How data is pulled | `skills/google-ads-audit/scripts/` |
| Integration with business-ai-os | `skills/google-ads-audit/references/business-ai-os.md` |

## Ground rules

- **No real account data.** Never commit exports, screenshots, account or property IDs, customer names, prices or credentials. Use fictional numbers in examples.
- **Read only stays read only.** The scripts may only call read endpoints. Pull requests that add write access, mutate calls or broader OAuth scopes will not be merged.
- **Evidence over opinion.** A new rule or threshold says where it comes from (Google documentation, a reproducible observation, a source). Mark rules of thumb as such.
- **Generic over specific.** A check must make sense for a small e-commerce shop, a lead-gen service business and a SaaS company. Industry-specific checks are marked as optional with the condition when they apply.
- **No dependencies in scripts.** Node 18+ standard library and `fetch` only, so the scripts run anywhere without `npm install`.
- **Secrets never printed.** Scripts read credentials from `~/.config/google-ads-audit/` or environment variables and never log them.
- **English** for all skill and documentation text. No em dashes.

## Checking your change

- Scripts: `node --check` on every changed file (`google-ads-script-export.js` runs only inside Google Ads; test it there in Preview mode). If you have access to an account, run a real pull and confirm that the report renders and the "Notes" section lists no new failures. Do not attach the output.
- Skill text: run the skill once in Claude Code on a test project (`cp -r skills/google-ads-audit .claude/skills/`) and confirm Claude follows the changed step.
- The CI workflow checks script syntax and the plugin manifests on every pull request.

## Licensing of contributions

By submitting a pull request you agree that your contribution is licensed under the [MIT License](LICENSE) of this project.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind, be specific, assume good intent.
