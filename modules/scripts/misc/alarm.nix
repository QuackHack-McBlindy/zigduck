{
  lib,
  config,
  pkgs,
  allowFrom,
  ...
} : let
  zigduck-cli = "zigduck-cli";

in {
  yo.scripts.alarm = {
    description = "Set an alarm for a specified time";
    category = "Misc";
    parameters = [
      { name = "hours";      type = "string"; description = "Clock hour, 24h format"; default = "0"; optional = false;
        values = allowFrom "alarm" "hours"; }
      { name = "minutes";    type = "string"; description = "Clock minute";                       default = "0";
        values = allowFrom "alarm" "minutes"; }
      { name = "minuteWord"; type = "string"; description = "Minute phrase part (fem, kvart, …)"; default = ""; }
      { name = "prep";       type = "string"; description = "Direction: över / i / halv";         default = ""; }
      { name = "list";       type = "bool";   description = "Lists active alarms";                default = false; }
      { name = "cancel";     type = "bool";   description = "Cancel an active alarm";             default = false; }
    ];
    code = ''
      if [ "$list" = "true" ]; then
        zigduck-cli alarm list
        exit 0
      fi

      : "''${hours:=0}"
      : "''${minutes:=0}"

      if [ "$hours" -eq 0 ] && [ "$minutes" -eq 0 ] && [ -z "$prep" ]; then
        zigduck-cli alarm list
        exit 0
      fi

      raw_hours="$hours"
      raw_minutes="$minutes"
      raw_prep="$prep"
      raw_mw="''${minuteWord:-0}"

      if [ "$raw_hours" -ge 1 ] && [ "$raw_hours" -le 12 ]; then
        base1="$raw_hours"
        base2=$(( raw_hours + 12 ))
      else
        base1="$raw_hours"
        base2="$raw_hours"
      fi

      apply_prep() {
        local h=$1
        if [ -z "$raw_prep" ]; then
          echo "$h $raw_minutes"
          return
        fi
        local offset
        case "$raw_prep" in
          halv)  offset=-30 ;;
          över)  offset="$raw_mw" ;;
          i)     offset="-$raw_mw" ;;
          *)     offset=0 ;;
        esac
        local t=$(( h * 60 + offset ))
        t=$(( (t + 1440) % 1440 ))
        echo "$(( t / 60 )) $(( t % 60 ))"
      }

      read h1 m1 <<< "$(apply_prep "$base1")"
      read h2 m2 <<< "$(apply_prep "$base2")"

      now_h=$(date +%-H)
      now_m=$(date +%-M)
      now_today=$(( now_h * 60 + now_m ))

      cand1=$(( h1 * 60 + m1 ))
      cand2=$(( h2 * 60 + m2 ))

      BEST=999999
      BEST_H=$h1
      BEST_M=$m1

      for t in "$cand1" "$cand2" "$(( cand1 + 1440 ))" "$(( cand2 + 1440 ))"; do
        d=$(( t - now_today ))
        if [ "$d" -gt 0 ] && [ "$d" -lt "$BEST" ]; then
          BEST=$d
          BEST_H=$(( t / 60 % 24 ))
          BEST_M=$(( t % 60 ))
        fi
      done

      hours=$BEST_H
      minutes=$BEST_M

      alarm_hh=$(printf "%02d" "$hours")
      alarm_mm=$(printf "%02d" "$minutes")

      if [ "$cancel" = "true" ]; then
        cancel_failed() {
          echo "WARNING: FAILED"
          yo say "Jag misslyckades med att stänga av väckarklockan på $alarm_hh:$alarm_mm"
          exit 1
        }

        if ! out=$(zigduck-cli alarm remove --time "$alarm_hh:$alarm_mm" 2>&1); then
          echo "$out"
          cancel_failed
        fi

        echo "$out"
        echo "$out" | grep -q '"status": *"ok"' || cancel_failed

        exit 0
      fi

      name="alarm-$hours-$minutes"
      zigduck-cli alarm add \
        --hours   "$hours" \
        --minutes "$minutes" \
        --name    "$name"
    '';


  };}
