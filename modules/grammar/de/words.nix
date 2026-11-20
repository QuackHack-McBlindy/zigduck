{


  numberWord = n:
    let
      words = [
        "null" "eins" "zwei" "drei" "vier" "fünf" "sechs" "sieben" "acht" "neun"
        "zehn" "elf" "zwölf" "dreizehn" "vierzehn" "fünfzehn" "sechzehn" "siebzehn" "achtzehn" "neunzehn"
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
          hWord = hundreds h;
        in
          if rest == 0 then hWord
          else hWord + builtins.elemAt words rest
      else toString n;



  clock = {
    preps = [
      { "in" = "nach"; out = "nach"; }
      { "in" = "vor";  out = "vor"; }
      { "in" = "halb"; out = "halb"; }
    ];
    minuteWords = [ { "in" = "viertel"; out = "15"; } ];
    midnightAlias = "null|mitternacht";
  };


  colors = [
    { "in" = "rot|rotes|rote|roter";                     out = "red"; }
    { "in" = "grün|grünes|grüne|grüner";                 out = "green"; }
    { "in" = "blau|blaues|blaue|blauer";                 out = "blue"; }
    { "in" = "gelb|gelbes|gelbe|gelber";                 out = "yellow"; }
    { "in" = "orange|orangefarben";                      out = "orange"; }
    { "in" = "lila|violett|purpur";                      out = "purple"; }
    { "in" = "rosa|pink|rosafarben";                     out = "pink"; }
    { "in" = "weiß|weißes|weiße|weißer";                 out = "white"; }
    { "in" = "schwarz|schwarzes|schwarze|schwarzer";     out = "black"; }
    { "in" = "grau|graues|graue|grauer";                 out = "gray"; }
    { "in" = "braun|braunes|braune|brauner";             out = "brown"; }
    { "in" = "cyan|türkisblau";                          out = "cyan"; }
    { "in" = "magenta|fuchsia";                          out = "magenta"; }
    { "in" = "türkis|türkisgrün";                        out = "turquoise"; }
    { "in" = "blaugrün|petrol";                          out = "teal"; }
    { "in" = "limette|limettengrün";                     out = "lime"; }
    { "in" = "kastanienbraun|weinrot";                   out = "maroon"; }
    { "in" = "oliv|olivgrün";                            out = "olive"; }
    { "in" = "marineblau|navy";                          out = "navy"; }
    { "in" = "lavendel";                                 out = "lavender"; }
    { "in" = "koralle|korallenrot";                      out = "coral"; }
    { "in" = "gold|golden|goldfarben";                   out = "gold"; }
    { "in" = "silber|silbern|silberfarben";              out = "silver"; }
    { "in" = "zufällig|random|zufallsfarbe";             out = "random"; }
  ];


  durations = [
    { "in" = "120|zwei Minuten|2 Minuten";                           out = "120"; }
    { "in" = "180|drei Minuten|3 Minuten";                           out = "180"; }
    { "in" = "300|fünf Minuten|5 Minuten";                           out = "300"; }
    { "in" = "600|zehn Minuten|10 Minuten";                          out = "600"; }
    { "in" = "900|fünfzehn Minuten|15 Minuten|eine Viertelstunde";   out = "900"; }
    { "in" = "1200|zwanzig Minuten|20 Minuten";                      out = "1200"; }
    { "in" = "1800|dreißig Minuten|30 Minuten|eine halbe Stunde";    out = "1800"; }
    { "in" = "2700|fünfundvierzig Minuten|45 Minuten";               out = "2700"; }
    { "in" = "3600|sechzig Minuten|60 Minuten|eine Stunde";          out = "3600"; }
  ];


  states = [
    { "in" = "offen|geöffnet|auf|open";                                   out = "open"; }
    { "in" = "geschlossen|zu|closed|close";                               out = "closed"; }
    { "in" = "an|eingeschaltet|angeschaltet|on";                          out = "on"; }
    { "in" = "aus|ausgeschaltet|abgeschaltet|off";                        out = "off"; }
    { "in" = "bewegung|bewegungen|aktivität|jemand|leute|person|personen"; out = "motion"; }
    { "in" = "batterie|akku";                                             out = "battery"; }
  ];


  metrics = [
    { "in" = "leistung|strom|watt|w";                             out = "power"; }
    { "in" = "temperatur|temp|grad|hitze|warm|kalt";              out = "temperature"; }
    { "in" = "batterie|akkustand|akku";                           out = "battery"; }
    { "in" = "luftfeuchtigkeit|feuchtigkeit|feucht";              out = "humidity"; }
    { "in" = "helligkeit|intensität";                             out = "brightness"; }
    { "in" = "signal|signalqualität|empfang";                     out = "linkquality"; }
    { "in" = "beleuchtung|lux|beleuchtungsstärke";                out = "illuminance"; }
  ];


  deviceAliases = {
    shield = "tv|fernseher|glotze|flimmerkiste|bildschirm|shield";

  };}
