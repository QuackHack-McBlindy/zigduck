{
  self,
  lib,
  config,
  pkgs,
  sv,
  allowFrom,
  maps,
  ...
} : let

in {

  yo.scripts.compare = {
    description = "Return true/false whether a device's numeric metric (power, battery, temperature, humidity, brightness, signal, lux) is above or below a threshold.";
    category = "Zigbee";
    parameters = [
      { name = "device"; description = "Device to check"; optional = true;
          values = allowFrom "compare" "device"; }
      { name = "scope";  description = "device (default) | any | all | none"; optional = true; default = "device";
          values = [ "device" "any" "all" "none" ]; }
      { name = "metric"; description = "Which metric to read"; optional = true; default = "power";
          values = allowFrom "compare" "metric"; }
      { name = "above"; description = "Return true if metric > this value"; optional = true; }
      { name = "below"; description = "Return true if metric < this value"; optional = true; }
    ];
    code = ''
      ${maps.mkBashMap "DEVICE_LOOKUP" maps.deviceMap}

      SCOPE="''${scope:-device}"
      D="''${device:-}"
      METRIC="''${metric:-power}"

      [ -z "''${above:-}" ] && [ -z "''${below:-}" ] && {
        echo "false"; echo "❌ --above eller --below krävs" >&2; exit 1; }
      [ -n "''${above:-}" ] && [ -n "''${below:-}" ] && {
        echo "false"; echo "❌ ange --above ELLER --below, inte båda" >&2; exit 1; }

      STATE_JSON=$(zigduck-cli --state-json 2>/dev/null | jq -c 'with_entries(.key |= ascii_downcase)')
      [ -z "$STATE_JSON" ] && { echo "false"; echo "❌ zigduck-cli svarar inte" >&2; exit 1; }

      if [ "$SCOPE" = "device" ]; then
        [ -z "$D" ] && { echo "false"; echo "❌ --device krävs för scope=device" >&2; exit 1; }

        D_LOWER=$(printf '%s' "$D" | tr '[:upper:]' '[:lower:]')
        RESOLVED="''${DEVICE_LOOKUP[$D_LOWER]:-$D_LOWER}"

        EXISTS=$(printf '%s' "$STATE_JSON" | jq -r --arg d "$D_LOWER" '.[$d] != null')
        [ "$EXISTS" != "true" ] && {
          echo "false"; echo "❌ Okänd enhet: '$D'" >&2; exit 1; }

        VALUE=$(printf '%s' "$STATE_JSON" | jq -r --arg d "$D_LOWER" --arg m "$METRIC" '.[$d][$m] // empty' 2>/dev/null)
        [ -z "$VALUE" ] && { echo "false"; echo "❌ '$RESOLVED' saknar '$METRIC'" >&2; exit 1; }
        [[ "$VALUE" =~ ^-?[0-9.]+$ ]] || { echo "false"; echo "❌ Icke-numerisk $METRIC: '$VALUE'" >&2; exit 1; }

        if [ -n "''${above:-}" ]; then
          RESULT=$(awk -v v="$VALUE" -v t="$above" 'BEGIN{print (v>t)?"true":"false"}')
        else
          RESULT=$(awk -v v="$VALUE" -v t="$below" 'BEGIN{print (v<t)?"true":"false"}')
        fi
        echo "$RESULT"
        exit 0
      fi

      if [ -n "''${above:-}" ]; then DIR=gt; THRESHOLD="$above"
      else                        DIR=lt; THRESHOLD="$below"; fi

      COND=$(printf '%s' "$STATE_JSON" | jq -r \
        --arg m "$METRIC" --arg t "$THRESHOLD" --arg dir "$DIR" --arg scope "$SCOPE" '
        [ .[] | .[$m]? | select(. != null) | tonumber? // empty ] as $vals
        | if $dir == "gt" then
            { any:  (any($vals[]; . > ($t|tonumber))),
              all:  (($vals|length) > 0 and all($vals[]; . > ($t|tonumber))),
              none: (all($vals[]; . <= ($t|tonumber))) }
          else
            { any:  (any($vals[]; . < ($t|tonumber))),
              all:  (($vals|length) > 0 and all($vals[]; . < ($t|tonumber))),
              none: (all($vals[]; . >= ($t|tonumber))) }
          end
        | .[$scope]
      ')

      case "$COND" in
        true|false) echo "$COND" ;;
        *) echo "false"; echo "❌ Kunde inte utvärdera scope=$SCOPE" >&2; exit 1 ;;
      esac
    '';

  };}
