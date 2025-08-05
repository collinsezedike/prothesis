/// Seed prefix for the DAO config PDA
pub const CONFIG_SEED: &[u8] = b"config";

/// Seed prefix for proposal PDAs
pub const PROPOSAL_SEED: &[u8] = b"proposal";

/// Seed prefix for vote PDAs
pub const VOTE_SEED: &[u8] = b"vote";

/// Maximum length for proposal titles
pub const MAX_TITLE_LENGTH: usize = 64;

/// Maximum length for proposal content
pub const MAX_CONTENT_LENGTH: usize = 2048;

/// Default proposal lifetime in seconds (7 days)
pub const DEFAULT_PROPOSAL_LIFETIME: i64 = 604800;

/// Default minimum upvote percentage required for approval
pub const DEFAULT_MIN_UPVOTE_PCT: u8 = 75;

/// Default minimum downvote percentage required for dismissal
pub const DEFAULT_MIN_DOWNVOTE_PCT: u8 = 75;
