# dotfiles/bin/media/tv-scrape.nix ⮞ https://github.com/quackhack-mcblindy/dotfiles
# » ★ QuackHack-McBLindy.com ★ «
{ # 🦆 duck say ⮞ scrape TV-guide and save EPG/HTML/XML for frontend
  config,
  lib,
  swe,
  pkgs,
#  zigduck,
  ...
} : let
  defaultDir = "/var/lib/zigduck";
in {
  yo.scripts.tv-scrape = {
    description = "Scrape the web for TV-guide data and save data for frontend.";
    category    = "Media";
    parameters = [
      { name = "dir"; description = "Output directory (defaults to zigduck state dir)"; optional = true;
          default = defaultDir; }
      { name = "wildcard"; description = "Nothing to see here...."; type = "string"; optional = true; }
    ];
    code = ''
      OUT="$dir"
      mkdir -p "$OUT"

      zigduck-epg \
        --json-out "$OUT/epg.json" \
        --html-out "$OUT/tv.html" \
        --xml-out  "$OUT/epg.xml"
    '';

  };}
