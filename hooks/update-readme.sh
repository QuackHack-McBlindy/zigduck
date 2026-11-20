#!/usr/bin/env bash
set -euo pipefail

readme="${1:-README.md}"
bar_width=20
export LC_ALL=C

cd "$(dirname "$0")/.."

mapfile -t langs < <(
  grep -oP 'languages\s*=\s*\[[^]]*\]' modules/grammar/default.nix \
    | grep -oP '"[^"]+"' | tr -d '"'
)

if [[ "${#langs[@]}" -eq 0 ]]; then
  echo "no languages found in modules/grammar/default.nix" >&2
  exit 1
fi

declare -A flag=(
  [sv]="🇸🇪 Swedish"    [en]="🇬🇧 English"    [de]="🇩🇪 German"
  [fr]="🇫🇷 French"     [es]="🇪🇸 Spanish"    [no]="🇳🇴 Norwegian"
  [da]="🇩🇰 Danish"     [fi]="🇫🇮 Finnish"    [nl]="🇳🇱 Dutch"
  [is]="🇮🇸 Icelandic"  [fo]="🇫🇴 Faroese"    [et]="🇪🇪 Estonian"
  [lv]="🇱🇻 Latvian"    [lt]="🇱🇹 Lithuanian" [pl]="🇵🇱 Polish"
  [cs]="🇨🇿 Czech"      [sk]="🇸🇰 Slovak"     [sl]="🇸🇮 Slovenian"
  [hr]="🇭🇷 Croatian"   [sr]="🇷🇸 Serbian"    [bs]="🇧🇦 Bosnian"
  [mk]="🇲🇰 Macedonian" [bg]="🇧🇬 Bulgarian"  [ro]="🇷🇴 Romanian"
  [hu]="🇭🇺 Hungarian"  [el]="🇬🇷 Greek"      [it]="🇮🇹 Italian"
  [pt]="🇵🇹 Portuguese" [ru]="🇷🇺 Russian"    [uk]="🇺🇦 Ukrainian"
  [be]="🇧🇾 Belarusian" [tr]="🇹🇷 Turkish"    [sq]="🇦🇱 Albanian"
  [ar]="🇸🇦 Arabic"     [he]="🇮🇱 Hebrew"     [fa]="🇮🇷 Persian"
  [hi]="🇮🇳 Hindi"      [bn]="🇧🇩 Bengali"    [ur]="🇵🇰 Urdu"
  [ta]="🇮🇳 Tamil"      [te]="🇮🇳 Telugu"     [th]="🇹🇭 Thai"
  [vi]="🇻🇳 Vietnamese" [id]="🇮🇩 Indonesian" [ms]="🇲🇾 Malay"
  [zh]="🇨🇳 Chinese"    [ja]="🇯🇵 Japanese"   [ko]="🇰🇷 Korean"
  [ne]="🇳🇵 Nepali"     [si]="🇱🇰 Sinhala"    [my]="🇲🇲 Burmese"
  [km]="🇰🇭 Khmer"      [lo]="🇱🇦 Lao"        [ka]="🇬🇪 Georgian"
  [hy]="🇦🇲 Armenian"   [az]="🇦🇿 Azerbaijani" [kk]="🇰🇿 Kazakh"
  [uz]="🇺🇿 Uzbek"      [mn]="🇲🇳 Mongolian"  [sw]="🇹🇿 Swahili"
  [af]="🇿🇦 Afrikaans"  [zu]="🇿🇦 Zulu"       [xh]="🇿🇦 Xhosa"
  [am]="🇪🇹 Amharic"    [yo]="🇳🇬 Yoruba"     [ig]="🇳🇬 Igbo"
  [ha]="🇳🇬 Hausa"      [ga]="🇮🇪 Irish"      [cy]="🏴 Welsh"
  [mt]="🇲🇹 Maltese"    [eu]="🏴 Basque"      [ca]="🏴 Catalan"
  [gl]="🏴 Galician"    [lb]="🇱🇺 Luxembourgish"
)

err_file=$(mktemp)
trap 'rm -f "$err_file"' EXIT

echo "evaluating config…" >&2

nix_config_expr=$(cat <<'NIXEOF'
let
  flake = builtins.getFlake (toString ./.);
  lib = flake.inputs.nixpkgs.lib;
  cfg = lib.nixosSystem {
    system = "x86_64-linux";
    specialArgs = { self = flake; inputs = flake.inputs; };
    modules = [
      flake.nixosModules.zigduck
      ({ lib, ... }: {
        system.stateVersion = "24.11";
        house.zigbee.networkKeyFile = "/dev/null";
        house.zigbee.coordinator = { vendorId = "t"; productId = "t"; };
        house.zigbee.mosquitto.host = "localhost";
        house.rooms.test = { icon = "mdi:test"; };
        house.zigbee.devices."test" = {
          friendly_name = "Test"; room = "test"; type = "light"; endpoint = 1;
        };
        fileSystems = lib.mkForce { "/" = { device = "/dev/null"; fsType = "ext4"; }; };
        boot.loader.grub.enable = lib.mkForce false;
      })
    ];
  };
in {
  devices = cfg.config.house.zigbee.devices or {};
  scenes  = cfg.config.house.zigbee.scenes  or {};
  rooms   = cfg.config.house.rooms          or {};
}
NIXEOF
)

if ! config_json=$(nix eval --impure --json --show-trace --expr "$nix_config_expr" 2>"$err_file"); then
  echo "config failed — full nix error:" >&2
  echo "─────────────────────────────────────────" >&2
  cat "$err_file" >&2
  echo "─────────────────────────────────────────" >&2
  exit 1
fi

export CFG_SNAPSHOT="$config_json"

nix_grammar_expr=$(cat <<'NIXEOF'
let
  configSnapshot = builtins.fromJSON (builtins.getEnv "CFG_SNAPSHOT");
  langs = builtins.fromJSON (builtins.getEnv "LANGS_JSON");
  flake = builtins.getFlake (toString ./.);
  lib = flake.inputs.nixpkgs.lib;

  mockConfig = {
    house = {
      languages = langs;
      zigbee = {
        devices = configSnapshot.devices or {};
        scenes  = configSnapshot.scenes  or {};
        mosquitto = { baseTopic = "zigbee2mqtt"; };
      };
      rooms = configSnapshot.rooms or {};
      tv = {};
      https = { media = { url = null; urlFile = null; }; };
    };
    yo = { scripts = {}; };
    this = { user = { me = { name = "test"; }; }; };
  };

  fakePkgs = {
    stdenv = { hostPlatform = { system = "x86_64-linux"; }; };
    gnused = "/bin/sed";
    jq = "/bin/jq";
    writeText = name: _: "/fake/${name}";
    writeShellScript = name: _: "/fake/${name}";
    runCommand = name: _: _: "/fake/${name}";
  };

  selfMock = flake // {
    inputs = flake.inputs // {
      zigduck = {
        packages.x86_64-linux = {
          zigduck-cli = "/fake/zigduck-cli";
          zigduck-tv  = "/fake/zigduck-tv";
          zigduck     = "/fake/zigduck";
        };
      };
    };
  };

  findNix = dir:
    if !builtins.pathExists dir then []
    else
      let
        e = builtins.readDir dir;
        files = lib.filterAttrs (n: t:
          t == "regular"
          && lib.hasSuffix ".nix" n
          && n != "words.nix"
          && n != "lib.nix"
        ) e;
        dirs = lib.filterAttrs (_: t: t == "directory") e;
      in
        (map (n: dir + "/${n}") (builtins.attrNames files))
        ++ (lib.concatMap (n: findNix (dir + "/${n}")) (builtins.attrNames dirs));

  expandOnce = s:
    let
      chars = lib.stringToCharacters s;
      len = builtins.length chars;
      walk = i: prefixChars:
        if i >= len then { found = false; }
        else let c = builtins.elemAt chars i; in
          if c == "[" || c == "(" then
            let
              closeChar = if c == "[" then "]" else ")";
              findClose = j:
                if j >= len then null
                else if builtins.elemAt chars j == closeChar then j
                else findClose (j + 1);
              closeIdx = findClose (i + 1);
            in
              if closeIdx == null then { found = false; }
              else {
                found = true;
                prefix = builtins.concatStringsSep "" prefixChars;
                isOptional = c == "[";
                inner = builtins.concatStringsSep "" (lib.sublist (i + 1) (closeIdx - i - 1) chars);
                suffix = builtins.concatStringsSep "" (lib.sublist (closeIdx + 1) (len - closeIdx - 1) chars);
              }
          else walk (i + 1) (prefixChars ++ [c]);
      g = walk 0 [];
    in
      if !g.found then [s]
      else
        let
          alts = lib.splitString "|" g.inner;
          variants = if g.isOptional then alts ++ [""] else alts;
        in lib.concatMap (a: expandOnce (g.prefix + a + g.suffix)) variants;

  extractVars = pattern:
    let
      parts = lib.splitString "{" pattern;
      getVar = part:
        let idx = lib.findFirst (i: builtins.substring i 1 part == "}") null
                                 (lib.range 0 (builtins.stringLength part - 1));
        in if idx == null || idx == 0 then null else builtins.substring 0 idx part;
    in lib.filter (x: x != null) (map getVar (lib.drop 1 parts));

  unwrap = v:
    if builtins.isAttrs v && ((v._type or null) == "if")
    then (if v.condition then unwrap v.content else {})
    else v;

  grammarDir = ./modules/grammar;
  bundleFor = l:
    let
      langDir' = grammarDir + "/${l}";
      hasW = builtins.pathExists (langDir' + "/words.nix");
      hasL = builtins.pathExists (grammarDir + "/lib.nix");
    in
      if !hasW || !hasL then null
      else (import (grammarDir + "/lib.nix")) {
        inherit lib;
        words = import (langDir' + "/words.nix");
        config = mockConfig;
        pkgs = null;
      };

  baseMockArgs = {
    config = mockConfig;
    inherit lib;
    pkgs = fakePkgs;
    self = selfMock;
    inputs = flake.inputs;
    cmdHelpers = "";
    allowFrom = _script: _list: [];
    zigduck = { stateDir = ""; baseTopic = "zigbee2mqtt"; };

    maps = (import ./modules/scripts/lib.nix) {
      config = mockConfig;
      inherit lib;
      pkgs   = fakePkgs;
      words  = import ./modules/grammar/sv/words.nix;
    };
  };

  mockArgs = baseMockArgs // lib.genAttrs langs bundleFor // {
    swe = bundleFor "sv";
    eng = bundleFor "en";
    fre = bundleFor "fr";
    ger = bundleFor "de";
    esp = bundleFor "es";
  };

  countLang = lang:
    let
      langDir = grammarDir + "/${lang}";
      bundle = bundleFor lang;

      langFiles   = if bundle == null then [] else findNix langDir;
      inlineFiles = if lang == "sv" && bundle != null then findNix ./modules/scripts else [];
      allFiles    = langFiles ++ inlineFiles;

      imports = map (f:
        let
          m = import f;
        in
          if !(builtins.isFunction m) then {}
          else
            let r = builtins.tryEval (m mockArgs);
            in if r.success
               then r.value.yo.scripts or {}
               else builtins.trace "  skipped ${toString f} (import failed — missing arg)" {}
      ) allFiles;

      scripts = lib.foldl' (a: b: lib.recursiveUpdate a b) {} imports;

      countScript = _name: script:
        let
          script'   = unwrap script;
          voice     = unwrap (script'.voice or {});
          sentences = unwrap (voice.sentences or []);
          lists     = unwrap (voice.lists or {});
          expanded  = lib.concatMap expandOnce sentences;
          patterns  = builtins.length expanded;
          phrasesFor = pat:
            let
              vars = extractVars pat;
              counts = map (v:
                if (lists.${v}.wildcard or false) then 1
                else builtins.length (lists.${v}.values or [])
              ) vars;
            in lib.foldl' (a: b: a * b) 1 counts;
          phrases = lib.foldl' (a: p: a + phrasesFor p) 0 expanded;
        in { inherit patterns phrases; };

      results = lib.mapAttrs countScript scripts;
    in {
      totalPatterns = lib.foldl' (a: r: a + r.patterns) 0 (builtins.attrValues results);
      totalPhrases  = lib.foldl' (a: r: a + r.phrases)  0 (builtins.attrValues results);
    };

  evalLangs =
    let s = builtins.getEnv "LANG_TO_EVAL";
    in if s == "" then langs else [ s ];
in
  lib.genAttrs evalLangs countLang
NIXEOF
)

export LANGS_JSON="$(printf '%s\n' "${langs[@]}" | jq -R . | jq -sc .)"

declare -A patterns phrases
declare -A failed
declare -A lang_error
max_patterns=0
total_patterns=0
total_phrases=0
failed_count=0

for lang in "${langs[@]}"; do
  echo "  counting $lang…" >&2
  export LANG_TO_EVAL="$lang"

  if ! stats=$(nix eval --impure --json --show-trace --expr "$nix_grammar_expr" 2>"$err_file"); then
    echo "     $lang failed to evaluate" >&2
    failed[$lang]=1
    lang_error[$lang]=$(cat "$err_file")
    failed_count=$(( failed_count + 1 ))
    continue
  fi

  patterns[$lang]=$(jq -r --arg l "$lang" '.[$l].totalPatterns // 0' <<< "$stats")
  phrases[$lang]=$(jq -r --arg l "$lang" '.[$l].totalPhrases  // 0' <<< "$stats")

  (( patterns[$lang] > max_patterns )) && max_patterns=${patterns[$lang]}
  total_patterns=$(( total_patterns + patterns[$lang] ))
  total_phrases=$(( total_phrases  + phrases[$lang]  ))
done
unset LANG_TO_EVAL

sorted_langs=()
while IFS= read -r lang; do sorted_langs+=("$lang"); done < <(
  for lang in "${langs[@]}"; do
    if [[ -v "failed[$lang]" ]]; then
      printf '0\t1\t%s\n' "$lang"
    else
      printf '%s\t0\t%s\n' "${patterns[$lang]}" "$lang"
    fi
  done | sort -t$'\t' -k2,2n -k1,1nr | cut -f3
)

fmt_num() {
  local n=$1
  if   (( n >= 1000000000 )); then printf "%.2fB" "$(awk "BEGIN{print $n/1000000000}")"
  elif (( n >= 1000000    )); then printf "%.2fM" "$(awk "BEGIN{print $n/1000000}")"
  elif (( n >= 1000       )); then printf "%.1fK" "$(awk "BEGIN{print $n/1000}")"
  else echo "$n"; fi
}

rows=()
for lang in "${sorted_langs[@]}"; do
  label="${flag[$lang]:-$lang}"

  if [[ -v "failed[$lang]" ]]; then
    rows+=("| $label | ❌ eval error | — |")
    continue
  fi

  p=${patterns[$lang]}

  if (( max_patterns == 0 || p == 0 )); then
    pct_cell="—"
  else
    pct=$(( p * 100 / max_patterns ))
    filled=$(( pct * bar_width / 100 ))
    empty=$(( bar_width - filled ))
    bar="$(printf '█%.0s' $(seq 1 $filled))$(printf '░%.0s' $(seq 1 $empty))"
    pct_cell="\`${bar}\` ${pct}%"
  fi
  rows+=("| $label | $pct_cell | $p |")
done

if (( failed_count > 0 )); then
  total_patterns_cell="**$total_patterns** *(+${failed_count} failed)*"
else
  total_patterns_cell="**$total_patterns**"
fi

table="| Language | Progress | Patterns |
|----------|:---------|---------:|
$(printf '%s\n' "${rows[@]}")
| **Total** | | $total_patterns_cell |"

if ! grep -q '<!-- LANGUAGES_START -->' "$readme"; then
  cat >&2 <<EOF
❌ README is missing markers. Add:

  ## Supported Languages

  <!-- LANGUAGES_START -->
  <!-- LANGUAGES_END -->
EOF
  exit 1
fi

awk -v new="$table" '
  /<!-- LANGUAGES_START -->/ { print; print new; skip=1; next }
  /<!-- LANGUAGES_END -->/   { skip=0 }
  !skip                       { print }
' "$readme" > "$readme.tmp"
mv "$readme.tmp" "$readme"
echo "Updated $readme"

if (( failed_count > 0 )); then
  echo "" >&2
  echo "  ${failed_count} language(s) failed to evaluate: ${!failed[*]}" >&2
  for lang in "${!failed[@]}"; do
    echo "" >&2
    echo "───── $lang ─────" >&2
    echo "${lang_error[$lang]}" >&2
  done
  exit 1
fi
