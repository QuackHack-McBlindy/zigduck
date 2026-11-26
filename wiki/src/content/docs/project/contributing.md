---
title: Contributing
description: How to help with zigduck, add protocol support and edit this wiki.
---

Contributions are welcome. zigduck is licensed under the MIT license; see the `LICENSE` file in the
repository.

# Welcome to the `zigduck` Contributing Guide

Thank you for considering contributing to our project! Your efforts help make
`zigduck` a better ecosystem for everyone.

## Getting Started

1. Fork the repository.
2. Clone your fork.
3. Create a feature branch (`git switch -c feat/my-change`).
4. Make your changes.
5. Run the tests and checks (see below).

## Development Setup

```bash
nix develop
```

This drops you into a shell with `nix`, `jq`, and the toolchain the hooks
expect. All checks below are runnable from that shell.

## Making Changes

- Keep changes focused and minimal.
- Follow the existing code style and conventions.
- Append appropriate entries to `CHANGELOG.md`.

## Contributing Grammar

1. **Register the language** in `modules/grammar/default.nix`:

   ```nix
   languages = [ "sv" "en" "de" "fr" "es" "xx" ];
   ```

   Use a 2-letter ISO code. If it's missing here, it is invisible to the
   grammar test and to `hooks/update-readme.sh`.

2. Create `modules/grammar/<code>/` and translate
   `modules/grammar/en/words.nix` into your language — same shape, same keys,
   just translated values.

3. Then translate scripts, keeping the same directory structure as `en/`.
   Every script must be wrapped in a language guard:

   ```nix
   voice = lib.mkIf (lib.elem "xx" config.house.languages) { … };
   ```

4. Verify the grammar before opening a PR:

   ```bash
   # full conflict-detection check across every registered language
   nix flake check

   # update the language table in README.md
   bash hooks/update-readme.sh
   ```

   The grammar test evaluates each language in isolation and fails with a
   readable list of any alias / pattern conflicts against the other
   languages.

5. For fast iteration while drafting, run a single language instead of the
   full check:

   ```bash
   # inside the nix develop shell
   LANG_TO_EVAL=xx bash hooks/update-readme.sh
   ```

   (The hook still needs the other languages present; this just narrows the
   per-language eval loop.)

## Contributing Scripts

1. Keep scripts free of API tokens, passwords, and other secrets.
2. Reference other packages via their store paths, e.g.
   `${pkgs.curl}/bin/curl`, never bare `curl`.
3. Contribute at least one language's grammar alongside a new script — a
   script with no grammar is unreachable.

## Contributing Protocols

If you'd like `zigduck` to support devices using other protocols (`Matter`,
`Z-Wave`, …), submit a PR with a persistent device-configuration shape. Include
enough detail to make the implementation strategy clear and the build fully
reproducible.

## Commits

Write clear, descriptive commit messages. Prefer small, logical commits.

## Pull Requests

Before opening a PR, confirm:

- [ ] `nix flake check` passes
- [ ] `bash hooks/update-readme.sh` has been run and the README table is current
- [ ] New languages are registered in `modules/grammar/default.nix`
- [ ] `CHANGELOG.md` is updated

Describe *what* changed and *why* in the PR body. Link related issues with
`Closes #123` where applicable.

## Reporting Issues

Use GitHub Issues to report bugs or suggest improvements. Include steps to
reproduce bugs whenever possible, plus your `nix --version` and the relevant
excerpt from `nix flake check` output.

## Questions

Open a GitHub Discussion or issue if you need help.

Thank you for contributing!
## Editing this wiki

The wiki is an [Astro Starlight](https://starlight.astro.build/) site in the `wiki/` folder.

- Guide pages are Markdown files in `wiki/src/content/docs/`. Every page has an "Edit page" link at
  the bottom.
- The [option reference](../../reference/options/) is generated from `hooks/options.json` and
  `hooks/service.json` by `wiki/scripts/gen-options.mjs`. To change an option's text, edit its
  `description` or `example` in the Nix module, then rerun `hooks/get-options.sh`.

To preview locally:

```sh
cd wiki
npm install
npm run dev
```

## Support the project

[Sponsor on GitHub](https://github.com/sponsors/QuackHack-McBlindy) or
[buy the author a coffee](https://buymeacoffee.com/quackhackmcblindy).
