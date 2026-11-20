{
  self,
  lib,
  config,
  pkgs,
  allowFrom,
  maps
  ?
  {},
  ...
} : let

in {
  yo.scripts.countdown = {
    description = "Set a countdown on a Zigduck device (turns off after N seconds).";
    category = "Zigbee";
    parameters = [
      { name   = "device";  description = "Device to set countdown on"; type = "string"; optional = false;
        values = allowFrom "state" "device"; }
      { name   = "seconds"; description = "Seconds until device turns off"; default = "0"; }
    ];

    code = ''
      ${maps.mkBashMap "DEVICE_LOOKUP" maps.deviceMap}

      _d=$(printf '%s' "$device" | tr '[:upper:]' '[:lower:]')
      RESOLVED="''${DEVICE_LOOKUP[$_d]:-$device}"

      zigduck-cli --publish \
        --topic "${config.house.zigbee.mosquitto.baseTopic}/''${RESOLVED}/set" \
        --payload "{\"countdown\": ''${seconds}}"
    '';



  };}
