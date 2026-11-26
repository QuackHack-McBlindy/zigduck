use std::time::Duration;

use ducktrace_logger::*;
use tokio::process::Command as TokioCommand;

use crate::domain::AutomationAction;
use crate::state::ZigduckState;
//
impl ZigduckState {
    pub async fn execute_automation_action(
        &self,
        action: &AutomationAction,
        device_name: &str,
        room: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        dt_debug!("Executing automation action for {} in {}", device_name, room);

        match action {
            AutomationAction::Simple(cmd) => {
                self.run_simple_action(cmd, device_name, room, &[]).await?;
            }
            AutomationAction::Structured(action_config) => match action_config.action_type.as_str() {
                "mqtt" => {
                    if let (Some(topic), Some(message)) = (&action_config.topic, &action_config.message) {
                        self.mqtt_publish(topic, message).await?;
                    }
                }
                "shell" => {
                    if let Some(cmd) = &action_config.command {
                        let output = TokioCommand::new("sh")
                            .arg("-c")
                            .arg(cmd)
                            .env("AUTOMATION_DEVICE", device_name)
                            .env("AUTOMATION_ROOM", room)
                            .output()
                            .await?;

                        if !output.status.success() {
                            dt_error!(
                                "Shell command failed: {}",
                                String::from_utf8_lossy(&output.stderr)
                            );
                        }
                    }
                }
                "scene" => {
                    if let Some(scene_name) = &action_config.scene {
                        self.activate_scene(scene_name).await?;
                    }
                }
                "device" => {
                    if let Err(e) = self.run_device_action(action_config).await {
                        dt_warning!("device action failed: {}", e);
                    }
                }
                "snapshot" => {
                    let snapshot_name = action_config
                        .snapshot_name
                        .clone()
                        .unwrap_or("default".to_string());
                    let scope = action_config.scope.clone().unwrap_or("global".to_string());
                    let room = action_config.room.clone();
                    let device_list = action_config.devices.clone();
                    self.create_snapshot(
                        &snapshot_name,
                        &scope,
                        room.as_deref(),
                        device_list.as_deref(),
                    )
                    .await?;
                }
                "restore" => {
                    let snapshot_name = action_config
                        .snapshot_name
                        .clone()
                        .unwrap_or("default".to_string());
                    self.restore_snapshot(&snapshot_name).await?;
                }
                "wait" => {
                    if let Some(seconds) = action_config.duration {
                        dt_debug!("⏳ Waiting {}s", seconds);
                        tokio::time::sleep(Duration::from_secs(seconds)).await;
                    }
                }
                _ => {}
            },
        }
        Ok(())
    }

    pub async fn execute_automation_action_mqtt(
        &self,
        action: &AutomationAction,
        device_name: &str,
        room: &str,
        topic: &str,
        payload: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        dt_debug!("Executing MQTT automation action for {} in {}", device_name, room);

        let mut extra_env: Vec<(String, String)> = vec![
            ("MQTT_TOPIC".into(), topic.into()),
            ("MQTT_PAYLOAD".into(), payload.into()),
            ("MQTT_DEVICE".into(), device_name.into()),
            ("MQTT_ROOM".into(), room.into()),
        ];
        if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload) {
            if let Some(action_val) = data.get("action").and_then(|v| v.as_str()) {
                extra_env.push(("MQTT_ACTION".into(), action_val.into()));
            }
            if let Some(state_val) = data.get("state").and_then(|v| v.as_str()) {
                extra_env.push(("MQTT_STATE".into(), state_val.into()));
            }
        }

        match action {
            AutomationAction::Simple(cmd) => {
                self.run_simple_action(cmd, device_name, room, &extra_env).await?;
            }
            AutomationAction::Structured(action_config) => match action_config.action_type.as_str() {
                "mqtt" => {
                    if let (Some(t), Some(m)) = (&action_config.topic, &action_config.message) {
                        self.mqtt_publish(t, m).await?;
                    }
                }
                "shell" => {
                    if let Some(cmd) = &action_config.command {
                        let mut cmd_builder = TokioCommand::new("sh");
                        cmd_builder
                            .arg("-c")
                            .arg(cmd)
                            .env("AUTOMATION_DEVICE", device_name)
                            .env("AUTOMATION_ROOM", room);
                        for (k, v) in &extra_env {
                            cmd_builder.env(k, v);
                        }
                        let output = cmd_builder.output().await?;
                        if !output.status.success() {
                            dt_warning!(
                                "Shell command failed: {}",
                                String::from_utf8_lossy(&output.stderr)
                            );
                        }
                    }
                }
                "snapshot" => {
                    let snapshot_name = action_config
                        .snapshot_name
                        .clone()
                        .unwrap_or("default".to_string());
                    let scope = action_config.scope.clone().unwrap_or("global".to_string());
                    let room = action_config.room.clone();
                    let device_list = action_config.devices.clone();
                    self.create_snapshot(
                        &snapshot_name,
                        &scope,
                        room.as_deref(),
                        device_list.as_deref(),
                    )
                    .await?;
                }
                "restore" => {
                    let snapshot_name = action_config
                        .snapshot_name
                        .clone()
                        .unwrap_or("default".to_string());
                    self.restore_snapshot(&snapshot_name).await?;
                }
                "scene" => {
                    if let Some(scene_name) = &action_config.scene {
                        self.activate_scene(scene_name).await?;
                    }
                }
                "device" => {
                    if let Err(e) = self.run_device_action(action_config).await {
                        dt_warning!("device action failed: {}", e);
                    }
                }
                _ => {}
            },
        }
        Ok(())
    }

    pub async fn run_simple_action(
        &self,
        cmd: &str,
        device_name: &str,
        room: &str,
        extra_env: &[(String, String)],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let prefix = self.config.simple_actions.prefix.trim();
        if prefix.is_empty() {
            return self.run_shell_raw(cmd, device_name, room, extra_env).await;
        }
        let mut parts = prefix.split_whitespace();
        let program = parts.next().unwrap_or("yo");
        let prefix_args: Vec<&str> = parts.collect();

        dt_debug!("simple action via '{}': {:?}", prefix, cmd);
        let mut cmd_builder = TokioCommand::new(program);
        cmd_builder
            .args(&prefix_args)
            .arg(cmd)
            .env("AUTOMATION_DEVICE", device_name)
            .env("AUTOMATION_ROOM", room);
        for (k, v) in extra_env {
            cmd_builder.env(k, v);
        }
        let output = cmd_builder.output().await?;

        let code = output.status.code();
        if output.status.success() {
            dt_debug!("simple action ok via '{}': exit={:?}", prefix, code);
        } else {
            dt_warning!(
                "simple action FAILED via '{}' (exit={:?}) cmd={:?} stderr={:?}",
                prefix,
                code,
                cmd,
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Ok(())
    }

    pub async fn run_shell_raw(
        &self,
        cmd: &str,
        device_name: &str,
        room: &str,
        extra_env: &[(String, String)],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut cmd_builder = TokioCommand::new("sh");
        cmd_builder
            .arg("-c")
            .arg(cmd)
            .env("AUTOMATION_DEVICE", device_name)
            .env("AUTOMATION_ROOM", room);
        for (k, v) in extra_env {
            cmd_builder.env(k, v);
        }
        let output = cmd_builder.output().await?;

        if !output.status.success() {
            dt_warning!(
                "shell FAILED (exit={:?}) cmd={:?} stderr={:?}",
                output.status.code(),
                cmd,
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Ok(())
    }
    pub async fn run_device_action(
        &self,
        a: &crate::domain::StructuredAction,
    ) -> Result<(), Box<dyn std::error::Error>> {
        use serde_json::json;

        let device_name = a.device.as_deref()
            .ok_or("device action: 'device' field is required")?;
        let operation = a.operation.as_deref()
            .ok_or("device action: 'operation' field is required")?;

        let device = self.get_device(device_name)
            .ok_or_else(|| format!("device action: device '{}' not found", device_name))?;

        dt_debug!(
            "device action: op={} target={} prop={:?}",
            operation,
            device_name,
            a.property
        );

        if operation == "read" {
            let prop = a.property.as_deref().unwrap_or("state");
            let val = self.get_state(device_name, prop);
            dt_info!("📖 device read: {}.{} = {:?}", device_name, prop, val);
            return Ok(());
        }

        let payload: serde_json::Value = match operation {
            "on"    => json!({ "state": "ON" }),
            "off"   => json!({ "state": "OFF" }),
            "toggle" => match device.device_type.as_str() {
                "blind" => {
                    let pos = self
                        .get_state(device_name, "position")
                        .and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0);
                    json!({ "position": if pos > 50 { 0 } else { 100 } })
                }
                _ => {
                    let cur = self
                        .get_state(device_name, "state")
                        .unwrap_or_else(|| "OFF".to_string());
                    let next = if cur.eq_ignore_ascii_case("on") { "OFF" } else { "ON" };
                    json!({ "state": next })
                }
            },
            "open" => match device.device_type.as_str() {
                "blind" => json!({ "position": 100 }),
                _ => json!({ "state": "OPEN" }),
            },
            "close" => match device.device_type.as_str() {
                "blind" => json!({ "position": 0 }),
                _ => json!({ "state": "CLOSE" }),
            },
            "set" => {
                let prop = a.property.as_deref()
                    .ok_or("device action: 'set' requires 'property'")?;
                let val = a.value.as_ref()
                    .ok_or("device action: 'set' requires 'value'")?;
                json!({ prop: val })
            }
            other => {
                return Err(format!("device action: unknown operation '{}'", other).into())
            }
        };

        let payload_str = serde_json::to_string(&payload)?;
        dt_debug!("device action payload: {}", payload_str);

        self.handle_device_command(device_name, &payload_str).await
    }
}
