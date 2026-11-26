{
  self,
  config,
  lib,
  pkgs,
  ...
} : with lib;
let
  cfg = config.services.zigduck;
  house = config.house;
  zigduckPkgs = self.inputs.zigduck.packages.${pkgs.system};

  cards = import ./cards.nix { inherit lib pkgs; };
  generateCardStyle = cards.generateCardStyle;
  statusCardThemes = cards.statusCardThemes;


  css = {
    global  = builtins.readFile ./../static/css/global.css;
    devices = builtins.readFile ./../static/css/devices.css;
    scenes  = builtins.readFile ./../static/css/scenes.css;
  };

  apiBaseUrl =
    if config.services.zigduck.dashboard.secure
    then ""
    else "http://${config.house.zigbee.mosquitto.host}:${toString config.services.zigduck.dashboard.port}";

  chatConfig = {
    host    = config.house.zigbee.mosquitto.host;
    port    = toString config.services.zigduck.dashboard.port;
    baseUrl = apiBaseUrl;
  };

  chat = ''
    <script>window.CHAT_CONFIG = ${builtins.toJSON chatConfig};</script>
    <link rel="stylesheet" href="/chat.css">
    ${builtins.readFile ./../static/html/chat.html}
    <script src="/chat.js" defer></script>
  '';

  dashboardData = builtins.toJSON {
    sceneData    = zigbeeScenes;
    iconData     = zigbeeDevicesIcon;
    baseTopic    = house.zigbee.mosquitto.baseTopic;
    roomDeviceMappings = lib.foldlAttrs (acc: room: ds:
      acc // { ${room} = map (d: {
        id = d.friendly_name or d.id;
        friendly_name = d.friendly_name or d.id;
        type = d.type;
      }) ds; }
    ) {} devicesByRoom;
  };


  tvConfig = builtins.trace "TV config: ${builtins.toJSON (builtins.removeAttrs house.tv [ "privateKeyFile" "publicKey" ])}"
      (builtins.removeAttrs house.tv [ "privateKeyFile" "publicKey" ]);

  zigbeeDevices = house.zigbee.devices;

  allRoomDevices = lib.filterAttrs (_: device:
    device.type == "light" ||
    device.type == "hue_light" ||
    device.type == "outlet" ||
    device.type == "pusher"
  ) zigbeeDevices;

  iOSmanifest = pkgs.writeText "manifest.json" ''
    {
      "name": "🦆'Dash",
      "short_name": "🦆",
      "start_url": "/index.html",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#ffffff",
      "icons": [
        {
          "src": "/android-chrome-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "/android-chrome-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    }
  '';


  scenes = house.zigbee.scenes;

  byRoom = lib.foldlAttrs (acc: id: dev:
    lib.recursiveUpdate acc {
      ${dev.room} = (acc.${dev.room} or []) ++ [ id ];
    }) {} zigbeeDevices;

  pageFilesAndCss = let
    pages = house.dashboard.pages;
  in lib.concatStrings (lib.mapAttrsToList (pageId: page:
    if page.css != "" then "echo '${page.css}' > $DASHBOARD_DIR/page-${pageId}.css;" else ""
  ) pages);


  statusCardsHtml = let
    enabledCards = lib.filterAttrs (name: card: card.enable) house.dashboard.statusCards;
    cardsList = lib.mapAttrsToList (name: card: card // { _name = name; }) enabledCards;
    groupedCards = lib.groupBy (card: card.group or "default") cardsList;
    groups = lib.attrNames groupedCards;

    generateCardStyle = cardName: card:
      let
        themeName = card.theme or "neon";
        theme = statusCardThemes.${themeName} or statusCardThemes.neon;
        themeVars = lib.concatStringsSep " " (lib.mapAttrsToList (name: value:
          "${name}: ${value};"
        ) theme.cssVars);
      in
        ''style="
          --card-color: ${card.color};
          --card-glow-color: ${card.color}40;
          ${themeVars}
        "'';

    generateCardHtml = card:
      let
        name = card._name;
        cardStyle = generateCardStyle name card;
        themeName = card.theme or "neon";
      in
        ''
        <div class="card${if card.chart then " has-chart" else ""}${if name == "temperature" then " quacking" else ""}"
             data-card="${name}"
             data-theme="${themeName}"
             ${cardStyle}>

          ${if name == "temperature" then ''
            <div class="duck-emoji">🦆</div>
          '' else ""}

          <div class="card-header">
            <div class="card-title">${card.title}</div>
            <i class="${card.icon}" style="color: ${card.color};
              text-shadow: 0 0 15px ${card.color}80;"></i>
          </div>

          <div class="card-value" id="status-${name}-value"
               style="color: ${card.color};">
            ${card.defaultValue}
          </div>

          ${if (card.detailsJsonField != null) || (card.details != "") then ''
            <div class="card-details">
              <i class="fas fa-info-circle"></i>
              <span id="status-${name}-details">${card.defaultDetails}</span>
            </div>
          '' else ""}

          ${if card.chart then ''
            <div class="card-delta" id="status-${name}-delta"
                 style="background: ${card.color}30; color: ${card.color};">
              <i class="fas fa-arrow-up"></i> 0%
            </div>
            <div class="card-chart">
              <canvas id="status-${name}-chart"></canvas>
            </div>
          '' else ""}
        </div>
        '';

    generateGroupHtml = groupName: cards:
      let
        cardsHtml = lib.concatMapStrings generateCardHtml cards;
      in
        cardsHtml + (if groupName != lib.last groups then "<br><br>" else "");
  in
    lib.concatStrings (lib.mapAttrsToList generateGroupHtml groupedCards);

  customTabsHtml = let
    pages = house.dashboard.pages;
  in if pages == {} then "" else lib.concatStrings (lib.mapAttrsToList (id: page:
    let
      iconHtml = if lib.hasPrefix "http" page.icon then
        ''<img src="${page.icon}" class="nav-icon">''
      else if lib.hasPrefix "mdi:" page.icon then
        ''<i class="mdi mdi-${lib.removePrefix "mdi:" page.icon}"></i>''
      else
        ''<i class="${page.icon}"></i>'';
    in
      ''<div class="nav-tab" data-page="${id}">${iconHtml}</div>''
  ) pages);


  zigbeeScenes = house.zigbee.scenes;
  zigbeeDevicesIcon = lib.mapAttrs' (id: device: {
    name = device.friendly_name;
    value = device.icon;
  }) zigbeeDevices;

  sceneData = builtins.toJSON zigbeeScenes;
  iconData = builtins.toJSON zigbeeDevicesIcon;

  sceneGradientCss = lib.concatStrings (lib.mapAttrsToList (name: scene:
    let
      sceneDevices = lib.removeAttrs scene [ "_aliases" ];
      deviceStates = lib.mapAttrsToList (_: device: device.state) sceneDevices;
      onCount = lib.length (lib.filter (state: state == "ON") deviceStates);
      offCount = lib.length (lib.filter (state: state == "OFF") deviceStates);

      colors = lib.unique (lib.concatMap (device:
        if device.state == "ON" && device ? color && device.color ? hex then
          [ device.color.hex ]
        else []
      ) (lib.attrValues sceneDevices));

      colorsLength = builtins.length colors;

      background =
        if offCount > onCount then "black"
        else if colorsLength == 0 then "white"
        else if colorsLength == 1 then "linear-gradient(135deg, ${lib.elemAt colors 0} 0%, ${lib.elemAt colors 0}66 100%)"
        else
          let
            colorStops = lib.imap0 (i: color:
              "${color} ${toString (i * (100 / (colorsLength - 1)))}%"
            ) colors;
          in
            "linear-gradient(135deg, ${lib.concatStringsSep ", " colorStops})";
    in
      ".scene-item[data-scene=\"${lib.escapeXML name}\"] {
        background: ${background};
        ${if background == "white" then "color: black;" else ""}
      }"
  ) zigbeeScenes);


  sceneGridHtml = lib.concatStrings (lib.mapAttrsToList (name: scene:
    let
      sceneDevices = lib.removeAttrs scene [ "_aliases" ];

      colors = lib.concatMap (device:
        if device.state == "ON" && device ? color.hex then [device.color.hex] else []
      ) (lib.attrValues sceneDevices);

      deviceStates = lib.mapAttrsToList (_: device: device.state) sceneDevices;
      onCount = lib.length (lib.filter (state: state == "ON") deviceStates);
      offCount = lib.length (lib.filter (state: state == "OFF") deviceStates);
      colorsAttr = if colors != [] then "data-colors='${builtins.toJSON colors}'" else "";
      statesAttr = "data-on='${toString onCount}' data-off='${toString offCount}'";
    in
      ''<div class="scene-item" data-scene="${lib.escapeXML name}" ${colorsAttr} ${statesAttr}>
        <i class="fas fa-lightbulb"></i>
        <span>${lib.escapeXML name}</span>
      </div>''
  ) zigbeeScenes);

  roomDeviceMappings = lib.concatMapStrings (room:
    let roomLights = devicesByRoom.${room} or [];
    in if roomLights != [] then
      let
        deviceMappings = map (d: {
          id = d.friendly_name or d.id;
          friendly_name = d.friendly_name or d.id;
          type = d.type;
        }) roomLights;
      in
        "window.roomDeviceMappings['${room}'] = " + builtins.toJSON deviceMappings + ";\n"
    else ""
  ) sortedRooms;

  roomIcons = lib.mapAttrs' (name: room: {
    name = name;
    value = room.icon;
  }) house.rooms;

  devicesWithId = lib.mapAttrsToList (id: value: { inherit id; } // value) allRoomDevices;
  devicesByRoom = lib.groupBy (device: device.room) devicesWithId;
  sortedRooms = lib.sort (a: b: a < b) (lib.attrNames devicesByRoom);

  roomControlsHtml = let
    devicesData = house.zigbee.devices;

    isDeviceOn = deviceId:
      let device = devicesData.${deviceId} or {};
      in device.state or "OFF" == "ON";
  in ''
    <div class="room-controls-section">
      <h3>🦆 ROOOOMS 🦆</h3>
      <div class="rooms" id="roomsContainer">
        ${lib.concatMapStrings (room:
          let
            iconName = lib.removePrefix "mdi:" (roomIcons.${room} or "mdi:home");
            roomLights = devicesByRoom.${room} or [];
            hasLights = roomLights != [];
            roomId = lib.toLower (lib.replaceStrings [" "] ["-"] room);
            deviceCount = lib.length roomLights;
            initialOnCount = lib.length (lib.filter (device:
              isDeviceOn device.id
            ) roomLights);
          in
            if hasLights then ''
              <div class="room" id="room-${roomId}" data-room="${roomId}" data-room-name="${room}">>
                <div class="room-header" onclick="openRoomDevicesPanel('${roomId}', '${room}')">
                  <div class="room-title">
                    <i class="mdi mdi-${iconName} room-icon"></i>
                    <span class="room-name">${lib.toUpper room}</span>
                  </div>
                  <div class="room-controls">
                    <button class="collapse-btn" title="View Devices" onclick="event.stopPropagation(); openRoomDevicesPanel('${roomId}', '${room}')">
                      ▸
                    </button>
                  </div>
                </div>

                <div class="room-brightness-container">
                  <div class="room-brightness-label">
                    <span>☀️</span>
                    <span class="brightness-value">100%</span>
                  </div>
                  <input class="brightness room-brightness" type="range" min="0" max="100" value="100"
                         title="Adjust room brightness">
                </div>

                <div class="room-devices-summary">
                  <i class="fas fa-lightbulb"></i>
                  <span class="room-devices-count">${toString deviceCount} lights</span>
                  <span>•</span>
                  <span class="room-on-devices" id="room-${roomId}-on-count">${toString initialOnCount} on</span>
                </div>
              </div>
            '' else ""
        ) sortedRooms}
      </div>
    </div>
  '';

  customPagesHtml = let
    pages = house.dashboard.pages;
  in if pages == {} then "" else lib.concatStrings (lib.mapAttrsToList (id: page:
    let
      cssLink = if page.css != "" then ''<link rel="stylesheet" href="/page-${id}.css">'' else "";
    in
      ''<div class="page" id="pageCustom${id}" data-page="${id}">
          ${cssLink}
          ${page.code}
        </div>''
  ) pages);



  # GENERATE DASHBOARD INDEX.HTML
  indexHtml = ''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="🦆'Dash">
        <link rel="apple-touch-icon" href="/icon-192.png">
        <link rel="manifest" href="/site.webmanifest">
        <script src="./script.js"></script>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">

        <title>🦆'Dash</title>
        <link rel="preconnect" href="https://cdn.jsdelivr.net">
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://cdn.jsdelivr.net/npm/@mdi/font/css/materialdesignicons.min.css" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet">

        <style>
            .page {
                display: none;
                width: 100%;
                min-height: 100%;
                padding: 20px;
                box-sizing: border-box;
            }

            ${css.global}
            ${css.devices}
            ${css.scenes}
            ${sceneGradientCss}
        </style>

    </head>
    <body>
        <div class="container">
            <div id="mqttStatus" style="position: fixed; top: 10px; right: 10px; z-index: 1000;
                 background: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 5px;">
                 ...
            </div>
            <div id="connectionStatus" style="display: none;"></div>
            <div id="deviceSelectorContainer" class="device-selector-container hidden">
                <select id="deviceSelect" class="device-selector">
                    <option value="">🦆 says ▶ pick a device! </option>
                </select>
            </div>

            <div class="page-container" id="pageContainer">
                <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
                 🦆 says ⮞ PAGE 0 HOME (STATUS CARDS)
                 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
                <div class="page" id="pageHome" data-page="0">

                    <div class="status-cards">
                    <div class="status-cards">
                        ${statusCardsHtml}
                    </div>
                    </div>

                    ${roomControlsHtml}
                </div><br><br><br>
                  <!-- 🦆says⮞ slide out a room panel with devices -->
                <div class="panel-backdrop" id="panelBackdrop" onclick="closeRoomDevicesPanel()"></div>
                <div class="slide-out-panel" id="devicesSlidePanel">
                  <div class="panel-header">
                    <button class="panel-back-btn" onclick="closeRoomDevicesPanel()">
                      ←
                    </button>
                    <div class="panel-title">
                      <div class="panel-room-name" id="panelRoomName">Room Name</div>
                      <i class="mdi mdi-home panel-room-icon" id="panelRoomIcon"></i>
                    </div>
                  </div>

                  <div class="panel-controls" id="panelDevicesContainer">
                  <!--  <div class="panel-devices-container" id="panelDevicesContainer">  -->
                    <!-- 🦆says⮞ room devices is shown here  -->
                  </div>
                </div>


                <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
                 🦆 says ⮞ PAGE 1 DEVICES
                 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
                <div class="page" id="pageDevices" data-page="1">

                    <!-- 🦆says⮞ main device content  -->
                    <div class="device-controls" id="deviceControls">
                        <!-- 🦆says⮞ device header (title, icon, signal) -->
                        <div class="device-header">
                            <div class="device-icon">
                                <i id="currentDeviceIcon" class="mdi"></i>
                            </div>
                            <div class="device-info">
                                <h1 id="currentDeviceName">Select a device</h1>
                                <p id="currentDeviceStatus">Choose a device from dropdown</p>
                            </div>
                            <div class="linkquality-mini">
                                <div class="lq-bars"></div>
                                <span class="lq-value">??</span>
                            </div>
                        </div>

                        <!-- 🦆says⮞ device controls  -->
                        <div id="devicePanel" class="device-panel">
                            <!-- 🦆says⮞ will be dynamically rendered here by renderMessage()  -->
                        </div>
                    </div>
                </div>


                <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
                 🦆 says ⮞ PAGE 2 - SCENES
                 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
                <div class="page" id="pageScenes" data-page="2">
                    <div class="room-controls-section">
                      <h3>SCENES <i class="fas fa-palette"></i>🦆</h3>
                    </div>
                    <div class="scene-grid" id="scenesContainer">
                      ${sceneGridHtml}
                    </div>
                </div>

                <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
                🦆 says ⮞ PAGE 3 - MEDIA BROWSER
                🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
                ${chat}


               <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
               🦆 says ⮞ USER CONFIGURATION PAGES
               🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
               ${customPagesHtml}

            </div>


            <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
             🦆 says ⮞ TABS
             🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆 -->
            <div class="nav-tabs">
                <div class="nav-tab active" data-page="0">
                    <i class="mdi mdi-home"></i>
                </div>
                <div class="nav-tab" data-page="1">
                    <i class="mdi mdi-lightbulb"></i>
                </div>
                <div class="nav-tab" data-page="2">
                    <i class="mdi mdi-palette"></i>
                </div>

                ${lib.optionalString (house.media.root or "" != "") ''
                  <div class="nav-tab" data-page="3">
                      <i class="mdi mdi-chat"></i>
                  </div>
                ''}

                <!-- 🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆🦆
              🦆 says ⮞ USER CONFIGURED TABS 🦆 -->
                ${customTabsHtml}
            </div>
        </div>

        <div class="notification hidden" id="notification"></div>

        <script>window.DASHBOARD_DATA = ${dashboardData};</script>
        <script src="/dashboard.js" defer></script>
    </body>
    </html>
  '';

  dashboardConfig = lib.filterAttrs (_: card: card.enable) house.dashboard.statusCards;
  dashboardConfigJSON = builtins.toJSON {
      cards = lib.mapAttrs (name: card: {
          enable = card.enable;
          title = card.title;
          icon = card.icon;
          color = card.color;
          on_click_action = card.on_click_action or [];
      }) dashboardConfig;
  };
  dashboardConfigFile = pkgs.writeText "dashboard-config.json" dashboardConfigJSON;

  statusCardsConfigJson = pkgs.writeText "status-cards-config.json" (builtins.toJSON {
    cards = lib.mapAttrs (name: card: {
      inherit name;
      title = card.title;
      group = card.group or "default";
      icon = card.icon;
      color = card.color;
      theme = card.theme or "neon";
      fileName = builtins.baseNameOf card.filePath;
      jsonField = card.jsonField;
      format = card.format;
      detailsJsonField = card.detailsJsonField or null;
      detailsFormat = card.detailsFormat or "";
      details = card.details or "";
      defaultDetails = card.defaultDetails or "";
      defaultValue = card.defaultValue or "--";
      chart = card.chart or false;
      historyField = card.historyField or "history";
      on_click_action = card.on_click_action or [];
    }) (lib.filterAttrs (_: card: card.enable) house.dashboard.statusCards);
    enabled = builtins.attrNames (lib.filterAttrs (_: card: card.enable) house.dashboard.statusCards);
  });

  dashboardConfigFiles = let
    enabledTVs = lib.filterAttrs (_: tv: tv.enable) (builtins.removeAttrs house.tv [ "privateKeyFile" "publicKey" ]);

    defaultTVName = let
      defaults = lib.filterAttrs (_: tv: tv.isDefault) enabledTVs;
    in
      if defaults != {} then lib.head (lib.attrNames defaults)
      else if enabledTVs != {} then lib.head (lib.attrNames enabledTVs)
      else throw "No enabled TVs defined";
  in
    pkgs.writeText "dashboard-config.json" (builtins.toJSON {
      dashboard_static_root = "${cfg.stateDir}/dashboard";
      port = cfg.dashboard.port;
      secure_cookies = cfg.dashboard.secure;
      state_file = "${cfg.stateDir}/state.json";
      alarms_file = "${cfg.stateDir}/alarms.json";
      devices_file = "/etc/zigduck/devices.json";
      scenes_file = "/etc/zigduck/scenes.json";
      rooms_file = "/etc/zigduck/rooms.json";
      types_file = "/etc/zigduck/types.json";
      tv_defaults_file = "/etc/zigduck/tv-defaults.json";
      media_root = house.media.root;
      playlist_file = house.media.root + "/playlist.m3u";
      webserver_secret_file = if house.https.media.urlFile != null then house.https.media.urlFile else "";
      default_tv_ip = house.tv.${defaultTVName}.ip;
    });

in {

  system.activationScripts.zigduck-dashboard = {
    deps = [ "users" ];
    text = ''
      #!/usr/bin/env bash
      DASHBOARD_DIR="${cfg.stateDir}/dashboard"
      mkdir -p "$DASHBOARD_DIR"
      chown zigduck:zigduck "$DASHBOARD_DIR"

      # symlink html files & manifest
      ln -sf /etc/zigduck/login.html $DASHBOARD_DIR/
      ln -sf /etc/zigduck/script.js $DASHBOARD_DIR/
      ln -sf /etc/zigduck/index.html $DASHBOARD_DIR/
      ln -sf /etc/static/tv.html $DASHBOARD_DIR/
      ln -sf /etc/zigduck/site.webmanifest $DASHBOARD_DIR/
      ln -sf /etc/zigduck/chat.js  $DASHBOARD_DIR/
      ln -sf /etc/zigduck/chat.css $DASHBOARD_DIR/
      ln -sf /etc/zigduck/dashboard.js $DASHBOARD_DIR/
      ln -sf /etc/zigduck/fail.wav $DASHBOARD_DIR/tts
      ln -sfn "${cfg.stateDir}/tts" "$DASHBOARD_DIR/tts"


      # & favicons
      ln -sf /etc/zigduck/favicon-32x32.png $DASHBOARD_DIR/
      ln -sf /etc/zigduck/favicon-16x16.png $DASHBOARD_DIR/
      ln -sf /etc/zigduck/favicon.ico $DASHBOARD_DIR/
      ln -sf /etc/zigduck/apple-touch-icon.png $DASHBOARD_DIR/
      ln -sf /etc/zigduck/android-chrome-512x512.png $DASHBOARD_DIR/
      ln -sf /etc/zigduck/android-chrome-192x192.png $DASHBOARD_DIR/

      # symlink json files
      ln -sf /etc/zigduck/config.json $DASHBOARD_DIR/
      ln -sf /etc/zigduck/devices.json $DASHBOARD_DIR/
      ln -sf /etc/zigduck/rooms.json $DASHBOARD_DIR/
      ln -sf /etc/zigduck/tv.json $DASHBOARD_DIR/
      ln -sf ${cfg.stateDir}/state.json $DASHBOARD_DIR/
      ln -sf /etc/static/epg.json $DASHBOARD_DIR/

      ln -sf /etc/zigduck/status-cards-config.json $DASHBOARD_DIR/
      ${lib.concatStringsSep "\n" (lib.mapAttrsToList (name: card:
        if card.enable then "ln -sf ${card.filePath} $DASHBOARD_DIR/${builtins.baseNameOf card.filePath};" else ""
      ) config.house.dashboard.statusCards)}

      ${lib.optionalString (house.https.media.urlFile != null) ''
        ln -sf ${house.https.media.urlFile} $DASHBOARD_DIR/mediadomain.txt
      ''}

      # process page files from dashboard configuration
      ${lib.concatStringsSep "\n" (lib.flatten (lib.mapAttrsToList (_: page:
        lib.mapAttrsToList (name: source:
          if lib.isString source then
            "ln -sf ${source} $DASHBOARD_DIR/${name}"
          else
            "ln -sf ${toString source} $DASHBOARD_DIR/${name}"
        ) (page.files or {})
      ) house.dashboard.pages))}

      # CSS files only
      ${pageFilesAndCss}

      # TV icons
      mkdir -p $DASHBOARD_DIR/tv-icons
      ${lib.concatMapStrings (tvName:
          let tv = tvConfig.${tvName};
          in lib.concatMapStrings (channelId:
              let channel = tv.channels.${channelId};
              in "ln -sf ${channel.icon} $DASHBOARD_DIR/tv-icons/${channelId}.png\n"
          ) (lib.attrNames tv.channels)
      ) (lib.attrNames tvConfig)}
    '';
  };


  environment.etc."zigduck/index.html" = {
    text = indexHtml;
    mode = "0644";
  };

  environment.etc."zigduck/login.html" = {
    source = ./../static/html/login.html;
    mode = "0644";
  };

  environment.etc."zigduck/script.js" = {
    source = ./../static/js/script.js;
    mode = "0644";
  };

  environment.etc."devices.json".source =
    pkgs.writeTextFile {
      name = "devices.json";
      text = builtins.toJSON house.zigbee.devices;
    };

  environment.etc."zigduck/rooms.json".source =
    pkgs.writeTextFile {
      name = "rooms.json";
      text = builtins.toJSON house.rooms;
    };

  environment.etc."zigduck/tv.json".source =
    pkgs.writeTextFile {
      name = "tv.json";
      text = builtins.toJSON (builtins.removeAttrs house.tv [ "privateKeyFile" "publicKey" ]);
    };

  environment.etc."zigduck/favicon-32x32.png".source = ./../static/icons/favicon-32x32.png;
  environment.etc."zigduck/favicon-16x16.png".source = ./../static/icons/favicon-16x16.png;
  environment.etc."zigduck/favicon.ico".source = ./../static/icons/favicon.ico;
  environment.etc."zigduck/apple-touch-icon.png".source = ./../static/icons/apple-touch-icon.png;
  environment.etc."zigduck/android-chrome-512x512.png".source = ./../static/icons/android-chrome-512x512.png;
  environment.etc."zigduck/android-chrome-192x192.png".source = ./../static/icons/android-chrome-192x192.png;

  environment.etc."zigduck/site.webmanifest".source = iOSmanifest;

  environment.etc."zigduck/dashboard.json".source = dashboardConfigFile;
  environment.etc."zigduck/dashboard-config.json".source = dashboardConfigFiles;
  environment.etc."zigduck/status-cards-config.json".source = statusCardsConfigJson;

  environment.etc."zigduck/chat.js".source  = ./../static/js/chat.js;
  environment.etc."zigduck/chat.css".source = ./../static/css/chat.css;
  environment.etc."zigduck/dashboard.js".source = ./../static/js/dashboard.js;
  environment.etc."zigduck/fail.wav".source = ./../static/sound/fail.wav;


  }
