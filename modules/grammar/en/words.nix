# zigduck/modules/grammar/en/words.nix
{
  pronouns = [ "it" ];

  # "Sorry, I did not quite catch that?"
  sorryPhrases = [
    "Sounds like you've got a meatball in your mouth. Finish your dinner and try again later."
    "What the fuck are you even saying?"
    "Please speak like a normal human being."
    "Are you on shrooms...?"
  ];

  numberWord = n:
    let
      ones = [
        "zero" "one" "two" "three" "four" "five" "six" "seven" "eight" "nine"
        "ten" "eleven" "twelve" "thirteen" "fourteen" "fifteen" "sixteen" "seventeen" "eighteen" "nineteen"
      ];
      tens = [
        "" "" "twenty" "thirty" "forty" "fifty" "sixty" "seventy" "eighty" "ninety"
      ];
      hundredsWord = h:
        if h == 1 then "one hundred"
        else if h == 2 then "two hundred"
        else if h == 3 then "three hundred"
        else if h == 4 then "four hundred"
        else if h == 5 then "five hundred"
        else if h == 6 then "six hundred"
        else if h == 7 then "seven hundred"
        else if h == 8 then "eight hundred"
        else if h == 9 then "nine hundred"
        else toString (h * 100);
      underHundred = x:
        if x < 20 then builtins.elemAt ones x
        else
          let t = builtins.div x 10; o = x - t * 10;
          in builtins.elemAt tens t
             + (if o == 0 then "" else "-" + builtins.elemAt ones o);
    in
      if n < 0 then toString n
      else if n < 100 then underHundred n
      else if n <= 300 then
        let h = builtins.div n 100; rest = n - h * 100;
        in hundredsWord h + (if rest == 0 then "" else " " + underHundred rest)
      else toString n;



  clock = {
    preps = [
      { "in" = "past"; out = "past"; }
      { "in" = "to";   out = "to"; }
      { "in" = "half"; out = "half"; }
    ];
    minuteWords = [ { "in" = "quarter"; out = "15"; } ];
    midnightAlias = "zero|midnight";
  };



  colors = [
    { "in" = "red";                       out = "red"; }
    { "in" = "green";                     out = "green"; }
    { "in" = "blue";                      out = "blue"; }
    { "in" = "yellow";                    out = "yellow"; }
    { "in" = "orange";                    out = "orange"; }
    { "in" = "purple|violet";             out = "purple"; }
    { "in" = "pink";                      out = "pink"; }
    { "in" = "white";                     out = "white"; }
    { "in" = "black";                     out = "black"; }
    { "in" = "gray|grey";                 out = "gray"; }
    { "in" = "brown";                     out = "brown"; }
    { "in" = "cyan";                      out = "cyan"; }
    { "in" = "magenta|fuchsia";           out = "magenta"; }
    { "in" = "turquoise";                 out = "turquoise"; }
    { "in" = "teal";                      out = "teal"; }
    { "in" = "lime";                      out = "lime"; }
    { "in" = "maroon";                    out = "maroon"; }
    { "in" = "olive";                     out = "olive"; }
    { "in" = "navy";                      out = "navy"; }
    { "in" = "lavender";                  out = "lavender"; }
    { "in" = "coral";                     out = "coral"; }
    { "in" = "gold|golden";               out = "gold"; }
    { "in" = "silver";                    out = "silver"; }
    { "in" = "random|any";                out = "random"; }
  ];



  durations = [
    { "in" = "120|two minutes|2 minutes";                    out = "120"; }
    { "in" = "180|three minutes|3 minutes";                  out = "180"; }
    { "in" = "300|five minutes|5 minutes";                   out = "300"; }
    { "in" = "600|ten minutes|10 minutes";                   out = "600"; }
    { "in" = "900|fifteen minutes|15 minutes|a quarter";     out = "900"; }
    { "in" = "1200|twenty minutes|20 minutes";               out = "1200"; }
    { "in" = "1800|thirty minutes|30 minutes|half an hour";  out = "1800"; }
    { "in" = "2700|forty five minutes|45 minutes";           out = "2700"; }
    { "in" = "3600|sixty minutes|60 minutes|an hour";        out = "3600"; }
  ];



  states = [
    { "in" = "open|opened";                        out = "open"; }
    { "in" = "closed|close|shut";                  out = "closed"; }
    { "in" = "on|lit|turned on";                   out = "on"; }
    { "in" = "off|dark|turned off";                out = "off"; }
    { "in" = "motion|movement|activity|someone|people|person|persons"; out = "motion"; }
    { "in" = "battery";                            out = "battery"; }
  ];



  metrics = [
    { "in" = "power|watt|watts|w";                           out = "power"; }
    { "in" = "temperature|temp|degrees|heat|warm|cold";      out = "temperature"; }
    { "in" = "battery|battery level";                        out = "battery"; }
    { "in" = "humidity|moisture";                            out = "humidity"; }
    { "in" = "brightness|strength";                          out = "brightness"; }
    { "in" = "signal|link quality|reception";                out = "linkquality"; }
    { "in" = "light|lux|illuminance";                        out = "illuminance"; }
  ];



  deviceAliases = {
    shield = "tv|telly|television|shield";

  };}
