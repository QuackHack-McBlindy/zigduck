# zigduck/modules/grammar/de/words.nix
{
  pronouns = [ "es" ];

  # "Entschuldigung, ich habe dich nicht ganz verstanden?"
  sorryPhrases = [
    "Es klingt, als hättest du einen Fleischklops im Mund. Iss dein Abendessen zu Ende und versuch es später noch einmal."
    "Was zum Teufel redest du da?"
    "Sprich bitte wie ein normaler Mensch."
    "Bist du auf Pilzen oder was...?"
  ];


  ordinalNumbers = [
    { value = 1; words = [ "erste" ]; }
    { value = 2; words = [ "zweite" ]; }
    { value = 3; words = [ "dritte" ]; }
    { value = 4; words = [ "vierte" ]; }
    { value = 5; words = [ "fünfte" ]; }
    { value = 6; words = [ "sechste" ]; }
    { value = 7; words = [ "siebte" ]; }
    { value = 8; words = [ "achte" ]; }
    { value = 9; words = [ "neunte" ]; }
    { value = 10; words = [ "zehnte" ]; }
    { value = 11; words = [ "elfte" ]; }
    { value = 12; words = [ "zwölfte" ]; }
  ];

  numberOne = [ "ein" "eine" "einen" "einem" "einer" "eins" ];

  numberWord = n:
    let
      words = [
        "null" "eins" "zwei" "drei" "vier" "fünf" "sechs" "sieben" "acht" "neun" "zehn"
        "elf" "zwölf" "dreizehn" "vierzehn" "fünfzehn" "sechzehn" "siebzehn" "achtzehn" "neunzehn"
        "zwanzig" "einundzwanzig" "zweiundzwanzig" "dreiundzwanzig" "vierundzwanzig" "fünfundzwanzig" "sechsundzwanzig" "siebenundzwanzig" "achtundzwanzig" "neunundzwanzig"
        "dreißig" "einunddreißig" "zweiunddreißig" "dreiunddreißig" "vierunddreißig" "fünfunddreißig" "sechsunddreißig" "siebenunddreißig" "achtunddreißig" "neununddreißig"
        "vierzig" "einundvierzig" "zweiundvierzig" "dreiundvierzig" "vierundvierzig" "fünfundvierzig" "sechsundvierzig" "siebenundvierzig" "achtundvierzig" "neunundvierzig"
        "fünfzig" "einundfünfzig" "zweiundfünfzig" "dreiundfünfzig" "vierundfünfzig" "fünfundfünfzig" "sechsundfünfzig" "siebenundfünfzig" "achtundfünfzig" "neunundfünfzig"
        "sechzig" "einundsechzig" "zweiundsechzig" "dreiundsechzig" "vierundsechzig" "fünfundsechzig" "sechsundsechzig" "siebenundsechzig" "achtundsechzig" "neunundsechzig"
        "siebzig" "einundsiebzig" "zweiundsiebzig" "dreiundsiebzig" "vierundsiebzig" "fünfundsiebzig" "sechsundsiebzig" "siebenundsiebzig" "achtundsiebzig" "neunundsiebzig"
        "achtzig" "einundachtzig" "zweiundachtzig" "dreiundachtzig" "vierundachtzig" "fünfundachtzig" "sechsundachtzig" "siebenundachtzig" "achtundachtzig" "neunundachtzig"
        "neunzig" "einundneunzig" "zweiundneunzig" "dreiundneunzig" "vierundneunzig" "fünfundneunzig" "sechsundneunzig" "siebenundneunzig" "achtundneunzig" "neunundneunzig"
        "einhundert"
      ];

      hundreds = h:
        if h == 1 then "einhundert"
        else if h == 2 then "zweihundert"
        else if h == 3 then "dreihundert"
        else if h == 4 then "vierhundert"
        else if h == 5 then "fünfhundert"
        else if h == 6 then "sechshundert"
        else if h == 7 then "siebenhundert"
        else if h == 8 then "achthundert"
        else if h == 9 then "neunhundert"
        else toString (h * 100);
    in
      if n < 0 then toString n
      else if n < builtins.length words then builtins.elemAt words n
      else if n <= 300 then
        let
          h = builtins.div n 100;
          rest = n - h * 100;
        in
          hundreds h + (if rest == 0 then "" else builtins.elemAt words rest)
      else toString n;

  clock = {
    preps = [
      { "in" = "nach"; out = "över"; }
      { "in" = "um";   out = "i"; }
      { "in" = "halb"; out = "halv"; }
    ];

    minuteWords = [
      { "in" = "viertel"; out = "15"; }
    ];

    midnightAlias = "null|mitternacht";
  };

  colors = [
    { "in" = "rot|rote|roter|rotes";                   out = "red"; }
    { "in" = "grün|grüne|grüner|grünes";              out = "green"; }
    { "in" = "blau|blaue|blauer|blaues";              out = "blue"; }
    { "in" = "gelb|gelbe|gelber|gelbes";              out = "yellow"; }
    { "in" = "orange|orangefarben|orangefarbene";     out = "orange"; }
    { "in" = "lila|violett|violette";                 out = "purple"; }
    { "in" = "rosa|pink";                             out = "pink"; }
    { "in" = "weiß|weiss|weiße|weißer|weißes";        out = "white"; }
    { "in" = "schwarz|schwarze|schwarzer|schwarzes";  out = "black"; }
    { "in" = "grau|graue|grauer|graues";              out = "gray"; }
    { "in" = "braun|braune|brauner|braunes";          out = "brown"; }
    { "in" = "cyan|türkisblau";                       out = "cyan"; }
    { "in" = "magenta|fuchsia";                       out = "magenta"; }
    { "in" = "türkis|türkisgrün";                     out = "turquoise"; }
    { "in" = "teal|blaugrün";                         out = "teal"; }
    { "in" = "lime|limettengrün";                     out = "lime"; }
    { "in" = "kastanienbraun|dunkelrot";              out = "maroon"; }
    { "in" = "oliv|olivgrün";                         out = "olive"; }
    { "in" = "marineblau|dunkelblau";                 out = "navy"; }
    { "in" = "lavendel|helllila";                     out = "lavender"; }
    { "in" = "koralle|korallrot";                     out = "coral"; }
    { "in" = "gold|goldfarben";                       out = "gold"; }
    { "in" = "silber|silberfarben";                   out = "silver"; }
    { "in" = "zufällig|random|beliebig";              out = "random"; }
  ];

  durations = [
    { "in" = "120|zwei minuten|2 minuten";                       out = "120"; }
    { "in" = "180|drei minuten|3 minuten";                       out = "180"; }
    { "in" = "300|fünf minuten|5 minuten";                       out = "300"; }
    { "in" = "600|zehn minuten|10 minuten";                      out = "600"; }
    { "in" = "900|fünfzehn minuten|15 minuten|eine viertelstunde"; out = "900"; }
    { "in" = "1200|zwanzig minuten|20 minuten";                  out = "1200"; }
    { "in" = "1800|dreißig minuten|30 minuten|eine halbe stunde"; out = "1800"; }
    { "in" = "2700|fünfundvierzig minuten|45 minuten";           out = "2700"; }
    { "in" = "3600|sechzig minuten|60 minuten|eine stunde";      out = "3600"; }
  ];

  states = [
    { "in" = "offen|geöffnet|open";                    out = "open"; }
    { "in" = "geschlossen|zu|closed|close";            out = "closed"; }
    { "in" = "an|eingeschaltet|ein|on";                out = "on"; }
    { "in" = "aus|ausgeschaltet|off";                  out = "off"; }
    { "in" = "bewegung|bewegungen|motion|beweglich|jemand|irgendjemand|personen|leute"; out = "motion"; }
    { "in" = "batterie";                               out = "battery"; }
    { "in" = "verriegelt|abgeschlossen|locked";        out = "locked"; }
    { "in" = "entriegelt|aufgeschlossen|unlocked";     out = "unlocked"; }
    { "in" = "aktiv|aktiviert|laufend";                out = "active"; }
    { "in" = "inaktiv|deaktiviert";                    out = "inactive"; }
    { "in" = "verbunden|angeschlossen|connected";      out = "connected"; }
    { "in" = "getrennt|offline|nicht verbunden";       out = "disconnected"; }
    { "in" = "niedrig|niedrige|niedriger";             out = "low"; }
    { "in" = "hoch|hohe|hoher";                        out = "high"; }
    { "in" = "voll|volle";                             out = "full"; }
    { "in" = "leer|leere";                              out = "empty"; }
  ];

  metrics = [
    { "in" = "leistung|power|watt|w";                   out = "power"; }
    { "in" = "temperatur|temp|grade|wärme|warm|kalt";   out = "temperature"; }
    { "in" = "batterie|battery|akkustand|batteriestand"; out = "battery"; }
    { "in" = "luftfeuchtigkeit|feuchtigkeit|humidity";  out = "humidity"; }
    { "in" = "helligkeit|brightness|stärke";            out = "brightness"; }
    { "in" = "signal|linkquality|empfang";              out = "linkquality"; }
    { "in" = "licht|lux|beleuchtungsstärke|beleuchtung"; out = "illuminance"; }
    { "in" = "energie|verbrauch|energy";                out = "energy"; }
  ];

  weekdays = [
    { "in" = "monday|montag|mo";       out = "monday"; }
    { "in" = "tuesday|dienstag|di";    out = "tuesday"; }
    { "in" = "wednesday|mittwoch|mi";  out = "wednesday"; }
    { "in" = "thursday|donnerstag|do"; out = "thursday"; }
    { "in" = "friday|freitag|fr";      out = "friday"; }
    { "in" = "saturday|samstag|sa";    out = "saturday"; }
    { "in" = "sunday|sonntag|so";      out = "sunday"; }
  ];

  months = [
    { "in" = "jan|januar";      out = "jan|january"; }
    { "in" = "feb|februar";     out = "feb|february"; }
    { "in" = "mär|maerz|märz";  out = "mar|march"; }
    { "in" = "apr|april";       out = "apr|april"; }
    { "in" = "mai";             out = "may"; }
    { "in" = "jun|juni";        out = "jun|june"; }
    { "in" = "jul|juli";        out = "jul|july"; }
    { "in" = "aug|august";      out = "aug|august"; }
    { "in" = "sep|september";   out = "sep|september"; }
    { "in" = "okt|oktober";     out = "oct|october"; }
    { "in" = "nov|november";    out = "nov|november"; }
    { "in" = "dez|dezember";    out = "dec|december"; }

  ];}
