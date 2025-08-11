use anchor_lang::prelude::*;

use crate::{
    constants::{DAO_CONFIG_SEED, MEMBER_SEED, TREASURY_SEED},
    error::ProthesisError,
    state::{DAOConfig, Member, RoleOp, RoleOpType, Status},
};

#[derive(Accounts)]
pub struct ResolveRoleOp<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        seeds = [DAO_CONFIG_SEED, dao_config.id.to_le_bytes().as_ref()],
        bump = dao_config.bump
    )]
    pub dao_config: Account<'info, DAOConfig>,

    #[account(
        mut,
        close = treasury, // Rent goes to the treasury as a small contribution to the DAO
        seeds = [role_op.seed.as_ref(), role_op.member.as_ref(), dao_config.key().as_ref()],
        bump = role_op.bump
    )]
    pub role_op: Account<'info, RoleOp>,

    #[account(
        mut,
        seeds = [MEMBER_SEED, nominated_member.owner.key().as_ref(), dao_config.key().as_ref()],
        bump = nominated_member.bump,
    )]
    pub nominated_member: Account<'info, Member>,

    #[account(
        seeds = [MEMBER_SEED, resolver.key().as_ref(), dao_config.key().as_ref()],
        bump = resolver_member.bump,
        constraint = resolver_member.is_council @ ProthesisError::NotCouncilMember
    )]
    pub resolver_member: Account<'info, Member>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, dao_config.key().as_ref()],
        bump = dao_config.treasury_bump
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> ResolveRoleOp<'info> {
    pub fn resolve_role_op(&mut self) -> Result<()> {
        match self.role_op.status {
            Status::Approved => {
                match self.role_op.op_type {
                    RoleOpType::PromoteToCouncil => {
                        require!(
                            self.resolver_member.is_council,
                            ProthesisError::NotCouncilMember
                        );
                        self.resolver_member.is_council = true;
                        self.dao_config.council_count = self
                            .dao_config
                            .council_count
                            .checked_add(1)
                            .ok_or(ProthesisError::CountOutOfRange)?;
                    }

                    RoleOpType::DemoteFromCouncil => {
                        require!(
                            self.resolver_member.is_council,
                            ProthesisError::NotCouncilMember,
                        );
                        self.resolver_member.is_council = false;
                        self.dao_config.council_count = self
                            .dao_config
                            .council_count
                            .checked_sub(1)
                            .ok_or(ProthesisError::CountOutOfRange)?;
                    }

                    RoleOpType::RemoveMember => {
                        // Close the member account and transfer the rent to the treasury
                        let rent = self.nominated_member.to_account_info().lamports();
                        self.treasury.add_lamports(rent)?;
                        self.nominated_member.sub_lamports(rent)?;
                        self.nominated_member
                            .to_account_info()
                            .assign(&self.system_program.key());
                    }
                }
            }

            Status::Dismissed | Status::Expired => {} // Do nothing, just close the account

            Status::Pending => return Err(ProthesisError::CannotResolveBeforeReview.into()),
        };

        Ok(())
    }
}
