{
  config,
  lib,
  pkgs,
  ...
} : let
  inherit (lib) mkOption types mkEnableOption;
  Types = import ./../types.nix { inherit lib; };
in {
  options.house.zigbee.automations = mkOption {
    type = types.submodule {
      options = {
        string = mkOption {
          type = types.submodule {
            options = {
              prefix = mkOption {
                type = types.str;
                default = "";
                description = "Optional prefix for string automation actions.";
                example = "echo";
              };
            };
          };
          default = { };
        };

        # MQTT triggered automations
        mqtt_triggered = mkOption {
          type = types.attrsOf (types.submodule {
            options = {
              enable = mkEnableOption "Enable this MQTT-triggered automation";
              description = mkOption {
                type = types.str;
                description = ''
                  Human-readable summary shown in logs and generated
                  documentation. Does not affect behaviour.
                '';
                example = "Toggle living room lights on single button press";
              };
              topic = mkOption {
                type = types.str;
                description = ''
                  MQTT topic the automation subscribes to. Must be fully
                  qualified with the broker's `baseTopic` prefix
                  (default: `zigbee2mqtt/`).
                '';
                example = "zigbee2mqtt/living_room_button/action";
              };
              message = mkOption {
                type = types.nullOr types.str;
                default = null;
                description = ''
                  If set, `actions` fire only when the published payload
                  equals this string exactly. `null` (the default) fires
                  on every message published to `topic`, regardless of
                  payload.
                '';
                example = "single";
              };

              conditions = mkOption {
                type = types.listOf (types.submodule {
                  options = {
                    type = mkOption {
                      type = types.enum ["dark_time" "someone_home" "room_occupied"];
                      description = ''
                        Condition to evaluate before running `actions`:

                          dark_time    -> current time is within the dark
                                          window configured under
                                          `house.zigbee.motion.trigger.lights`
                          someone_home -> at least one presence tracker
                                          reports home
                          room_occupied-> the room named in `room` currently
                                          reports occupancy
                      '';
                      example = "dark_time";
                    };
                    room = mkOption {
                      type = types.nullOr types.str;
                      default = null;
                      description = ''
                        Room the condition applies to. Required when
                        `type = "room_occupied"`; ignored otherwise.
                      '';
                      example = "kitchen";
                    };
                    value = mkOption {
                      type = types.nullOr types.bool;
                      default = null;
                      description = ''
                        Expected boolean for the condition. The condition
                        passes when the computed state equals `value`.
                        `null` means "any non-empty value".
                      '';
                      example = true;
                    };
                  };
                });
                default = [];
                description = ''
                  Conditions that must all pass before `actions` run.
                  Empty list means the automation fires unconditionally
                  on a matching message.
                '';
              };

              actions = mkOption {
                type = types.listOf Types.automationActionType;
                default = [];
                description = ''
                  Ordered actions executed when `topic` (and `message`,
                  if set) match and all `conditions` pass. String entries
                  are shorthand for
                  `{ type = "shell"; command = <string>; }`.
                '';
                example = [
                  { type = "scene"; scene = "kitchenInstant"; }
                  { type = "wait"; duration = 5; }
                  "echo 'automation completed'"
                ];
              };
            };
          });
          default = {};
          description = ''
            Automations driven by incoming MQTT messages. Each attribute
            name is the automation's identifier (free-form, shown in
            logs). Runs `actions` when `topic` receives a matching
            message and every optional `conditions` entry passes.
          '';
          example = {
            button_single_press = {
              enable = true;
              description = "Toggle living room lights on single button press";
              topic = "zigbee2mqtt/living_room_button/action";
              message = "single";
              actions = [
                {
                  type = "mqtt";
                  topic = "zigbee2mqtt/living_room_lights/set";
                  message = ''{"state":"TOGGLE"}'';
                }
              ];
            };
            motion_alert = {
              enable = true;
              description = "Send notification on outdoor motion";
              topic = "zigbee2mqtt/outdoor_motion/occupancy";
              message = "true";
              actions = [
                "echo 'Motion detected outside!' | wall"
                {
                  type = "shell";
                  command = "${pkgs.libnotify}/bin/notify-send 'Security' 'Motion detected outside'";
                }
              ];
            };
          };
        };


        time_based = mkOption {
          type = types.attrsOf (types.submodule {
            options = {
              enable = mkEnableOption "this time-based automation";

              description = mkOption {
                type = types.str;
                description = ''
                  Human-readable summary shown in logs and generated
                  documentation. Does not affect behaviour.
                '';
                example = "Gentle morning lights on weekdays";
              };

              schedule = mkOption {
                type = types.oneOf [
                  types.str
                  (types.submodule {
                    options = {
                      start = mkOption {
                        type = types.nullOr types.str;
                        default = null;
                        description = ''
                          Start of the active window, in 24-hour `HH:MM`
                          format. `null` means "fire at exactly the time
                          in `end`, once".
                        '';
                        example = "06:30";
                      };
                      end = mkOption {
                        type = types.nullOr types.str;
                        default = null;
                        description = ''
                          End of the active window, in 24-hour `HH:MM`
                          format. Must be set when `start` is set.
                        '';
                        example = "07:00";
                      };
                      days = mkOption {
                        type = types.listOf (types.enum ["mon" "tue" "wed" "thu" "fri" "sat" "sun"]);
                        default = ["mon" "tue" "wed" "thu" "fri" "sat" "sun"];
                        description = ''
                          Days of the week the schedule is active.
                          Defaults to every day.
                        '';
                        example = ["mon" "tue" "wed" "thu" "fri"];
                      };
                    };
                  })
                ];
                description = ''
                  When the automation fires. Either:

                    string-> a standard 5-field cron expression
                             (e.g. `"0 22 * * *"` = every day at 22:00)

                    attrset-> structured `{ start; end; days; }` for the
                              common "within this window" case
                '';
                example = {
                  start = "06:30";
                  end = "07:00";
                  days = ["mon" "tue" "wed" "thu" "fri"];
                };
              };

              conditions = mkOption {
                type = types.listOf (types.submodule {
                  options = {
                    type = mkOption {
                      type = types.enum ["dark_time" "someone_home" "room_occupied"];
                      description = ''
                        Same condition vocabulary as `mqtt_triggered`:

                          dark_time    -> currently inside the dark window
                          someone_home -> at least one presence tracker home
                          room_occupied-> the room named in `room` reports
                                          occupancy
                      '';
                      example = "someone_home";
                    };
                    room = mkOption {
                      type = types.nullOr types.str;
                      default = null;
                      description = ''
                        Room the condition applies to. Required when
                        `type = "room_occupied"`; ignored otherwise.
                      '';
                      example = "bedroom";
                    };
                    value = mkOption {
                      type = types.nullOr types.bool;
                      default = null;
                      description = ''
                        Expected boolean for the condition. Passes when
                        the computed state equals `value`.
                      '';
                      example = true;
                    };
                  };
                });
                default = [];
                description = ''
                  Conditions that must all pass at fire time. Empty list
                  means the automation fires unconditionally.
                '';
              };

              actions = mkOption {
                type = types.listOf Types.automationActionType;
                default = [];
                description = ''
                  Ordered actions executed when the schedule and every
                  condition match. String entries are shorthand for
                  `{ type = "shell"; command = <string>; }`.
                '';
                example = [
                  { type = "scene"; scene = "morning"; }
                  "echo 'Good morning!'"
                ];
              };
            };
          });
          default = {};
          description = ''
            Automations driven by a schedule. `schedule` accepts either a
            cron expression or a structured window; see its description
            for both forms.
          '';
          example = {
            morning_wakeup = {
              enable = true;
              description = "Gentle morning lights on weekdays";
              schedule = {
                start = "06:30";
                end = "07:00";
                days = ["mon" "tue" "wed" "thu" "fri"];
              };
              conditions = [
                { type = "someone_home"; value = true; }
              ];
              actions = [
                { type = "scene"; scene = "morning"; }
                "echo 'Good morning!'"
              ];
            };
            bedtime = {
              enable = true;
              description = "Prepare the house for bed every night";
              schedule = "0 22 * * *";
              actions = [
                { type = "scene"; scene = "dark"; }
              ];
            };
          };
        };

        presence_based = mkOption {
          type = types.attrsOf (types.submodule {
            options = {
              enable = mkEnableOption "this presence-based automation";

              description = mkOption {
                type = types.str;
                description = ''
                  Human-readable summary shown in logs and generated
                  documentation. Does not affect behaviour.
                '';
                example = "Turn off kitchen lights after 10 minutes idle";
              };

              motion_sensors = mkOption {
                type = types.listOf types.str;
                description = ''
                  Friendly names of the motion sensors to watch. The
                  automation considers the room idle once every sensor in
                  this list has reported no motion for
                  `no_motion_duration` seconds.
                '';
                example = ["Motion Sensor Kök"];
              };

              no_motion_duration = mkOption {
                type = types.int;
                default = 300;
                description = ''
                  Seconds of continuous no-motion before `actions` fire.
                  A single motion event resets the countdown.
                '';
                example = 600;
              };

              conditions = mkOption {
                type = types.listOf (types.submodule {
                  options = {
                    type = mkOption {
                      type = types.enum ["dark_time" "room_occupied" "lights_on"];
                      description = ''
                        Condition to evaluate before `actions` run:

                          dark_time    -> currently inside the dark window
                          room_occupied-> the room currently reports
                                          occupancy (useful to suppress
                                          auto-off if someone just returned)
                          lights_on    -> at least one light in scope is
                                          currently on (skips the work
                                          when everything is already off)
                      '';
                      example = "lights_on";
                    };
                    room = mkOption {
                      type = types.nullOr types.str;
                      default = null;
                      description = ''
                        Room the condition applies to. Required when
                        `type` is room-scoped (`room_occupied`); ignored
                        otherwise.
                      '';
                      example = "kitchen";
                    };
                    value = mkOption {
                      type = types.nullOr types.bool;
                      default = null;
                      description = ''
                        Expected boolean for the condition. Passes when
                        the computed state equals `value`.
                      '';
                      example = true;
                    };
                  };
                });
                default = [];
                description = ''
                  Conditions that must all pass before `actions` run.
                  `motion_restored_actions` is not gated by these.
                '';
              };

              actions = mkOption {
                type = types.listOf Types.automationActionType;
                default = [];
                description = ''
                  Ordered actions executed after `no_motion_duration`
                  seconds without motion, provided every condition
                  passes. String entries are shorthand for
                  `{ type = "shell"; command = <string>; }`.
                '';
                example = [
                  { type = "scene"; scene = "kitchenFadeOff"; }
                ];
              };

              motion_restored_actions = mkOption {
                type = types.listOf Types.automationActionType;
                default = [];
                description = ''
                  Ordered actions executed when motion is detected again
                  after `actions` has fired. Use this to restore lighting
                  without waiting for the normal motion handler to catch
                  up. Not gated by `conditions`.
                '';
                example = [
                  { type = "scene"; scene = "kitchenInstant"; }
                ];
              };
            };
          });
          default = {};
          description = ''
            Automations driven by motion absence. Each entry watches
            one or more motion sensors and fires `actions` after
            `no_motion_duration` seconds of stillness, then optionally
            fires `motion_restored_actions` when motion returns.
          '';
          example = {
            kitchen_idle = {
              enable = true;
              description = "Turn off kitchen lights and fan after 10 minutes with no motion";
              motion_sensors = [ "Motion Sensor Kök" ];
              no_motion_duration = 600;
              conditions = [
                { type = "lights_on"; room = "kitchen"; value = true; }
              ];
              actions = [
                { type = "scene"; scene = "kitchenFadeOff"; }
                { type = "mqtt"; topic = "zigduck/Fläkt/set"; message = ''{"state":"OFF"}''; }
              ];
              motion_restored_actions = [
                { type = "scene"; scene = "kitchenInstant"; }
              ];
            };
          };
        };

        greeting = mkOption {
          type = types.submodule {
            options = {
              enable = mkEnableOption "the greeting automation";

              awayDuration = mkOption {
                type = types.int;
                default = 7200;
                description = ''
                  Minimum seconds the house must have been empty before a
                  door opening counts as "arriving home". Prevents the
                  greeting from firing when you just stepped out to take
                  out the trash.
                '';
                example = 7200;
              };

              door = mkOption {
                type = types.nullOr types.str;
                default = null;
                description = ''
                  Friendly name of the door sensor to watch. Required
                  when `enable = true`; the automation is a no-op when
                  this is `null`. Must match a `friendly_name` under
                  `house.zigbee.devices`. Case-sensitive.
                '';
                example = "Door Sensor Hall";
              };

              message = mkOption {
                type = types.str;
                default = "contact";
                description = ''
                  Field on the door sensor's state payload that flips to
                  `false` when the door opens. For most Zigbee contact
                  sensors this is `"contact"`; override only when using
                  a custom sensor with a different field name.
                '';
                example = "contact";
              };

              delay = mkOption {
                type = types.int;
                default = 10;
                description = ''
                  Seconds to wait after the door opens before running
                  `actions`. Useful when the greeting is TTS that should
                  play after the door has closed again.
                '';
                example = 10;
              };

              actions = mkOption {
                type = types.listOf Types.automationActionType;
                default = [ "echo 'Welcome home!'" ];
                description = ''
                  Ordered actions executed on arrival. The default is a
                  shell echo; most users override this with a TTS
                  command or a notification. String entries are
                  shorthand for
                  `{ type = "shell"; command = <string>; }`.
                '';
                example = [
                  { type = "shell"; command = "yo say 'Welcome home!'"; }
                ];
              };
            };
          };
          default = {};
          description = ''
            The welcome-home automation. Fires `actions` when the
            configured door opens after the house has been empty for at
            least `awayDuration` seconds.
          '';
          example = {
            enable = true;
            awayDuration = 7200;
            door = "Door Sensor Hall";
            message = "contact";
            delay = 10;
            actions = [
              { type = "shell"; command = "yo say 'Welcome home!'"; }
            ];
          };
        };

        dimmer_actions = mkOption {
          type = types.attrsOf (types.submodule {
            options = {
              on_press_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the on-button press-and-release event in
                  this room. `null` uses the built-in default (turn on
                  room lights). See the top-level `_default` example for
                  the baseline behaviour of every event.
                '';
                example = {
                  enable = true;
                  description = "Turn on kitchen lights and fan";
                };
              };
              on_hold_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the on-button hold-and-release event.
                  `null` uses the built-in default (turn on all lights).
                '';
                example = {
                  enable = true;
                  description = "Turn on every light in the house";
                };
              };
              off_press_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the off-button press-and-release event.
                  `null` uses the built-in default (turn off room lights).
                '';
                example = {
                  enable = true;
                  description = "Turn off room lights only";
                };
              };
              off_hold_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the off-button hold-and-release event.
                  `null` uses the built-in default (turn off all lights).
                '';
                example = {
                  enable = true;
                  description = "Turn off all lights and the kitchen fan";
                };
              };
              up_press_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the up-button press-and-release event.
                  `null` uses the built-in default (dim room lights up).
                '';
                example = {
                  enable = true;
                  description = "Dim room lights up";
                };
              };
              up_hold_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the up-button hold-and-release event.
                  `null` uses the built-in default (no action).
                '';
                example = {
                  enable = true;
                  description = "Nothing by default";
                };
              };
              down_press_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the down-button press-and-release event.
                  `null` uses the built-in default (dim room lights down).
                '';
                example = {
                  enable = true;
                  description = "Dim room lights down";
                };
              };
              down_hold_release = mkOption {
                type = types.nullOr Types.dimmerActionType;
                default = null;
                description = ''
                  Override for the down-button hold-and-release event.
                  `null` uses the built-in default (no action).
                '';
                example = {
                  enable = true;
                  description = "Nothing by default";
                };
              };
            };
          });
          default = {};
          description = ''
            Per-room overrides for dimmer-switch behaviour. The attribute
            name must match a room declared under `house.rooms`. The
            reserved key `_default` defines the baseline applied to every
            room that does not override a given event; each concrete room
            inherits `_default` and may override any subset of the eight
            button events.
          '';
          example = {
            kitchen = {
              on_press_release = {
                enable = true;
                description = "Turn on kitchen lights and fan";
                extra_actions = [
                  {
                    type = "mqtt";
                    topic = "zigbee2mqtt/Fläkt/set";
                    message = ''{"state":"ON"}'';
                  }
                ];
              };
              off_press_release = {
                enable = true;
                description = "Turn off kitchen lights only";
              };
            };
            _default = {
              on_press_release = {
                enable = true;
                description = "Default: turn on room lights";
              };
              on_hold_release = {
                enable = true;
                description = "Default: turn on all lights at maximum brightness";
              };
              up_press_release = {
                enable = true;
                description = "Default: dim up room lights";
              };
              up_hold_release = {
                enable = true;
                description = "Default: no default actions";
              };
              down_press_release = {
                enable = true;
                description = "Default: dim down room lights";
              };
              down_hold_release = {
                enable = true;
                description = "Default: no default actions";
              };
              off_press_release = {
                enable = true;
                description = "Default: turn off room lights";
              };
              off_hold_release = {
                enable = true;
                description = "Default: turn off all lights";
              };
            };
          };
        };

        room_actions = mkOption {
          type = types.attrsOf (types.attrsOf (types.listOf Types.automationActionType));
          default = {};
          description = ''
            Room-scoped automation hooks fired by internal zigduck
            events. Outer key is the room name (must match a room under
            `house.rooms`); inner key is the event name emitted by the
            room event bus (e.g. `motion_detected`, `motion_not_detected`,
            `door_opened`, `door_closed`, `lights_turned_on`); the value
            is an ordered action list. String entries are shorthand for
            `{ type = "shell"; command = <string>; }`.
          '';
          example = {
            hallway = {
              door_opened = [
                { type = "shell"; command = "zigduck-cli --notify '🚪 DOOR OPEN!'"; }
                { type = "shell"; command = "curl http://192.168.1.15/api/settings/speaker/play/ding"; }
              ];
              door_closed = [];
            };
            kitchen = {
              motion_detected = [
                { type = "scene"; scene = "kitchenInstant"; }
              ];
              motion_not_detected = [
                { type = "scene"; scene = "kitchenFadeOff"; }
              ];
            };
          };
        };

        global_actions = mkOption {
          type = types.attrsOf (types.listOf Types.automationActionType);
          default = {};
          description = ''
            Global automation hooks fired by internal zigduck events that
            are not scoped to a room. Key is the event name (e.g.
            `leak_detected`, `smoke_detected`, `all_lights_on`,
            `security_armed`); value is an ordered action list. String
            entries are shorthand for
            `{ type = "shell"; command = <string>; }`.
          '';
          example = {
            leak_detected = [
              { type = "mqtt"; topic = "zigduck/effects/flash"; message = " "; }
              { type = "scene"; scene = "max"; }
              { type = "shell"; command = "zigduck-cli --notify '💧 WATER LEAK DETECTED!'"; }
            ];
            smoke_detected = [
              { type = "mqtt"; topic = "zigduck/effects/flash"; message = " "; }
              { type = "scene"; scene = "max"; }
              { type = "shell"; command = "zigduck-cli --notify '🔥 FIRE/SMOKE DETECTED!' --tag critical"; }
            ];
          };
        };
      };
    };
    default = {};
    description = ''
      Modular automations for zigduck. Each submodule groups a family of
      related event sources:

        mqtt_triggered -> fires when an MQTT topic publishes a matching
                          payload
        time_based     -> fires on a cron expression or structured
                          schedule
        presence_based -> fires after motion has been absent for a
                          configured duration
        greeting       -> fires when the entry door opens after the house
                          has been empty
        dimmer_actions -> per-room overrides for dimmer button events
        room_actions   -> hooks for internal zigduck room events
        global_actions -> hooks for internal zigduck global events

      All submodules share the action DSL defined by
      `Types.automationActionType`, so any action can be used in any
      submodule. Conditions are not shared: `mqtt_triggered` and
      `time_based` accept `dark_time | someone_home | room_occupied`,
      while `presence_based` accepts `dark_time | room_occupied |
      lights_on`.
    '';

  };}
