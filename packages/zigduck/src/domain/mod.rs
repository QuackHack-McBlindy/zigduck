pub mod automation;
pub mod dashboard;
pub mod device;
pub mod scene;

pub use automation::*;
pub use dashboard::*;
pub use device::*;
pub use scene::*;


pub(crate) fn default_true() -> bool {
    true
}
