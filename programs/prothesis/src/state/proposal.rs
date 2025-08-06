use anchor_lang::prelude::*;

use crate::constants::{MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH};

use super::Status;

/// Proposal account - stores a single proposal's data and voting status
#[account]
#[derive(InitSpace)]
pub struct Proposal {
    /// Author of the proposal
    pub author: Pubkey,
    /// Title of the proposal (max 64 chars)
    #[max_len(MAX_TITLE_LENGTH)]
    pub title: String,
    /// Content of the proposal (max 2048 chars)
    #[max_len(MAX_CONTENT_LENGTH)]
    pub content: String,
    /// Number of upvotes received
    pub upvotes: u64,
    /// Number of downvotes received
    pub downvotes: u64,
    /// Unix timestamp when the proposal was created
    pub created_at: i64,
    /// The account where the proposal funding will go to
    pub treasury: Pubkey,
    /// Current status of the proposal
    pub status: Status,
    /// PDA bump
    pub bump: u8,
}

impl Proposal {
    pub const SPACE: usize = 8 + Proposal::INIT_SPACE;
}
