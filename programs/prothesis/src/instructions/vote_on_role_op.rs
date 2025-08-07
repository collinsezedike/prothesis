use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, ROLE_OP_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status},
};

#[derive(Accounts)]
pub struct VoteOnRoleOp<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        seeds = [ROLE_OP_SEED, role_op.member.as_ref(), dao_config.key().as_ref()],
        bump = role_op.bump
    )]
    pub role_op: Account<'info, RoleOp>,

    #[account(
        seeds = [MEMBER_SEED, voter.key().as_ref(), dao_config.key().as_ref()],
        bump = voter_member.bump,
    )]
    pub voter_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> VoteOnRoleOp<'info> {
    pub fn vote_on_role_op(&mut self, vote: u8) -> Result<()> {
        // Account checks for the different role operations
        match self.role_op.op_type {
            RoleOpType::PromoteToCouncil | RoleOpType::DemoteFromCouncil => {
                require!(
                    self.voter_member.is_council == 1,
                    ProthesisError::NotCouncilMember,
                ); // Only council members can vote for promotion or demotion
            }
            RoleOpType::RemoveMember => {} // Do nothing, anybody can vote for member removal
        }

        match vote {
            0 => self.role_op.downvotes += 1,
            1 => self.role_op.upvotes += 1,
            _ => return Err(ProthesisError::InvalidVoteType.into()),
        };

        Ok(())
    }
}
