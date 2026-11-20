# Grammar

Voice grammar for the natural-language engine. One file per language per script:

```
modules/grammar/<lang>/<script>.nix   ← what the user says
modules/scripts/core/<script>.nix     ← what it does (shared by all languages)
```

## Add a new language

1. Create the directory: `modules/grammar/de/`
2. Copy a file from `sv/` and translate the sentences
3. Keep `{var}` placeholders **identical** — they map to the core script's parameters
4. Register it in `modules/scripts/default.nix`:
   ```nix
   supportedLanguages = [ "de" "en" "sv" ];
   ```
5. Run the check:
   ```bash
   nix build .#checks.x86_64-linux.grammar
   ```

The README language table updates on your next commit.

## Add grammar to an existing script

Drop a file into `modules/grammar/<lang>/` — it's picked up automatically.

```nix
{ lib, ... }:
{
  yo.scripts.chain.voice = {
    priority = 5;
    fuzzy.enable = true;
    fuzzy.threshold = 0.5;

    sentences = [
      "{a} und {b}"
      "{a} und {b} und {c}"
    ];

    lists = {
      a.wildcard = true;
      b.wildcard = true;
      c.wildcard = true;
    };
  };
}
```

## The rules

| Rule | Why |
|---|---|
| Every `{var}` needs a matching `lists.<var>` | Otherwise the sentence can never match |
| Every `lists.<var>` needs `wildcard = true` or non-empty `values` | An empty list is dead grammar |
| Every `{var}` must be a parameter in `core/<script>.nix` | Voice can't pass data the script doesn't accept |
| No two sentences >70% token-similar | The fuzzy matcher gets confused — see below |

## Sentence design

Keep sentences **distinct** across scripts. `tills {x}` (until) vs `medan {x}` (while) is 75% similar and will be rejected by CI — rewrite one so the words differ.

**Prefer:**

- Unique verbs per script: `sätt`, `släck`, `tänd`, `så länge`
- Different sentence structures — not just one word swapped
- 4–8 tokens per template
- Optional connectors in brackets: `"om {cond} [så] {then}"`

## Run the check

```bash
nix build .#checks.x86_64-linux.grammar
```

Fails with a clear message on any grammar problem — pass before pushing.

## Multi-language

All languages load simultaneously. A user can say a Swedish *or* an English phrase and the fuzzy matcher picks the closest. `house.language` is just a hint, not a hard switch.

See [`/CONTRIBUTING.md`](../../CONTRIBUTING.md) for the full workflow.
