use std::time::SystemTime;

use ducktrace_logger::*;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn handle_room_dimmer_action<F, Fut>(
        &self,
        action: &str,
        device_name: &str,
        room: &str,
        default_action: F,
    ) -> Result<(), Box<dyn std::error::Error>>
    where
        F: FnOnce(String) -> Fut,
        Fut: std::future::Future<Output = Result<(), Box<dyn std::error::Error>>>,
    {
        let mut executed = false;
        let mut default_action = Some(default_action);

        if let Some(room_actions) = self.automations.dimmer_actions.get(room) {
            let dimmer_action = match action {
                "on_press_release" => &room_actions.on_press_release,
                "on_hold_release" => &room_actions.on_hold_release,
                "off_press_release" => &room_actions.off_press_release,
                "off_hold_release" => &room_actions.off_hold_release,
                "up_press_release" => &room_actions.up_press_release,
                "up_hold_release" => &room_actions.up_hold_release,
                "down_press_release" => &room_actions.down_press_release,
                "down_hold_release" => &room_actions.down_hold_release,
                _ => &None,
            };

            if let Some(config) = dimmer_action {
                if config.enable {
                    if !config.override_actions.is_empty() {
                        dt_debug!("Running override actions for {} in {}", action, room);
                        for override_action in &config.override_actions {
                            self.execute_automation_action(override_action, device_name, room)
                                .await?;
                        }
                        executed = true;
                    } else {
                        dt_debug!("Running default + extra actions for {} in {}", action, room);
                        if let Some(action_fn) = default_action.take() {
                            action_fn(room.to_string()).await?;
                        }
                        for extra_action in &config.extra_actions {
                            self.execute_automation_action(extra_action, device_name, room)
                                .await?;
                        }
                        executed = true;
                    }
                } else {
                    dt_debug!("Actions disabled for {} in {}", action, room);
                    executed = true;
                }
            }
        }


        if !executed {
            if let Some(default_actions) = self.automations.dimmer_actions.get("_default") {
                let dimmer_action = match action {
                    "on_press_release" => &default_actions.on_press_release,
                    "on_hold_release" => &default_actions.on_hold_release,
                    "off_press_release" => &default_actions.off_press_release,
                    "off_hold_release" => &default_actions.off_hold_release,
                    "up_press_release" => &default_actions.up_press_release,
                    "up_hold_release" => &default_actions.up_hold_release,
                    "down_press_release" => &default_actions.down_press_release,
                    "down_hold_release" => &default_actions.down_hold_release,
                    _ => &None,
                };

                if let Some(config) = dimmer_action {
                    if config.enable {
                        if !config.override_actions.is_empty() {
                            dt_debug!("Running default override actions for {}", action);
                            for override_action in &config.override_actions {
                                self.execute_automation_action(
                                    override_action,
                                    device_name,
                                    room,
                                )
                                .await?;
                            }
                            executed = true;
                        } else {
                            dt_debug!("Running default actions for {}", action);
                            if let Some(action_fn) = default_action.take() {
                                action_fn(room.to_string()).await?;
                            }
                            for extra_action in &config.extra_actions {
                                self.execute_automation_action(extra_action, device_name, room)
                                    .await?;
                            }
                            executed = true;
                        }
                    }
                }
            }
        }


        if !executed {
            dt_debug!("Running fallback default for {} in {}", action, room);
            if let Some(action_fn) = default_action.take() {
                action_fn(room.to_string()).await?;
            }
        }
        Ok(())
    }

    pub async fn check_double_click(
        &self,
        device_name: &str,
        room: &str,
        button_type: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let key = format!("{}:{}", device_name, button_type);
        let now = SystemTime::now();
        let mut last_press_map = self.last_button_press.lock().unwrap();

        if let Some(last) = last_press_map.get(&key) {
            if now.duration_since(*last).unwrap() < self.double_click_timeout {
                dt_info!(
                    "Double-click detected: device={}, room={}, button={}",
                    device_name,
                    room,
                    button_type
                );
                let elapsed = now.duration_since(*last).unwrap().as_millis();
                dt_info!("Time between presses: {} ms", elapsed);

                if button_type == "on" {
                    if let Some(scenes) = self.room_scenes.get(room) {
                        if !scenes.is_empty() {
                            let next_scene = {
                                let mut index_map = self.scene_index.write().unwrap();
                                let current_index = index_map.entry(room.to_string()).or_insert(0);
                                let next = scenes[*current_index].clone();
                                *current_index = (*current_index + 1) % scenes.len();
                                dt_info!("Cycling to scene: {} (index {})", next, *current_index);
                                next
                            };

                            self.activate_scene_filtered(&next_scene, Some(room))
                                .await?;
                        } else {
                            dt_info!("No scenes available for room {}", room);
                        }
                    } else {
                        dt_info!("No scenes configured for room {}", room);
                    }
                }
            }
        }
        last_press_map.insert(key, now);
        Ok(())
    }
}
