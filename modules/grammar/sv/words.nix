{

  numberWord = n:
    let
      words = [
        "noll" "ett" "två" "tre" "fyra" "fem" "sex" "sju" "åtta" "nio" "tio"
        "elva" "tolv" "tretton" "fjorton" "femton" "sexton" "sjutton" "arton" "nitton"
        "tjugo" "tjugoett" "tjugotvå" "tjugotre" "tjugofyra" "tjugofem" "tjugosex" "tjugosju" "tjugoåtta" "tjugonio"
        "trettio" "trettioett" "trettiotvå" "trettiotre" "trettiofyra" "trettiofem" "trettiosex" "trettiosju" "trettioåtta" "trettionio"
        "fyrtio" "fyrtioett" "fyrtiotvå" "fyrtiotre" "fyrtiofyra" "fyrtiofem" "fyrtiosex" "fyrtiosju" "fyrtioåtta" "fyrtionio"
        "femtio" "femtioett" "femtiotvå" "femtiotre" "femtiofyra" "femtiofem" "femtiosex" "femtiosju" "femtioåtta" "femtionio"
        "sextio" "sextioett" "sextiotvå" "sextiotre" "sextiofyra" "sextiofem" "sextiosex" "sextiosju" "sextioåtta" "sextionio"
        "sjuttio" "sjuttioett" "sjuttiotvå" "sjuttiotre" "sjuttiofyra" "sjuttiofem" "sjuttiosex" "sjuttiosju" "sjuttioåtta" "sjuttionio"
        "åttio" "åttioett" "åttiotvå" "åttiotre" "åttiofyra" "åttiofem" "åttiosex" "åttiosju" "åttioåtta" "åttionio"
        "nittio" "nittioett" "nittiotvå" "nittiotre" "nittiofyra" "nittiofem" "nittiosex" "nittiosju" "nittioåtta" "nittionio"
        "etthundra"
      ];
      hundreds = h:
        if h == 1 then "etthundra"
        else if h == 2 then "tvåhundra"
        else if h == 3 then "trehundra"
        else if h == 4 then "fyrahundra"
        else if h == 5 then "femhundra"
        else if h == 6 then "sexhundra"
        else if h == 7 then "sjuhundra"
        else if h == 8 then "åttahundra"
        else if h == 9 then "niohundra"
        else toString (h * 100);
    in
      if n < 0 then toString n
      else if n < builtins.length words then builtins.elemAt words n
      else if n <= 300 then
        let h = builtins.div n 100; rest = n - h * 100;
        in hundreds h + (if rest == 0 then "" else builtins.elemAt words rest)
      else toString n;


  clock = {
    preps = [
      { "in" = "över"; out = "över"; }
      { "in" = "i";    out = "i"; }
      { "in" = "halv"; out = "halv"; }
    ];
    minuteWords = [ { "in" = "kvart"; out = "15"; } ];
    midnightAlias = "noll|midnatt";
  };


  colors = [
    { "in" = "röd|rött|röda";                out = "red"; }
    { "in" = "grön|grönt|gröna";             out = "green"; }
    { "in" = "blå|blått|blåa";               out = "blue"; }
    { "in" = "gul|gult|gula";                out = "yellow"; }
    { "in" = "orange|orangefärgad|orangea";  out = "orange"; }
    { "in" = "lila|lilla|violett|violetta";  out = "purple"; }
    { "in" = "rosa|rosafärgad|rosaaktig";    out = "pink"; }
    { "in" = "vit|vitt|vita";                out = "white"; }
    { "in" = "svart|svarta";                 out = "black"; }
    { "in" = "grå|grått|gråa";               out = "gray"; }
    { "in" = "brun|brunt|bruna";             out = "brown"; }
    { "in" = "cyan|cyanblå|turkosblå";       out = "cyan"; }
    { "in" = "magenta|cerise|fuchsia";       out = "magenta"; }
    { "in" = "turkos|turkosgrön";            out = "turquoise"; }
    { "in" = "teal|blågrön";                 out = "teal"; }
    { "in" = "lime|limegrön";                out = "lime"; }
    { "in" = "maroon|mörkröd";               out = "maroon"; }
    { "in" = "oliv|olivgrön";                out = "olive"; }
    { "in" = "navy|marinblå";                out = "navy"; }
    { "in" = "lavendel|ljuslila";            out = "lavender"; }
    { "in" = "korall|korallröd";             out = "coral"; }
    { "in" = "guld|guldfärgad";              out = "gold"; }
    { "in" = "silver|silverfärgad";          out = "silver"; }
    { "in" = "slumpmässig|random|valfri";    out = "random"; }
  ];


  durations = [
    { "in" = "120|två minuter|2 minuter";                    out = "120"; }
    { "in" = "180|tre minuter|3 minuter";                    out = "180"; }
    { "in" = "300|fem minuter|5 minuter";                    out = "300"; }
    { "in" = "600|tio minuter|10 minuter";                   out = "600"; }
    { "in" = "900|femton minuter|15 minuter|en kvart";       out = "900"; }
    { "in" = "1200|tjugo minuter|20 minuter";                out = "1200"; }
    { "in" = "1800|trettio minuter|30 minuter|en halvtimme"; out = "1800"; }
    { "in" = "2700|fyrtiofem minuter|45 minuter";            out = "2700"; }
    { "in" = "3600|sextio minuter|60 minuter|en timme";      out = "3600"; }
  ];


  states = [
    { "in" = "öppen|öppet|oppen|öppna|open";                                       out = "open";   }
    { "in" = "stängd|stängt|stangd|stängda|closed|close";                          out = "closed"; }
    { "in" = "tänd|tänt|tand|tända|on|på|pa";                                      out = "on";     }
    { "in" = "släckt|släkt|slakt|slackt|släckta|off|av";                            out = "off";    }
    { "in" = "rörelse|rörelser|motion|rörlig|aktiv|någon|nån|nått|några|folk|person|personer"; out = "motion"; }
    { "in" = "batteri";                                                            out = "battery"; }
  ];


  metrics = [
    { "in" = "effekt|power|watt|w";                       out = "power"; }
    { "in" = "temperatur|temp|grader|värme|varmt|kallt";  out = "temperature"; }
    { "in" = "batteri|battery|batteriet|batterinivå";      out = "battery"; }
    { "in" = "luftfuktighet|fuktighet|fukt|humidity";     out = "humidity"; }
    { "in" = "ljusstyrka|brightness|styrka";              out = "brightness"; }
    { "in" = "signal|linkquality|mottagning";             out = "linkquality"; }
    { "in" = "ljus|lux|illuminance|belysning";            out = "illuminance"; }
  ];

  weekdays = [
    { "in" = "monday|måndag|månda";               out = "monday"; }
    { "in" = "tuesday|tis|tisdag";                out = "tuesday"; }
    { "in" = "wednesday|wed|ons|onsdag";          out = "wednesday"; }
    { "in" = "thursday|thu|torsdag|torsda";       out = "thursday"; }
    { "in" = "friday|fri|fre|fredag|freda";       out = "friday"; }
    { "in" = "saturday|sat|lör|lörda|lördag";     out = "saturday"; }
    { "in" = "sunday|sun|sön|sönda|söndag";       out = "sunday"; }

  ];}
