use std::time::Duration;

use ducktrace_logger::*;
use rumqttc::{Client, Event, Incoming, MqttOptions, QoS};
use tokio::time;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn start_listening(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let device_states = self.device_states.clone();
        let state_file = self.state_file.clone();

        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(5));
            loop {
                interval.tick().await;
                let snapshot = device_states.read().unwrap().clone();
                let state_file = state_file.clone();
                tokio::task::spawn_blocking(move || {
                    let json = serde_json::to_string(&snapshot).unwrap();
                    let tmp = format!("{}.tmp", state_file);
                    let _ = std::fs::write(&tmp, json);
                    let _ = std::fs::rename(&tmp, &state_file);
                })
                .await
                .ok();
            }
        });

        dt_info!("🚀 Starting ZigDuck automation system");
        dt_info!("📡 Listening to all Zigbee events...");
        self.start_periodic_checks().await;
        self.start_state_refreshers().await;
        self.start_tv_state_trackers().await;
        self.start_presence_probes().await;
        let mut mqttoptions = MqttOptions::new("zigduck", &self.mqtt_broker, 1883);
        mqttoptions.set_credentials(&self.mqtt_user, &self.mqtt_password);
        mqttoptions.set_keep_alive(Duration::from_secs(60));
        // 🦆 says ⮞ max packet size if larger payloads
        mqttoptions.set_max_packet_size(1024 * 1024, 1024 * 1024); // 🦆 says ⮞ 1MB

        let (mut client, mut connection) = Client::new(mqttoptions, 10);
        let sub_topic = format!("{}/#", self.mqtt_base_topic);
        client.subscribe(&sub_topic, QoS::AtMostOnce)?;

        dt_info!("Connected to MQTT broker: {}", &self.mqtt_broker);
        dt_info!("[🦆🏡] ⮞ Welcome Home");
        loop {
            match connection.eventloop.poll().await {
                Ok(event) => {
                    if let Event::Incoming(Incoming::Publish(publish)) = event {
                        if publish.retain {
                            dt_debug!("dropping retained MQTT message on {}", publish.topic);
                            continue;
                        }
                        let topic = publish.topic;
                        let payload = String::from_utf8_lossy(&publish.payload);

                        if let Err(e) = self.process_message(&topic, &payload).await {
                            dt_error!("Failed to process message: {}", e);
                        }
                    }
                }
                Err(e) => {
                    dt_warning!("Connection error: {}", e);
                    dt_info!("Attempting to reconnect in 5 seconds...");
                    tokio::time::sleep(Duration::from_secs(5)).await;

                    // 🦆 says ⮞ recreate connection
                    let mut mqttoptions = MqttOptions::new("zigduck", &self.mqtt_broker, 1883);
                    mqttoptions.set_credentials(&self.mqtt_user, &self.mqtt_password);
                    mqttoptions.set_keep_alive(Duration::from_secs(60));
                    mqttoptions.set_max_packet_size(1024 * 1024, 1024 * 1024); // 1MB

                    let (new_client, new_connection) = Client::new(mqttoptions, 10);
                    client = new_client;
                    connection = new_connection;

                    match client.subscribe(&sub_topic, QoS::AtMostOnce) {
                        Ok(_) => dt_info!("Successfully reconnected and subscribed"),
                        Err(e) => dt_warning!("Failed to subscribe after reconnect: {}", e),
                    }
                }
            }
        }
    }
}
