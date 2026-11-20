pub mod listener;
pub mod router;

use ducktrace_logger::*;
use rumqttc::QoS;

use crate::state::ZigduckState;

impl ZigduckState {
    pub async fn mqtt_publish(
        &self,
        topic: &str,
        message: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        dt_debug!("Publishing to {}: {}", topic, message);
        self.mqtt_publisher
            .publish(topic, QoS::AtLeastOnce, false, message)
            .await?;
        Ok(())
    }
}
