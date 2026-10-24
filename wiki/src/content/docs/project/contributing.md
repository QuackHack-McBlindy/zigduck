---
title: Contributing
description: How to help with zigduck, add protocol support and edit this wiki.
---

Contributions are welcome. zigduck is licensed under the MIT license; see the `LICENSE` file in the
repository.

## More protocols

If you'd like zigduck to support devices on other protocols such as Matter or Z-Wave, open a pull request with a suggested persistent device configuration. Include enough
detail for a clear implementation plan, and keep zigduck fully reproducible.

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
