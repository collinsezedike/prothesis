use anchor_lang::prelude::*;

/// Enum representing the status of a proposal/promotion
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq)]
pub enum Status {
    /// Proposal/promotion is active and can be voted on
    Pending,
    /// Proposal/promotion has been approved by meeting the upvote threshold
    Approved,
    /// Proposal/promotion has been dismissed by meeting the downvote threshold
    Dismissed,
    /// Proposal/promotion has expired due to reaching its lifetime without resolution
    Expired,
}