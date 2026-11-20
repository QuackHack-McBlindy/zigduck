use ducktrace_logger::*;

use crate::hue::convert_to_hue_payload;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn activate_scene_filtered(
        &self,
        scene_name: &str,
        room_filter: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let scene = self
            .scene_config
            .scenes
            .get(scene_name)
            .ok_or_else(|| format!("Scene '{}' not found", scene_name))?;
        dt_info!("🎨 Activating scene: {} (filter: {:?})", scene_name, room_filter);

        if let Some(room) = room_filter {
            let mut any_device_on = false;
            for (device_name, settings) in &scene.devices {
                if let Some(device) = self.get_device(device_name) {
                    if device.room == room {
                        let is_off = match (settings.get("state"), settings.get("on")) {
                            (Some(state_val), _) => {
                                state_val.as_str().map(|s| s.eq_ignore_ascii_case("OFF")).unwrap_or(false)
                            }
                            (None, Some(on_val)) => on_val.as_bool().map(|b| !b).unwrap_or(false),
                            (None, None) => false,
                        };

                        if !is_off {
                            any_device_on = true;
                            break;
                        }
                    }
                }
            }

            if !any_device_on {
                dt_debug!(
                    "Skipping scene '{}' for room '{}' because it would turn all lights off",
                    scene_name,
                    room
                );
                return Ok(());
            }
        }

        for (device_name, settings) in &scene.devices {
            let device = self
                .get_device(device_name)
                .ok_or_else(|| format!("Device '{}' not found in scene", device_name))?;

            if let Some(room) = room_filter {
                if device.room != room {
                    continue;
                }
            }

            match device.device_type.as_str() {
                "hue_light" => {
                    if let Some(hue_id) = device.hue_id {
                        if let Some(hue_client) = &self.hue_client {
                            let hue_payload = convert_to_hue_payload(settings)?;
                            if let Err(e) = hue_client.set_light_state(hue_id, hue_payload).await {
                                dt_warning!("Failed to set Hue light {}: {}", device_name, e);
                            }
                        } else {
                            dt_warning!("Hue client not initialized, skipping {}", device_name);
                        }
                    } else {
                        dt_warning!("Hue light {} missing hue_id", device_name);
                    }
                }
                "light" | _ => {
                    let topic = format!("{}/{}/set", self.mqtt_base_topic, device_name);
                    let payload = serde_json::to_string(settings)?;
                    if let Err(e) = self.mqtt_publish(&topic, &payload).await {
                        dt_warning!("Failed to publish MQTT for {}: {}", device_name, e);
                    }
                }
            }
        }
        Ok(())
    }


    pub async fn activate_scene(&self, scene_name: &str) -> Result<(), Box<dyn std::error::Error>> {
        let canonical = self.resolve_scene_name(scene_name).ok_or_else(|| {
            format!(
                "Scene '{}' not found (known: {})",
                scene_name,
                self.scene_config.scenes.keys().cloned().collect::<Vec<_>>().join(", ")
            )
        })?;
        if canonical != scene_name {
            dt_info!("🎨 scene alias '{}' > '{}'", scene_name, canonical);
        }
        self.activate_scene_filtered(&canonical, None).await
    }

    pub fn resolve_scene_name(&self, input: &str) -> Option<String> {
        if self.scene_config.scenes.contains_key(input) {
            return Some(input.to_string());
        }
        let needle = input.to_lowercase();
        self.scene_config
            .scenes
            .iter()
            .find(|(_, scene)| scene.aliases.iter().any(|a| a.to_lowercase() == needle))
            .map(|(name, _)| name.clone())
    }
}
