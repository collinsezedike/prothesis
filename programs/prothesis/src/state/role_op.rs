use anchor_lang::prelude::*;

use super::Status;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Eq)]
pub enum RoleOpType {
    /// Propose promoting the member to a council role
    PromoteToCouncil,
    /// Propose demoting the member from their council role to a regular member
    DemoteFromCouncil,
    /// Propose removing the member from the DAO entirely
    RemoveMember,
}

/// RoleOp account - stores a single role operation's data and voting status
#[account]
#[derive(InitSpace)]
pub struct RoleOp {
    /// The type of operation
    pub op_type: RoleOpType,
    /// The target member of the role operation
    pub member: Pubkey,
    /// Number of upvotes received
    pub upvotes: u64,
    /// Number of downvotes received
    pub downvotes: u64,
    /// Unix timestamp when the RoleOp was created
    pub created_at: i64,
    /// Current status of the RoleOp
    pub status: Status,
    /// PDA bump
    pub bump: u8,
}

impl RoleOp {
    pub const SPACE: usize = 8 + RoleOp::INIT_SPACE;
}
