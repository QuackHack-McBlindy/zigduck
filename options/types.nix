{
  lib,
  ...
} : let
  inherit (lib) types mkOption mkEnableOption mkMerge;

  roomType = types.submodule {
    options = {
      icon = mkOption {
        type = types.str;
        description = "Material Design (mdi) icon representing the room.";
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
          description = "Type of automation action";
        };
        command = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "The shell command to execute (for shell type)";
        };
        topic = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "MQTT topic (for mqtt type)";
        };
        message = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "MQTT message (for mqtt type)";
        };
        scene = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "Scene name (for scene type)";
        };
        duration = mkOption {
          type = types.nullOr types.int;
          default = null;
          description = "Duration in seconds (for wait type)";
        };
        snapshot_name = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "Name of the snapshot (for snapshot/restore types). Defaults to 'default' if omitted.";
        };
        scope = mkOption {
          type = types.nullOr (types.enum ["global" "room" "devices"]);
          default = null;
          description = "Scope of the snapshot (only for snapshot type). Defaults to 'global'.";
        };
        room = mkOption {
          type = types.nullOr types.str;
          default = null;
          description = "Room name if scope is 'room' (only for snapshot type).";
        };
        devices = mkOption {
          type = types.nullOr (types.listOf types.str);
          default = null;
          description = "List of device friendly names if scope is 'devices' (only for snapshot type).";
        };
      };
    })
  ];


  dimmerActionType = types.submodule {
    options = {
      enable = mkEnableOption "Enable this dimmer action";
      description = mkOption {
        type = types.str;
        description = "Description of this action";
      };
      extra_actions = mkOption {
        type = types.listOf automationActionType;
        default = [];
        description = "Additional actions to perform when this dimmer action triggers";
      };
      override_actions = mkOption {
        type = types.listOf automationActionType;
        default = [];
        description = "If defined, replaces default behavior with these actions";
      };
    };
  };


  statusCardType = with lib.types; submodule {
    options = {
      enable = mkEnableOption "this status card";
      title = mkOption { type = str; };
      icon = mkOption { type = str; };
      color = mkOption { type = str; default = "#2ecc71"; };
      theme = lib.mkOption {
        type = lib.types.str;
        default = "neon";
        description = "Theme for this card (neon, minimal, dark, glass, colorful)";
      };
      group = mkOption {
        type = str;
        default = "default";
        example = "sensors";
        description = "Status cards are ordered by it's group name";
      };

      source = mkOption {
        type = enum [ "file" ];
        default = "file";
      };

      filePath = mkOption {
        type = str;
        default = "";
        description = "Path to JSON file for file source";
      };

      jsonField = mkOption {
        type = str;
        default = "";
        description = "JSON field to extract from file for main value";
      };
      detailsJsonField = mkOption {
        type = nullOr str;
        default = null;
        description = "JSON field to extract from file for details (optional)";
      };

      format = mkOption {
        type = str;
        default = "{value}";
        description = "Format string for main value. Use {value} placeholder";
      };
      detailsFormat = mkOption {
        type = str;
        default = "{value}";
        description = "Format string for details value. Use {value} placeholder";
      };
      chart = mkOption {
        type = bool;
        default = false;
        description = "Wether to show a history chart in the status card";
      };
      historyField = mkOption {
        type = str;
        default = "history";
        description = "JSON field to extract history data from for the chart";
      };


      on_click_action = mkOption {
        type = lib.types.listOf automationActionType;
        default = [];
        description = "Actions to perform when clicking this status card";
      };

      # fallback values
      defaultValue = mkOption { type = str; default = ""; };
      defaultDetails = mkOption { type = str; default = ""; };
      # legacy support - will be used if detailsJsonField is null
      details = mkOption {
        type = str;
        default = "";
        description = "Static details text (used if detailsJsonField is not set)";
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
          Scraper default: '//table[@id="channel-schedule"]//tr'.
        '';
        example = "//div[contains(@class,'programme-row')]";
      };

      time_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the element containing the
          start time. Scraper default: './/time'.
        '';
        example = ".//span[@class='airtime']";
      };

      time_attr = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Attribute of the time element to read. Set to "" to always use
          the element's text content. Scraper default: "datetime".
        '';
        example = "data-start";
      };

      title_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the title element.
          Scraper default: './/a[contains(@class, "program-title")]'.
        '';
        example = ".//h3";
      };

      desc_xpath = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          XPath relative to a row, locating the description element.
          Set to "" to disable descriptions.
          Scraper default: './/p'.
        '';
        example = ".//div[@class='synopsis']";
      };

      time_formats = mkOption {
        type = types.nullOr (types.listOf types.str);
        default = null;
        description = ''
          strptime formats tried in order, after ISO 8601 is attempted.
          Scraper default: [ "%H:%M" "%H.%M" ].
        '';
        example = [ "%I:%M %p" "%I:%M%p" "%H:%M" ];
      };

      time_strip_pattern = mkOption {
        type = types.nullOr types.str;
        default = null;
        description = ''
          Regex applied to the raw time string before strptime. Set to ""
          to disable stripping — required when the format keeps a literal
          AM/PM marker. Scraper default: "[^\\d:\\.]".
        '';
        example = "[^\\d:\\.APM ]";
      };

      default_duration_minutes = mkOption {
        type = types.nullOr types.ints.positive;
        default = null;
        description = ''
          Fallback duration when the next entry's start time can't be
          parsed. Scraper default: 30.
        '';
      };

      timezone_offset_hours = mkOption {
        type = types.nullOr types.number;
        default = null;
        description = ''
          Fixed offset applied to every parsed time, in hours. May be fractional
          (e.g. 5.5). null = use the scraper's built-in global TIME_OFFSET.
        '';
        example = 2;
      };

      pm_heuristic_after_hour = mkOption {
        type = types.nullOr (types.ints.between 0 23);
        default = null;
        description = ''
          Only relevant for 12-hour formats that lack an explicit AM/PM
          marker. Once the previous programme reached or passed this hour,
          later ambiguous AM hours are promoted to PM. null disables.
        '';
        example = 12;
      };
    };
  };

  scraperToJson = s: lib.filterAttrs (_: v: v != null) s;

in {
  inherit automationActionType dimmerActionType roomType statusCardType scraperType scraperToJson;
}
