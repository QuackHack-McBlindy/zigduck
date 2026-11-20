{
  self,
  lib,
  config,
  pkgs,
  allowFrom,
  ...
} : let

in {
  yo.scripts.house = {
    description = "High-performance unified CLI for controlling all smart home devices.";
    category = "Zigbee";
    #binary = self.packages.x86_64-linux.zigduck-cli + "/bin/zigduck-cli";
    binary = "/run/current-system/sw/bin/zigduck-cli";
    parameters = [
      { name = "device"; description = "Device to control"; optional = true;
          values = allowFrom "house" "device"; }
      { name = "state"; type = "string"; description = "State of the device or group";
          values = [ "ON" "OFF" ]; }
      { name = "brightness"; description = "Brightness value (1-100)"; optional = true; type = "string";
          values = allowFrom "house" "brightness"; }
      { name = "color"; description = "Color name or hex code"; optional = true;
          values = allowFrom "house" "color"; }
      { name = "temperature"; description = "Light color temperature (153-500)"; optional = true;
          values = allowFrom "house" "temperature"; }
      { name = "scene"; description = "Activate a predefined scene"; optional = true;
          values = allowFrom "house" "scene"; }
      { name = "room"; description = "Room to target"; optional = true;
          values = allowFrom "house" "room"; }
      { name = "blinds"; description = "Control all blinds (up/down/open/close)"; optional = true;
          values = allowFrom "house" "blinds"; }
      { name = "all-lights"; description = "Control all lights"; type = "bool"; optional = false; default = false; }
      { name = "get-state"; type = "bool"; description = "Fetch current on/off state of a device"; optional = true; }
      { name = "pair"; type = "bool"; description = "Activate zigbee2mqtt pairing and start searching for new devices"; optional = true; }
    ];


  };}
