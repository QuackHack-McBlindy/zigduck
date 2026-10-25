---
title: REST API
description: HTTP endpoints for state, devices, scenes, timers, alarms, notifications, media and playlists.
---

The zigduck service serves a REST API that the dashboard, the GNOME extension and `zigduck-cli` all
use. Most endpoints answer on both `/path` and `/api/path`. `GET /` lists every endpoint.

Set the API password with `services.zigduck.dashboard.passwordFile`.

## State

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/state` | GET | Full state of all Zigbee devices | None |
| `/state/{device}` | GET | State of one device | `{device}` friendly name |
| `/state/room/{room}` | GET | State of every device in a room | `{room}` |

## Devices and scenes

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/device/list` | GET | List all devices from `devices.json` | None |
| `/device/rooms` | GET | Devices grouped by room | None |
| `/device/types` | GET | Devices grouped by type | None |
| `/device/{device}/{command}/{value}...` | POST | Control a device. Chain several command and value pairs. | `{device}` name, then pairs like `state/on`, `brightness/200`, `color/%23FF5733`, `temperature/300` |
| `/scene/{scene}` | POST | Activate a scene | `{scene}` name |

## Dashboard cards

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/cards` | GET | All status cards with their resolved value, details and history | None |
| `/cards/{id}` | GET | One status card | `{id}` card name |

## Timers

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/timers` | GET | List all timers | None |
| `/timers/set` | POST | Create a timer | `hours`, `minutes`, `seconds` (at least one above 0), `topic`, `payload`, optional `name` |
| `/timers/pause` | POST | Pause a running timer | `id` |
| `/timers/resume` | POST | Resume a paused timer | `id` |
| `/timers/cancel` | POST | Cancel and delete a timer | `id` |

## Alarms

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/alarms` | GET | List all alarms | None |
| `/alarms/add` | POST | Add an alarm | `hours` (0 to 23), `minutes` (0 to 59), `name`, optional `days` (comma-separated, 0 is Sunday through 6 is Saturday) |
| `/alarms/remove` | POST | Remove an alarm | `id` |
| `/alarms/toggle` | POST | Turn an alarm on or off | `id` |

## Notifications

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/notify` | POST | Add or update a notification | `message` as a query parameter or the raw POST body, optional `tag`. A notification with the same tag replaces the old one. |
| `/get-notify` | GET | All notifications as JSON | None |
| `/clear-notify` | POST | Clear all notifications | None |

## Media (ADB)

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/media/power/on` | POST | Wake the media device | `device` (IP) |
| `/media/power/off` | POST | Put the media device to sleep | `device` |
| `/media/next` | POST | Next track | `device` |
| `/media/previous` | POST | Previous track | `device` |
| `/media/play`, `/media/pause` | POST | Toggle play and pause | `device` |
| `/media/volume/up` | POST | Volume up | `device` |
| `/media/volume/down` | POST | Volume down | `device` |
| `/media/playlist` | POST | Launch a playlist on the device with an ADB intent | `device`, optional `url` (defaults to the web server's `/playlist.m3u`) |

## Media library and playlist

| Endpoint | Method | Description | Parameters |
| --- | --- | --- | --- |
| `/browse` | GET | Browse the media folder with `ls` | `path`, relative to the media root |
| `/browsev2` | GET | Browse the media folder with `find`, returning full paths | `path`, relative to the media root |
| `/playlist/list` | GET | List the current m3u playlist | None |
| `/playlist/add` | POST | Add an entry | `entry` (path) |
| `/playlist/remove` | POST | Remove an entry by index, starting at 0 | `index` |
| `/playlist/shuffle` | POST | Shuffle the playlist | None |
| `/playlist/clear` | POST | Clear the playlist | None |
