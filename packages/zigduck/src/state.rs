use std::{
    collections::HashMap,
    fs,
    sync::{Arc, Mutex, RwLock},
    time::{Duration, SystemTime},
};

use ducktrace_logger::*;
use rumqttc::{AsyncClient, MqttOptions};

use crate::config::HouseConfig;
use crate::domain::{AutomationConfig, DashboardConfig, Device, SceneConfig};
use crate::hue::HueClient;
use crate::motion::MotionTracker;

pub struct ZigduckState {
    pub hue_client: Option<HueClient>,
    pub mqtt_broker: String,
    pub mqtt_user: String,
    pub mqtt_password: String,
    pub mqtt_publisher: AsyncClient,
    pub mqtt_base_topic: String,
    pub mqtt_whitelist: Vec<String>,
    pub dashboard_config: DashboardConfig,
    pub state_dir: String,
    pub state_file: String,
    pub devices: HashMap<String, Device>,
    pub scene_config: SceneConfig,
    pub room_scenes: HashMap<String, Vec<String>>,
    pub scene_index: Arc<RwLock<HashMap<String, usize>>>,
    pub automations: AutomationConfig,
    pub motion_tracker: Arc<RwLock<MotionTracker>>,
    pub motion_timers: HashMap<String, tokio::task::JoinHandle<()>>,
    pub processing_times: HashMap<String, u128>,
    pub message_counts: HashMap<String, u64>,
    pub total_messages: u64,
    pub debug: bool,
    pub device_states: Arc<RwLock<HashMap<String, HashMap<String, String>>>>,
    pub config: HouseConfig,
    pub last_button_press: Arc<Mutex<HashMap<String, SystemTime>>>,
    pub double_click_timeout: Duration,
    pub motion_triggered: Arc<RwLock<HashMap<String, bool>>>,
    pub presence_state: Arc<RwLock<Option<bool>>>,
}

impl Clone for ZigduckState {
    fn clone(&self) -> Self {
        Self {
            hue_client: self.hue_client.clone(),
            mqtt_broker: self.mqtt_broker.clone(),
            mqtt_user: self.mqtt_user.clone(),
            mqtt_password: self.mqtt_password.clone(),
            mqtt_publisher: self.mqtt_publisher.clone(),
            mqtt_base_topic: self.mqtt_base_topic.clone(),
            mqtt_whitelist: self.mqtt_whitelist.clone(),
            dashboard_config: self.dashboard_config.clone(),
            state_dir: self.state_dir.clone(),
            state_file: self.state_file.clone(),
            devices: self.devices.clone(),
            scene_config: self.scene_config.clone(),
            room_scenes: self.room_scenes.clone(),
            scene_index: self.scene_index.clone(),
            automations: self.automations.clone(),
            motion_tracker: self.motion_tracker.clone(),
            motion_timers: HashMap::new(),
            processing_times: self.processing_times.clone(),
            message_counts: self.message_counts.clone(),
            total_messages: self.total_messages,
            debug: self.debug,
            device_states: self.device_states.clone(),
            config: self.config.clone(),
            last_button_press: Arc::new(Mutex::new(HashMap::new())),
            double_click_timeout: self.double_click_timeout,
            motion_triggered: self.motion_triggered.clone(),
            presence_state: self.presence_state.clone(),
        }
    }
}

impl ZigduckState {
    pub fn new(state_dir: String, devices_file: String, automations_file: String, debug: bool) -> Self {
        let config_path = std::env::var("HOUSE_CONFIG_FILE")
            .unwrap_or_else(|_| "/etc/zigduck/config.json".to_string());
        let config: HouseConfig = std::fs::read_to_string(&config_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_else(|| {
                dt_error!("Failed to load house config from {}", config_path);
                std::process::exit(1);
            });


        let (mqtt_broker, mqtt_user, mqtt_password) = if let Some(mosq) = &config.mosquitto {
            let broker = mosq.broker.clone();
            let user = mosq.user.clone();
            let password = if let Some(pw_file) = &mosq.password_file {
                fs::read_to_string(pw_file).map(|s| s.trim().to_string()).unwrap_or_else(|e| {
                    dt_warning!("Failed to read MQTT password file {}: {}", pw_file, e);
                    String::new()
                })
            } else { String::new() };
            (broker, user, password)
        } else {
            let broker = std::env::var("MQTT_BROKER").unwrap_or_else(|_| "127.0.0.1".to_string());
            let user = std::env::var("MQTT_USER").unwrap_or_else(|_| "mqtt".to_string());
            let password = if let Ok(pw) = std::env::var("MQTT_PASSWORD") {
                pw
            } else if let Ok(pw_file) = std::env::var("MQTT_PASSWORD_FILE") {
                fs::read_to_string(pw_file).map(|s| s.trim().to_string()).unwrap_or_default()
            } else { String::new() };
            (broker, user, password)
        };

        let mqtt_base_topic = config.mosquitto
            .as_ref()
            .map(|m| m.base_topic.clone())
            .unwrap_or_else(|| "zigbee2mqtt".to_string());

        let mqtt_whitelist = config.mosquitto
            .as_ref()
            .map(|m| m.whitelist.clone())
            .unwrap_or_default();

        let hue_client = if let Some(hue) = &config.hue {
            if let (Some(ip), Some(pw_file)) = (&hue.bridge_ip, &hue.password_file) {
                fs::read_to_string(pw_file).ok().and_then(|key| {
                    match HueClient::new(ip, key.trim()) {
                        Ok(c) => Some(c),
                        Err(e) => {
                            dt_warning!("Failed to initialize Hue client: {}", e);
                            None
                        }
                    }
                })
            } else { None }
        } else {
            if let (Ok(ip), Ok(key_file)) = (std::env::var("HUE_BRIDGE_IP"), std::env::var("HUE_API_KEY_FILE")) {
                fs::read_to_string(&key_file).ok().and_then(|key| {
                    match HueClient::new(&ip, key.trim()) {
                        Ok(c) => Some(c),
                        Err(e) => {
                            dt_warning!("Failed to initialize Hue client from env: {}", e);
                            None
                        }
                    }
                })
            } else { None }
        };

        let state_file = format!("{}/state.json", state_dir);

        std::fs::create_dir_all(&state_dir).unwrap_or_else(|e| {
            dt_error!("Failed to create state directory {}: {}", state_dir, e);
            std::process::exit(1);
        });

        if !std::path::Path::new(&state_file).exists() {
            std::fs::write(&state_file, "{}").unwrap_or_else(|e| {
                dt_error!("Failed to create state file {}: {}", state_file, e);
                std::process::exit(1);
            });
        }

        let scene_config_path = std::env::var("SCENE_CONFIG_FILE")
            .unwrap_or_else(|_| "/etc/zigduck/scenes.json".to_string());

        let scene_config: SceneConfig = std::fs::read_to_string(&scene_config_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_else(|| {
                dt_warning!("Failed to load scene config from {}", scene_config_path);
                SceneConfig { scenes: HashMap::new() }
            });

        let devices_json = std::fs::read_to_string(&devices_file)
            .unwrap_or_else(|e| {
                dt_warning!("Failed to read devices file {}: {}", devices_file, e);
                "{}".to_string()
            });

        let raw_devices: std::collections::HashMap<String, serde_json::Value> = serde_json::from_str(&devices_json)
            .unwrap_or_else(|e| {
                dt_warning!("Failed to parse devices JSON from {}: {}", devices_file, e);
                std::collections::HashMap::new()
            });

        let mut devices = std::collections::HashMap::new();
        for (friendly_name, device_value) in raw_devices {
            match serde_json::from_value::<Device>(device_value.clone()) {
                Ok(device) => { devices.insert(friendly_name, device); }
                Err(e) => { dt_debug!("Failed to parse device {}: {}", friendly_name, e); }
            }
        }


        let mut room_scenes: HashMap<String, Vec<String>> = HashMap::new();
        for (scene_name, scene_devices) in &scene_config.scenes {
            for device_name in scene_devices.devices.keys() {
                if let Some(device) = devices.get(device_name) {
                    let room = device.room.clone();
                    room_scenes.entry(room).or_default().push(scene_name.clone());
                }
            }
        }

        for scenes in room_scenes.values_mut() {
            scenes.sort();
            scenes.dedup();
        }

        dt_info!("Loaded {} devices from {}", devices.len(), devices_file);
        dt_info!("State directory: {}", state_dir);
        dt_info!("State file: {}", state_file);

        let automations_json = std::fs::read_to_string(&automations_file)
            .unwrap_or_else(|e| {
                dt_warning!("Failed to read automations file {}: {}", automations_file, e);
                "{\"dimmer_actions\":{},\"room_actions\":{},\"global_actions\":{}}".to_string()
            });

        let automations: AutomationConfig = serde_json::from_str(&automations_json)
            .unwrap_or_else(|e| {
                dt_warning!("Failed to parse automations JSON: {}", e);
                AutomationConfig {
                    dimmer_actions: HashMap::new(),
                    room_actions: HashMap::new(),
                    global_actions: HashMap::new(),
                    time_based: HashMap::new(),
                    mqtt_triggered: HashMap::new(),
                    presence_based: HashMap::new(),
                    greeting: None,
                }
            });

        let motion_tracker = Arc::new(RwLock::new(MotionTracker {
            last_motion: HashMap::new(),
            last_occupancy: HashMap::new(),
        }));

        let dashboard_config_path = std::env::var("DASHBOARD_CONFIG_FILE")
            .unwrap_or_else(|_| "/etc/zigduck/dashboard.json".to_string());

        let dashboard_config: DashboardConfig = std::fs::read_to_string(&dashboard_config_path)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_else(|| {
                dt_warning!("Failed to load dashboard config from {}", dashboard_config_path);
                DashboardConfig { cards: HashMap::new() }
            });

        let device_states = Arc::new(RwLock::new(HashMap::new()));

        if let Ok(content) = std::fs::read_to_string(&state_file) {
            if let Ok(existing) = serde_json::from_str::<HashMap<String, HashMap<String, String>>>(&content) {
                let mut states = device_states.write().unwrap();
                *states = existing;
            }
        }

        {
            let disabled: Vec<String> = devices.iter()
                .filter(|(_, d)| !d.enable)
                .map(|(name, _)| name.clone())
                .collect();
            if !disabled.is_empty() {
                let (removed, json) = {
                    let mut states = device_states.write().unwrap();
                    let mut removed = 0usize;
                    for name in &disabled {
                        if states.remove(name).is_some() {
                            removed += 1;
                        }
                    }
                    let json = if removed > 0 {
                        serde_json::to_string(&*states).ok()
                    } else { None };
                    (removed, json)
                };
                if removed > 0 {
                    dt_info!("Pruned persisted state for {} disabled device(s)", removed);
                    if let Some(json) = json {
                        let tmp = format!("{}.tmp", state_file);
                        if std::fs::write(&tmp, &json).is_ok() {
                            let _ = std::fs::rename(&tmp, &state_file);
                        }
                    }
                }
            }
        }

        if let Ok(states) = device_states.read() {
            if let Ok(mut t) = motion_tracker.write() {
                for (dev, fields) in states.iter() {
                    if let Some(s) = fields.get("occupancy") {
                        if let Ok(b) = s.parse::<bool>() {
                            t.last_occupancy.insert(dev.clone(), b);
                        }
                    }
                }
            }
        }

        let presence_state = Arc::new(RwLock::new(
            device_states
                .read()
                .unwrap()
                .get("apartment")
                .and_then(|m| m.get("presence"))
                .map(|v| v == "home"),
        ));

        let double_click_timeout = Duration::from_millis(
            config.dimmer.double_click_timeout_ms.unwrap_or(300),
        );

        let mut pub_options = MqttOptions::new("zigduck-pub", &mqtt_broker, 1883);
        pub_options.set_credentials(&mqtt_user, &mqtt_password);
        pub_options.set_keep_alive(Duration::from_secs(30));
        let (mqtt_publisher, mut pub_eventloop) = rumqttc::AsyncClient::new(pub_options, 5);

        tokio::spawn(async move {
            loop { pub_eventloop.poll().await.ok(); }
        });

        Self {
            mqtt_broker,
            mqtt_user,
            mqtt_password,
            mqtt_publisher,
            mqtt_base_topic,
            mqtt_whitelist,
            hue_client,
            state_dir,
            state_file,
            dashboard_config,
            devices,
            scene_config,
            room_scenes,
            scene_index: Arc::new(RwLock::new(HashMap::new())),
            automations,
            processing_times: HashMap::new(),
            message_counts: HashMap::new(),
            total_messages: 0,
            motion_tracker,
            motion_timers: HashMap::new(),
            debug,
            device_states,
            config,
            double_click_timeout,
            last_button_press: Arc::new(Mutex::new(HashMap::new())),
            motion_triggered: Arc::new(RwLock::new(HashMap::new())),
            presence_state,
        }
    }
}
