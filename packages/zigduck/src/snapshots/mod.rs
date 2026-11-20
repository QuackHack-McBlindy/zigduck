use std::collections::HashMap;

use ducktrace_logger::*;

use crate::hue::convert_to_hue_payload;
use crate::state::ZigduckState;

fn is_controllable_field(device_type: &str, field: &str) -> bool {
    match device_type {
        "light" | "hue_light" => matches!(
            field,
            "state" | "brightness" | "color" | "color_temp" | "transition"
        ),
        "blind" => matches!(field, "position" | "state"),
        "outlet" => matches!(field, "state"),
        _ => false,
    }
}

impl ZigduckState {
    pub async fn create_snapshot(
        &self,
        name: &str,
        scope: &str,
        room_filter: Option<&str>,
        device_list: Option<&[String]>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if name.is_empty() || name.contains('/') || name.contains('\\') {
            return Err("Invalid snapshot name".into());
        }

        let snapshots_dir = format!("{}/snapshots", self.state_dir);
        tokio::fs::create_dir_all(&snapshots_dir).await?;

        let states = self.device_states.read().unwrap().clone();

        let mut snapshot_data: HashMap<String, serde_json::Value> = HashMap::new();

        for (device_name, device) in &self.devices {
            let include = match scope {
                "global" => device.device_type == "light" || device.device_type == "hue_light",
                "room" => {
                    if let Some(room) = room_filter {
                        device.room == room
                    } else { false }
                }
                "devices" => {
                    if let Some(list) = device_list {
                        list.iter().any(|d| d == device_name)
                    } else { false }
                }
                _ => false,
            };
            if !include {
                continue;
            }

            if let Some(device_state) = states.get(device_name) {
                let mut json_state = serde_json::Map::new();
                for (key, value_str) in device_state {
                    if !is_controllable_field(&device.device_type, key) {
                        continue;
                    }

                    let value = match serde_json::from_str::<serde_json::Value>(value_str) {
                        Ok(v) if v.is_object() || v.is_array() => v,
                        _ => {
                            if let Ok(b) = value_str.parse::<bool>() {
                                serde_json::Value::Bool(b)
                            } else if let Ok(n) = value_str.parse::<i64>() {
                                serde_json::Value::Number(n.into())
                            } else if let Ok(f) = value_str.parse::<f64>() {
                                serde_json::Value::from(f)
                            } else {
                                serde_json::Value::String(value_str.clone())
                            }
                        }
                    };

                    json_state.insert(key.clone(), value);
                }

                if !json_state.is_empty() {
                    snapshot_data.insert(device_name.clone(), serde_json::Value::Object(json_state));
                }
            }
        }

        let json_str = serde_json::to_string_pretty(&snapshot_data)?;
        let file_path = format!("{}/{}.json", snapshots_dir, name);
        tokio::fs::write(&file_path, json_str).await?;
        dt_info!("Snapshot '{}' saved with {} devices", name, snapshot_data.len());
        Ok(())
    }

    pub async fn restore_snapshot(&self, name: &str) -> Result<(), Box<dyn std::error::Error>> {
        let snapshots_dir = format!("{}/snapshots", self.state_dir);
        let file_path = format!("{}/{}.json", snapshots_dir, name);

        let content = match tokio::fs::read_to_string(&file_path).await {
            Ok(c) => c,
            Err(e) => {
                dt_warning!("Snapshot '{}' not found: {}", name, e);
                return Ok(());
            }
        };

        let snapshot_data: HashMap<String, serde_json::Value> = serde_json::from_str(&content)?;

        for (device_name, state_value) in snapshot_data {
            if let Some(device) = self.get_device(&device_name) {
                let state_map = state_value.as_object().cloned().unwrap_or_default();

                match device.device_type.as_str() {
                    "hue_light" => {
                        if let Some(hue_id) = device.hue_id {
                            if let Some(hue_client) = &self.hue_client {
                                let hue_payload =
                                    convert_to_hue_payload(&serde_json::Value::Object(state_map))?;
                                hue_client.set_light_state(hue_id, hue_payload).await?;
                            } else {
                                dt_warning!("Hue client not initialized, skipping {}", device_name);
                            }
                        } else {
                            dt_warning!("Hue light {} missing hue_id", device_name);
                        }
                    }
                    _ => {
                        let topic = format!("{}/{}/set", self.mqtt_base_topic, device_name);
                        let payload = serde_json::to_string(&state_map)?;
                        self.mqtt_publish(&topic, &payload).await?;
                    }
                }
            } else {
                dt_warning!("Device '{}' not found in current config, skipping", device_name);
            }
        }

        dt_info!("Snapshot '{}' restored", name);
        Ok(())
    }
}
