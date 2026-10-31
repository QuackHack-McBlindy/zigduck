# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed


## [0.2.9] - 2026-10-31

### Added

- Zigduck now automatically tries to remember when Zigbee davices had it's batteries replaced.
- New option: `house.presence`, enable/disable home/away awareness, default: true. 
- New option: Per-room / per-device aliases.

### Changed

### Fixed

- Removed blocking `.await` calls on automation dispatcher, which caused issues when long-running processes was executed. 
- Moved `double_click_timeout_ms` in the `zigduck` Rust binary from top-level into `dimmerConfig`. 

### Removed

## [0.2.8] - 2026-10-25

### Added

- New Starlight wiki in `wiki/`, published to GitHub Pages by `.github/workflows/wiki.yml`. Guide pages are ported from the README and the option reference is generated from `hooks/options.json` and `hooks/service.json` on every build.
- New option: `house.devices.<name>.state.refresh`, configure the state refresh-rate for a device that's fetched into `state.json`. 
- `zigduck` now tracks defined TV's power state in `state.json`.

### Changed

- `house.devices.<name>.stateEndpoint` > `house.devices.<name>.state.endpoint`.

### Fixed

- Improved retry logic in `tv` binary.

### Removed

## [0.2.7] - 2026-10-23

### Added

- New auto generated Wiki page for documenting options.
- New option: `house.zigbee.mosquitto.whitelist`, where users may define an optional list of additional JSON fields to be included in `states.json`.
- New options for `house.devices`. Create control actions for any device and include in automations/control via Zigduck. These devices will also appear in the zigduck GNOME Shell extension/dashboard. 


### Changed

### Fixed

### Removed

## [0.2.6] - 2026-10-18

### Added

- New package: `gnomeExtension` a GNOME Shell extension to get a zigduck widget in the top bar.
- `zigduck-cli` new commands: `--notify`, `--get-notify`, `--clear-notify`, `--cards`.
- `zigduck-cli` new subcommand: `hue` - handles the Philips Hue Sync Box integration. 
- `zigduck-dashboard` new endpoints: `/api/notify`, `/api/get-notify`, `/api/clear-notify`, `/api/cards`, `/api/card/{id}`.
- New room boolean option `house.rooms.<room>.entertainment` for Philips Hue Sync integration.
- New Zigbee device type: `custom`.
- New option: `house.devices`, for generic read only devices. 

### Changed

- `tv-scraper`: Changed default path for --json-out to `~/.local/share/zigduck/epg.json`.  

### Fixed

### Removed

- Removed insecure Philips Hue options.
- `hue` script removed, no longer needed. Usage now handled with `zigduck-cli`.

## [0.2.5] - 2026-09-17

### Added

- Added alarm/timer control on the dashboard.
- Added options for tv scraping. Can be configured globally or per-channel.
- Added TV-guide voice script, user can search by channel or show.

### Changed

- Consolidated all packages to use the same version for simplicity.
- Duplicate alarms set for the same time is no longer allowed.

### Fixed

- `tv-scraper` package now uses the correct JSON configuration file.
- FIxed the timers API endpoints by properly prefixing with `/api/`.

### Removed

## [0.2.4] - 2026-09-14

### Added

- Added CI workflow.
- `tv-scraper` python package that scrapes Nix defined TV-channel URLs.
- The `zigduck-cli` package now supports `--version`.

### Changed

- Changed the dashboard favicons and webmanifest.

### Fixed

- Fixed the critical issue with Rust code missing.

### Removed

## [0.2.3] - 2026-09-10


### Added
- If `house.media.root` is defined an extra media tab is added to the dashboard.

### Changed
- Alarms are now removed and toggled using time instead of id.
- To avoid mixed content issues, the dashboard is now communicating entirely via API calls instead of MQTT.

### Fixed


### Removed
- MQTT dashboard client script and connection logic.


## [0.2.2] - 2026-08-30

### Added
- `house.https.dashboard.url` and `house.https.dashboard.urlFile` options for dashboard API URL.
- `house.https.media.url` and `house.https.media.urlFile` options for media library URL.
- `house.zigbee.motion.trigger.lights.transition` option to fade lights off over duration instead of waiting.
- `house.zigbee.automations.greeting.door` and `message` options for door sensor triggered greeting.
- `url_file` support in zigduck-cli API configuration for reading API URL from a file.

### Changed
- TV controller now uses `house.https.media.url` or `house.https.media.urlFile` for webserver URL.
- Zigduck periodic no-motion check interval is now based on `house.zigbee.no.motion.after`, with a minimum of 30 seconds.
- Default state for CLI device/room/all-lights commands is now `"on"` if `--state` is not provided.
- `tv` package version bumped to 0.1.3.
- Assertions updated to validate new HTTPS options and greeting door sensor.


### Fixed
- Greeting automation now triggers on door open event (requires door sensor) instead of global motion absence.

### Removed
