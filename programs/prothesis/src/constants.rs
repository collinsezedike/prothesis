/// Seed prefix for the DAO config PDA
pub const DAO_CONFIG_SEED: &[u8] = b"dao";

/// Seed prefix for the DAO treasury
pub const TREASURY_SEED: &[u8] = b"treasury";

/// Seed prefix for proposal PDAs
pub const PROPOSAL_SEED: &[u8] = b"proposal";

/// Seed prefix for vote PDAs
pub const VOTE_SEED: &[u8] = b"vote";

/// Maximum length for proposal titles
pub const MAX_TITLE_LENGTH: usize = 64;

/// Maximum length for proposal content
pub const MAX_CONTENT_LENGTH: usize = 2048;