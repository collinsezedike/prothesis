use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED},
    error::ProthesisError,
    role_op,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status},
};

#[derive(Accounts)]
#[instruction(role_op_seed: Vec<u8>)]
pub struct InitiateRoleOp<'info> {
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
        seeds = [role_op_seed.as_ref(), nominated_member.key().as_ref(), dao_config.key().as_ref()],
        bump,
        space = RoleOp::SPACE
    )]
    pub role_op: Account<'info, RoleOp>,

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

impl<'info> InitiateRoleOp<'info> {
    pub fn initiate_role_op(
        &mut self,
        role_op_seed: Vec<u8>,
        bumps: &InitiateRoleOpBumps,
    ) -> Result<()> {
        let role_op_type = match role_op_seed.as_slice() {
            b"promotion" => RoleOpType::PromoteToCouncil,
            b"demotion" => RoleOpType::DemoteFromCouncil,
            b"removal" => RoleOpType::RemoveMember,
            _ => return Err(ProthesisError::InvalidRoleOpSeed.into()),
        };

        self.role_op.set_inner(RoleOp {
            seed: role_op_seed.to_vec(),
            op_type: role_op_type,
            member: self.nominated_member.key(),
            upvotes: 0,
            downvotes: 0,
            created_at: Clock::get()?.unix_timestamp,
            status: Status::Pending,
            bump: bumps.role_op,
        });

        Ok(())
    }
}
