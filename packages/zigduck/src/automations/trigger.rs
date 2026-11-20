use ducktrace_logger::*;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn check_mqtt_triggered_automations(
        &self,
        topic: &str,
        payload: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (name, automation) in &self.automations.mqtt_triggered {
            if !automation.enable {
                continue;
            }

            if topic == automation.topic {

                if let Some(expected_msg) = &automation.message {
                    if payload != expected_msg {
                        continue;
                    }
                }

                if self.check_conditions(&automation.conditions).await {
                    dt_debug!("Triggering MQTT automation: {}", automation.description);
                    let actions = automation.actions.clone();
                    let state = self.clone();
                    let topic = topic.to_string();
                    let payload = payload.to_string();
                    tokio::spawn(async move {
                        for action in &actions {
                            if let Err(e) = state
                                .execute_automation_action_mqtt(
                                    action,
                                    "mqtt_triggered",
                                    "global",
                                    &topic,
                                    &payload,
                                )
                                .await
                            {
                                dt_error!("Error executing MQTT automation action: {}", e);
                            }
                        }
                    });
                }
                let _ = name;
            }
        }
        Ok(())
    }

    pub async fn execute_automations(
        &self,
        automation_type: &str,
        trigger: &str,
        device_name: &str,
        room: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        match automation_type {
            "motion" => {
                if let Some(actions) = self.automations.room_actions.get(room) {
                    if let Some(motion_actions) = actions.get(trigger) {
                        for action in motion_actions {
                            self.execute_automation_action(action, device_name, room).await?;
                        }
                    }
                }
            }
            "contact" => {
                if let Some(actions) = self.automations.room_actions.get(room) {
                    if let Some(contact_actions) = actions.get(trigger) {
                        for action in contact_actions {
                            self.execute_automation_action(action, device_name, room).await?;
                        }
                    }
                }
            }
            "water_leak" => {
                if let Some(actions) = self.automations.global_actions.get(trigger) {
                    for action in actions {
                        self.execute_automation_action(action, device_name, room).await?;
                    }
                }
            }
            "smoke" => {
                if let Some(actions) = self.automations.global_actions.get(trigger) {
                    for action in actions {
                        self.execute_automation_action(action, device_name, room).await?;
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }


    pub fn has_motion_automation_for_room(&self, room: &str) -> bool {
        self.automations
            .room_actions
            .get(room)
            .and_then(|actions| actions.get("motion_detected"))
            .map(|actions| !actions.is_empty())
            .unwrap_or(false)
    }
}
