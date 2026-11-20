use std::time::Duration;

use ducktrace_logger::*;
use serde_json::Value;
use tokio::process::Command as TokioCommand;

use crate::config::HouseDevice;
use crate::domain::AutomationAction;
use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn handle_house_device_set(
        &self,
        device_name: &str,
        device: &HouseDevice,
        data: &Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let obj = match data.as_object() {
            Some(o) => o,
            None => {
                dt_debug!("Non-object control payload for {}: {}", device_name, data);
                return Ok(());
            }
        };

        let ip = device.ip.clone().unwrap_or_default();
        let mut executed = false;

        for (key, value) in obj {
            let ctrl = match device.controls.get(key) {
                Some(c) => c,
                None => {
                    dt_debug!("Unknown control '{}' on '{}'", key, device_name);
                    continue;
                }
            };

            if ctrl.control_type == "sensor" || ctrl.actions.is_empty() {
                dt_debug!(
                    "Skipping control '{}.{}' ({} action(s))",
                    device_name,
                    key,
                    ctrl.actions.len()
                );
                continue;
            }

            let value_str = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => continue,
                other => other.to_string(),
            };

            dt_info!("{}.{} = {}", device_name, key, value_str);
            executed = true;

            for action in &ctrl.actions {
                if let Err(e) = self
                    .execute_control_action(action, device_name, key, &value_str, &ip)
                    .await
                {
                    dt_warning!("Control action failed for {}.{}: {}", device_name, key, e);
                }
            }
        }

        if executed {
            if let (Some(endpoint), Some(ip)) = (device.effective_state_endpoint(), &device.ip) {
                let url = format!("http://{}{}", ip, endpoint);
                dt_debug!("Refreshing state for {} from {}", device_name, url);

                match reqwest::Client::new()
                    .get(&url)
                    .timeout(Duration::from_secs(5))
                    .send()
                    .await
                {
                    Ok(resp) if resp.status().is_success() => match resp.json::<Value>().await {
                        Ok(mut fresh) => {
                            if let Some(map) = fresh.as_object_mut() {
                                map.insert(
                                    "last_seen".into(),
                                    Value::String(
                                        chrono::Utc::now()
                                            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                                    ),
                                );
                            }
                            if let Ok(payload) = serde_json::to_string(&fresh) {
                                let topic = format!("{}/{}", self.mqtt_base_topic, device_name);
                                if let Err(e) = self.mqtt_publish(&topic, &payload).await {
                                    dt_warning!(
                                        "Failed to publish refreshed state for {}: {}",
                                        device_name,
                                        e
                                    );
                                } else {
                                    dt_debug!(
                                        "Republished state for {} to {} ({} fields)",
                                        device_name,
                                        topic,
                                        fresh.as_object().map(|o| o.len()).unwrap_or(0)
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            dt_warning!("Failed to parse state JSON from {}: {}", url, e)
                        }
                    },
                    Ok(resp) => dt_warning!(
                        "State refresh for {} returned HTTP {}",
                        device_name,
                        resp.status()
                    ),
                    Err(e) => dt_warning!("State refresh for {} failed: {}", device_name, e),
                }
            } else {
                dt_debug!(
                    "No state_endpoint/ip configured for {}; skipping refresh",
                    device_name
                );
            }
        }
        Ok(())
    }

    pub async fn execute_control_action(
        &self,
        action: &AutomationAction,
        device_name: &str,
        key: &str,
        value: &str,
        ip: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let subst = |s: &str| s.replace("{value}", value);

        match action {
            AutomationAction::Simple(cmd) => {
                self.run_control_shell(cmd, device_name, key, value, ip).await?;
            }
            AutomationAction::Structured(a) => match a.action_type.as_str() {
                "shell" => {
                    if let Some(cmd) = &a.command {
                        self.run_control_shell(cmd, device_name, key, value, ip).await?;
                    }
                }
                "mqtt" => {
                    if let (Some(t), Some(m)) = (&a.topic, &a.message) {
                        self.mqtt_publish(&subst(t), &subst(m)).await?;
                    }
                }
                "scene" => {
                    if let Some(s) = &a.scene {
                        self.activate_scene(s).await?;
                    }
                }
                "wait" => {
                    if let Some(d) = a.duration {
                        tokio::time::sleep(Duration::from_secs(d)).await;
                    }
                }
                "snapshot" => {
                    let name = a.snapshot_name.clone().unwrap_or_else(|| "default".into());
                    let scope = a.scope.clone().unwrap_or_else(|| "global".into());
                    self.create_snapshot(&name, &scope, a.room.as_deref(), a.devices.as_deref())
                        .await?;
                }
                "restore" => {
                    let name = a.snapshot_name.clone().unwrap_or_else(|| "default".into());
                    self.restore_snapshot(&name).await?;
                }
                _ => dt_debug!("Unknown control action type: {}", a.action_type),
            },
        }
        Ok(())
    }

    pub async fn run_control_shell(
        &self,
        cmd: &str,
        device_name: &str,
        key: &str,
        value: &str,
        ip: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let output = TokioCommand::new("sh")
            .arg("-c")
            .arg(cmd)
            .env("VALUE", value)
            .env("KEY", key)
            .env("DEVICE", device_name)
            .env("IP", ip)
            .output()
            .await?;

        if !output.status.success() {
            dt_warning!(
                "Control shell failed ({}.{}): {}",
                device_name,
                key,
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Ok(())
    }
}
