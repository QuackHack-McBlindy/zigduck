# zigduck/modules/grammar/es/words.nix
{
  pronouns = [ "ello" ];

  # "Perdona, ¿no te he entendido bien?"
  sorryPhrases = [
    "Parece que tienes una albóndiga en la boca. Termina de cenar y vuelve a intentarlo más tarde."
    "¿Qué coño estás diciendo?"
    "Por favor, habla como una persona normal."
    "¿Estás de setas...?"
  ];

  numberWord = n:
    let
      words = [
        "cero" "uno" "dos" "tres" "cuatro" "cinco" "seis" "siete" "ocho" "nueve"
        "diez" "once" "doce" "trece" "catorce" "quince" "dieciséis" "diecisiete" "dieciocho" "diecinueve"
        "veinte" "veintiuno" "veintidós" "veintitrés" "veinticuatro" "veinticinco" "veintiséis" "veintisiete" "veintiocho" "veintinueve"
        "treinta" "treinta y uno" "treinta y dos" "treinta y tres" "treinta y cuatro" "treinta y cinco" "treinta y seis" "treinta y siete" "treinta y ocho" "treinta y nueve"
        "cuarenta" "cuarenta y uno" "cuarenta y dos" "cuarenta y tres" "cuarenta y cuatro" "cuarenta y cinco" "cuarenta y seis" "cuarenta y siete" "cuarenta y ocho" "cuarenta y nueve"
        "cincuenta" "cincuenta y uno" "cincuenta y dos" "cincuenta y tres" "cincuenta y cuatro" "cincuenta y cinco" "cincuenta y seis" "cincuenta y siete" "cincuenta y ocho" "cincuenta y nueve"
        "sesenta" "sesenta y uno" "sesenta y dos" "sesenta y tres" "sesenta y cuatro" "sesenta y cinco" "sesenta y seis" "sesenta y siete" "sesenta y ocho" "sesenta y nueve"
        "setenta" "setenta y uno" "setenta y dos" "setenta y tres" "setenta y cuatro" "setenta y cinco" "setenta y seis" "setenta y siete" "setenta y ocho" "setenta y nueve"
        "ochenta" "ochenta y uno" "ochenta y dos" "ochenta y tres" "ochenta y cuatro" "ochenta y cinco" "ochenta y seis" "ochenta y siete" "ochenta y ocho" "ochenta y nueve"
        "noventa" "noventa y uno" "noventa y dos" "noventa y tres" "noventa y cuatro" "noventa y cinco" "noventa y seis" "noventa y siete" "noventa y ocho" "noventa y nueve"
        "cien"
      ];
      hundreds = h:
        if h == 1 then "cien"
        else if h == 2 then "doscientos"
        else if h == 3 then "trescientos"
        else if h == 4 then "cuatrocientos"
        else if h == 5 then "quinientos"
        else if h == 6 then "seiscientos"
        else if h == 7 then "setecientos"
        else if h == 8 then "ochocientos"
        else if h == 9 then "novecientos"
        else toString (h * 100);
    in
      if n < 0 then toString n
      else if n < builtins.length words then builtins.elemAt words n
      else if n <= 300 then
        let
          h = builtins.div n 100;
          rest = n - h * 100;
          base = if h == 1 then (if rest == 0 then "cien" else "ciento") else hundreds h;
        in
          if rest == 0 then base
          else base + " " + builtins.elemAt words rest
      else toString n;


  clock = {
    preps = [
      { "in" = "y";     out = "y"; }
      { "in" = "menos"; out = "menos"; }
      { "in" = "media"; out = "media"; }
    ];
    minuteWords = [ { "in" = "cuarto"; out = "15"; } ];
    midnightAlias = "cero|medianoche";
  };


  colors = [
    { "in" = "rojo|roja|rojos|rojas";                    out = "red"; }
    { "in" = "verde|verdes";                             out = "green"; }
    { "in" = "azul|azules";                              out = "blue"; }
    { "in" = "amarillo|amarilla|amarillos|amarillas";    out = "yellow"; }
    { "in" = "naranja|naranjas|anaranjado";              out = "orange"; }
    { "in" = "morado|morada|púrpura|violeta";            out = "purple"; }
    { "in" = "rosa|rosado|rosada";                       out = "pink"; }
    { "in" = "blanco|blanca|blancos|blancas";            out = "white"; }
    { "in" = "negro|negra|negros|negras";                out = "black"; }
    { "in" = "gris|grises";                              out = "gray"; }
    { "in" = "marrón|marrón|castaño|café";               out = "brown"; }
    { "in" = "cian";                                     out = "cyan"; }
    { "in" = "magenta|fucsia";                           out = "magenta"; }
    { "in" = "turquesa";                                 out = "turquoise"; }
    { "in" = "verde azulado";                            out = "teal"; }
    { "in" = "lima|verde lima";                          out = "lime"; }
    { "in" = "granate|vino";                             out = "maroon"; }
    { "in" = "oliva|aceituna";                           out = "olive"; }
    { "in" = "azul marino";                              out = "navy"; }
    { "in" = "lavanda";                                  out = "lavender"; }
    { "in" = "coral";                                    out = "coral"; }
    { "in" = "oro|dorado|dorada";                        out = "gold"; }
    { "in" = "plata|plateado|plateada";                  out = "silver"; }
    { "in" = "aleatorio|al azar|random";                 out = "random"; }
  ];


  durations = [
    { "in" = "120|dos minutos|2 minutos";                        out = "120"; }
    { "in" = "180|tres minutos|3 minutos";                       out = "180"; }
    { "in" = "300|cinco minutos|5 minutos";                      out = "300"; }
    { "in" = "600|diez minutos|10 minutos";                      out = "600"; }
    { "in" = "900|quince minutos|15 minutos|un cuarto de hora";  out = "900"; }
    { "in" = "1200|veinte minutos|20 minutos";                   out = "1200"; }
    { "in" = "1800|treinta minutos|30 minutos|media hora";       out = "1800"; }
    { "in" = "2700|cuarenta y cinco minutos|45 minutos";         out = "2700"; }
    { "in" = "3600|sesenta minutos|60 minutos|una hora";         out = "3600"; }
  ];


  states = [
    { "in" = "abierto|abierta|abiertos|abiertas|open";                        out = "open"; }
    { "in" = "cerrado|cerrada|cerrados|cerradas|closed|close";                out = "closed"; }
    { "in" = "encendido|encendida|encendidos|encendidas|on";                  out = "on"; }
    { "in" = "apagado|apagada|apagados|apagadas|off";                         out = "off"; }
    { "in" = "movimiento|movimientos|actividad|alguien|gente|persona|personas"; out = "motion"; }
    { "in" = "batería|bateria|pila";                                          out = "battery"; }
  ];


  metrics = [
    { "in" = "potencia|energía|vatios|watt|w";                        out = "power"; }
    { "in" = "temperatura|temp|grados|calor|caliente|frío";           out = "temperature"; }
    { "in" = "batería|nivel de batería|pila";                         out = "battery"; }
    { "in" = "humedad";                                               out = "humidity"; }
    { "in" = "brillo|intensidad|luminosidad";                         out = "brightness"; }
    { "in" = "señal|calidad de señal|recepción";                      out = "linkquality"; }
    { "in" = "iluminación|lux|luminancia|illuminance";                out = "illuminance"; }
  ];


  deviceAliases = {
    shield = "tv|tele|televisión|pantalla|shield";

  };}
