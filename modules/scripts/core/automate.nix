{
  config,
  lib,
  pkgs,
  ...
} : let

in {

  yo.scripts.automate = {
    description = "Define an automation in natural language. Trigger + actions are compiled to the shared IR and persisted for runtime pickup.";
    category    = "Core";
    parameters = [
      { name = "dimmer_gesture"; description = "Dimmer gesture (canonicalised: on_press_release / off_hold_release / …)"; type = "string"; optional = true; }
      { name = "dimmer_room";    description = "Room containing the dimmer";                                              type = "string"; optional = true; }
      { name = "door_event";     description = "Door event (canonicalised: door_opened / door_closed)";                  type = "string"; optional = true; }
      { name = "door_room";      description = "Room containing the door sensor";                                        type = "string"; optional = true; }
      { name = "motion_room";    description = "Room to watch for motion";                                               type = "string"; optional = true; }
      { name = "schedule_days";  description = "Days of week (canonicalised: mon,tue,…)";                                type = "string"; optional = true; }
      { name = "schedule_time";  description = "Time of day, HH:MM or natural language";                                 type = "string"; optional = true; }
      { name = "event";          description = "System event (canonicalised: leak_detected / smoke_detected / …)";       type = "string"; optional = true; }
      { name = "topic";          description = "MQTT topic to subscribe to";                                             type = "string"; optional = true; }
      { name = "actions";        description = "Natural-language action list, dispatched through `yo do`";               type = "string"; optional = false; }
    ];
    code = ''
      kind=""; spec=""
      if   [ -n "''${dimmer_gesture:-}" ] && [ -n "''${dimmer_room:-}" ]; then
        kind="dimmer"; spec="''${dimmer_room}:''${dimmer_gesture}"
      elif [ -n "''${door_event:-}" ]     && [ -n "''${door_room:-}" ];    then
        kind="door";   spec="''${door_room}:''${door_event}"
      elif [ -n "''${motion_room:-}" ];                                     then
        kind="motion"; spec="''${motion_room}"
      elif [ -n "''${schedule_time:-}" ];                                   then
        kind="schedule"; spec="''${schedule_days:-*}:''${schedule_time}"
      elif [ -n "''${event:-}" ];                                           then
        kind="event";  spec="''${event}"
      elif [ -n "''${topic:-}" ];                                           then
        kind="mqtt";   spec="''${topic}"
      else
        echo "automate: no trigger clause matched" >&2; exit 1
      fi
      zigduck automations define --kind "$kind" --spec "$spec" --actions "$actions"
      exit $?
    '';

  };}
