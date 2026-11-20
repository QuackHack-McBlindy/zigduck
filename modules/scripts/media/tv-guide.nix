{
  self,
  lib,
  config,
  pkgs,
  ...
} : let
in {
  yo.scripts.tv-guide = {
    description = "Show the current TV-guide with progress bars";
    category    = "Media";

    parameters = [
      { name = "search";       description = "TV show to search for";                            optional = true; }
      { name = "channel";      description = "TV channel to list currently playing on";          optional = true; }
      { name = "jsonFilePath"; description = "Path to the EPG JSON file (default: ~/epg.json)";  optional = true; default = ""; }
    ];

    code = ''
      channel="$channel"
      search="$search"
      jsonFilePath="''${jsonFilePath:-$HOME/epg.json}"

      if [ ! -f "$jsonFilePath" ]; then
        echo "EPG not found at $jsonFilePath — scraping…" >&2
        zigduck-epg \
          --json-out "$jsonFilePath" \
          --html-out "''${jsonFilePath%.json}.html" \
          --xml-out  "''${jsonFilePath%.json}.xml" >/dev/null 2>&1 || true
        sleep 2
      fi

      clean_title() {
        echo "$1" | ${pkgs.gnused}/bin/sed 's/<[^>]*>//g' \
                  | ${pkgs.gnused}/bin/sed 's/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&apos;/'"'"'/g'
      }

      extract_epg_time() {
        local epg_time="$1"
        echo "''${epg_time:8:2}:''${epg_time:10:2}"
      }

      epg_to_epoch() {
        local epg_time="$1"
        local year="''${epg_time:0:4}"
        local month="''${epg_time:4:2}"
        local day="''${epg_time:6:2}"
        local hour="''${epg_time:8:2}"
        local minute="''${epg_time:10:2}"
        date -d "''${year}-''${month}-''${day} ''${hour}:''${minute}" +%s 2>/dev/null || echo "0"
      }

      get_channel_name() {
        ${pkgs.jq}/bin/jq -r --arg id "$1" '
          (.channels // [])[] | select(.id == $id) | .name
        ' "$jsonFilePath"
      }

      repeat_char() {
        local n="$1" c="$2" out=""
        for ((i=0; i<n; i++)); do out+="$c"; done
        printf '%s' "$out"
      }

      get_progress_bar() {
        local start_time="$1"
        local end_time="$2"
        local width=50
        local start_epoch=$(epg_to_epoch "$start_time")
        local end_epoch=$(epg_to_epoch "$end_time")
        local now_epoch=$(date +%s)

        if [ "$start_epoch" -eq 0 ] || [ "$end_epoch" -eq 0 ]; then
          repeat_char "$width" "─"
          return
        fi

        local total_duration=$((end_epoch - start_epoch))
        local elapsed=$((now_epoch - start_epoch))
        local progress=0

        if [ "$total_duration" -gt 0 ]; then
          progress=$((elapsed * 100 / total_duration))
        fi

        (( progress < 0 ))   && progress=0
        (( progress > 100 )) && progress=100

        local filled=$((progress * width / 100))
        local empty=$((width - filled))
        local bar="$(repeat_char "$filled" "█")$(repeat_char "$empty" "─")"

        if (( progress < 50 )); then
          printf '\033[32m%s\033[0m\n' "$bar"
        elif (( progress < 75 )); then
          printf '\033[33m%s\033[0m\n' "$bar"
        else
          printf '\033[31m%s\033[0m\n' "$bar"
        fi
      }

      schedule_future_program() {
        local chan_id="$1"
        local start_epoch="$2"
        local title="$3"
        local start_time="$4"
        local current_epoch=$(date +%s)
        local delay_seconds=$((start_epoch - current_epoch))

        if [ "$delay_seconds" -gt 0 ] && [ "$delay_seconds" -lt 86400 ]; then
          local delay_minutes=$(( (delay_seconds + 59) / 60 ))
          local start_time_formatted=$(extract_epg_time "$start_time")
          echo "Scheduling '$title' on channel $chan_id in $delay_minutes min (at $start_time_formatted)" >&2
          yo say "Programmet $title sänds på $chan_id klockan $start_time_formatted. Jag ser till att starta det åt dig när det är dax!" 2>/dev/null || true
          echo "yo tv --typ livetv --search '$chan_id'" |
            at now + "$delay_minutes" minutes 2>/dev/null || true
        fi
      }

      display_channel_info() {
        local chan_id="$1"
        local title="$2"
        local start_time="$3"
        local end_time="$4"
        local progress_bar="$5"
        title=$(clean_title "$title")
        local start_fmt=$(extract_epg_time "$start_time")
        local end_fmt=$(extract_epg_time "$end_time")
        local channel_name=$(get_channel_name "$chan_id")
        local title_length=''${#title}
        local padding=0
        [ "$title_length" -lt 50 ] && padding=$(( (50 - title_length) / 2 ))

        printf "\n%*s" "$padding" ""
        printf '\033[1m%s\033[0m\n' "$title"
        printf '\033[1m%s\033[0m - %s\n' "$chan_id" "$channel_name"
        repeat_char 77 "─"; printf '\n'
        printf '%s %b %s\n' "$start_fmt" "$progress_bar" "$end_fmt"
      }

      is_program_current() {
        local start_time="$1"
        local end_time="$2"
        local start_epoch=$(epg_to_epoch "$start_time")
        local end_epoch=$(epg_to_epoch "$end_time")
        local now_epoch=$(date +%s)

        [ "$start_epoch" -le "$now_epoch" ] && [ "$now_epoch" -lt "$end_epoch" ]
      }

      # ── channel search ──
      if [ -n "$channel" ]; then
        programs=$(${pkgs.jq}/bin/jq -r --arg chan "$channel" '
          (.channels[].programs // [])[] |
          select(.channel_id == $chan) |
          "\(.title)|\(.start)|\(.stop)"
        ' "$jsonFilePath")

        found_current=false
        while IFS='|' read -r title start_time end_time; do
          if is_program_current "$start_time" "$end_time"; then
            title=$(clean_title "$title")
            progress_bar=$(get_progress_bar "$start_time" "$end_time")
            yo say "Kanal $channel $title" 2>/dev/null || true
            display_channel_info "$channel" "$title" "$start_time" "$end_time" "$progress_bar"
            found_current=true
            break
          fi
        done <<< "$programs"

        if [ "$found_current" = "false" ]; then
          channel_name=$(get_channel_name "$channel")
          echo "No program found on $channel_name right now." >&2
        fi

      # ── program search ──
      elif [ -n "$search" ]; then
        results=$(${pkgs.jq}/bin/jq -r --arg query "$search" '
          (.channels[].programs // [])[] |
          select(.title | ascii_downcase | contains($query | ascii_downcase)) |
          "\(.channel_id)|\(.title)|\(.start)|\(.stop)|\(.description)"
        ' "$jsonFilePath")

        if [ -z "$results" ]; then
          echo "No programs matched your search." >&2
        else
          current_epoch=$(date +%s)
          found_current=false
          airing_now=false

          while IFS='|' read -r _chan _title _start _stop _desc; do
            if is_program_current "$_start" "$_stop"; then
              airing_now=true
              break
            fi
          done <<< "$results"

          while IFS='|' read -r chan_id title start_time end_time description; do
            cleaned_title=$(clean_title "$title")
            cleaned_desc=$(clean_title "$description")
            start_epoch=$(epg_to_epoch "$start_time")
            start_formatted=$(extract_epg_time "$start_time")
            channel_name=$(get_channel_name "$chan_id")

            if is_program_current "$start_time" "$end_time"; then
              progress_bar=$(get_progress_bar "$start_time" "$end_time")
              display_channel_info "$chan_id" "$cleaned_title" "$start_time" "$end_time" "$progress_bar"
              if [ "$found_current" = "false" ]; then
                echo "Starting current program: $cleaned_title" >&2
                yo tv --typ livetv --search "$chan_id" 2>/dev/null || true
                found_current=true
              fi
            else
              printf '\n\033[33m[UPCOMING] %s - %s\033[0m\n' "$start_formatted" "$channel_name"
              printf '  %s\n' "$cleaned_title"
              if [ -n "$cleaned_desc" ] && [ "$cleaned_desc" != "No description" ]; then
                printf '  \033[90m%s\033[0m\n' "$cleaned_desc"
              fi
              if [ "$airing_now" = "false" ] && [ "$start_epoch" -gt "$current_epoch" ]; then
                schedule_future_program "$chan_id" "$start_epoch" "$cleaned_title" "$start_time"
              fi
            fi
          done <<< "$results"
        fi

      # ── show all currently playing ──
      else
        results=$(${pkgs.jq}/bin/jq -r '
          (.channels[].programs // [])[] |
          "\(.channel_id)|\(.title)|\(.start)|\(.stop)"
        ' "$jsonFilePath")

        if [ -z "$results" ]; then
          echo "No current programs found." >&2
        else
          tmpfile=$(mktemp)
          trap 'rm -f "$tmpfile"' EXIT

          while IFS='|' read -r chan_id title start_time end_time; do
            if is_program_current "$start_time" "$end_time"; then
              printf "%03d|%s|%s|%s\n" "$chan_id" "$title" "$start_time" "$end_time" >> "$tmpfile"
            fi
          done <<< "$results"

          if [ -s "$tmpfile" ]; then
            sort -t'|' -k1,1n "$tmpfile" | while IFS='|' read -r chan_id title start_time end_time; do
              chan_id=$(echo "$chan_id" | sed 's/^0*//')
              cleaned_title=$(clean_title "$title")
              progress_bar=$(get_progress_bar "$start_time" "$end_time")
              display_channel_info "$chan_id" "$cleaned_title" "$start_time" "$end_time" "$progress_bar"
            done
          else
            echo "No current programs found." >&2
          fi
        fi
      fi
    '';
  };
}
