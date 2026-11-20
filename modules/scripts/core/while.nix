{
  config,
  lib,
  pkgs,
  ...
} : let

in {
  yo.scripts.while = {
    description = "Repeat a command while a condition holds.";
    category = "Core";
    parameters = [
      { name = "condition"; description = "Query returning true/false"; optional = false; }
      { name = "body";      description = "Command to repeat while condition is true"; optional = false; }
      { name = "every";       description = "Seconds between iterations";     default = "5"; }
      { name = "max_minutes"; description = "Hard ceiling on loop duration";  default = "30"; }
    ];

    code = ''
      COND="''${condition:-}"
      BODY="''${body:-}"
      EVERY="''${every:-5}"
      MAX="''${max_minutes:-30}"

      COND="''${COND#kolla om }"
      COND="''${COND#kontrollera om }"
      QUERY="kolla om $COND"

      START=$(date +%s)
      LIMIT=$(( MAX * 60 ))

      while true; do
        [ $(( $(date +%s) - START )) -ge "$LIMIT" ] && break

        RESULT=$(yo do "$QUERY" 2>/dev/null | tail -1 | tr -d '[:space:]')
        case "$RESULT" in
          true|false) ;;
          *) RESULT=$(yo do "$COND" 2>/dev/null | tail -1 | tr -d '[:space:]') ;;
        esac
        [ "$RESULT" = "true" ] || break

        timeout 10 yo do "$BODY" 2>/dev/null || true
        sleep "$EVERY"
      done
    '';

  };}
