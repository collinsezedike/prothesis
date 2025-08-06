use anchor_lang::prelude::*;

use super::Status;

/// Council promotion account - stores a single promotion's data and voting status
#[account]
#[derive(InitSpace)]
pub struct Promotion {
    /// The member to be promoted
    pub member: Pubkey,
    /// Number of upvotes received
    pub upvotes: u64,
    /// Number of downvotes received
    pub downvotes: u64,
    /// Unix timestamp when the promotion was created
    pub created_at: i64,
    /// Current status of the promotion
    pub status: Status,
    /// PDA bump
    pub bump: u8,
}

impl Promotion {
    pub const SPACE: usize = 8 + Promotion::INIT_SPACE;
}
