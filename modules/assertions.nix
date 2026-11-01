{
  config,
  lib,
  ...
} : let
  inherit (lib)
    filterAttrs mapAttrsToList mapAttrs' nameValuePair flatten
    optional attrNames concatStringsSep take length unique
    hasAttr attrValues subtractLists listToAttrs map attrsToList
    ;

  getAllFriendlyNames =
    let devices = config.house.zigbee.devices or { };
    in mapAttrsToList (_: device: device.friendly_name) devices;

  friendlyNamesSet =
    let names = getAllFriendlyNames;
    in builtins.listToAttrs (map (name: { inherit name; value = true; }) names);

  deviceExistsByFriendlyName = deviceName:
    builtins.hasAttr deviceName friendlyNamesSet;

  roomExists = roomName:
    builtins.hasAttr roomName (config.house.rooms or { });

  isMqttEnabled = config.house.zigbee.mosquitto != null &&
                  (config.house.zigbee.mosquitto.username != null ||
                   config.house.zigbee.mosquitto.passwordFile != null);

  isValidHexColor = color:
    let cleanColor = lib.removePrefix "#" color;
    in lib.strings.match "[0-9A-Fa-f]{6}" cleanColor != null;

  isValidBrightness = brightness:
    brightness >= 0 && brightness <= 254;

  isValidState = state:
    builtins.elem state [ "ON" "OFF" ];

  getAllMotionSensors =
    let devices = config.house.zigbee.devices or { };
    in filterAttrs (_: device: device.type == "motion") devices;

  getMotionSensorNames =
    let motionSensors = getAllMotionSensors;
    in mapAttrsToList (_: device: device.friendly_name) motionSensors;

  validateScene = sceneName: sceneDevices:
    let
      availableNames = getAllFriendlyNames;
      devices = lib.removeAttrs sceneDevices [ "_aliases" ];
    in flatten (mapAttrsToList (deviceName: settings:
      [
        {
          assertion = deviceExistsByFriendlyName deviceName;
          message = "🦆 duck say ⮞ fuck ❌ Scene '${sceneName}' references non-existent device '${deviceName}'. Available: ${concatStringsSep ", " (take 10 availableNames)}${if length availableNames > 10 then "..." else ""}";
        }

        {
          assertion = settings ? state -> isValidState settings.state;
          message = "🦆 duck say ⮞ fuck ❌ Scene '${sceneName}' device '${deviceName}' has invalid state '${settings.state}' (must be ON or OFF)";
        }

        {
          assertion = settings ? brightness -> isValidBrightness settings.brightness;
          message = "🦆 duck say ⮞ fuck ❌ Scene '${sceneName}' device '${deviceName}' has invalid brightness ${toString settings.brightness} (must be 0-254)";
        }

        {
          assertion = settings ? color -> (
            (settings.color ? hex && isValidHexColor settings.color.hex) ||
            (settings.color ? xy && lib.isList settings.color.xy && lib.length settings.color.xy == 2) ||
            (settings.color ? hue && settings.color ? saturation && lib.isInt settings.color.hue && lib.isInt settings.color.saturation) ||
            (settings.color ? ct && lib.isInt settings.color.ct)
          );
          message = "🦆 duck say ⮞ fuck ❌ Scene '${sceneName}' device '${deviceName}' has invalid color format (must have hex, xy, hue/sat, or ct)";
        }
      ]
    ) devices);

  sceneAliasValidations =
    let
      scenes = config.house.zigbee.scenes or { };
      sceneNames = attrNames scenes;

      # every (alias → scene) pair, lowercased for case-insensitive collision check
      aliasEntries = flatten (mapAttrsToList (name: scene:
        map (alias: { inherit name alias; lower = lib.toLower alias; })
            (scene._aliases or [ ])
      ) scenes);

      seenLower = builtins.foldl' (acc: e:
        if builtins.hasAttr e.lower acc
        then acc
        else acc // { ${e.lower} = e.name; }
      ) { } aliasEntries;

      duplicateAliases = lib.filter (e:
        seenLower.${e.lower} != e.name || builtins.length
          (lib.filter (x: x.lower == e.lower) aliasEntries) > 1
      ) aliasEntries;

      aliasesShadowSceneNames = lib.filter (e:
        builtins.elem e.alias sceneNames
      ) aliasEntries;
    in
    lib.optional (duplicateAliases != [ ]) {
      assertion = false;
      message = "🦆 duck say ⮞ fuck ❌ Scene aliases are not unique: ${concatStringsSep ", " (map (e: "'${e.alias}' (used by '${e.name}')") duplicateAliases)}";
    }
    ++ lib.optional (aliasesShadowSceneNames != [ ]) {
      assertion = false;
      message = "🦆 duck say ⮞ fuck ❌ Scene alias shadows a canonical scene name: ${concatStringsSep ", " (map (e: "'${e.alias}' in scene '${e.name}'") aliasesShadowSceneNames)}";
    };

  validateDevice = deviceId: device:
    [
      {
        assertion = roomExists device.room;
        message = "🦆 duck say ⮞ fuck ❌ Device '${device.friendly_name}' (${deviceId}) assigned to non-existent room '${device.room}'";
      }

      {
        assertion = isValidState "ON";
        message = "🦆 duck say ⮞ fuck ❌ Device '${device.friendly_name}' state validation failed";
      }

    ];

  validateMotionSensors = automationName: sensors:
    let
      availableSensors = getMotionSensorNames;
      invalidSensors = lib.filter (sensor: !lib.elem sensor availableSensors) sensors;
    in
      optional (invalidSensors != [ ]) {
        assertion = false;
        message = "🦆 duck say ⮞ fuck ❌ Automation '${automationName}' references non-existent motion sensors: ${toString invalidSensors}. Available: ${toString availableSensors}";
      };

  sceneValidations = flatten (
    mapAttrsToList validateScene (config.house.zigbee.scenes or { })
  );

  deviceValidations = flatten (
    mapAttrsToList validateDevice (config.house.zigbee.devices or { })
  );

  deviceAliasValidations =
    let
      devices = config.house.zigbee.devices or { };

      entries = mapAttrsToList (deviceId: dev: {
        inherit deviceId;
        friendly      = dev.friendly_name;
        friendlyLower = lib.toLower dev.friendly_name;
        aliases       = dev.aliases or [ ];
      }) devices;

      aliasTuples = flatten (map (e:
        map (alias: {
          inherit (e) deviceId friendlyLower;
          inherit alias;
          aliasLower = lib.toLower alias;
        }) e.aliases
      ) entries);

      groupedByLower   = lib.groupBy (t: t.aliasLower) aliasTuples;
      duplicateAliases = lib.filterAttrs (_: list: length list > 1) groupedByLower;

      duplicateAliasMessages = mapAttrsToList (aliasLower: list:
        let
          devs  = unique (map (t: t.deviceId) list);
          where =
            if length devs == 1
            then "multiple times in device '${builtins.head devs}'"
            else "across devices: ${concatStringsSep ", " devs}";
        in "'${aliasLower}' ${where}"
      ) duplicateAliases;

      aliasesShadowingFriendly = lib.filter (t:
        t.aliasLower != t.friendlyLower
        && builtins.any (e: e.friendlyLower == t.aliasLower) entries
      ) aliasTuples;

      shadowMessages = map (t:
        let
          owner = lib.findFirst
            (e: e.friendlyLower == t.aliasLower) null entries;
        in
          "alias '${t.alias}' on '${t.deviceId}' shadows friendly_name of '${owner.deviceId}' ('${owner.friendly}')"
      ) aliasesShadowingFriendly;

      badAliases = lib.filter (t:
        t.alias == ""
        || lib.strings.trim t.alias != t.alias
      ) aliasTuples;

      badAliasMessages = map (t:
        if t.alias == ""
        then "empty alias on device '${t.deviceId}'"
        else "alias '${t.alias}' on device '${t.deviceId}' has leading/trailing whitespace"
      ) badAliases;
    in
      optional (duplicateAliasMessages != [ ]) {
        assertion = false;
        message = "🦆 duck say ⮞ fuck ❌ Device alias collisions: ${concatStringsSep "; " duplicateAliasMessages}";
      }
      ++ optional (shadowMessages != [ ]) {
        assertion = false;
        message = "🦆 duck say ⮞ fuck ❌ Device alias shadows another device's friendly_name: ${concatStringsSep "; " shadowMessages}";
      }
      ++ optional (badAliasMessages != [ ]) {
        assertion = false;
        message = "🦆 duck say ⮞ fuck ❌ Invalid device aliases: ${concatStringsSep "; " badAliasMessages}";
      };

  motionSensorValidations = flatten (
    mapAttrsToList (name: automation:
      validateMotionSensors name (automation.motion_sensors or [ ])
    ) (config.house.zigbee.automations.presence_based or { })
  );

  duplicateFriendlyNameValidation =
    let
      friendlyNames = getAllFriendlyNames;
      uniqueNames = lib.unique friendlyNames;
    in
    [{
      assertion = length friendlyNames == length uniqueNames;
      message = "🦆 duck say ⮞ fuck ❌ Duplicate friendly names found: ${toString (subtractLists uniqueNames friendlyNames)}";
    }];

  validateMqttTriggered = automationName: automation:
    [{
      assertion = automation.topic != "";
      message = "🦆 duck say ⮞ fuck ❌ MQTT automation '${automationName}' has empty topic";
    }];

  mqttTriggeredValidations = flatten (
    mapAttrsToList validateMqttTriggered (config.house.zigbee.automations.mqtt_triggered or { })
  );

  mqttValidations = [
    {
      assertion = config.house.zigbee.mosquitto != null ->
        (config.house.zigbee.mosquitto.username != null) == (config.house.zigbee.mosquitto.passwordFile != null);
      message = "🦆 duck say ⮞ fuck ❌ MQTT authentication requires both username and passwordFile to be set together";
    }

    {
      assertion = config.house.zigbee.mosquitto != null && config.house.zigbee.mosquitto.ssl.enable ->
        (config.house.zigbee.mosquitto.ssl.clientCertFile != null) == (config.house.zigbee.mosquitto.ssl.clientKeyFile != null);
      message = "🦆 duck say ⮞ fuck ❌ MQTT SSL client authentication requires both clientCertFile and clientKeyFile";
    }

  ];

  syncBoxTvValidation = {
    assertion = config.house.zigbee.hueSyncBox != null &&
                config.house.zigbee.hueSyncBox.enable &&
                config.house.zigbee.hueSyncBox.syncBox.tv != "" ->
                builtins.hasAttr config.house.zigbee.hueSyncBox.syncBox.tv config.house.tv;
    message = let
      syncBox = config.house.zigbee.hueSyncBox;
      tv = syncBox.syncBox.tv;
      availableTvs = attrNames config.house.tv;
    in "🦆 duck say ⮞ fuck ❌ Hue Sync Box references non-existent TV '${tv}'. Available TVs: ${toString availableTvs}";
  };

  tvDefaultValidation =
    let
      defaultTVs = filterAttrs (_: tv: tv.isDefault or false) (config.house.tv or {});
      defaultTVNames = attrNames defaultTVs;
    in
      [{
        assertion = length defaultTVNames <= 1;
        message = "🦆 duck say ⮞ fuck ❌ Only one TV can be set as default. Multiple default TVs found: ${toString defaultTVNames}";
      }];

  tvWebserverValidation =
    let
      enabledTVs = filterAttrs (_: tv: tv.enable or false) (config.house.tv or {});
    in {
      assertion = enabledTVs == {} || (config.house.https.media.url != null || config.house.https.media.urlFile != null);
      message = "🦆 duck say ⮞ fuck ❌ TVs are enabled but neither `house.https.media.url` nor `house.https.media.urlFile` is set. The TV controller requires a webserver URL (or URL file) for media playback. Set one of these options.";
    };

  noMotionConfig = config.house.zigbee.no.motion or {};
  noMotionTrigger = noMotionConfig.trigger or {};
  noMotionAllLightsOff = noMotionTrigger.all.lights.off or {};
  excludeDevices = noMotionAllLightsOff.exclude or [];

  excludedDevicesExistValidation =
    map (deviceName: {
      assertion = deviceExistsByFriendlyName deviceName;
      message = "🦆 duck say ⮞ fuck ❌ No-motion automation excludes non-existent device '${deviceName}'";
    }) excludeDevices;

  noMotionTimeoutComparison =
    let
      noMotionEnabled = noMotionAllLightsOff.enable or false;
      noMotionAfter = noMotionAllLightsOff.after or 0;
      motionDuration = config.house.zigbee.motion.trigger.lights.duration or 0;
    in
      optional noMotionEnabled {
        assertion = (noMotionAfter * 60) > motionDuration;
        message = "🦆 duck say ⮞ fuck ❌ No-motion timeout (${toString noMotionAfter} min × 60 = ${toString (noMotionAfter * 60)}) must be greater than motion trigger lights duration (${toString motionDuration})";
      };

  validateGreetingDoor =
    let
      greeting = config.house.zigbee.automations.greeting or {};
      enable = greeting.enable or false;
      door = greeting.door or "";
    in
      optional enable {
        assertion = door != "" && deviceExistsByFriendlyName door;
        message = "🦆 duck say ⮞ fuck ❌ Greeting automation references non-existent door sensor '${door}'";
      };

  dashboardUrlExclusive = {
    assertion = !(config.house.https.dashboard.url != null && config.house.https.dashboard.urlFile != null);
    message = "🦆 duck say ⮞ fuck ❌ `house.https.dashboard.url` and `house.https.dashboard.urlFile` cannot both be set. Choose one.";
  };

  mediaUrlExclusive = {
    assertion = !(config.house.https.media.url != null && config.house.https.media.urlFile != null);
    message = "🦆 duck say ⮞ fuck ❌ `house.https.media.url` and `house.https.media.urlFile` cannot both be set. Choose one.";
  };

in {

  config.assertions =
    sceneValidations
    ++ deviceValidations
    ++ deviceAliasValidations
    ++ duplicateFriendlyNameValidation
    ++ motionSensorValidations
    ++ mqttValidations
    ++ mqttTriggeredValidations
    ++ [ syncBoxTvValidation ]
    ++ [ tvWebserverValidation ]
    ++ excludedDevicesExistValidation
    ++ noMotionTimeoutComparison
    ++ validateGreetingDoor
    ++ tvDefaultValidation
    ++ [ dashboardUrlExclusive mediaUrlExclusive ];
}
