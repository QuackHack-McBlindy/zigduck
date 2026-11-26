use std::time::{Duration, SystemTime, UNIX_EPOCH};

use chrono::Local;
use ducktrace_logger::*;
use serde_json::Value;

use crate::domain::Device;
use crate::state::ZigduckState;

impl ZigduckState {
    pub fn update_device_state(
        &self,
        device: &str,
        key: &str,
        value: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let prev = {
            let states = self.device_states.read().unwrap();
            states.get(device).and_then(|m| m.get(key)).cloned()
        };

        {
            let mut states = self.device_states.write().unwrap();
            let device_map = states
                .entry(device.to_string())
                .or_insert_with(std::collections::HashMap::new);
            device_map.insert(key.to_string(), value.to_string());
        }

        if prev.as_deref() != Some(value)
            && key != "last_updated"
            && key != "last_seen"
        {
            let has_match = self.automations.state_changed.values().any(|a| {
                a.enable && a.device == device && a.property == key
            });

            if has_match {
                let state  = self.clone();
                let device = device.to_string();
                let key    = key.to_string();
                let value  = value.to_string();
                let prev   = prev.clone();

                tokio::spawn(async move {
                    if let Err(e) = state
                        .check_state_changed_automations(
                            &device,
                            &key,
                            prev.as_deref(),
                            &value,
                        )
                        .await
                    {
                        dt_warning!("state_changed automation error: {}", e);
                    }
                });
            }
        }
        Ok(())
    }

    pub fn get_state(&self, device: &str, key: &str) -> Option<String> {
        let states = self.device_states.read().unwrap();
        states.get(device)?.get(key).cloned()
    }

    pub fn get_device(&self, name: &str) -> Option<&Device> {
        self.devices.get(name).or_else(|| {
            let needle = name.to_lowercase();
            self.devices
                .iter()
                .find(|(k, _)| k.to_lowercase() == needle)
                .map(|(_, d)| d)
        })
    }

    // 🦆 says ⮞ STATE UPDATES
    pub fn update_device_state_from_data(
        &self,
        device_name: &str,
        data: &Value,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // 🦆 says ⮞ skip set/availability topics
        if device_name.ends_with("/set") || device_name.ends_with("/availability") {
            dt_debug!("Skipping state update for {} (set/availability topic)", device_name);
            return Ok(());
        }

        if let Some(dev) = self.get_device(device_name) {
            if !dev.enable {
                dt_debug!(
                    "Device {} is disabled in zigbee.devices, skipping state update",
                    device_name
                );
                return Ok(());
            }
        }

        if let Some(dev) = self.config.devices.get(device_name) {
            if !dev.enable {
                dt_debug!("Device {} is disabled in house.devices, skipping", device_name);
                return Ok(());
            }

            if let Some(obj) = data.as_object() {
                for (key, value) in obj {
                    let value_str = match value {
                        Value::String(s) => s.clone(),
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => b.to_string(),
                        Value::Null => continue,
                        other => other.to_string(),
                    };
                    self.update_device_state(device_name, key, &value_str)?;
                }
            }

            let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            self.update_device_state(device_name, "last_updated", &timestamp.to_string())?;
            dt_debug!(
                "house.devices passthrough: {} ({} fields)",
                device_name,
                data.as_object().map(|o| o.len()).unwrap_or(0)
            );
            return Ok(());
        }

        dt_debug!("Updating all state fields for: {}", device_name);

        // 🦆 says ⮞ extract ALL fields
        if let Some(linkquality) = data["linkquality"].as_u64() {
            self.update_device_state(device_name, "linkquality", &linkquality.to_string())?;
        }
        if let Some(last_seen) = data["last_seen"].as_str() {
            self.update_device_state(device_name, "last_seen", last_seen)?;
        }
        if let Some(occupancy) = data["occupancy"].as_bool() {
            self.update_device_state(device_name, "occupancy", &occupancy.to_string())?;
        }
        if let Some(action) = data["action"].as_str() {
            self.update_device_state(device_name, "action", action)?;
        }
        if let Some(contact) = data["contact"].as_bool() {
            self.update_device_state(device_name, "contact", &contact.to_string())?;
        }
        if let Some(position) = data["position"].as_u64() {
            self.update_device_state(device_name, "position", &position.to_string())?;
        }
        if let Some(state) = data["state"].as_str() {
            self.update_device_state(device_name, "state", state)?;
        }
        if let Some(brightness) = data["brightness"].as_u64() {
            self.update_device_state(device_name, "brightness", &brightness.to_string())?;
        }
        if let Some(color) = data["color"].as_object() {
            if let Ok(color_json) = serde_json::to_string(color) {
                self.update_device_state(device_name, "color", &color_json)?;
            }
        }
        if let Some(water_leak) = data["water_leak"].as_bool() {
            self.update_device_state(device_name, "water_leak", &water_leak.to_string())?;
        }
        if let Some(waterleak) = data["waterleak"].as_bool() {
            self.update_device_state(device_name, "waterleak", &waterleak.to_string())?;
        }
        if let Some(temperature) = data["temperature"].as_f64() {
            self.update_device_state(device_name, "temperature", &temperature.to_string())?;
        }
        if let Some(battery_state) = data["battery_state"].as_str() {
            self.update_device_state(device_name, "battery_state", battery_state)?;
        }
        if let Some(tamper) = data["tamper"].as_bool() {
            self.update_device_state(device_name, "tamper", &tamper.to_string())?;
        }

        // 🌡️ TEMPERATURE
        if let Some(temperature) = data["temperature"].as_f64() {
            let temp_str = format!("{:.1}", temperature); // optional: round to 1 decimal
            let prev = self.get_state(device_name, "temperature");
            if prev.as_deref() != Some(&temp_str) && prev.is_some() {
                dt_debug!(
                    "🌡️ Temperature: {}: {}°C -> {}°C",
                    device_name,
                    prev.unwrap(),
                    temperature
                );
            }
            self.update_device_state(device_name, "temperature", &temp_str)?;
        }

        // 🔋 BATTERY
        if let Some(battery) = data["battery"].as_u64() {
            let battery_str = battery.to_string();
            if let Some(prev_str) = self.get_state(device_name, "battery") {
                if let Ok(prev_val) = prev_str.parse::<u64>() {
                    if prev_val < 20 && battery >= 80 {
                        let now = Local::now().to_rfc3339();
                        self.update_device_state(device_name, "battery_replaced", &now)?;
                        dt_info!(
                            "🔋✅ Battery replaced on {}: {}% > {}% at {}",
                            device_name,
                            prev_val,
                            battery,
                            now
                        );
                    }
                    if prev_str != battery_str {
                        dt_info!(
                            "🔋 Battery: {}: {}% > {}%",
                            device_name,
                            prev_val,
                            battery
                        );
                    }
                }
            }
            self.update_device_state(device_name, "battery", &battery_str)?;
        }

        // ⚡ POWER
        if let Some(power) = data["power"].as_f64() {
            let power_str = power.to_string();
            let prev = self.get_state(device_name, "power");
            if prev.as_deref() != Some(&power_str) && prev.is_some() {
                dt_debug!("⚡ Power: {}: {}W -> {}W", device_name, prev.unwrap(), power);
            }
            self.update_device_state(device_name, "power", &power_str)?;
        }

        // ⚡ ENERGY
        if let Some(energy) = data["energy"].as_f64() {
            let energy_str = energy.to_string();
            let prev = self.get_state(device_name, "energy");
            if prev.as_deref() != Some(&energy_str) && prev.is_some() {
                dt_debug!(
                    "🔋 Energy: {}: {} kWh -> {} kWh",
                    device_name,
                    prev.unwrap(),
                    energy
                );
            }
            self.update_device_state(device_name, "energy", &energy_str)?;
        }

        // ⚡ VOLTAGE
        if let Some(voltage) = data["voltage"].as_f64() {
            let voltage_str = voltage.to_string();
            let prev = self.get_state(device_name, "voltage");
            if prev.as_deref() != Some(&voltage_str) && prev.is_some() {
                dt_debug!(
                    "⚡ Voltage: {}: {}V ->-> {}V",
                    device_name,
                    prev.unwrap(),
                    voltage
                );
            }
            self.update_device_state(device_name, "voltage", &voltage_str)?;
        }

        // 🔋 CHARGING
        if let Some(charging) = data["charging"].as_u64() {
            let charging_str = charging.to_string();
            let prev = self.get_state(device_name, "charging");
            if prev.as_deref() != Some(&charging_str) && prev.is_some() {
                dt_debug!(
                    "🔋 Charging: {}: {} -> {}",
                    device_name,
                    prev.unwrap(),
                    charging
                );
            }
            self.update_device_state(device_name, "charging", &charging_str)?;
        }

        // 🔥 SMOKE
        if let Some(smoke) = data["smoke"].as_bool() {
            self.update_device_state(device_name, "smoke", &smoke.to_string())?;
        }

        // 💧 HUMIDITY
        if let Some(humidity) = data["humidity"].as_f64() {
            let humidity_str = humidity.to_string();
            let prev = self.get_state(device_name, "humidity");
            if prev.as_deref() != Some(&humidity_str) && prev.is_some() {
                dt_debug!(
                    "💧 Humidity: {}: {}% -> {}%",
                    device_name,
                    prev.unwrap(),
                    humidity
                );
            }
            self.update_device_state(device_name, "humidity", &humidity_str)?;
        }

        // 🌫 PRESSURE
        if let Some(pressure) = data["pressure"].as_f64() {
            let pressure_str = pressure.to_string();
            let prev = self.get_state(device_name, "pressure");
            if prev.as_deref() != Some(&pressure_str) && prev.is_some() {
                dt_debug!(
                    "🌫 Pressure: {}: {} hPa -> {} hPa",
                    device_name,
                    prev.unwrap(),
                    pressure
                );
            }
            self.update_device_state(device_name, "pressure", &pressure_str)?;
        }

        // ☀️ ILLUMINANCE
        if let Some(illuminance) = data["illuminance"].as_u64() {
            let illuminance_str = illuminance.to_string();
            let prev = self.get_state(device_name, "illuminance");
            if prev.as_deref() != Some(&illuminance_str) && prev.is_some() {
                dt_debug!(
                    "☀️ Illuminance: {}: {} lux -> {} lux",
                    device_name,
                    prev.unwrap(),
                    illuminance
                );
            }
            self.update_device_state(device_name, "illuminance", &illuminance_str)?;
        }

        // 🌡️ DEVICE TEMPERATURE
        if let Some(device_temperature) = data["device_temperature"].as_f64() {
            let device_temperature_str = device_temperature.to_string();
            let prev = self.get_state(device_name, "device_temperature");
            if prev.as_deref() != Some(&device_temperature_str) && prev.is_some() {
                dt_debug!(
                    "🌡️ Device temp: {}: {}°C -> {}°C",
                    device_name,
                    prev.unwrap(),
                    device_temperature
                );
            }
            self.update_device_state(device_name, "device_temperature", &device_temperature_str)?;
        }

        // 📦 UPDATE AVAILABLE
        if let Some(update_available) = data["update_available"].as_bool() {
            let update_available_str = update_available.to_string();
            let prev = self.get_state(device_name, "update_available");
            if prev.as_deref() != Some(&update_available_str) && prev.is_some() {
                dt_info!(
                    "📦 Update available: {}: {} -> {}",
                    device_name,
                    if prev.as_deref() == Some("true") { "yes" } else { "no" },
                    if update_available { "yes" } else { "no" }
                );
            }
            self.update_device_state(device_name, "update_available", &update_available_str)?;
        }

        // 🦆 says ⮞ process user-defined whitelist fields
        for field in &self.mqtt_whitelist {
            let Some(value) = data.get(field) else { continue; };
            let value_str = match value {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Null => continue,
                other => other.to_string(),
            };

            let prev = self.get_state(device_name, field);
            if prev.as_deref() != Some(&value_str) && prev.is_some() {
                dt_debug!("Whitelisted: {}: {}: {} --> {}", device_name, field, prev.unwrap(), value_str);
            }
            self.update_device_state(device_name, field, &value_str)?;
        }

        // 🦆 says ⮞ update last_seen
        let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        self.update_device_state(device_name, "last_updated", &timestamp.to_string())?;

        Ok(())
    }

    pub async fn start_state_refreshers(&self) {
        for (name, device) in &self.config.devices {
            if !device.enable {
                continue;
            }

            let endpoint = match device.effective_state_endpoint() {
                Some(e) => e.to_string(),
                None => continue,
            };
            let ip = match device.ip.as_deref() {
                Some(i) => i.to_string(),
                None => {
                    dt_warning!("Device '{}' has state endpoint but no IP", name);
                    continue;
                }
            };
            let refresh = match device.refresh_interval_secs() {
                Some(r) => r,
                None => continue,
            };

            let name = name.clone();
            let state = self.clone();
            let url = format!("http://{}{}", ip, endpoint);

            dt_debug!("State refresher for {} every {}s {}", name, refresh, url);

            tokio::spawn(async move {
                let client = reqwest::Client::new();
                let mut interval = tokio::time::interval(Duration::from_secs(refresh));
                interval.tick().await;

                loop {
                    interval.tick().await;
                    match client
                        .get(&url)
                        .timeout(Duration::from_secs(5))
                        .send()
                        .await
                    {
                        Ok(resp) if resp.status().is_success() => match resp.json::<Value>().await {
                            Ok(json) => {
                                let fields = json.as_object().map(|o| o.len()).unwrap_or(0);
                                if let Some(obj) = json.as_object() {
                                    for (key, value) in obj {
                                        let value_str = match value {
                                            Value::String(s) => s.clone(),
                                            Value::Number(n) => n.to_string(),
                                            Value::Bool(b) => b.to_string(),
                                            Value::Null => continue,
                                            other => other.to_string(),
                                        };
                                        if let Err(e) =
                                            state.update_device_state(&name, key, &value_str)
                                        {
                                            dt_warning!("State refresh {}.{}: {}", name, key, e);
                                        }
                                    }
                                    let ts = SystemTime::now()
                                        .duration_since(UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs();
                                    let _ = state.update_device_state(
                                        &name,
                                        "last_updated",
                                        &ts.to_string(),
                                    );
                                    dt_debug!("Refreshed {} ({} fields)", name, fields);
                                }
                            }
                            Err(e) => {
                                dt_warning!("Parse error for {}: {}", url, e)
                            }
                        },
                        Ok(resp) => {
                            dt_debug!("Refresh {} returned HTTP {}", name, resp.status())
                        }
                        Err(e) => dt_debug!("Refresh {} failed: {}", name, e),
                    }
                }
            });
        }
    }
}
