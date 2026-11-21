# zigduck/modules/grammar/fr/words.nix
{
  pronouns = [ "il" ];

  # "Désolé, je n'ai pas bien compris ?"
  sorryPhrases = [
    "On dirait que tu as une boulette de viande dans la bouche. Termine ton dîner et réessaie plus tard."
    "Mais putain, qu'est-ce que tu racontes ?"
    "Parle normalement, s'il te plaît."
    "Tu as pris des champignons hallucinogènes ou quoi... ?"
  ];

  numberWord = n:
    let
      words = [
        "zéro" "un" "deux" "trois" "quatre" "cinq" "six" "sept" "huit" "neuf"
        "dix" "onze" "douze" "treize" "quatorze" "quinze" "seize" "dix-sept" "dix-huit" "dix-neuf"
        "vingt" "vingt et un" "vingt-deux" "vingt-trois" "vingt-quatre" "vingt-cinq" "vingt-six" "vingt-sept" "vingt-huit" "vingt-neuf"
        "trente" "trente et un" "trente-deux" "trente-trois" "trente-quatre" "trente-cinq" "trente-six" "trente-sept" "trente-huit" "trente-neuf"
        "quarante" "quarante et un" "quarante-deux" "quarante-trois" "quarante-quatre" "quarante-cinq" "quarante-six" "quarante-sept" "quarante-huit" "quarante-neuf"
        "cinquante" "cinquante et un" "cinquante-deux" "cinquante-trois" "cinquante-quatre" "cinquante-cinq" "cinquante-six" "cinquante-sept" "cinquante-huit" "cinquante-neuf"
        "soixante" "soixante et un" "soixante-deux" "soixante-trois" "soixante-quatre" "soixante-cinq" "soixante-six" "soixante-sept" "soixante-huit" "soixante-neuf"
        "soixante-dix" "soixante et onze" "soixante-douze" "soixante-treize" "soixante-quatorze" "soixante-quinze" "soixante-seize" "soixante-dix-sept" "soixante-dix-huit" "soixante-dix-neuf"
        "quatre-vingts" "quatre-vingt-un" "quatre-vingt-deux" "quatre-vingt-trois" "quatre-vingt-quatre" "quatre-vingt-cinq" "quatre-vingt-six" "quatre-vingt-sept" "quatre-vingt-huit" "quatre-vingt-neuf"
        "quatre-vingt-dix" "quatre-vingt-onze" "quatre-vingt-douze" "quatre-vingt-treize" "quatre-vingt-quatorze" "quatre-vingt-quinze" "quatre-vingt-seize" "quatre-vingt-dix-sept" "quatre-vingt-dix-huit" "quatre-vingt-dix-neuf"
        "cent"
      ];
      hundreds = h:
        if h == 1 then "cent"
        else if h == 2 then "deux cents"
        else if h == 3 then "trois cents"
        else if h == 4 then "quatre cents"
        else if h == 5 then "cinq cents"
        else if h == 6 then "six cents"
        else if h == 7 then "sept cents"
        else if h == 8 then "huit cents"
        else if h == 9 then "neuf cents"
        else toString (h * 100);
      stripTrailingS = str:
        let len = builtins.stringLength str;
        in if len > 0 && builtins.substring (len - 1) 1 str == "s"
           then builtins.substring 0 (len - 1) str
           else str;
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
          else (stripTrailingS hWord) + " " + builtins.elemAt words rest
      else toString n;



  clock = {
    preps = [
      { "in" = "et";    out = "et"; }
      { "in" = "moins"; out = "moins"; }
      { "in" = "demie"; out = "demie"; }
    ];
    minuteWords = [ { "in" = "quart"; out = "15"; } ];
    midnightAlias = "zéro|minuit";
  };



  colors = [
    { "in" = "rouge|rouges";                   out = "red"; }
    { "in" = "vert|verte|verts|vertes";        out = "green"; }
    { "in" = "bleu|bleue|bleus|bleues";        out = "blue"; }
    { "in" = "jaune|jaunes";                   out = "yellow"; }
    { "in" = "orange|oranges";                 out = "orange"; }
    { "in" = "violet|violette|violets|pourpre"; out = "purple"; }
    { "in" = "rose|roses";                     out = "pink"; }
    { "in" = "blanc|blanche|blancs|blanches";  out = "white"; }
    { "in" = "noir|noire|noirs|noires";        out = "black"; }
    { "in" = "gris|grise|grises";              out = "gray"; }
    { "in" = "marron|marron foncé|brun";       out = "brown"; }
    { "in" = "cyan";                           out = "cyan"; }
    { "in" = "magenta|fuchsia";                out = "magenta"; }
    { "in" = "turquoise";                      out = "turquoise"; }
    { "in" = "sarcelle|bleu canard";           out = "teal"; }
    { "in" = "lime|vert citron";               out = "lime"; }
    { "in" = "bordeaux|marron rouge";          out = "maroon"; }
    { "in" = "olive|olivâtre";                 out = "olive"; }
    { "in" = "marine|bleu marine";             out = "navy"; }
    { "in" = "lavande";                        out = "lavender"; }
    { "in" = "corail";                         out = "coral"; }
    { "in" = "or|doré|dorée";                  out = "gold"; }
    { "in" = "argent|argenté|argentée";        out = "silver"; }
    { "in" = "aléatoire|hasard|au hasard";     out = "random"; }
  ];



  durations = [
    { "in" = "120|deux minutes|2 minutes";                    out = "120"; }
    { "in" = "180|trois minutes|3 minutes";                   out = "180"; }
    { "in" = "300|cinq minutes|5 minutes";                    out = "300"; }
    { "in" = "600|dix minutes|10 minutes";                    out = "600"; }
    { "in" = "900|quinze minutes|15 minutes|un quart d'heure"; out = "900"; }
    { "in" = "1200|vingt minutes|20 minutes";                 out = "1200"; }
    { "in" = "1800|trente minutes|30 minutes|une demi-heure"; out = "1800"; }
    { "in" = "2700|quarante-cinq minutes|45 minutes";         out = "2700"; }
    { "in" = "3600|soixante minutes|60 minutes|une heure";    out = "3600"; }
  ];


  states = [
    { "in" = "ouvert|ouverte|ouverts|ouvertes|open";                     out = "open"; }
    { "in" = "fermé|fermée|fermés|fermées|closed|close";                 out = "closed"; }
    { "in" = "allumé|allumée|allumés|allumées|on";                       out = "on"; }
    { "in" = "éteint|éteinte|éteints|éteintes|off";                      out = "off"; }
    { "in" = "mouvement|mouvements|activité|quelqu'un|personne|gens";    out = "motion"; }
    { "in" = "batterie|pile";                                            out = "battery"; }
  ];


  metrics = [
    { "in" = "puissance|power|watt|watts|w";                         out = "power"; }
    { "in" = "température|temp|degrés|chaleur|chaud|froid";          out = "temperature"; }
    { "in" = "batterie|niveau de batterie|pile";                     out = "battery"; }
    { "in" = "humidité|moiteur";                                     out = "humidity"; }
    { "in" = "luminosité|intensité|brightness";                      out = "brightness"; }
    { "in" = "signal|qualité du signal|réception";                   out = "linkquality"; }
    { "in" = "éclairage|lux|luminance|illuminance";                  out = "illuminance"; }
  ];


  deviceAliases = {
    shield = "tv|télé|télévision|écran|shield";

  };}
