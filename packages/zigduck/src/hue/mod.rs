use anyhow::{bail, Result};
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct HueClient {
    base_url: String,
    client: reqwest::Client,
}

impl HueClient {
    pub fn new(bridge_ip: &str, api_key: &str) -> Result<Self> {
        let base_url = format!("http://{}/api/{}", bridge_ip, api_key);
        Ok(Self {
            base_url,
            client: reqwest::Client::new(),
        })
    }

    pub async fn set_light_state(&self, light_id: u16, state: Value) -> Result<()> {
        let url = format!("{}/lights/{}/state", self.base_url, light_id);
        let response = self.client.put(&url).json(&state).send().await?;
        if !response.status().is_success() {
            bail!("Hue API error: {}", response.status());
        }
        Ok(())
    }

    pub async fn get_light_state(&self, light_id: u16) -> Result<Value> {
        let url = format!("{}/lights/{}", self.base_url, light_id);
        let response = self.client.get(&url).send().await?;
        Ok(response.json().await?)
    }
}


pub fn convert_to_hue_payload(settings: &Value) -> Result<Value> {
    let mut payload = serde_json::Map::new();

    if let Some(state) = settings.get("state").and_then(|s| s.as_str()) {
        payload.insert("on".to_string(), Value::Bool(state == "ON"));
    } else {
        payload.insert("on".to_string(), Value::Bool(true));
    }

    if let Some(brightness) = settings.get("brightness") {
        if let Some(bri) = brightness.as_u64() {
            let hue_bri = (bri as f32).min(254.0) as u8;
            if hue_bri > 0 {
                payload.insert("bri".to_string(), Value::Number(hue_bri.into()));
            }
        } else if let Some(bri) = brightness.as_f64() {
            let hue_bri = (bri as f32).min(254.0) as u8;
            if hue_bri > 0 {
                payload.insert("bri".to_string(), Value::Number(hue_bri.into()));
            }
        }
    }

    if let Some(color_obj) = settings.get("color") {
        if let Some(xy_array) = color_obj.get("xy") {
            if let Some(xy) = xy_array.as_array() {
                if xy.len() == 2 {
                    payload.insert("xy".to_string(), serde_json::json!(xy));
                }
            }
        }
    }

    if let Some(temp) = settings.get("color_temp") {
        if let Some(ct) = temp.as_u64() {
            let hue_ct = if ct > 500 { 500 } else if ct < 153 { 153 } else { ct as u16 };
            payload.insert("ct".to_string(), Value::Number(hue_ct.into()));
        }
    }

    if let Some(transition) = settings.get("transition") {
        if let Some(t) = transition.as_f64() {
            let trans_time = (t * 10.0).round() as u16;
            payload.insert("transitiontime".to_string(), Value::Number(trans_time.into()));
        } else if let Some(t) = transition.as_u64() {
            let trans_time = (t as f64 * 10.0).round() as u16;
            payload.insert("transitiontime".to_string(), Value::Number(trans_time.into()));
        }
    }

    Ok(Value::Object(payload))
}
