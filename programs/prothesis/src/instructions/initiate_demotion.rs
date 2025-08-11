use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, ROLE_OP_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status},
};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct InitiateDemotion<'info> {
    #[account(mut)]
    pub council_signer: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        init,
        payer = council_signer,
        seeds = [ROLE_OP_SEED, seed.to_le_bytes().as_ref(), nominated_member.key().as_ref(), dao_config.key().as_ref()],
        bump,
        space = RoleOp::SPACE
    )]
    pub demotion: Account<'info, RoleOp>,

    #[account(
        seeds = [MEMBER_SEED, nominated_member.owner.key().as_ref(), dao_config.key().as_ref()],
        bump = nominated_member.bump,
        constraint = nominated_member.is_council == 1 @ ProthesisError::NotCouncilMember
    )]
    pub nominated_member: Account<'info, Member>,

    #[account(
        seeds = [MEMBER_SEED, council_signer.key().as_ref(), dao_config.key().as_ref()],
        bump = council_member.bump,
        constraint = council_member.is_council == 1 @ ProthesisError::NotCouncilMember
    )]
    pub council_member: Account<'info, Member>,

    pub system_program: Program<'info, System>,
}

impl<'info> InitiateDemotion<'info> {
    pub fn initiate_demotion(&mut self, seed: u64, bumps: &InitiateDemotionBumps) -> Result<()> {
        self.demotion.set_inner(RoleOp {
            seed,
            op_type: RoleOpType::DemoteFromCouncil,
            member: self.nominated_member.key(),
            upvotes: 0,
            downvotes: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: Status::Pending,
            bump: bumps.demotion,
        });

        Ok(())
    }
}
