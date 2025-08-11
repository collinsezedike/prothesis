use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, ROLE_OP_SEED, VOTE_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status, Vote, VoteType},
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
        seeds = [ROLE_OP_SEED, role_op.seed.to_le_bytes().as_ref(), role_op.member.as_ref(), dao_config.key().as_ref()],
        bump = role_op.bump
    )]
    pub role_op: Account<'info, RoleOp>,

    #[account(
        seeds = [MEMBER_SEED, voter.key().as_ref(), dao_config.key().as_ref()],
        bump = voter_member.bump,
    )]
    pub voter_member: Account<'info, Member>,

    #[account(
        init,
        payer = voter,
        seeds = [VOTE_SEED, voter_member.key().as_ref(), role_op.key().as_ref()],
        bump,
        space = Vote::SPACE
    )]
    pub vote: Account<'info, Vote>,

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

        self.vote.vote_type = match vote {
            0 => VoteType::Downvote,
            1 => VoteType::Upvote,
            _ => return Err(ProthesisError::InvalidVoteType.into()),
        };

        match self.vote.vote_type {
            VoteType::Downvote => self.role_op.downvotes += 1,
            VoteType::Upvote => self.role_op.upvotes += 1,
        }

        Ok(())
    }
}
