{
  self,
  lib,
  config,
  pkgs,
  en,
  ...
}: {
  yo.scripts = {
    weather = {
      voice = lib.mkIf (lib.elem "en" config.house.languages) {
        sentences = [
          "(what|how) (is|will be) [the] [the] (weather|weather conditions) in {location}"
          "the weather [in|at] {location}"
          "what will the weather be like [on] {day} in {location}"
          "how (warm|cold) will it be [on] {day} in {location}"
          "what will the weather be [on] {day} in {location}"
          "how {condition} is it [on] {day} in {location}"
          "will it [be] {condition} [on] {day} in {location}"
          "how {condition} is it in {location}"
          "will it be {condition} [on] {day} in {location}"
        ];

        lists = {
          day.values = [
            { "in" = "[today]"; out = "today"; }
            { "in" = "tomorrow"; out = "tomorrow"; }
            { "in" = "the day after tomorrow"; out = "the day after tomorrow"; }
            { "in" = "Monday"; out = "Monday"; }
            { "in" = "Tuesday"; out = "Tuesday"; }
            { "in" = "Wednesday"; out = "Wednesday"; }
            { "in" = "Thursday"; out = "Thursday"; }
            { "in" = "Friday"; out = "Friday"; }
            { "in" = "Saturday"; out = "Saturday"; }
            { "in" = "Sunday"; out = "Sunday"; }
          ];

          condition.values = [
            { "in" = "[sun|sunny|clear]"; out = "sunny"; }
            { "in" = "[partly clear|partly cloudy|variable cloudiness]"; out = "partly cloudy"; }
            { "in" = "[cloudy|overcast|completely overcast]"; out = "cloudy"; }
            { "in" = "[rain|rain|raining|showers|rain showers]"; out = "rain"; }
            { "in" = "[sleet|slush|wet snow]"; out = "sleet"; }
            { "in" = "[snow|snow|snowing|snowfall]"; out = "snow"; }
            { "in" = "[thunder|thunderstorm|thunderstorm rain|lightning]"; out = "thunderstorm"; }
            { "in" = "[fog|mist|haze]"; out = "fog"; }
            { "in" = "[blow|blowing|windy|wind|windy]"; out = "windy"; }
            { "in" = "[warm|warm|hot|heat]"; out = "hot"; }
            { "in" = "[cold|cold|frost]"; out = "cold"; }
          ];
        };
      };

      responses = lib.mkIf (lib.elem "en" config.house.languages) [
        {
          name = "ERROR_NO_LOCATION";
          description = "No location could be determined";
          text = "No location specified.";
        }
        {
          name = "ERROR_FETCH_FAILED";
          description = "The weather service could not be reached";
          text = "Could not retrieve weather data.";
        }

        {
          name = "DAY_FORECAST_TEXT";
          description = "A statement describing the forecast for a specific day";
          text = "$display_name: $swedish_condition. Min $mintempC degrees, max $maxtempC degrees$precip_text.";
        }
        {
          name = "WEATHER_OVERVIEW_TEXT";
          description = "Introduction to the three-day overview";
          text = "Weather overview for the next three days.";
        }
        {
          name = "DAILY_WEATHER_SUMMARY_TEXT";
          description = "Summary of conditions and temperatures for a specific day";
          text = "$day_desc: $swedish_condition, $temp_desc$precip_desc$wind_desc$humidity_desc$feels_desc.";
        }

        {
          name = "HOT_WEATHER_ADVICE_TEXT";
          description = "Advice during hot weather";
          text = "Remember to drink plenty of water and protect yourself from the sun.";
        }
        {
          name = "COLD_WEATHER_ADVICE_TEXT";
          description = "Advice during cold weather";
          text = "Make sure to dress warmly.";
        }
        {
          name = "RAIN_WEATHER_ADVICE_TEXT";
          description = "Advice during rain";
          text = "Bring an umbrella or rain gear.";
        }
        {
          name = "WIND_WEATHER_ADVICE_TEXT";
          description = "Advice during strong wind";
          text = "Be careful outside in strong winds.";
        }

        {
          name = "CONDITION_YES_TEXT";
          description = "Positive answer confirming a condition";
          text = "Yes, it will be $swedish_condition $display_name.";
        }
        {
          name = "CONDITION_NO_TEXT";
          description = "Negative answer denying a condition";
          text = "No, it will not be $swedish_condition $display_name.";
        }
        {
          name = "UNKNOWN_WEATHER_CONDITION_TEXT";
          description = "The requested condition is unknown";
          text = "Unknown weather condition: $condition";
        }

        {
          name = "WINDY_YES_TEXT";
          description = "Positive answer confirming windy weather";
          text = "Yes, it will be $swedish_condition $display_name ($wind_speed km/h ≈ $ms_speed m/s).";
        }
        {
          name = "WINDY_NO_SPEECH_TEXT";
          description = "Negative answer for windy weather";
          text = "No, it will not be particularly $swedish_condition $display_name.";
        }
        {
          name = "WIND_SPEED_LOW_TEXT";
          description = "Wind speed is relatively low";
          text = "Only $wind_speed kilometers per hour, or $ms_speed meters per second.";
        }

        {
          name = "EXTREME_HEAT_DEGREES_TEXT";
          description = "Extreme heat";
          text = "Yes, very hot $display_name! A heat record of $maxtempC degrees.";
        }
        {
          name = "WARM_WEATHER_DEGREES_TEXT";
          description = "Warm weather";
          text = "Yes, warm $display_name with $maxtempC degrees.";
        }
        {
          name = "NOT_HOT_DEGREES_TEXT";
          description = "Not particularly hot";
          text = "No, not particularly hot. Only $maxtempC degrees.";
        }
        {
          name = "COLD_WEATHER_YES_DEGREES_TEXT";
          description = "Cold weather confirmed";
          text = "Yes, it will be $swedish_condition $display_name with a minimum of $mintempC degrees.";
        }
        {
          name = "COLD_WEATHER_NO_DEGREES_TEXT";
          description = "Cold weather denied";
          text = "No, it will not be $swedish_condition $display_name. At least $mintempC degrees.";
        }

        {
          name = "LIGHT_RAIN_DEGREES_TEXT";
          description = "Light rain";
          text = "Yes, but only a little. $precipMM millimeters of precipitation with a $chance_of_rain percent chance.";
        }
        {
          name = "MODERATE_RAIN_DEGREES_TEXT";
          description = "Moderate rain";
          text = "Yes, it will rain. $precipMM millimeters of precipitation with a $chance_of_rain percent chance.";
        }
        {
          name = "HEAVY_RAIN_DEGREES_TEXT";
          description = "Heavy rain";
          text = "Yes, heavy rain! $precipMM millimeters of precipitation with a $chance_of_rain percent chance.";
        }
        {
          name = "NO_RAIN_DEGREES_TEXT";
          description = "No rainfall expected";
          text = "No, no rain $display_name.";
        }

        {
          name = "SUMMARY_TEMPERATURE_TEXT";
          description = "Temperature range for a forecast day";
          text = "between $mintempC and $maxtempC degrees";
        }
        {
          name = "SUMMARY_WIND_STRONG_TEXT";
          description = "Description of strong wind";
          text = ", windy with $wind_speed kilometers per hour";
        }
        {
          name = "SUMMARY_WIND_BREEZE_TEXT";
          description = "Description of a light breeze";
          text = ", a light breeze at $wind_speed kilometers per hour";
        }
        {
          name = "SUMMARY_PRECIP_LIGHT_TEXT";
          description = "Light precipitation";
          text = ", light precipitation of $precipMM millimeters";
        }
        {
          name = "SUMMARY_PRECIP_MODERATE_TEXT";
          description = "Moderate precipitation";
          text = ", precipitation of $precipMM millimeters";
        }
        {
          name = "SUMMARY_PRECIP_HEAVY_TEXT";
          description = "Heavy precipitation";
          text = ", heavy precipitation of $precipMM millimeters";
        }
        {
          name = "SUMMARY_RAIN_CHANCE_TEXT";
          description = "Probability of precipitation";
          text = " with a $chance_of_rain percent chance";
        }
        {
          name = "SUMMARY_HUMIDITY_HIGH_TEXT";
          description = "High humidity";
          text = ", high humidity at $humidity percent";
        }
        {
          name = "SUMMARY_HUMIDITY_LOW_TEXT";
          description = "Low humidity";
          text = ", dry with $humidity percent humidity";
        }
        {
          name = "SUMMARY_FEELS_HOTTER_TEXT";
          description = "Apparent temperature is higher than actual";
          text = ", feels like $feels_like degrees due to high humidity";
        }
        {
          name = "SUMMARY_FEELS_COLDER_TEXT";
          description = "Apparent temperature is lower than actual";
          text = ", feels like $feels_like degrees due to the wind";
        }
      ];
    };

  };}
