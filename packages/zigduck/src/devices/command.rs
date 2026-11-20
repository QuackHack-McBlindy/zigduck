use ducktrace_logger::*;
use serde_json::Value;
use tokio::process::Command as TokioCommand;

use crate::state::ZigduckState;

impl ZigduckState {
    pub fn handle_device_command<'a>(
        &'a self,
        device_id: &'a str,
        payload: &'a str,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<(), Box<dyn std::error::Error>>> + 'a>,
    > {
        Box::pin(async move {
            let data: Value = match serde_json::from_str(payload) {
                Ok(d) => d,
                Err(e) => {
                    dt_debug!("Failed to parse payload: {}", e);
                    return Ok(());
                }
            };

            let normalize = |s: &str| s.to_lowercase().trim_start_matches("0x").to_string();
            let incoming_norm = normalize(device_id);

            let mut resolved_device = None;

            for (key, info) in &self.devices {
                if normalize(&info.id) == incoming_norm {
                    resolved_device = Some(info);
                    break;
                }

                if let Some(ieee) = &info.ieee {
                    if normalize(ieee) == incoming_norm {
                        resolved_device = Some(info);
                        break;
                    }
                }

                if key.eq_ignore_ascii_case(device_id) || info.id.eq_ignore_ascii_case(device_id) {
                    resolved_device = Some(info);
                    break;
                }
            }

            let device_info = match resolved_device {
                Some(d) => d,
                None => {
                    dt_info!("❌ Device not found: {}", device_id);
                    dt_info!("Available devices: {:?}", self.devices.keys().collect::<Vec<_>>());
                    return Ok(());
                }
            };


            match device_info.device_type.as_str() {
                "hue_light" => {
                    let mut hue_payload = serde_json::Map::new();

                    if let Some(state) = data.get("state").and_then(|v| v.as_str()) {
                        hue_payload.insert(
                            "on".into(),
                            Value::Bool(state.eq_ignore_ascii_case("on")),
                        );
                    }

                    if let Some(brightness) = data.get("brightness").and_then(|v| v.as_u64()) {
                        let bri = if brightness > 100 {
                            brightness.clamp(0, 254)
                        } else { ((brightness as f64 / 100.0) * 254.0).round() as u64 };
                        hue_payload.insert("bri".into(), Value::Number(bri.into()));
                    }

                    if let Some(transition) = data.get("transition").and_then(|v| v.as_f64()) {
                        hue_payload.insert(
                            "transitiontime".into(),
                            Value::Number(((transition * 100.0).round() as u64).into()),
                        );
                    }

                    if hue_payload.contains_key("on") && !hue_payload.contains_key("bri") {
                        hue_payload.insert("bri".into(), Value::Number(254.into()));
                    }

                    let hue_json = serde_json::to_string(&Value::Object(hue_payload))?;
                    dt_debug!("Hue payload: {}", hue_json);

                    let output = TokioCommand::new("zigduck-cli")
                        .arg("--device")
                        .arg(&device_info.id)
                        .arg("--json")
                        .arg(&hue_json)
                        .output()
                        .await?;

                    if !output.status.success() {
                        dt_debug!("Hue failed: {}", String::from_utf8_lossy(&output.stderr));
                    }
                }


                _ => {
                    let topic = format!("{}/{}/set", self.mqtt_base_topic, device_info.id);
                    dt_debug!("MQTT -> {}", topic);
                    self.mqtt_publish(&topic, payload).await?;
                }
            }

            Ok(())
        })
    }
}
