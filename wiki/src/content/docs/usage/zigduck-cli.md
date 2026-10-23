---
title: zigduck-cli
description: Control devices, rooms, scenes, timers, alarms and snapshots from the command line.
---

`zigduck-cli` gives you full control of your house from the terminal. Install it with
`services.zigduck.cli.enable = true`. Run `zigduck-cli --help` any time for the same reference.

## Examples

```sh
zigduck-cli --scene myScene
zigduck-cli --scene myScene --room kitchen
zigduck-cli --blinds up
zigduck-cli --device myLight --state on --brightness 90 --color red --transition 5
zigduck-cli timer set --minutes 15 --seconds 30
zigduck-cli alarm add --hours 07 --minutes 0
zigduck-cli --publish --topic "zigduck/Fläkt/set" --payload '{"countdown": 0}'
zigduck-cli snapshot create my_test
zigduck-cli snapshot restore my_test
```

## Common tasks

| Task | Command |
| --- | --- |
| List devices, rooms, scenes, lights or sensors | `zigduck-cli --list rooms` |
| Show a status table with state, battery and temperature | `zigduck-cli --status` |
| Pair new devices for 2 minutes and watch them join | `zigduck-cli --pair 120 --watch` |
| Turn every light on or off | `zigduck-cli --all-lights false` |
| Get the temperature in a room | `zigduck-cli --get-temp --room kitchen` |
| Get a device's battery level | `zigduck-cli --get-bat --device "Motion Sensor Hall"` |
| Send a notification | `zigduck-cli --notify "Laundry done" --tag laundry` |

## Full help

```text
Usage: zigduck-cli [OPTIONS] [COMMAND]

Commands:
  timer
  alarm
  snapshot
  help      Print this message or the help of the given subcommand(s)

Options:
  -b, --broker <BROKER>
          MQTT broker host [env: MQTT_BROKER=] [default: 127.0.0.1]
  -u, --user <USER>
          MQTT username [env: MQTT_USER=] [default: mqtt]
      --password-file <PASSWORD_FILE>
          MQTT password file [env: MQTT_PASSWORD_FILE=]
      --password <PASSWORD>
          MQTT password [env: MQTT_PASSWORD=]
  -v, --verbose...
          Verbosity level
      --devices-config <DEVICES_CONFIG>
          Path to devices configuration [env: DEVICES_CONFIG=]
      --scenes-config <SCENES_CONFIG>
          Path to scenes configuration [env: SCENES_CONFIG=]
      --hue-bridge-ip <HUE_BRIDGE_IP>
          Hue Bridge IP [env: HUE_BRIDGE_IP=]
      --hue-api-key <HUE_API_KEY>
          Hue Bridge API key [env: HUE_API_KEY=]
      --hue-key-file <HUE_KEY_FILE>
          Hue Bridge API key file [env: HUE_KEY_FILE=]
      --device <DEVICE>
          Device name (friendly name)
      --room <ROOM>
          Room name
      --scene <SCENE>
          Scene name
      --list [<LIST>]
          List devices, rooms, scenes, lights, or sensors [possible values: devices, rooms, scenes, lights, sensors]
      --status
          Show a formatted device status table including state, battery, temperature
      --state-json
          Dump full state.json (all devices) as JSON
      --get-temp [<GET_TEMP>]
          Get temperature readings from devices in a room (requires --room)
      --get-bat [<GET_BAT>]
          Get battery level for a device (requires --device)
      --notify <NOTIFY>
          Send a notification to the API (message text)
      --tag <TAG>
          Optional tag; a new notification with the same tag replaces the old one
      --get-notify
          Get all notifications as JSON
      --clear-notify
          Clear all notifications
      --cards
          Get all cards (with resolved value, details, history) as JSON
      --state-file <STATE_FILE>
          Path to local state.json (overrides API fetch) [env: ZIGDUCK_STATE_FILE=]
      --pair [<PAIR>]
          Pairing duration in seconds (default: 120)
      --all-lights [<ALL_LIGHTS>]
          Control all lights (optional true/false)
      --blinds <BLINDS>
          Control all blinds globally (up or down)
      --cheap-mode <CHEAP_MODE>
          Room name for cheap mode
      --publish
          Publish a raw MQTT message
      --topic <TOPIC>
          MQTT topic (used with --publish)
      --json-cmd
          Send raw JSON to a device
      --state <STATE>
          Device state: on/off/toggle/max/dark
      --brightness <BRIGHTNESS>
          Brightness percentage (1-100)
      --color <COLOR>
          Color name or hex code
      --temperature <TEMPERATURE>
          Color temperature (153-500)
      --transition <TRANSITION>
          Transition time in seconds
      --payload <PAYLOAD>
          Raw JSON payload (used with --json-cmd or --publish)
      --backend <BACKEND>
          Backend type (auto/zigbee/hue) [default: auto] [possible values: auto, zigbee, hue]
      --json-output
          Output list as JSON
      --watch
          Watch for new devices during pairing
      --random
          Pick a random scene
      --scene-room <SCENE_ROOM>
          Restrict scene to a specific room
      --delay <DELAY>
          Delay in seconds for cheap mode [default: 300]
      --api-url <API_URL>
          zigduck API URL [env: API_URL=]
      --api-password-file <API_PASSWORD_FILE>
          File containing API password [env: API_PASSWORD_FILE=]
      --api-password <API_PASSWORD>
          API password directly [env: API_PASSWORD=]
  -h, --help
          Print help (see more with '--help')
```
