pub mod dark_time;
pub mod dimmer;
pub mod house_device;
pub mod hue;
pub mod mqtt;
pub mod no_motion;
pub mod presence;
pub mod simple_actions;
pub mod tv;

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

pub use dark_time::*;
pub use dimmer::*;
pub use house_device::*;
pub use hue::*;
pub use mqtt::*;
pub use no_motion::*;
pub use presence::*;
pub use simple_actions::*;
pub use tv::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HouseConfig {
    pub mosquitto: Option<MosquittoConfig>,
    pub hue: Option<HueConfig>,
    pub dimmer: DimmerConfig,
    pub dark_time: DarkTimeConfig,
    #[serde(default)]
    pub no_motion: NoMotionConfig,
    #[serde(default)]
    pub devices: HashMap<String, HouseDevice>,
    #[serde(default)]
    pub tv: HashMap<String, TvConfig>,
    #[serde(default)]
    pub presence: PresenceConfig,
    #[serde(default)]
    pub simple_actions: SimpleActionsConfig,
}
