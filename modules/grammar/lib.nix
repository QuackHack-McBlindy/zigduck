# zigduck/modules/grammar/lib.nix
# general grammar helpers etc, nothing language specific
{
  config,
  lib,
  pkgs,
  words,
  scriptName
  ?
  null,
  ...
} : let
  zigbeeDevices = config.house.zigbee.devices or {};
  zigbeeScenes  = config.house.zigbee.scenes or {};
  zigbeeRooms   = config.house.rooms or {};

  asList = v: if v == null then [] else v;

  capitalizeFirst = s:
    if s == "" then s
    else lib.toUpper (builtins.substring 0 1 s)
         + builtins.substring 1 (builtins.stringLength s - 1) s;


  numberFromZeroTo = max:
    builtins.concatLists (builtins.genList
      (i: [
        { "in" = toString i;          out = toString i; }
        { "in" = words.numberWord i;  out = toString i; }
      ])
      (max + 1));

  numberFromOneTo = max:
    builtins.concatLists (builtins.genList
      (i: let n = i + 1; in [
        { "in" = toString n;          out = toString n; }
        { "in" = words.numberWord n;  out = toString n; }
      ])
      max);


  paramFrom = vs: lib.unique (map (v: v.out) vs);

  caseVariants = name:
    lib.unique [
      name
      (lib.toLower name)
      (lib.toUpper name)
    ];

  houseEntry = canonical: aliases:
    let
      names = lib.unique (lib.concatMap caseVariants (
        [ canonical ] ++ aliases
      ));
    in {
      "in" = lib.concatStringsSep "|" names;
      out = canonical;
    };

  devices = lib.mapAttrsToList (_: d:
    houseEntry d.friendly_name (
      asList (d.aliases or null)
      ++ asList (d._aliases or null)
    )
  ) zigbeeDevices;

  rooms = lib.mapAttrsToList (name: cfg:
    houseEntry name (
      asList (cfg.aliases or null)
      ++ asList (cfg._aliases or null)
    )
  ) zigbeeRooms;

  scenes = lib.mapAttrsToList (sceneName: cfg:
    houseEntry sceneName (
      asList (cfg.aliases or null)
      ++ asList (cfg._aliases or null)
    )
  ) zigbeeScenes;



  inherit (words) states metrics colors durations weekdays;

  brightness = numberFromOneTo 100;


  clock = {
    inherit (words.clock) preps minuteWords;
    hours   = numberFromOneTo 23
              ++ [ { "in" = words.clock.midnightAlias; out = "0"; } ];
    minutes = numberFromZeroTo 59;
    seconds = numberFromZeroTo 59;
  };


  temperature = builtins.genList (i: {
    "in" = toString (i + 153);
    out  = toString (i + 153);
  }) 347;




  param = {
    hours      = paramFrom clock.hours;
    minutes    = paramFrom clock.minutes;
    seconds    = paramFrom clock.seconds;
    brightness = paramFrom brightness;
    weekdays   = paramFrom weekdays;
  };



in {
  inherit
    devices rooms scenes
    states metrics
    colors brightness temperature
    durations clock weekdays
    param
    numberFromZeroTo numberFromOneTo paramFrom;
}
