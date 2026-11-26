---
title: Automations
description: Time based, MQTT triggered, state change, room, global, dimmer, presence and greeting automations, and the action types they run.
---

Automations are optional. Smart defaults already cover lights, dimmers and motion, so reach for these
when you want something extra. They all live under `house.zigbee.automations`.

| Automation | Fires when |
| --- | --- |
| [`time_based`](#time-based) | A cron expression or a structured schedule matches |
| [`mqtt_triggered`](#mqtt-triggered) | A message arrives on an MQTT topic |
| [`state_changed`](#state-changed) | A device property changes (optionally `from` → `to`) |
| [`room_actions`](#room-actions) | A room event happens, such as motion or a door opening |
| [`global_actions`](#global-actions) | A house-wide event happens, such as a leak or smoke alarm |
| [`dimmer_actions`](#dimmer-actions) | A dimmer button is pressed or held in a given room |
| [`presence_based`](#presence-based) | Motion sensors have seen nothing for a set time |
| [`greeting`](#greeting) | A door opens after the house has been empty |

## Actions

Every automation runs a list of actions in order. There are seven action types, plus a string
shorthand.

| Action | Example |
| --- | --- |
| `shell` | `{ type = "shell"; command = "notify 'hello'"; }` |
| `scene` | `{ type = "scene"; scene = "max"; }` |
| `mqtt` | `{ type = "mqtt"; topic = "zigbee2mqtt/Roller Shade/set"; message = ''{"state":"ON"}''; }` |
| `device` | `{ type = "device"; device = "Kitchen Light"; operation = "on"; }` |
| `wait` | `{ type = "wait"; duration = 10; }` (seconds) |
| `snapshot` | `{ type = "snapshot"; snapshot_name = "before_alarm"; }` |
| `restore` | `{ type = "restore"; snapshot_name = "before_alarm"; }` |
| string | `"curl http://192.168.1.15/api/settings/speaker/play/ding"`, short for a `shell` action |

A snapshot saves the current light states so a later `restore` can put them back. If you use
[yo](https://github.com/QuackHack-McBlindy/yo), a string action like `"yo do 'turn on all lights'"`
lets you write simple automations in natural language.

### The `device` action

`device` targets a device by its friendly name and asks the daemon to act on it, without you
having to remember the MQTT topic or whether the device is a Hue light or a zigbee2mqtt one.

| Field | Required for | Notes |
| --- | --- | --- |
| `device` | always | Friendly name from `house.zigbee.devices` (case-insensitive) |
| `operation` | always | `on`, `off`, `toggle`, `open`, `close`, `set`, `read` |
| `property` | `set`, `read` | e.g. `state`, `brightness`, `position`, `temperature` |
| `value` | `set` | number, string, boolean or structured value |

```nix
# turn the light on and set brightness in one go
{ type = "device"; device = "Kitchen Light"; operation = "on"; }
{ type = "device"; device = "Kitchen Light"; operation = "set";
  property = "brightness"; value = 128; }

# toggle a blind — flips position between fully up and fully down
{ type = "device"; device = "Bedroom Blind"; operation = "toggle"; }

# read a value — logs the current value without changing anything
{ type = "device"; device = "Kitchen Light";
  operation = "read"; property = "brightness"; }
```

`read` prints a `📖 device read: <name>.<prop> = <value>` line to the daemon log and does
not publish anything.

## Time based

Runs on a schedule. `schedule` takes either a 5-field cron string such as `"0 22 * * *"` or a
structured `{ start; end; days; }` window.

```nix
house.zigbee.automations.time_based = {
  morning_wakeup = {
    enable = true;
    description = "set morning wakeup alarm";
    schedule = {
      start = "01:00";
      days = [ "mon" "tue" "wed" "thu" "fri" ];
    };
    actions = [ "zigduck-cli alarm add --hours 11 --minutes 00" ];
  };
};
```

## MQTT triggered

Runs when a topic receives a message. Set `message` to fire only on an exact payload, and add
`conditions` to gate it further. The topic must include the `zigbee2mqtt/` prefix.

```nix
house.zigbee.automations.mqtt_triggered = {
  alarm_wakeup = {
    enable = true;
    description = "Time to wake up!";
    topic = "zigbee2mqtt/alarm/triggered";
    actions = [
      { type = "shell"; command = "tv --typ youtube --search 'nisse snus'"; }
      { type = "snapshot"; snapshot_name = "before_alarm"; }
      { type = "scene"; scene = "max"; }
      { type = "device"; device = "Robot Arm 3"; operation = "off"; }
      { type = "device"; device = "Robot Arm 4"; operation = "off"; }
      { type = "wait"; duration = 10; }
      { type = "scene"; scene = "dark-fast"; }
      { type = "wait"; duration = 2; }
      { type = "shell"; command = "curl http://192.168.1.13/api/settings/speaker/play/ding"; }
      "yo do 'turn on all lights'"
      { type = "wait"; duration = 2; }
      { type = "shell"; command = "curl http://192.168.1.15/api/settings/speaker/play/ding"; }
      { type = "wait"; duration = 10; }
      { type = "mqtt"; topic = "zigbee2mqtt/Roller Shade/set"; message = ''{"state":"ON"}''; }
      { type = "restore"; snapshot_name = "before_alarm"; }
    ];
  };

  timer_finish = {
    enable = true;
    description = "a timer is ringing";
    topic = "zigbee2mqtt/timer/finished";
    actions = [
      { type = "scene"; scene = "max"; }
      { type = "shell"; command = "curl http://192.168.1.15/api/settings/speaker/play/ding"; }
      { type = "wait"; duration = 7; }
      { type = "scene"; scene = "dark-fast"; }
      { type = "wait"; duration = 2; }
      { type = "scene"; scene = "max"; }
    ];
  };
};
```

Inside a `shell` action the incoming payload is available as `$MQTT_PAYLOAD`. The
[dashboard page](../dashboard/) has an example that writes it to a file.

## State changed

Runs when a device property changes. Set `from` and/or `to` to narrow the trigger; either
may be omitted.

```nix
house.zigbee.automations.state_changed = {
  kitchen_fan_logs_light = {
    enable = true;
    description = "When the kitchen fan turns ON, log it and turn on the light";
    device   = "Kitchen Fan";   # friendly name, case-sensitive
    property = "state";          # state, brightness, temperature, occupancy, power, …
    from     = "OFF";            # optional
    to       = "ON";             # optional
    actions = [
      "echo 'fan is now ON' >> /tmp/zigduck-test.log"
      { type = "device"; device = "Kitchen Light"; operation = "on"; }
    ];
  };

  bedroom_temperature_changed = {
    enable = true;
    description = "React whenever bedroom temperature changes";
    device   = "Bedroom Sensor";
    property = "temperature";
    # no from / to — fires on every change
    actions = [
      { type = "shell"; command = "echo 'Bedroom temperature changed'"; }
    ];
  };
};
```

Field reference:

| Field | Type | Notes |
| --- | --- | --- |
| `enable` | bool | Defaults to `false` |
| `description` | string | Shown in the daemon log |
| `device` | string | Friendly name from `house.zigbee.devices` |
| `property` | string | Name of the state field, e.g. `state`, `brightness`, `temperature`, `occupancy`, `power`, `contact` |
| `from` | anything (optional) | Previous value. Strings, numbers and booleans all compare correctly; numbers use a `1e-9` epsilon so `21.5` matches `"21.50"` |
| `to` | anything (optional) | New value. Same comparison rules |
| `actions` | list of actions | Executed in order |

Notes:

- The automation fires on the **first** observation of a property too, unless you set `from`.
  If you want it to fire *only* on real transitions, provide `from`.
- `last_updated` and `last_seen` are excluded: they are rewritten on every message and would
  self-trigger.

## Room actions

Hooks into room events. The outer key is a room from `house.rooms`. Events include
`motion_detected`, `motion_not_detected`, `door_opened` and `door_closed`.

```nix
house.zigbee.automations.room_actions = {
  hallway = {
    door_opened = [ "curl http://192.168.1.15/api/settings/speaker/play/ding" ];
    door_closed = [];
  };

  kitchen = {
    motion_not_detected = [
      {
        type = "shell";
        command = ''
          power=$(jq -r '."Fläkt".power' /var/lib/zigduck/state.json)
          # if the kitchen fan is drawing power, turn it off after 2 minutes
          if (( power > 20 )); then
            zigduck-cli --publish --topic "zigduck/Fläkt/set" --payload '{"countdown": 120}'
          fi
        '';
      }
      # slowly turn off the kitchen lights
      { type = "scene"; scene = "kitchenFadeOff"; }
    ];

    motion_detected = [
      { type = "scene"; scene = "kitchenInstant"; }
      {
        type = "shell";
        command = ''
          # cancel any pending countdown
          zigduck-cli --publish --topic "zigduck/Fläkt/set" --payload '{"countdown": 0}'
          # start the fan if it's off
          STATE=$(jq -r '."Fläkt".state' /var/lib/zigduck/state.json)
          if [ "$STATE" = "OFF" ]; then
            zigduck-cli --device "Fläkt" --state on
          fi
        '';
      }
    ];
  };
};
```

## Global actions

Hooks into house-wide events such as `leak_detected`, `smoke_detected`, `all_lights_on` and
`security_armed`.

```nix
house.zigbee.automations.global_actions = {
  leak_detected  = [ "notify '🚨 WATER LEAK DETECTED!'" ];
  smoke_detected = [ "notify '🔥 SMOKE DETECTED!'" ];
};
```

## Dimmer actions

Changes what a dimmer button does in one room. Each event can either add `extra_actions` to the
default behavior or replace it with `override_actions`. The key `_default` sets the baseline for
every room. The [default behavior](../dimmers-and-motion/#default-dimmer-actions) is listed on the
dimmers page.

```nix
house.zigbee.automations.dimmer_actions = {
  bedroom = {
    off_hold_release = {
      enable = true;
      description = "Turn off all lights and the kitchen fan";
      extra_actions = [];
      override_actions = [
        { type = "scene"; scene = "dark"; }
        { type = "device"; device = "Fläkt"; operation = "off"; }
      ];
    };
  };
};
```

Events are `on_press_release`, `on_hold_release`, `up_press_release`, `up_hold_release`,
`down_press_release`, `down_hold_release`, `off_press_release` and `off_hold_release`.

## Presence based

Runs after a set of motion sensors have all seen nothing for `no_motion_duration` seconds, and can
run `motion_restored_actions` when motion comes back.

```nix
house.zigbee.automations.presence_based = {
  office_idle = {
    enable = true;
    description = "Dim the office when nobody is there";
    motion_sensors = [ "Motion Sensor Office" ];
    no_motion_duration = 600;
    actions = [ { type = "scene"; scene = "office-dim"; } ];
    motion_restored_actions = [ { type = "scene"; scene = "office-bright"; } ];
  };
};
```

## Greeting

A welcome-home automation. It runs when a door opens after the house has been empty for at least
`awayDuration` seconds.

```nix
house.zigbee.automations.greeting = {
  enable       = true;
  awayDuration = 7200;                  # only if nobody was home for 2 hours
  door         = "Door Sensor Hallway"; # when this door opens
  delay        = 10;                    # wait 10 seconds first
  actions = [
    { type = "shell"; command = "your TTS command here"; }
  ];
};
```

## Options

See [`house.zigbee.automations`](../../reference/options/automations/) for every field, including
`conditions`.
