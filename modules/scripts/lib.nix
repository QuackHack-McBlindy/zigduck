# zigduck/modules/scripts/default.nix
# scripts library & helpers
{
  config,
  lib,
  pkgs,
  scriptName ? null,
  ...
} : let
  zigbeeDevices = config.house.zigbee.devices or {};
  zigbeeScenes = config.house.zigbee.scenes or {};
  zigbeeRooms = config.house.rooms or {};

  asList = v:
    if v == null then [] else v;

  capitalizeFirst = s:
    if s == "" then s
    else
      lib.toUpper (builtins.substring 0 1 s)
      + builtins.substring 1 (builtins.stringLength s - 1) s;


  numberFromZeroTo = max:
    builtins.genList
      (i: {
        "in" = toString i;
        out = toString i;
      })
      (max + 1);

  numberFromOneTo = max:
    builtins.genList
      (i:
        let n = i + 1;
        in {
          "in" = toString n;
          out = toString n;
        })
      max;

  paramFrom = vs:
    lib.unique (map (v: v.out) vs);

  allowFrom = listName:
    let
      def =
        if scriptName == null then {}
        else config.yo.scripts.${scriptName}.voice.lists.${listName} or {};

      expand = v:
        lib.splitString "|" (v."in" or v.out);
    in
      if (def.wildcard or false) then []
      else lib.unique (lib.concatMap expand (def.values or []));

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

  devices =
    lib.mapAttrsToList (_: d:
      houseEntry
        (capitalizeFirst d.friendly_name)
        (
          asList (d.aliases or null)
          ++ asList (d._aliases or null)
        )
    ) zigbeeDevices
    ++ [
      {
        "in" = "tv|TV|Tv|tvn|TVN|Tvn|teven|TEVEN|Teven|shield|SHIELD|Shield|sköld|SKÖLD|Sköld|skölden|SKÖLDEN|Skölden|sjöld|SJÖLD|Sjöld";
        out = "shield";
      }
    ];

  rooms = lib.mapAttrsToList (name: cfg:
    houseEntry
      (lib.toLower name)
      (
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


  states = [
    { "in" = "öppen|öppet|oppen|öppna|open"; out = "öppen"; }
    { "in" = "stängd|stängt|stangd|stängda|closed|close"; out = "stängd"; }
    { "in" = "tänd|tänt|tand|tända|on|på|pa"; out = "tänd"; }
    { "in" = "släckt|släkt|slakt|slackt|släckta|off|av"; out = "släckt"; }
    {
      "in" = "rörelse|rörelser|motion|rörlig|aktiv|någon|nån|nått|några|folk|person|personer";
      out = "rörelse";
    }
    { "in" = "batteri"; out = "batteri"; }
  ];

  statesCase =
    builtins.listToAttrs (map
      (s: lib.nameValuePair s.out s."in")
      states);

  metrics = [
    { "in" = "effekt|power|watt|w"; out = "power"; }
    { "in" = "temperatur|temp|grader|värme|varmt|kallt"; out = "temperature"; }
    { "in" = "batteri|battery|batteriet|batterinivå"; out = "battery"; }
    { "in" = "luftfuktighet|fuktighet|fukt|humidity"; out = "humidity"; }
    { "in" = "ljusstyrka|brightness|styrka"; out = "brightness"; }
    { "in" = "signal|linkquality|mottagning"; out = "linkquality"; }
    { "in" = "ljus|lux|illuminance|belysning"; out = "illuminance"; }
  ];

  colors = [
    { "in" = "röd|rött|röda"; out = "red"; }
    { "in" = "grön|grönt|gröna"; out = "green"; }
    { "in" = "blå|blått|blåa"; out = "blue"; }
    { "in" = "gul|gult|gula"; out = "yellow"; }
    { "in" = "orange|orangefärgad|orangea"; out = "orange"; }
    { "in" = "lila|lilla|violett|violetta"; out = "purple"; }
    { "in" = "rosa|rosafärgad|rosaaktig"; out = "pink"; }
    { "in" = "vit|vitt|vita"; out = "white"; }
    { "in" = "svart|svarta"; out = "black"; }
    { "in" = "grå|grått|gråa"; out = "gray"; }
    { "in" = "brun|brunt|bruna"; out = "brown"; }
    { "in" = "cyan|cyanblå|turkosblå"; out = "cyan"; }
    { "in" = "magenta|cerise|fuchsia"; out = "magenta"; }
    { "in" = "turkos|turkosgrön"; out = "turquoise"; }
    { "in" = "teal|blågrön"; out = "teal"; }
    { "in" = "lime|limegrön"; out = "lime"; }
    { "in" = "maroon|mörkröd"; out = "maroon"; }
    { "in" = "oliv|olivgrön"; out = "olive"; }
    { "in" = "navy|marinblå"; out = "navy"; }
    { "in" = "lavendel|ljuslila"; out = "lavender"; }
    { "in" = "korall|korallröd"; out = "coral"; }
    { "in" = "guld|guldfärgad"; out = "gold"; }
    { "in" = "silver|silverfärgad"; out = "silver"; }
    { "in" = "slumpmässig|random|valfri"; out = "random"; }
  ];

  brightness = numberFromOneTo 100;

  durations = [
    { "in" = "120|två minuter|2 minuter"; out = "120"; }
    { "in" = "180|tre minuter|3 minuter"; out = "180"; }
    { "in" = "300|fem minuter|5 minuter"; out = "300"; }
    { "in" = "600|tio minuter|10 minuter"; out = "600"; }
    { "in" = "900|femton minuter|15 minuter|en kvart"; out = "900"; }
    { "in" = "1200|tjugo minuter|20 minuter"; out = "1200"; }
    { "in" = "1800|trettio minuter|30 minuter|en halvtimme"; out = "1800"; }
    { "in" = "2700|fyrtiofem minuter|45 minuter"; out = "2700"; }
    { "in" = "3600|sextio minuter|60 minuter|en timme"; out = "3600"; }
  ];

  weekdays = [
    { "in" = "monday|mon|mån|månda|måndag"; out = "monday"; }
    { "in" = "tuesday|tue|tis|tisdag|tisda"; out = "tuesday"; }
    { "in" = "wednesday|wed|ons|onsdag|onsda"; out = "wednesday"; }
    { "in" = "thursday|thu|tors|torsdag|torsda"; out = "thursday"; }
    { "in" = "friday|fri|fre|fredag|freda"; out = "friday"; }
    { "in" = "saturday|sat|lör|lördag|lörda"; out = "saturday"; }
    { "in" = "sunday|sun|sön|söndag|sönda"; out = "sunday"; }
  ];

  clock = {
    preps = [
      { "in" = "över"; out = "över"; }
      { "in" = "i"; out = "i"; }
      { "in" = "halv"; out = "halv"; }
    ];

    minuteWords =
      [ { "in" = "kvart"; out = "15"; } ]
      ++ numberFromOneTo 29;

    hours =
      numberFromOneTo 23
      ++ [ { "in" = "noll|midnatt"; out = "0"; } ];

    minutes = numberFromZeroTo 59;
    seconds = numberFromZeroTo 59;
  };

  temperature = builtins.genList (i: {
    "in" = toString (i + 153);
    out = toString (i + 153);
  }) 347;


  param = {
    hours = paramFrom clock.hours;
    minutes = paramFrom clock.minutes;
    seconds = paramFrom clock.seconds;
    brightness = paramFrom brightness;
  };


  makeLookupMap = entries:
    lib.listToAttrs (lib.concatMap (entry:
      map
        (name: lib.nameValuePair name entry.out)
        (lib.splitString "|" entry."in")
    ) entries);

  deviceMap = makeLookupMap devices;
  roomMap = makeLookupMap rooms;
  sceneMap = makeLookupMap scenes;

  normalizedDeviceMap = lib.mapAttrs' (_id: d:
    lib.nameValuePair
      (lib.toLower d.friendly_name)
      d.friendly_name
  ) zigbeeDevices;

  typeMap = lib.listToAttrs (lib.concatMap (d:
    let
      entry = houseEntry d.friendly_name (
        asList (d.aliases or null)
        ++ asList (d._aliases or null)
      );

      deviceType = d.type or "unknown";
    in
      map
        (name: lib.nameValuePair name deviceType)
        (lib.splitString "|" entry."in")
  ) (lib.attrValues zigbeeDevices));

  deviceNames = lib.sort (a: b: a < b)
    (map (d: d.friendly_name) (lib.attrValues zigbeeDevices));

  roomNames =
    if zigbeeRooms != {}
    then builtins.attrNames zigbeeRooms
    else lib.unique (map (d: d.room) (lib.attrValues zigbeeDevices));

  sceneNames = builtins.attrNames zigbeeScenes;

  roomDevices =
    let
      grouped = lib.groupBy (d: d.room) (lib.attrValues zigbeeDevices);
    in
      lib.mapAttrs (_room: devs:
        map (d: d.friendly_name) devs
      ) grouped;

  roomBashMap = lib.mapAttrs (_room: devs:
    lib.concatStringsSep "|" devs
  ) roomDevices;

  allDevicesStr =
    lib.concatStringsSep "|" (lib.attrValues normalizedDeviceMap);

  mkBashMap = name: attrs:
    let
      entries = lib.mapAttrsToList (k: v:
        "  [${lib.escapeShellArg k}]=${lib.escapeShellArg (toString v)}"
      ) attrs;
    in ''
      declare -A ${name}=(
      ${lib.concatStringsSep "\n" entries}
      )
    '';

in {
  inherit
    devices
    rooms
    scenes

    # voice lists
    states
    statesCase
    metrics
    colors
    brightness
    temperature
    durations
    clock
    weekdays

    # parameter validation
    allowFrom
    param
    paramFrom
    numberFromZeroTo
    numberFromOneTo

    # Lookups
    deviceMap
    roomMap
    sceneMap
    normalizedDeviceMap
    typeMap
    deviceNames
    roomNames
    sceneNames
    roomDevices
    roomBashMap
    allDevicesStr

    # Helpers
    asList
    capitalizeFirst
    mkBashMap;
}
