use ducktrace_logger::*;
use serde_json::json;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn room_lights_on(&self, room: &str) -> Result<(), Box<dyn std::error::Error>> {
        for (device_id, device) in &self.devices {
            if device.room == room && device.device_type == "light" {
                let message = json!({ "state": "ON" });
                let topic = format!("{}/{}/set", self.mqtt_base_topic, device_id);
                if let Err(e) = self.mqtt_publish(&topic, &message.to_string()).await {
                    dt_info!("Failed to turn on {}: {}", device_id, e);
                }
            }
        }
        Ok(())
    }


    pub async fn room_lights_off(&self, room: &str) -> Result<(), Box<dyn std::error::Error>> {
        for (device_id, device) in &self.devices {
            if device.room == room && device.device_type == "light" {
                let message = json!({ "state": "OFF" });
                let topic = format!("{}/{}/set", self.mqtt_base_topic, device_id);
                if let Err(e) = self.mqtt_publish(&topic, &message.to_string()).await {
                    dt_info!("Failed to turn off {}: {}", device_id, e);
                }
            }
        }
        Ok(())
    }

    pub async fn room_lights_off_with_transition(
        &self,
        room: &str,
        transition_secs: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (device_id, device) in &self.devices {
            if device.room != room {
                continue;
            }

            match device.device_type.as_str() {
                "light" => {
                    let message = json!({
                        "state": "OFF",
                        "transition": transition_secs
                    });
                    let topic = format!("{}/{}/set", self.mqtt_base_topic, device_id);
                    if let Err(e) = self.mqtt_publish(&topic, &message.to_string()).await {
                        dt_warning!("Failed to turn off {} with transition: {}", device_id, e);
                    }
                }
                "hue_light" => {
                    if let (Some(hue_id), Some(hue_client)) = (device.hue_id, &self.hue_client) {
                        let payload = json!({
                            "on": false,
                            "transitiontime": transition_secs * 10
                        });
                        if let Err(e) = hue_client.set_light_state(hue_id, payload).await {
                            dt_warning!("Failed to turn off Hue light {} with transition: {}", device_id, e);
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }


    pub async fn control_all_lights(
        &self,
        state: &str,
        brightness: Option<u8>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (device_id, device) in &self.devices {
            if device.device_type == "light" {
                let mut message = serde_json::Map::new();
                message.insert("state".to_string(), serde_json::Value::String(state.to_string()));
                if let Some(brightness) = brightness {
                    message.insert(
                        "brightness".to_string(),
                        serde_json::Value::Number(brightness.into()),
                    );
                }
                let topic = format!("{}/{}/set", self.mqtt_base_topic, device_id);
                if let Err(e) = self
                    .mqtt_publish(&topic, &serde_json::Value::Object(message).to_string())
                    .await
                {
                    dt_info!("Failed to control {}: {}", device_id, e);
                }
            }
        }
        let action = if state == "ON" { "ON" } else { "OFF" };
        dt_info!("💡 All lights turned {}", action);
        Ok(())
    }

    pub async fn all_lights_off_except(
        &self,
        exclude: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (device_id, device) in &self.devices {
            if exclude.iter().any(|e| e == device_id || e == &device.id) {
                dt_debug!("skipping excluded device: {}", device_id);
                continue;
            }

            match device.device_type.as_str() {
                "light" => {
                    let message = json!({ "state": "OFF" });
                    let topic = format!("{}/{}/set", self.mqtt_base_topic, device_id);
                    if let Err(e) = self.mqtt_publish(&topic, &message.to_string()).await {
                        dt_warning!("Failed to turn off {}: {}", device_id, e);
                    }
                }
                "hue_light" => {
                    if let Some(hue_id) = device.hue_id {
                        if let Some(hue_client) = &self.hue_client {
                            let payload = json!({ "on": false });
                            if let Err(e) = hue_client.set_light_state(hue_id, payload).await {
                                dt_warning!("failed to turn off Hue light {}: {}", device_id, e);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }
}
