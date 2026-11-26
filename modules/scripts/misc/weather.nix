{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : let

  svLang = pkgs.writeText "yo-weather-lang-sv.sh" ''
    declare -gA EMOJI=(
      ["113"]="☀️"  ["116"]="⛅"  ["119"]="☁️"  ["122"]="☁️"  ["143"]="☁️"
      ["176"]="🌧️"  ["179"]="🌧️"  ["182"]="🌧️"  ["185"]="🌧️"  ["200"]="⛈️"
      ["227"]="🌨️"  ["230"]="🌨️"  ["248"]="☁️"  ["260"]="☁️"  ["263"]="🌧️"
      ["266"]="🌧️"  ["281"]="🌧️"  ["284"]="🌧️"  ["293"]="🌧️"  ["296"]="🌧️"
      ["299"]="🌧️"  ["302"]="🌧️"  ["305"]="🌧️"  ["308"]="🌧️"  ["311"]="🌧️"
      ["314"]="🌧️"  ["317"]="🌧️"  ["320"]="🌨️"  ["323"]="🌨️"  ["326"]="🌨️"
      ["329"]="❄️"  ["332"]="❄️"  ["335"]="❄️"  ["338"]="❄️"  ["350"]="🌧️"
      ["353"]="🌧️"  ["356"]="🌧️"  ["359"]="🌧️"  ["362"]="🌧️"  ["365"]="🌧️"
      ["368"]="🌧️"  ["371"]="❄️"  ["374"]="🌨️"  ["377"]="🌨️"  ["386"]="🌨️"
      ["389"]="🌨️"  ["392"]="🌧️"  ["395"]="❄️"
    )

    declare -gA COND_LABELS=(
      ["113"]="soligt"               ["116"]="delvis molnigt"       ["119"]="molnigt"
      ["122"]="mulet"                ["143"]="dis"                  ["176"]="regn"
      ["179"]="snö"                  ["182"]="snöblandat regn"      ["185"]="underkylt regn"
      ["200"]="åska"                 ["227"]="snö"                  ["230"]="snöstorm"
      ["248"]="dimma"                ["260"]="underkylt dimma"      ["263"]="lätt regn"
      ["266"]="lätt regn"            ["281"]="underkylt regn"       ["284"]="underkylt regn"
      ["293"]="lätt regn"            ["296"]="lätt regn"            ["299"]="måttligt regn"
      ["302"]="måttligt regn"        ["305"]="kraftigt regn"        ["308"]="kraftigt regn"
      ["311"]="underkylt regn"       ["314"]="underkylt regn"       ["317"]="snöblandat regn"
      ["320"]="snöblandat regn"      ["323"]="lätt snö"             ["326"]="lätt snö"
      ["329"]="måttlig snö"          ["332"]="måttlig snö"          ["335"]="kraftig snö"
      ["338"]="kraftig snö"          ["350"]="ishagel"              ["353"]="lätt regnskur"
      ["356"]="kraftig regnskur"     ["359"]="skyfall"              ["362"]="snöblandad regnskur"
      ["365"]="snöblandad regnskur"  ["368"]="lätt snöby"           ["371"]="kraftig snöby"
      ["374"]="lätt ishagelby"       ["377"]="ishagelby"            ["386"]="åska med regn"
      ["389"]="kraftigt åskregn"     ["392"]="åska med snö"         ["395"]="åska med snö"
    )

    declare -gA COND_SWEDISH=(
      ["sunny"]="soligt"          ["partly cloudy"]="halvklart"
      ["cloudy"]="molnigt"        ["rain"]="regn"
      ["sleet"]="snöblandat regn" ["snow"]="snö"
      ["thunderstorm"]="åska"     ["fog"]="dimma"
      ["windy"]="blåsigt"         ["hot"]="varmt"
      ["cold"]="kallt"
    )

    declare -gA COND_CODES=(
      ["sunny"]="113"
      ["partly cloudy"]="116"
      ["cloudy"]="119 122 143"
      ["rain"]="176 179 182 185 263 266 281 284 293 296 299 302 305 308 311 314 317 350 353 356 359 362 365 368 392"
      ["sleet"]="227 230 320 323 326 374 377 386 389"
      ["snow"]="329 332 335 338 371 395"
      ["thunderstorm"]="200"
      ["fog"]="248 260"
    )

    label_idag="Idag"
    label_imorgon="Imorgon"
    label_overmorgon="I övermorgon"
    declare -ga DAYS_SV=("söndag" "måndag" "tisdag" "onsdag" "torsdag" "fredag" "lördag")
  '';
in {
  yo.scripts.weather = {
    description = "Weather Assistant. Ask anything weather related (3 day forecast)";
    category = "Misc";
    parameters = [
      { name = "location"; description = "Location to check (City, Country)."; optional = true; }
      { name = "day"; description = "Search weather for a specified day"; optional = true; }
      { name = "condition"; description = "Check for a specific weather condition"; optional = true; }
    ];
    code = ''
      JQ="${pkgs.jq}/bin/jq"
      CURL="${pkgs.curl}/bin/curl"
      GLOW="${pkgs.glow}/bin/glow"

      source ${svLang}

      weather_cache="''${XDG_CACHE_HOME:-$HOME/.cache}/yo-weather.json"
      cache_age=1800

      float_gt() { awk -v a="$1" -v b="$2" 'BEGIN{exit !(a > b)}'; }
      float_lt() { awk -v a="$1" -v b="$2" 'BEGIN{exit !(a < b)}'; }

      get_day_name_epoch()  { echo "''${DAYS_SV[$(date -d "@$1" +%w)]}"; }
      get_day_name_offset() { echo "''${DAYS_SV[$(date -d "today + $1 days" +%w)]}"; }

      expand_response() {
        local prev="" cur="$1"
        while [ "$prev" != "$cur" ]; do
          prev="$cur"
          cur=$(eval "printf '%s' \"$cur\"")
        done
        printf '%s' "$cur"
      }

      get_day_offset() {
        case "$1" in
          "idag"|"i dag"|"in dag") echo 0 ;;
          "imorgon"|"i morgon")    echo 1 ;;
          "i övermorgon"|"övermorgon") echo 2 ;;
          *)
            for i in {0..6}; do
              [ "$(get_day_name_offset "$i")" = "$1" ] && { echo "$i"; return; }
            done
            echo 0 ;;
        esac
      }

      day_label_for_offset() {
        case "$1" in
          0) echo "$label_idag" ;;
          1) echo "$label_imorgon" ;;
          2) echo "$label_overmorgon" ;;
          *) echo "$(get_day_name_offset "$1")" ;;
        esac
      }

      refresh_cache=true
      if [ -f "$weather_cache" ]; then
        now=$(date +%s)
        age=$(( now - $(stat -c %Y "$weather_cache") ))
        (( age < cache_age )) && refresh_cache=false
      fi
      if $refresh_cache; then
        $CURL -sf "https://wttr.in/$location_param?format=j1" -o "$weather_cache" \
          || { yo say --text "Kunde inte hämta väderdata."; exit 1; }
      fi

      display_weather_table() {
        local processed=$1
        local day_count=$($JQ length <<<"$processed")

        {
          echo "# Weather"
          echo "| Day | Min/Max | Wind | Precip | Conditions |"
          echo "|-----|---------|------|--------|------------|"
          for ((i=0; i<day_count; i++)); do
            local day=$($JQ -r ".[$i]" <<<"$processed")
            local epoch=$(date -d "$($JQ -r '.date' <<<"$day")" +%s)
            local dname=$(get_day_name_epoch "$epoch")
            local mint=$($JQ -r '.mintempC' <<<"$day")
            local maxt=$($JQ -r '.maxtempC' <<<"$day")
            local code=$($JQ -r '.noonWeather.weatherCode' <<<"$day")
            local emoji="''${EMOJI[$code]:-❓}"
            local desc=$($JQ -r '.noonWeather.weatherDesc' <<<"$day")
            local wind=$($JQ -r '.noonWeather.windspeedKmph' <<<"$day")
            local precip=$($JQ -r '.noonWeather.precipMM' <<<"$day")
            echo "| $dname | $mint-$maxt°C | $wind km/h | $precip mm | $emoji $desc |"
          done
        } | $GLOW -
      }

      show_day_forecast() {
        local offset=$1
        local processed=$($JQ --argjson off "$offset" '
          [.weather[$off] | {
            date, mintempC, maxtempC,
            noonWeather: (.hourly[] | select(.time=="1200") | {
              weatherCode, weatherDesc: .weatherDesc[0].value,
              windspeedKmph, humidity, precipMM
            })
          }]' "$weather_cache")

        display_weather_table "$processed"

        local day=$($JQ -r '.[0]' <<<"$processed")
        mintempC=$($JQ -r '.mintempC // 0'            <<<"$day")
        maxtempC=$($JQ -r '.maxtempC // 0'            <<<"$day")
        weather_code=$($JQ -r '.noonWeather.weatherCode' <<<"$day")
        precipMM=$($JQ -r '.noonWeather.precipMM // 0' <<<"$day")

        display_name=$(day_label_for_offset "$offset")
        swedish_condition="''${COND_LABELS[$weather_code]:-okänt}"

        precip_text=""
        if float_gt "$precipMM" 0; then
          precip_text=", med $precipMM millimeter nederbörd"
        fi

        yo say --text "$(expand_response "$DAY_FORECAST_TEXT")"
      }

      show_3day_forecast() {
        local processed=$($JQ '[.weather[] | {
          date, mintempC, maxtempC,
          noonWeather: (.hourly[] | select(.time=="1200") | {
            weatherCode, weatherDesc: .weatherDesc[0].value,
            windspeedKmph, humidity, precipMM
          })
        }]' "$weather_cache")
        display_weather_table "$processed"
      }

      generate_tts_summary() {
        local processed=$($JQ '[.weather[0], .weather[1], .weather[2] | {
          date, mintempC, maxtempC,
          noonWeather: (.hourly[] | select(.time=="1200") | {
            weatherCode, weatherDesc: .weatherDesc[0].value,
            windspeedKmph, humidity, precipMM, chanceofrain, FeelsLikeC
          })
        }]' "$weather_cache")

        local summary="$WEATHER_OVERVIEW_TEXT "

        for i in 0 1 2; do
          local day=$($JQ -r ".[$i]" <<<"$processed")

          mintempC=$($JQ -r '.mintempC // 0'              <<<"$day")
          maxtempC=$($JQ -r '.maxtempC // 0'              <<<"$day")
          weather_code=$($JQ -r '.noonWeather.weatherCode' <<<"$day")
          precipMM=$($JQ -r '.noonWeather.precipMM // 0'  <<<"$day")
          chance_of_rain=$($JQ -r '.noonWeather.chanceofrain // 0' <<<"$day")
          wind_speed=$($JQ -r '.noonWeather.windspeedKmph // 0'    <<<"$day")
          humidity=$($JQ -r '.noonWeather.humidity // 0'           <<<"$day")
          feels_like=$($JQ -r '.noonWeather.FeelsLikeC // 0'       <<<"$day")

          day_desc=$(day_label_for_offset "$i")
          swedish_condition="''${COND_LABELS[$weather_code]:-okänt}"
          temp_desc="$SUMMARY_TEMPERATURE_TEXT"

          wind_desc=""
          (( wind_speed > 20 ))                     && wind_desc="$SUMMARY_WIND_STRONG_TEXT"
          (( wind_speed > 10 && wind_speed <= 20 )) && wind_desc="$SUMMARY_WIND_BREEZE_TEXT"

          precip_desc=""
          if float_gt "$precipMM" 0; then
            if float_lt "$precipMM" 1; then
              precip_desc="$SUMMARY_PRECIP_LIGHT_TEXT"
            elif float_lt "$precipMM" 5; then
              precip_desc="$SUMMARY_PRECIP_MODERATE_TEXT"
            else
              precip_desc="$SUMMARY_PRECIP_HEAVY_TEXT"
            fi
            [ "$chance_of_rain" != "0" ] && [ "$chance_of_rain" != "null" ] \
              && precip_desc="$precip_desc$SUMMARY_RAIN_CHANCE_TEXT"
          fi

          humidity_desc=""
          (( humidity > 80 ))                && humidity_desc="$SUMMARY_HUMIDITY_HIGH_TEXT"
          (( humidity < 40 && humidity > 0 )) && humidity_desc="$SUMMARY_HUMIDITY_LOW_TEXT"

          feels_desc=""
          local diff=$(( feels_like - maxtempC ))
          (( diff > 2 ))  && feels_desc="$SUMMARY_FEELS_HOTTER_TEXT"
          (( diff < -2 )) && feels_desc="$SUMMARY_FEELS_COLDER_TEXT"

          summary="$summary $(expand_response "$DAILY_WEATHER_SUMMARY_TEXT") "
        done

        local first=$($JQ -r '.[0]' <<<"$processed")
        local max1=$($JQ -r '.maxtempC | tonumber'               <<<"$first")
        local precip1=$($JQ -r '.noonWeather.precipMM | tonumber' <<<"$first")
        local wind1=$($JQ -r '.noonWeather.windspeedKmph | tonumber' <<<"$first")

        (( max1 > 25 ))       && summary="$summary $HOT_WEATHER_ADVICE_TEXT "
        (( max1 < 5 ))        && summary="$summary $COLD_WEATHER_ADVICE_TEXT "
        float_gt "$precip1" 5 && summary="$summary $RAIN_WEATHER_ADVICE_TEXT "
        (( wind1 > 15 ))      && summary="$summary $WIND_WEATHER_ADVICE_TEXT "

        echo "$summary" | sed 's/  / /g; s/\. \././g'
      }

      speak_weather_summary() {
        local rendered
        rendered=$(expand_response "$(generate_tts_summary)")
        rendered=$(printf '%s' "$rendered" | sed 's/  / /g; s/\. \././g')
        yo say --text "$rendered"
      }

      check_condition() {
        local condition="$1" offset="$2"
        local day=$($JQ --argjson off "$offset" '
          .weather[$off] | {
            mintempC, maxtempC,
            noonWeather: (.hourly[] | select(.time=="1200") | {
              weatherCode, weatherDesc: .weatherDesc[0].value,
              windspeedKmph, humidity, precipMM, chanceofrain, FeelsLikeC
            })
          }' "$weather_cache")

        weather_code=$($JQ -r '.noonWeather.weatherCode'          <<<"$day")
        wind_speed=$($JQ -r '.noonWeather.windspeedKmph // 0'     <<<"$day")
        mintempC=$($JQ -r '.mintempC // 0'                        <<<"$day")
        maxtempC=$($JQ -r '.maxtempC // 0'                        <<<"$day")
        precipMM=$($JQ -r '.noonWeather.precipMM // 0'            <<<"$day")
        chance_of_rain=$($JQ -r '.noonWeather.chanceofrain // 0'  <<<"$day")

        display_name=$(day_label_for_offset "$offset")
        swedish_condition="''${COND_SWEDISH[$condition]:-$condition}"

        case "$condition" in
          rain)
            if float_gt "$precipMM" 0; then
              if float_lt "$precipMM" 1; then
                yo say --text "$(expand_response "$LIGHT_RAIN_DEGREES_TEXT")"
              elif float_lt "$precipMM" 5; then
                yo say --text "$(expand_response "$MODERATE_RAIN_DEGREES_TEXT")"
              else
                yo say --text "$(expand_response "$HEAVY_RAIN_DEGREES_TEXT")"
              fi
            else
              yo say --text "$(expand_response "$NO_RAIN_DEGREES_TEXT")"
            fi
            ;;
          windy)
            ms_speed=$(awk -v k="$wind_speed" 'BEGIN{printf "%.1f", k/3.6}')
            if (( wind_speed > 20 )); then
              yo say --text "$(expand_response "$WINDY_YES_TEXT")"
            else
              yo say --text "$(expand_response "$WINDY_NO_SPEECH_TEXT") $(expand_response "$WIND_SPEED_LOW_TEXT")"
            fi
            ;;
          hot)
            if (( maxtempC > 28 )); then
              yo say --text "$(expand_response "$EXTREME_HEAT_DEGREES_TEXT")"
            elif (( maxtempC > 25 )); then
              yo say --text "$(expand_response "$WARM_WEATHER_DEGREES_TEXT")"
            else
              yo say --text "$(expand_response "$NOT_HOT_DEGREES_TEXT")"
            fi
            ;;
          cold)
            if (( mintempC < 10 )); then
              yo say --text "$(expand_response "$COLD_WEATHER_YES_DEGREES_TEXT")"
            else
              yo say --text "$(expand_response "$COLD_WEATHER_NO_DEGREES_TEXT")"
            fi
            ;;
          sunny|partly\ cloudy|cloudy|sleet|snow|thunderstorm|fog)
            local codes="''${COND_CODES[$condition]}"
            if [[ " $codes " =~ " $weather_code " ]]; then
              yo say --text "$(expand_response "$CONDITION_YES_TEXT")"
            else
              yo say --text "$(expand_response "$CONDITION_NO_TEXT")"
            fi
            ;;
          *)
            yo say --text "$(expand_response "$UNKNOWN_WEATHER_CONDITION_TEXT")"
            ;;
        esac
      }

      if [ -n "$condition_param" ]; then
        [ -z "$day_param" ] && day_param="idag"
        check_condition "$condition_param" "$(get_day_offset "$day_param")"
      elif [ -n "$day_param" ]; then
        show_day_forecast "$(get_day_offset "$day_param")"
      else
        show_3day_forecast
        speak_weather_summary
      fi
    '';

  };}
