# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added CI workflow.
- `tv-scraper` python package that scrapes Nix defined TV-channel URLs.
- The `zigduck-cli` package now supports `--version`.

### Changed

- Changed the dashboard favicons and webmanifest.

### Fixed

- Fixed the critical issue with Rust code missing.

### Removed


## [0.2.3] - 10-10-2026

### Added
- If `house.media.root` is defined an extra media tab is added to the dashboard.

### Changed
- Alarms are now removed and toggled using time instead of id.
- To avoid mixed content issues, the dashboard is now communicating entirely via API calls instead of MQTT.

### Fixed


### Removed
- MQTT dashboard client script and connection logic.


## [0.2.2] - 08-30-2026

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
