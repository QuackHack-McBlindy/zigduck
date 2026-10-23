---
title: Voice
description: Voice and natural language control through the companion flake yo.
---

Voice and natural language control comes from the companion flake
[yo](https://github.com/QuackHack-McBlindy/yo). See its repository for installation.

Once yo is set up, copy the [`modules/voice`](https://github.com/quackhack-mcblindy/zigduck/tree/main/modules/voice)
folder from this repository into your NixOS configuration. It adds voice commands for your
devices, rooms, media, timers and alarms.

:::note
For ESP32-S3 based yo clients, see the [yo-esp](https://github.com/QuackHack-McBlindy/yo-esp)
library.
:::

To write your own voice commands, follow the instructions in the
[yo repository](https://github.com/QuackHack-McBlindy/yo).

yo also works inside automations: a string action such as `"yo do 'turn on all lights'"` runs a
natural language command. See [Automations](../automations/#actions).
