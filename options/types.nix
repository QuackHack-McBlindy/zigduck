{
  lib,
  ...
}: let
  inherit (lib) types mkOption mkEnableOption mkMerge;

  roomType = types.submodule {
    options = {
      icon = mkOption {
        type = types.str;
        default = "mdi:toilet";
        description = ''
          Material Design Icons (MDI) identifier rendered by the
          dashboard for this room. Must include the `mdi:` prefix.
          Catalogue: https://pictogrammers.com/library/mdi/
        '';
        example = "mdi:food-fork-drink";
      };
      aliases = mkOption {
        type        = types.nullOr (types.listOf types.str);
        default     = null;
        description = "Alternative names for this room.";
        example     = [ "sovrum" "sovrummet" "bedroom" ];
      };
      entertainment = mkOption {
        type = types.bool;
        default = false;
        description = ''
          Marks this room as a Philips Hue Play HDMI Sync Box
          entertainment area. Rooms with this flag enabled are
          eligible for Hue-synced lighting (see
          `house.zigbee.hueSyncBox`).
        '';
        example = true;
      };
    };
  };

  automationActionType = types.oneOf [
    (types.str)
    (types.submodule {
      options = {
        type = mkOption {
          type = types.enum ["mqtt" "shell" "scene" "wait" "snapshot" "restore"];
          default = "shell";
          description = ''
            Discriminator selecting how this action is executed.
            Each value consumes a different subset of the other
            options; irrelevant fields are ignored.

              shell    > `command`
              mqtt     > `topic`, `message`
              scene    > `scene`
              wait     > `duration`
              snapshot > `snapshot_name`, `scope`, `room`, `devices`
              restore  > `snapshot_name`

            Defaults to `shell`, the most common action type.
            A plain string may be supplied in place of a full
            attribute set as shorthand for
            `{ type = "shell"; command = <string>; }`.
          '';
          example = "mqtt";
        };
        command = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            Shell command executed when `type = "shell"`. Runs
            under the zigduck daemon's environment, so `zigduck-cli`,
            `jq`, `curl`, `yo`, etc. are all available.
          '';
          example = "zigduck-cli --notify 'Door opened'";
        };
        topic = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            MQTT topic to publish to when `type = "mqtt"`. Must be
            fully qualified with the configured `baseTopic`
            (default: `zigduck/`).
          '';
          example = "zigduck/effects/flash";
        };
        message = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            MQTT payload to publish when `type = "mqtt"`. Prefer
            JSON-encoded device commands, e.g. `{"state":"ON"}` for
            switches and outlets.
          '';
          example = ''{"state":"ON"}'';
        };
        scene = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            Name of a scene defined under `house.zigbee.scenes` to
            activate when `type = "scene"`.
          '';
          example = "kitchenFadeOff";
        };
        duration = mkOption {
          type = types.nullOr types.int;
          default = null;
          description = ''
            Seconds to wait before continuing when `type = "wait"`.
          '';
          example = 5;
        };
        snapshot_name = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            Identifier used to store and later recall a snapshot of
            device states. Required for `type = "snapshot"` and
            `type = "restore"`; defaults to `"default"` if omitted.
          '';
          example = "before_timer";
        };
        scope = mkOption {
          type = types.nullOr (types.enum ["global" "room" "devices"]);
          default = null;
          description = ''
            What to capture in the snapshot (only for `type = "snapshot"`):

              global  > every device known to the daemon
              room    > devices in a single room (requires `room`)
              devices > an explicit list (requires `devices`)

            Defaults to `global` when omitted.
          '';
          example = "room";
        };
        room = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = ''
            Room whose devices should be captured when
            `scope = "room"`. Matches against
            `house.zigbee.devices.*.room`.
          '';
          example = "bedroom";
        };
        devices = mkOption {
          type = types.nullOr (types.listOf types.str);
          default = null;
          description = ''
            Friendly names of the devices to capture when
            `scope = "devices"`. Must match `friendly_name` entries
            under `house.zigbee.devices`.
          '';
          example = [ "PC" "Taket Sovrum 1" ];
        };
      };
    })
  ];

  dimmerActionType = types.submodule {
    options = {
      enable = mkEnableOption "Enable this dimmer action";
      description = mkOption {
        type = types.str;
        description = ''
          Human-readable description of what this handler does.
          Shown in generated documentation.
        '';
        example = "Turn off the kitchen fan on hold-release";
      };
      extra_actions = mkOption {
        type = types.listOf automationActionType;
        default = [];
        description = ''
          Actions appended after the dimmer's default behaviour.
          Use this to add side effects (e.g. switch a fan on)
          without replacing the built-in dimming logic.
        '';
        example = [
          { type = "mqtt"; topic = "zigduck/Fläkt/set"; message = ''{"state":"ON"}''; }
        ];
      };
      override_actions = mkOption {
        type = types.listOf automationActionType;
        default = [];
        description = ''
          If non-empty, replaces the default dimmer behaviour
          entirely with these actions. Use this to repurpose a
          button (e.g. hold "off" to run a scene instead of merely
          dimming).
        '';
        example = [
          { type = "scene"; scene = "dark"; }
        ];
      };
    };
  };

  statusCardType = with lib.types; submodule {
    options = {
      enable = mkEnableOption "this status card";

      title = mkOption {
        type = str;
        description = ''
          Text shown as the card's heading. Unicode and emoji are
          supported (e.g. `𝑿𝑴𝑹`, `𝑩𝑻𝑪`).
        '';
        example = "𝑿𝑴𝑹";
      };

      icon = mkOption {
        type = str;
        description = ''
          Font Awesome class rendered in the card header. Any free
          or pro icon class works. See https://fontawesome.com/search
        '';
        example = "fab fa-monero";
      };

      color = mkOption {
        type = str;
        default = "#2ecc71";
        description = "Accent colour (hex or CSS colour) used for the card.";
        example = "#a78bfa";
      };

      theme = mkOption {
        type = str;
        default = "neon";
        description = ''
          Visual theme applied to the card. One of:
          `neon`, `minimal`, `dark`, `glass`, `colorful`.
        '';
        example = "glass";
      };

      group = mkOption {
        type = str;
        default = "default";
        description = ''
          Group name controlling the card's placement on the
          dashboard. Cards sharing the same group are rendered
          together, ordered alphabetically by group name.
        '';
        example = "sensors";
      };

      source = mkOption {
        type = enum [ "file" ];
        default = "file";
        description = ''
          Where the card pulls its value from. Currently only
          `file` is supported: a JSON file written by an
          MQTT-triggered automation.
        '';
        example = "file";
      };

      filePath = mkOption {
        type = str;
        default = "";
        description = ''
          Absolute path to the JSON file the card reads when
          `source = "file"`. Typically under `/var/lib/zigduck/`.
        '';
        example = "/var/lib/zigduck/xmr.json";
      };

      jsonField = mkOption {
        type = str;
        default = "";
        description = ''
          Key in the JSON file whose value is substituted into
          `format` (as `{value}`) to produce the card's main value.
        '';
        example = "current_price";
      };

      detailsJsonField = mkOption {
        type = nullOr str;
        default = null;
        description = ''
          Optional key in the JSON file whose value is substituted
          into `detailsFormat`. When null, the static `details`
          string is shown instead (legacy behaviour).
        '';
        example = "7d_change";
      };

      format = mkOption {
        type = str;
        default = "{value}";
        description = ''
          Format string for the main value. `{value}` is replaced
          with the value of `jsonField`.
        '';
        example = "{value} SEK/kWh";
      };

      detailsFormat = mkOption {
        type = str;
        default = "{value}";
        description = ''
          Format string for the details line. `{value}` is replaced
          with the value of `detailsJsonField`.
        '';
        example = "7d: {value}%";
      };

      chart = mkOption {
        type = bool;
        default = false;
        description = ''
          Render a sparkline history chart on the card. Requires
          the JSON file to contain a history array (see
          `historyField`).
        '';
      };

      historyField = mkOption {
        type = str;
        default = "history";
        description = ''
          Key in the JSON file holding the array of past values
          plotted when `chart = true`.
        '';
        example = "history";
      };

      on_click_action = mkOption {
        type = listOf automationActionType;
        default = [];
        description = ''
          Actions to run when the card is clicked. Uses the same
          action DSL as automations.
        '';
        example = [
          { type = "shell"; command = "yo say 'hello from the dashboard'"; }
        ];
      };

      defaultValue = mkOption {
        type = str;
        default = "";
        description = ''
          Text shown in place of the main value when the card
          cannot be loaded (missing file, unparsable JSON, absent
          field).
        '';
        example = "—";
      };

      defaultDetails = mkOption {
        type = str;
        default = "";
        description = ''
          Text shown in place of the details line when the card
          cannot be loaded.
        '';
        example = "unavailable";
      };

      details = mkOption {
        type = str;
        default = "";
        description = ''
          Static details text used when `detailsJsonField` is null.
          Prefer `detailsJsonField` + `detailsFormat` for dynamic
          values; this option is kept for backwards compatibility.
        '';
        example = "Temperature in Hallway";
      };
    };
  };

  scraperType = types.submodule {
    options = {
      row_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath selecting each programme row.
          Scraper default: `//table[@id="channel-schedule"]//tr`.
        '';
        example = "//div[contains(@class,'programme-row')]";
      };

      time_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the element containing
          the start time.
          Scraper default: `.//time`.
        '';
        example = ".//span[@class='airtime']";
      };

      time_attr = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Attribute of the time element to read. Set to `""` to
          always use the element's text content.
          Scraper default: `"datetime"`.
        '';
        example = "data-start";
      };

      title_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the title element.
          Scraper default: `.//a[contains(@class, "program-title")]`.
        '';
        example = ".//h3";
      };

      desc_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the description element.
          Set to `""` to disable descriptions.
          Scraper default: `.//p`.
        '';
        example = ".//div[@class='synopsis']";
      };

      time_formats = mkOption {
        type = types.nullOr (types.listOf types.str);
        default = null;
        description = ''
          strptime formats tried in order, after ISO 8601 is
          attempted.
          Scraper default: `[ "%H:%M" "%H.%M" ]`.
        '';
        example = [ "%I:%M %p" "%I:%M%p" "%H:%M" ];
      };

      time_strip_pattern = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Regex applied to the raw time string before strptime.
          Set to `""` to disable stripping — required when the
          format keeps a literal AM/PM marker.
          Scraper default: `"[^\\d:\\.]"`.
        '';
        example = "[^\\d:\\.APM ]";
      };

      default_duration_minutes = mkOption {
        type = types.nullOr types.ints.positive;
        default = null;
        description = ''
          Fallback duration when the next entry's start time can't
          be parsed.
          Scraper default: `30`.
        '';
        example = 45;
      };

      timezone_offset_hours = mkOption {
        type = types.nullOr types.number;
        default = null;
        description = ''
          Fixed offset applied to every parsed time, in hours. May
          be fractional (e.g. `5.5`). `null` = use the scraper's
          built-in global `TIME_OFFSET`.
        '';
        example = 2;
      };

      pm_heuristic_after_hour = mkOption {
        type = types.nullOr (types.ints.between 0 23);
        default = null;
        description = ''
          Only relevant for 12-hour formats that lack an explicit
          AM/PM marker. Once the previous programme reached or
          passed this hour, later ambiguous AM hours are promoted
          to PM. `null` disables the heuristic.
        '';
        example = 12;
      };
    };
  };

  scraperToJson = s: lib.filterAttrs (_: v: v != null) s;

in {
  inherit automationActionType dimmerActionType roomType statusCardType scraperType scraperToJson;
}
