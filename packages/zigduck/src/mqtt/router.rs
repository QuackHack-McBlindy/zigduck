use std::time::{Duration, SystemTime, UNIX_EPOCH};

use chrono::Local;
use ducktrace_logger::*;
use serde_json::Value;

use crate::state::ZigduckState;

impl ZigduckState {
    pub fn update_performance_stats(&mut self, topic: &str, duration: u128) {
        let current_avg = self.processing_times.get(topic).copied().unwrap_or(0);
        self.processing_times
            .insert(topic.to_string(), (current_avg + duration) / 2);
        *self.message_counts.entry(topic.to_string()).or_insert(0) += 1;
        self.total_messages += 1;
        if duration > 100 {
            dt_info!("[🦆📶] - SLOW PROCESSING: {} took {}ms", topic, duration);
        }

        if self.total_messages % 100 == 0 {
            dt_debug!("[🦆📶] - Total messages: {}", self.total_messages);
            for (topic_type, avg_time) in &self.processing_times {
                let count = self.message_counts.get(topic_type).unwrap_or(&0);
                dt_debug!("{}: avg {}ms, count {}", topic_type, avg_time, count);
            }
        }
    }

    // ==============================
    // 🦆 says ⮞ PROCESS MQTT MESSAGES
    pub async fn process_message(
        &mut self,
        topic: &str,
        payload: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // 🦆 says ⮞ start timer 4 exec time messurementz
        let start_time = std::time::Instant::now();
        // 🦆 says ⮞ skip large payloads
        if payload.len() > 10000 {
            dt_debug!(
                "Skipping large payload on topic: {} (size: {})",
                topic,
                payload.len()
            );
            return Ok(());
        }

        let base_prefix = format!("{}/", self.mqtt_base_topic);
        if let Some(rest) = topic.strip_prefix(&base_prefix) {
            if let Some(device_name) = rest.strip_suffix("/set") {
                if let Some(dev) = self.config.devices.get(device_name) {
                    if !dev.controls.is_empty() {
                        if let Ok(data) = serde_json::from_str::<Value>(payload) {
                            self.handle_house_device_set(device_name, dev, &data).await?;
                        } else {
                            dt_debug!("Invalid JSON on control topic {}", topic);
                        }
                        return Ok(());
                    }
                }
            }
        }

        // 🦆 says ⮞ MQTT TRIGGERED AUTOMATIONS
        if let Err(e) = self.check_mqtt_triggered_automations(topic, payload).await {
            dt_info!("Error checking MQTT automations: {}", e);
        }

        // 🦆 says ⮞ debug log raw payloadz yo
        dt_debug!("TOPIC: {}", topic);
        dt_debug!("PAYLOAD: {}", payload);
        let data: Value = match serde_json::from_str(payload) {
            Ok(parsed) => parsed,
            Err(_) => {
                dt_debug!("Invalid JSON payload: {}", payload);
                return Ok(());
            }
        };

        let device_cmd_prefix = format!("{}/device_command/", self.mqtt_base_topic);
        let dash_card_prefix = format!("{}/dashboard/card/", self.mqtt_base_topic);
        let scene_prefix = format!("{}/scene/", self.mqtt_base_topic);
        let tv_prefix = format!("{}/tv/", self.mqtt_base_topic);
        let snapshot_control_prefix = format!("{}/control/snapshot/", self.mqtt_base_topic);

        // 🦆 says ⮞ handle snapshot control commands (create / restore)
        if topic.starts_with(&snapshot_control_prefix) {
            let command = topic.strip_prefix(&snapshot_control_prefix).unwrap_or("");
            match command {
                "create" => {
                    if let Ok(params) = serde_json::from_str::<Value>(payload) {
                        let name = params
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("default");
                        let scope = params
                            .get("scope")
                            .and_then(|v| v.as_str())
                            .unwrap_or("global");
                        let room = params.get("room").and_then(|v| v.as_str());
                        let device_list = params.get("devices").and_then(|v| v.as_array()).map(
                            |arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect::<Vec<String>>()
                            },
                        );

                        if let Err(e) = self
                            .create_snapshot(name, scope, room, device_list.as_deref())
                            .await
                        {
                            dt_warning!("Failed to create snapshot via MQTT: {}", e);
                        } else {
                            dt_info!("Snapshot '{}' created via MQTT", name);
                        }
                    } else {
                        dt_warning!("Invalid JSON in snapshot create payload");
                    }
                    return Ok(());
                }
                "restore" => {
                    if let Ok(params) = serde_json::from_str::<Value>(payload) {
                        let name = params
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or("default");
                        if let Err(e) = self.restore_snapshot(name).await {
                            dt_warning!("Failed to restore snapshot via MQTT: {}", e);
                        } else {
                            dt_info!("Snapshot '{}' restored via MQTT", name);
                        }
                    } else {
                        dt_warning!("Invalid JSON in snapshot restore payload");
                    }
                    return Ok(());
                }
                _ => {}
            }
        }

        // 🦆 says ⮞ unified hue & z2m topic
        if topic.starts_with(&device_cmd_prefix) {
            let device_id = topic.strip_prefix(&device_cmd_prefix).unwrap_or("");
            if !device_id.is_empty() {
                return self.handle_device_command(device_id, payload).await;
            }
        }

        // 🦆 says ⮞ dashboard status card clicks automations
        if topic.starts_with(&dash_card_prefix) && topic.ends_with("/click") {
            let card_name = topic
                .strip_prefix(&dash_card_prefix)
                .and_then(|s| s.strip_suffix("/click"))
                .unwrap_or("");

            if !card_name.is_empty() {
                dt_info!("Dashboard card clicked: {}", card_name);

                // 🦆 says ⮞ parse payload 2 get click data
                if let Ok(_data) = serde_json::from_str::<Value>(payload) {
                    if let Some(card_config) = self.dashboard_config.cards.get(card_name) {
                        if card_config.enable {
                            for action in &card_config.on_click_action {
                                if let Err(e) = self
                                    .execute_automation_action_mqtt(
                                        action, card_name, "dashboard", topic, payload,
                                    )
                                    .await
                                {
                                    dt_debug!(
                                        "Error executing dashboard card action: {}",
                                        e
                                    );
                                }
                            }
                        } else {
                            dt_debug!("Card {} is disabled", card_name);
                        }
                    } else {
                        dt_debug!("No configuration found for card: {}", card_name);
                    }
                }
            }
            return Ok(());
        }

        // 🦆 says ⮞ dashboard triggered scene activation
        if topic.starts_with(&scene_prefix) {
            let scene_name = topic.strip_prefix(&scene_prefix).unwrap_or("");

            if !scene_name.is_empty() {
                dt_debug!("activating scene: {}", scene_name);

                if let Err(e) = self.activate_scene(scene_name).await {
                    dt_warning!("Error activating scene: {}", e);
                }
            }
            return Ok(());
        }

        // 🦆 says ⮞ tv
        if topic.starts_with(&tv_prefix) && topic.ends_with("/channel") {
            if let Some(device_ip) = topic.split('/').nth(2) {
                if let (Some(channel_id), Some(channel_name)) = (
                    data["channel_id"].as_str(),
                    data["channel_name"].as_str(),
                ) {
                    let device_key = format!("tv_{}", device_ip);
                    self.update_device_state(&device_key, "current_channel", channel_id)?;
                    self.update_device_state(&device_key, "current_channel_name", channel_name)?;
                    let timestamp = Local::now().to_rfc3339();
                    self.update_device_state(&device_key, "last_update", &timestamp)?;
                    dt_info!("📺 {} live tv channel: {}", device_ip, channel_name);
                }
            }
            return Ok(());
        }

        let prefix = format!("{}/", self.mqtt_base_topic);
        let device_name = topic.strip_prefix(&prefix).unwrap_or(topic);

        // 🦆 says ⮞ STATE UPDATES
        if let Err(e) = self.update_device_state_from_data(device_name, &data) {
            dt_debug!("Failed to update device state: {}", e);
        }

        if let Some(device) = self.get_device(device_name) {
            let room = device.room.clone();
            let device_type = device.device_type.clone();

            // 🦆 says ⮞ ❤️‍🔥 FIRE / SMOKE DETECTOR
            if let Some(smoke) = data["smoke"].as_bool() {
                if smoke {
                    dt_info!("❤️‍🔥❤️‍🔥 SMOKE! in {} {}", device_name, room);
                    let state_clone = self.clone();
                    let dev = device_name.to_string();
                    let r = room.to_string();
                    tokio::spawn(async move {
                        if let Err(e) = state_clone
                            .execute_automations("smoke", "smoke_detected", &dev, &r)
                            .await
                        {
                            dt_warning!("smoke automation failed: {}", e);
                        }
                    });
                }
            }

            // 🦆 says ⮞ 🕵️ MOTION SENSORS
            if let Some(occupancy) = data["occupancy"].as_bool() {
                let prev_occ = self
                    .motion_tracker
                    .read()
                    .ok()
                    .and_then(|t| t.last_occupancy.get(device_name).copied());
                let fresh = match data["last_seen"].as_str() {
                    Some(s) => chrono::DateTime::parse_from_rfc3339(s)
                        .map(|dt| {
                            let age = chrono::Utc::now()
                                .signed_duration_since(dt.with_timezone(&chrono::Utc))
                                .num_seconds();
                            age < 120 && age > -120
                        })
                        .unwrap_or(true),
                    None => true,
                };
                let edge = prev_occ != Some(occupancy);
                if let Ok(mut t) = self.motion_tracker.write() {
                    t.last_occupancy.insert(device_name.to_string(), occupancy);
                }
                let repeat = !edge && prev_occ.is_some();
                let stale = !fresh;
                if repeat {
                    dt_debug!(
                        "repeat occupancy={} for {} - ignoring",
                        occupancy,
                        device_name
                    );
                } else if stale {
                    dt_debug!(
                        "stale occupancy={} for {} (last_seen={:?}) - ignoring",
                        occupancy,
                        device_name,
                        data["last_seen"]
                    );
                }
                if occupancy && !stale {
                    let ts = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                    self.update_motion_tracker(device_name);
                    self.update_device_state("apartment", "last_motion", &ts.to_string())?;
                }

                if occupancy && !repeat && !stale {
                    dt_debug!("🕵️ Motion in {} {}", device_name, room);

                    let state_clone = self.clone();
                    let dev = device_name.to_string();
                    let r = room.to_string();
                    tokio::spawn(async move {
                        if let Err(e) = state_clone
                            .execute_automations("motion", "motion_detected", &dev, &r)
                            .await
                        {
                            dt_warning!("motion_detected automation failed: {}", e);
                        }
                    });

                    if self.is_dark_time() {
                        if let Some(existing_timer) = self.motion_timers.remove(&room) {
                            existing_timer.abort();
                            dt_debug!("⏰ Cancelled existing timer for {}", room);
                        }
                        self.set_motion_triggered(&room, true)?;
                        if !self.has_motion_automation_for_room(&room) {
                            self.room_lights_on(&room).await?;
                        }
                    } else {
                        dt_debug!("❌ Daytime - no lights activated by motion.");
                    }
                } else if !occupancy && edge {
                    dt_debug!("🛑 No more motion in {} {}", device_name, room);
                    let state_clone = self.clone();
                    let dev = device_name.to_string();
                    let r = room.to_string();
                    tokio::spawn(async move {
                        if let Err(e) = state_clone
                            .execute_automations("motion", "motion_not_detected", &dev, &r)
                            .await
                        {
                            dt_warning!("motion_not_detected automation failed: {}", e);
                        }
                    });
                    if self.is_motion_triggered(&room) {
                        // 🦆 says ⮞ if transition is enabled, fade out over duration instead of waiting
                        if self.config.dark_time.transition {
                            if let Some(timer) = self.motion_timers.remove(&room) {
                                timer.abort();
                            }
                            let transition_secs = self.config.dark_time.duration;
                            dt_debug!(
                                "💡 Motion stopped in {}, fading lights off over {}s",
                                room,
                                transition_secs
                            );

                            if let Err(e) = self
                                .room_lights_off_with_transition(&room, transition_secs)
                                .await
                            {
                                dt_warning!(
                                    "Failed to turn off lights with transition in {}: {}",
                                    room,
                                    e
                                );
                            }
                            let _ = self.set_motion_triggered(&room, false);
                        } else {
                            dt_debug!(
                                "⏰ Motion stopped in {}, will turn off lights in {}s",
                                room,
                                self.config.dark_time.duration
                            );
                            let room_clone = room.clone();
                            let state_clone = std::sync::Arc::new(self.clone());
                            let duration = self.config.dark_time.duration;
                            let timer_handle = tokio::spawn(async move {
                                tokio::time::sleep(Duration::from_secs(duration)).await;
                                if state_clone.is_motion_triggered(&room_clone) {
                                    dt_debug!(
                                        "💡 Turning off motion-triggered lights in {}",
                                        room_clone
                                    );
                                    let _ = state_clone.room_lights_off(&room_clone).await;
                                    let _ = state_clone.set_motion_triggered(&room_clone, false);
                                }
                            });
                            if let Some(old) = self.motion_timers.remove(&room) {
                                old.abort();
                            }
                            self.motion_timers.insert(room.clone(), timer_handle);
                        }
                    }
                }
            }

            // 🦆 says ⮞ 💧 WATER SENSORS
            if data["water_leak"].as_bool() == Some(true)
                || data["waterleak"].as_bool() == Some(true)
            {
                dt_info!("💧 WATER LEAK DETECTED in {} on {}", room, device_name);
                let state_clone = self.clone();
                let dev = device_name.to_string();
                let r = room.to_string();
                tokio::spawn(async move {
                    if let Err(e) = state_clone
                        .execute_automations("water_leak", "leak_detected", &dev, &r)
                        .await
                    {
                        dt_warning!("water_leak automation failed: {}", e);
                    }
                });
            }

            // 🦆 says ⮞ 🚪 DOOR / WINDOW SENSOR
            if let Some(contact) = data["contact"].as_bool() {
                if let Some(greeting) = &self.automations.greeting {
                    if device_name == greeting.door {
                        let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
                        if contact {
                            let _ = self.update_device_state(
                                "apartment",
                                "last_door_close",
                                &ts.to_string(),
                            );
                            dt_debug!(
                                "🚪 door '{}' CLOSED at {} (presence tracker)",
                                greeting.door,
                                ts
                            );
                        } else {
                            let _ = self.update_device_state(
                                "apartment",
                                "last_door_open",
                                &ts.to_string(),
                            );
                            dt_debug!(
                                "🚪 door '{}' OPENED at {} (presence tracker)",
                                greeting.door,
                                ts
                            );
                        }
                    }
                }

                let trigger = if contact { "door_closed" } else { "door_opened" };
                let _ = std::fs::write(
                    &self.state_file,
                    serde_json::to_string(&*self.device_states.read().unwrap()).unwrap(),
                );
                dt_info!("🚪 {} {} in {}", device_name, trigger, room);
                let state_clone = self.clone();
                let device_name_owned = device_name.to_string();
                let room_owned = room.to_string();
                let trigger_owned = trigger.to_string();
                tokio::spawn(async move {
                    if let Err(e) = state_clone
                        .execute_automations(
                            "contact",
                            &trigger_owned,
                            &device_name_owned,
                            &room_owned,
                        )
                        .await
                    {
                        dt_warning!("contact automation failed: {}", e);
                    }
                });
            }

            // 🦆 says ⮞ 🚪 GREETING (DOOR SENSOR)
            if let Some(greeting) = &self.automations.greeting {
                if greeting.enable {
                    if device_name == greeting.door {
                        let is_open = data
                            .get(&greeting.message)
                            .and_then(|v| v.as_bool())
                            .map(|b| !b)
                            .unwrap_or(false);
                        if is_open {
                            let current_time = SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_secs();
                            let last_motion_str = self
                                .get_state("apartment", "last_motion")
                                .unwrap_or_else(|| "0".to_string());
                            let last_motion: u64 = last_motion_str.parse().unwrap_or(0);
                            let time_diff = current_time.saturating_sub(last_motion);

                            if time_diff > greeting.away_duration {
                                dt_info!("🚪 Door '{}' opened. Welcome home!", greeting.door);
                                let greeting = greeting.clone();
                                let state = self.clone();
                                tokio::spawn(async move {
                                    tokio::time::sleep(Duration::from_secs(greeting.delay)).await;
                                    for action in &greeting.actions {
                                        if let Err(e) = state
                                            .execute_automation_action(
                                                action, "greeting", "global",
                                            )
                                            .await
                                        {
                                            dt_error!(
                                                "Error executing greeting action: {}",
                                                e
                                            );
                                        }
                                    }
                                });
                            } else {
                                dt_debug!(
                                    "🛑 Door opened but only {} seconds since last motion, not greeting.",
                                    time_diff
                                );
                            }
                        }
                    }
                }
            }

            // 🦆 says ⮞ BLINDz
            if let Some(position) = data["position"].as_u64() {
                if device_type == "blind" {
                    if position == 0 {
                        dt_info!("🪟 Rolled DOWN {} in {}", device_name, room);
                    } else if position == 100 {
                        dt_info!("🪟 Rolled UP {} in {}", device_name, room);
                    } else {
                        dt_info!(
                            "🪟 {} positioned at {}% in {}",
                            device_name,
                            position,
                            room
                        );
                    }
                }
            }

            // 🦆 says ⮞ STATE
            if let Some(state) = data["state"].as_str() {
                match device_type.as_str() {
                    "outlet" => {
                        if state == "ON" {
                            dt_debug!("🔌 {} Turned ON in {}", device_name, room);
                        } else if state == "OFF" {
                            dt_debug!("🔌 {} Turned OFF in {}", device_name, room);
                        }
                    }
                    "light" => {
                        if state == "ON" {
                            dt_debug!("💡 {} Turned ON in {}", device_name, room);
                        } else if state == "OFF" {
                            dt_debug!("💡 {} Turned OFF in {}", device_name, room);
                        }
                    }
                    _ => {
                        if state == "ON" {
                            dt_debug!("⚡ {} Turned ON in {}", device_name, room);
                        } else if state == "OFF" {
                            dt_debug!("⚡ {} Turned OFF in {}", device_name, room);
                        }
                    }
                }
            }

            // 🦆 says ⮞ 🎚 DIMMER SWITCH
            if let Some(action) = data[&self.config.dimmer.message_key].as_str() {
                if action == self.config.dimmer.actions.on_press {
                    self.handle_room_dimmer_action(action, device_name, &room, async |r: String| {
                        dt_info!("💡 Turning on lights in {}", r);
                        self.room_lights_on(&r).await
                    })
                    .await?;
                    self.check_double_click(device_name, &room, "on").await?;
                } else if action == self.config.dimmer.actions.on_hold {
                    self.handle_room_dimmer_action(action, device_name, &room, async |_| {
                        self.control_all_lights("ON", Some(254)).await?;
                        dt_info!("✅💡 MAX LIGHTS ON");
                        Ok(())
                    })
                    .await?;
                    self.check_double_click(device_name, &room, "on_hold").await?;
                } else if action == self.config.dimmer.actions.off_press {
                    self.handle_room_dimmer_action(action, device_name, &room, async |r: String| {
                        dt_info!("💡 Turning off lights in {}", r);
                        self.room_lights_off(&r).await
                    })
                    .await?;
                    self.check_double_click(device_name, &room, "off").await?;
                } else if action == self.config.dimmer.actions.off_hold {
                    self.handle_room_dimmer_action(action, device_name, &room, async |_| {
                        self.control_all_lights("OFF", None).await?;
                        dt_info!("🦆 DARKNESS ON");
                        Ok(())
                    })
                    .await?;
                    self.check_double_click(device_name, &room, "off_hold").await?;
                } else if action == self.config.dimmer.actions.up_press {
                    self.handle_room_dimmer_action(action, device_name, &room, async |r: String| {
                        for (light_id, light_device) in &self.devices {
                            if light_device.room == r && light_device.device_type == "light" {
                                dt_info!("🔺 Increasing brightness on {} in {}", light_id, r);
                                let message =
                                    serde_json::json!({"brightness_step": 50, "transition": 3.5});
                                let topic =
                                    format!("{}/{}/set", self.mqtt_base_topic, light_id);
                                self.mqtt_publish(&topic, &message.to_string()).await?;
                            }
                        }
                        Ok(())
                    })
                    .await?;
                } else if action == self.config.dimmer.actions.down_press {
                    self.handle_room_dimmer_action(action, device_name, &room, async |r: String| {
                        for (light_id, light_device) in &self.devices {
                            if light_device.room == r && light_device.device_type == "light" {
                                dt_info!("🔻 Decreasing {} in {}", light_id, r);
                                let message =
                                    serde_json::json!({"brightness_step": -50, "transition": 3.5});
                                let topic =
                                    format!("{}/{}/set", self.mqtt_base_topic, light_id);
                                self.mqtt_publish(&topic, &message.to_string()).await?;
                            }
                        }
                        Ok(())
                    })
                    .await?;
                } else if action == self.config.dimmer.actions.up_hold
                    || action == self.config.dimmer.actions.down_hold
                {
                    self.handle_room_dimmer_action(action, device_name, &room, async |_| {
                        dt_debug!("{} in {}", action, room);
                        Ok(())
                    })
                    .await?;
                } else {
                    dt_debug!("Unhandled dimmer action: {}", action);
                }
            }
        }

        let duration = start_time.elapsed().as_millis();
        self.update_performance_stats(topic, duration);
        Ok(())
    }
}
