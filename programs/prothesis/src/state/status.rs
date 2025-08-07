use anchor_lang::prelude::*;

/// Enum representing the status of a proposal/role op
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq)]
pub enum Status {
    /// Proposal/role op is active and can be voted on
    Pending,
    /// Proposal/role op has been approved by meeting the upvote threshold
    Approved,
    /// Proposal/role op has been dismissed by meeting the downvote threshold
    Dismissed,
    /// Proposal/role op has expired due to reaching its lifetime without resolution
    Expired,
}
