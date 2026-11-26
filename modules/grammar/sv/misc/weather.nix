{
  self,
  lib,
  config,
  pkgs,
  sv,
  ...
} : {
  yo.scripts = {
    weather = {
      voice = lib.mkIf (lib.elem "sv" config.house.languages) {
        sentences = [
          "(vad|hur) (är|blir) [det] [för] (vädret|väder) i {location}"
          "vädret [i|på] {loction}"
          "hur (blir|är) vädret [på] {day} i {location}"
          "hur (varmt|kallt) (blir|är) det [på] {day} i {location}"
          "vad blir det för väder [på] {day} i {location}"
          "hur {condition} (är|blir) det på {day} i {location}"
          "(kommer|blir) det [att] {condition} [på] {day} i {location}"
          "hur {condition} är det i {location}"
          "kommer det att {condition} [på] {day} i {location}"
        ];
        lists = {
          day.values = [
            { "in" = "[ida|idag]"; out = "idag"; }
            { "in" = "imorgon";    out = "imorgon"; }
            { "in" = "i morgon";   out = "imorgon"; }
            { "in" = "i övermorgon"; out = "i övermorgon"; }
            { "in" = "övermorgon";   out = "i övermorgon"; }
            { "in" = "måndag";  out = "måndag"; }
            { "in" = "tisdag";  out = "tisdag"; }
            { "in" = "onsdag";  out = "onsdag"; }
            { "in" = "torsdag"; out = "torsdag"; }
            { "in" = "fredag";  out = "fredag"; }
            { "in" = "lördag";  out = "lördag"; }
            { "in" = "söndag";  out = "söndag"; }
          ];
          condition.values = [
            { "in" = "[sol|soligt|klart]";                        out = "sunny"; }
            { "in" = "[halvklart|delvis molnigt|växlande molnighet]"; out = "partly cloudy"; }
            { "in" = "[molnigt|mulet|övermulet]";                 out = "cloudy"; }
            { "in" = "[regn|regna|regnar|skurar|duschregn]";      out = "rain"; }
            { "in" = "[snöblandat regn|snöblask|blötsnö]";        out = "sleet"; }
            { "in" = "[snö|snöa|snöar|snöfall]";                  out = "snow"; }
            { "in" = "[åska|åskväder|åskregn|blixt]";             out = "thunderstorm"; }
            { "in" = "[dimma|dis|töcken]";                        out = "fog"; }
            { "in" = "[blås|blåsa|blåsigt|vind|vindigt]";         out = "windy"; }
            { "in" = "[varm|varmt|hett|värme]";                   out = "hot"; }
            { "in" = "[kallt|kyla|frost]";                        out = "cold"; }
          ];
        };
      };

      responses = lib.mkIf (lib.elem "sv" config.house.languages) [
        { name = "ERROR_NO_LOCATION";
          description = "No location could be determined";
          text = "Ingen plats angiven."; }
        { name = "ERROR_FETCH_FAILED";
          description = "The weather service could not be reached";
          text = "Kunde inte hämta väderdata."; }

        { name = "DAY_FORECAST_TEXT";
          description = "A statement describing the forecast for a specific day";
          text = "$display_name: $swedish_condition. Min $mintempC grader, max $maxtempC grader$precip_text."; }
        { name = "WEATHER_OVERVIEW_TEXT";
          description = "Introduction to the three-day overview";
          text = "Väderöversikt för nästa tre dagar."; }
        { name = "DAILY_WEATHER_SUMMARY_TEXT";
          description = "Summary of conditions and temperatures for a specific day";
          text = "$day_desc: $swedish_condition, $temp_desc$precip_desc$wind_desc$humidity_desc$feels_desc."; }

        { name = "HOT_WEATHER_ADVICE_TEXT";
          description = "Advice during hot weather";
          text = "Kom ihåg att dricka mycket vatten och skydda dig mot solen."; }
        { name = "COLD_WEATHER_ADVICE_TEXT";
          description = "Advice during cold weather";
          text = "Se till att klä dig varmt."; }
        { name = "RAIN_WEATHER_ADVICE_TEXT";
          description = "Advice during rain";
          text = "Ta med paraply eller regnkläder."; }
        { name = "WIND_WEATHER_ADVICE_TEXT";
          description = "Advice during strong wind";
          text = "Var försiktig ute i stark vinden."; }

        { name = "CONDITION_YES_TEXT";
          description = "Positive answer confirming a condition";
          text = "Ja, det blir $swedish_condition $display_name."; }
        { name = "CONDITION_NO_TEXT";
          description = "Negative answer denying a condition";
          text = "Nej, det blir inte $swedish_condition $display_name."; }
        { name = "UNKNOWN_WEATHER_CONDITION_TEXT";
          description = "The requested condition is unknown";
          text = "Okänt väderförhållande: $condition"; }

        { name = "WINDY_YES_TEXT";
          description = "Positive answer confirming windy weather";
          text = "Ja, det blir $swedish_condition $display_name ($wind_speed km/h ≈ $ms_speed m/s)."; }
        { name = "WINDY_NO_SPEECH_TEXT";
          description = "Negative answer for windy weather";
          text = "Nej, det blir inte särskilt $swedish_condition $display_name."; }
        { name = "WIND_SPEED_LOW_TEXT";
          description = "Wind speed is relatively low";
          text = "Bara $wind_speed kilometer per timme, alltså $ms_speed meter per sekund."; }

        { name = "EXTREME_HEAT_DEGREES_TEXT";
          description = "Extreme heat";
          text = "Ja, mycket varmt $display_name! Hetterekord på $maxtempC grader."; }
        { name = "WARM_WEATHER_DEGREES_TEXT";
          description = "Warm weather";
          text = "Ja, varmt $display_name med $maxtempC grader."; }
        { name = "NOT_HOT_DEGREES_TEXT";
          description = "Not particularly hot";
          text = "Nej, inte särskilt varmt. Bara $maxtempC grader."; }
        { name = "COLD_WEATHER_YES_DEGREES_TEXT";
          description = "Cold weather confirmed";
          text = "Ja, det blir $swedish_condition $display_name med minst $mintempC grader."; }
        { name = "COLD_WEATHER_NO_DEGREES_TEXT";
          description = "Cold weather denied";
          text = "Nej, det blir inte $swedish_condition $display_name. Minst $mintempC grader."; }

        { name = "LIGHT_RAIN_DEGREES_TEXT";
          description = "Light rain";
          text = "Ja, men bara lite. $precipMM millimeter nederbörd med $chance_of_rain procents risk."; }
        { name = "MODERATE_RAIN_DEGREES_TEXT";
          description = "Moderate rain";
          text = "Ja, det blir regn. $precipMM millimeter nederbörd med $chance_of_rain procents risk."; }
        { name = "HEAVY_RAIN_DEGREES_TEXT";
          description = "Heavy rain";
          text = "Ja, kraftigt regn! $precipMM millimeter nederbörd med $chance_of_rain procents risk."; }
        { name = "NO_RAIN_DEGREES_TEXT";
          description = "No rainfall expected";
          text = "Nej, inget regn $display_name."; }

        { name = "SUMMARY_TEMPERATURE_TEXT";
          description = "Temperature range for a forecast day";
          text = "mellan $mintempC och $maxtempC grader"; }
        { name = "SUMMARY_WIND_STRONG_TEXT";
          description = "Description of strong wind";
          text = ", blåsigt med $wind_speed kilometer per timme"; }
        { name = "SUMMARY_WIND_BREEZE_TEXT";
          description = "Description of a light breeze";
          text = ", lätt bris på $wind_speed kilometer per timme"; }
        { name = "SUMMARY_PRECIP_LIGHT_TEXT";
          description = "Light precipitation";
          text = ", lite nederbörd på $precipMM millimeter"; }
        { name = "SUMMARY_PRECIP_MODERATE_TEXT";
          description = "Moderate precipitation";
          text = ", nederbörd på $precipMM millimeter"; }
        { name = "SUMMARY_PRECIP_HEAVY_TEXT";
          description = "Heavy precipitation";
          text = ", kraftig nederbörd på $precipMM millimeter"; }
        { name = "SUMMARY_RAIN_CHANCE_TEXT";
          description = "Probability of precipitation";
          text = " med $chance_of_rain procents risk"; }
        { name = "SUMMARY_HUMIDITY_HIGH_TEXT";
          description = "High humidity";
          text = ", hög luftfuktighet på $humidity procent"; }
        { name = "SUMMARY_HUMIDITY_LOW_TEXT";
          description = "Low humidity";
          text = ", torrt med $humidity procent luftfuktighet"; }
        { name = "SUMMARY_FEELS_HOTTER_TEXT";
          description = "Apparent temperature is higher than actual";
          text = ", känns som $feels_like grader på grund av hög luftfuktighet"; }
        { name = "SUMMARY_FEELS_COLDER_TEXT";
          description = "Apparent temperature is lower than actual";
          text = ", känns som $feels_like grader på grund av vinden"; }
      ];
    };

  };}
