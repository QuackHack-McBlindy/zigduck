{
  config,
  lib,
  pkgs,
  ...
} : let

in {
   yo.scripts.chain = {
    description = "Chain commands.  Splits and dispatches each part sequentially.";
    category = "Core";
    parameters = [
      { name = "a"; description = "First command"; type = "string"; optional = false; }
      { name = "b"; description = "Second command"; type = "string"; optional = false; }
      { name = "c"; description = "Optional third command"; type = "string"; optional = true; }
      { name = "d"; description = "Optional fourth command"; type = "string"; optional = true; }
    ];
    code = ''
      for part in "''${a:-}" "''${b:-}" "''${c:-}" "''${d:-}"; do
        if [ -n "$part" ]; then
          yo do "$part" || exit $?
        fi
      done
      exit 0
    '';


  };}
