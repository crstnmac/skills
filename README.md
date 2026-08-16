# skills

Published agent skills. Each skill is a self-contained package.

| Skill | Package |
| --- | --- |
| [generate-vector-logo](generate-vector-logo/) | `@crstnmac/generate-vector-logo` |
| [a11y-audit](a11y-audit/) | `@crstnmac/a11y-audit` |

## Install with the skills CLI

Install both skills interactively from this repository:

```bash
npx skills add crstnmac/skills
```

Install one skill globally for Codex without prompts:

```bash
npx skills add crstnmac/skills \
  --skill a11y-audit \
  --global \
  --agent codex \
  --yes

npx skills add crstnmac/skills \
  --skill generate-vector-logo \
  --global \
  --agent codex \
  --yes
```

List the skills before installing:

```bash
npx skills add crstnmac/skills --list
```

Use a skill for one task without installing it:

```bash
npx skills use crstnmac/skills@a11y-audit --agent codex
npx skills use crstnmac/skills@generate-vector-logo --agent codex
```

The repository follows the open Agent Skills layout: each discoverable directory contains a `SKILL.md` with `name` and `description` frontmatter. The `skills` CLI discovers both folders directly; no additional registry manifest is required.

## Install from npm

The packages are also available independently:

```bash
npm install @crstnmac/a11y-audit
npm install @crstnmac/generate-vector-logo
```

## License

MIT
