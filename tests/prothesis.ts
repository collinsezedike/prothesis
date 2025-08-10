import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Prothesis } from "../target/types/prothesis";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

import { getMemberAccount } from "./helpers";

describe("prothesis", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.prothesis as Program<Prothesis>;

  // Test wallets
  const creator = Keypair.generate();
  const person1 = Keypair.generate();
  const person2 = Keypair.generate();
  const person3 = Keypair.generate();
  const nonMember = Keypair.generate();

  // DAO parameters
  const daoId = new BN(1);
  const consensusPct = 5100; // 51%
  const consensusLifetime = new BN(604800); // 7 days in seconds

  // PDAs
  let daoConfigPDA: PublicKey;
  let treasuryPDA: PublicKey;
  let creatorMemberAccount: PublicKey;
  let person1MemberAccount: PublicKey;
  let person2MemberAccount: PublicKey;
  let person3MemberAccount: PublicKey;
  let roleOpPDA: PublicKey;
  let proposalPDA: PublicKey;
  let roleOpVotePDA: PublicKey;
  let proposalVotePDA: PublicKey;

  // Proposal parameters
  const proposalTitle = "Test Proposal";
  const proposalContent = "This is a test proposal for the DAO";

  before(async () => {
    // Airdrop SOL to test wallets
    const wallets = [creator, person1, person2, person3, nonMember];
    for (const wallet of wallets) {
      const airdropSig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
    }

    // Derive PDAs
    [daoConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), daoId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [treasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoConfigPDA.toBuffer()],
      program.programId
    );

    creatorMemberAccount = getMemberAccount(creator.publicKey, daoConfigPDA, program.programId);
    person1MemberAccount = getMemberAccount(person1.publicKey, daoConfigPDA, program.programId);
    person2MemberAccount = getMemberAccount(person2.publicKey, daoConfigPDA, program.programId);
    person3MemberAccount = getMemberAccount(person3.publicKey, daoConfigPDA, program.programId);
  });

  describe("DAO Initialization and Membership", () => {
    it("Should initialize a new DAO", async () => {
      const tx = await program.methods
        .initializeDao(daoId, consensusPct, consensusLifetime)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          creator: creator.publicKey,
          member: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify DAO config was created
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.id.toString()).to.equal(daoId.toString());
      expect(daoConfig.consensusPct).to.equal(consensusPct);
      expect(daoConfig.consensusLifetime.toString()).to.equal(consensusLifetime.toString());
      expect(daoConfig.membersCount.toString()).to.equal("1"); // creator is the first member
      expect(daoConfig.councilCount.toString()).to.equal("1"); // creator is a council member
    });

    it("Should fund the DAO treasury", async () => {
      const fundAmount = new BN(0.5 * LAMPORTS_PER_SOL);

      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);

      await program.methods
        .fundDao(fundAmount)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          treasury: treasuryPDA,
          patron: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(fundAmount.toNumber());
    });

    it("Should add a new member", async () => {
      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person1.publicKey,
          newMember: person1MemberAccount,
          councilMember: creatorMemberAccount,
          councilSigner: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person1])
        .rpc();

      // Verify member was added
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.owner.toString()).to.equal(person1.publicKey.toString());
      expect(memberAccount.isCouncil).to.equal(0); // Not a council member

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("2");
      expect(daoConfig.councilCount.toString()).to.equal("1");
    });

    it("Should add another member", async () => {
      // Derive member PDA
      [person2MemberAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), daoConfigPDA.toBuffer(), person2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person2.publicKey,
          newMember: person2MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person2])
        .rpc();

      // Verify member was added
      const memberAccount = await program.account.member.fetch(person2MemberAccount);
      expect(memberAccount.owner.toString()).to.equal(person2.publicKey.toString());

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("3");
    });

    it("Should add a third member", async () => {
      // Derive member PDA
      [person3MemberAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), daoConfigPDA.toBuffer(), person3.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .addMember()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          aspirant: person3.publicKey,
          newMember: person3MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person3])
        .rpc();

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal("4");
    });
  });

  describe("Role Operations", () => {
    it("Should initiate a promotion for a member", async () => {
      [roleOpPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("role operation"),
          person1.publicKey.toBuffer(),
          daoConfigPDA.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .initiatePromotion()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          promotion: roleOpPDA,
          nominee: person1.publicKey,
          nominatedMember: person1MemberAccount,
          councilSigner: creator.publicKey,
          councilMember: creatorMemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator, person1])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(roleOpPDA);
      expect(roleOp.member.toString()).to.equal(person1MemberAccount.toString());
      expect(roleOp.opType).to.equal(0); // Promotion
      expect(roleOp.status.pending).to.not.be.undefined;
      expect(roleOp.upvotes.toString()).to.equal("0");
      expect(roleOp.downvotes.toString()).to.equal("0");
    });

    it("Should vote on a role operation", async () => {
      // Derive role operation PDA
      [roleOpPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("role operation"),
          person1.publicKey.toBuffer(),
          daoConfigPDA.toBuffer(),
        ],
        program.programId
      );
      // Derive vote PDA
      [roleOpVotePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vote"),
          roleOpPDA.toBuffer(),
          person2.publicKey.toBuffer()
        ],
        program.programId
      );

      // Vote 1 = upvote
      await program.methods
        .voteOnRoleOp(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: roleOpPDA,
          vote: roleOpVotePDA,
          voter: person2.publicKey,
          voterMember: person2MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person2])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(roleOpVotePDA);
      expect(vote.voter.toString()).to.equal(person2.publicKey.toString());
      expect(vote.voteType).to.equal(1); // Upvote

      // Verify role op was updated
      const roleOp = await program.account.roleOp.fetch(roleOpPDA);
      expect(roleOp.upvotes.toString()).to.equal("2");
    });

    it("Should review a role operation", async () => {
      // Have person3 vote as well to reach consensus
      const person3VotePDA = await createVoteAccount(person3, roleOpPDA, "role_op_vote", 1);

      // Review the role op
      await program.methods
        .reviewRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: roleOpPDA,
          reviewer: creator.publicKey,
          reviewerMember: await getMemberAccount(creator.publicKey),
        })
        .signers([creator])
        .rpc();

      // Verify role op status was updated
      const roleOp = await program.account.roleOp.fetch(roleOpPDA);
      expect(roleOp.status.approved).to.not.be.undefined;
    });

    it("Should resolve an approved role operation", async () => {
      await program.methods
        .resolveRoleOp()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: roleOpPDA,
          targetMember: person1MemberAccount,
          resolver: creator.publicKey,
          resolverMember: await getMemberAccount(creator.publicKey),
        })
        .signers([creator])
        .rpc();

      // Verify member was promoted
      const memberAccount = await program.account.member.fetch(person1MemberAccount);
      expect(memberAccount.isCouncil).to.equal(1); // Now a council member

      // Verify DAO config was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.councilCount.toString()).to.equal("2");
    });

    it("Should initiate a demotion for a member", async () => {
      // Derive role op PDA for demotion
      [roleOpPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("role operation"),
          person1.publicKey.toBuffer(),
          daoConfigPDA.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .initiateDemotion()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: roleOpPDA,
          targetMember: person1MemberAccount,
          initiator: creator.publicKey,
          initiatorMember: await getMemberAccount(creator.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(roleOpPDA);
      expect(roleOp.targetMember.toString()).to.equal(person1MemberAccount.toString());
      expect(roleOp.opType).to.equal(1); // Demotion
      expect(roleOp.status.pending).to.not.be.undefined;
    });

    it("Should initiate a removal for a member", async () => {
      // Derive role op PDA for removal
      const removalRoleOpPDA = await createRoleOpAccount(person2.publicKey, 2); // 2 for removal

      await program.methods
        .initiateRemoval()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: removalRoleOpPDA,
          targetMember: person2MemberAccount,
          initiator: creator.publicKey,
          initiatorMember: await getMemberAccount(creator.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify role op was created
      const roleOp = await program.account.roleOp.fetch(removalRoleOpPDA);
      expect(roleOp.targetMember.toString()).to.equal(person2MemberAccount.toString());
      expect(roleOp.opType).to.equal(2); // Removal
      expect(roleOp.status.pending).to.not.be.undefined;
    });
  });

  describe("Proposals", () => {
    it("Should submit a proposal", async () => {
      // Derive proposal PDA
      const proposalId = new BN(1);
      [proposalPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal"),
          daoConfigPDA.toBuffer(),
          proposalId.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );

      await program.methods
        .submitProposal(proposalTitle, proposalContent, treasuryPDA)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          submitter: person1.publicKey,
          submitterMember: person1MemberAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([person1])
        .rpc();

      // Verify proposal was created
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.title).to.equal(proposalTitle);
      expect(proposal.content).to.equal(proposalContent);
      expect(proposal.submitter.toString()).to.equal(person1.publicKey.toString());
      expect(proposal.treasury.toString()).to.equal(treasuryPDA.toString());
      expect(proposal.status.pending).to.not.be.undefined;
      expect(proposal.upvotes.toString()).to.equal("1"); // Submitter's vote
    });

    it("Should vote on a proposal", async () => {
      // Derive vote PDA
      [proposalVotePDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("proposal_vote"),
          proposalPDA.toBuffer(),
          creator.publicKey.toBuffer()
        ],
        program.programId
      );

      // Vote 1 = upvote
      await program.methods
        .voteOnProposal(1)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          vote: proposalVotePDA,
          voter: creator.publicKey,
          voterMember: await getMemberAccount(creator.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify vote was recorded
      const vote = await program.account.vote.fetch(proposalVotePDA);
      expect(vote.voter.toString()).to.equal(creator.publicKey.toString());
      expect(vote.voteType).to.equal(1); // Upvote

      // Verify proposal was updated
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.upvotes.toString()).to.equal("2");
    });

    it("Should review a proposal", async () => {
      // Have person3 vote as well to reach consensus
      const person3VotePDA = await createVoteAccount(person3, proposalPDA, "proposal_vote", 1);

      // Review the proposal
      await program.methods
        .reviewProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          reviewer: creator.publicKey,
          reviewerMember: await getMemberAccount(creator.publicKey),
        })
        .signers([creator])
        .rpc();

      // Verify proposal status was updated
      const proposal = await program.account.proposal.fetch(proposalPDA);
      expect(proposal.status.approved).to.not.be.undefined;
    });

    it("Should resolve an approved proposal", async () => {
      const treasuryBalanceBefore = await provider.connection.getBalance(treasuryPDA);
      const person1BalanceBefore = await provider.connection.getBalance(person1.publicKey);

      await program.methods
        .resolveProposal()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: proposalPDA,
          treasury: treasuryPDA,
          beneficiary: person1.publicKey,
          resolver: creator.publicKey,
          resolverMember: await getMemberAccount(creator.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify proposal was resolved (funds transferred)
      const treasuryBalanceAfter = await provider.connection.getBalance(treasuryPDA);
      const person1BalanceAfter = await provider.connection.getBalance(person1.publicKey);

      // The proposal doesn't specify an amount, so we can't verify exact transfer
      // But we can verify that treasury balance decreased and person1 balance increased
      expect(treasuryBalanceAfter).to.be.lessThan(treasuryBalanceBefore);
      expect(person1BalanceAfter).to.be.greaterThan(person1BalanceBefore);
    });
  });

  describe("Member Exit", () => {
    it("Should allow a member to exit the DAO", async () => {
      const membersCountBefore = (await program.account.daoConfig.fetch(daoConfigPDA)).membersCount;

      await program.methods
        .exitDao()
        .accountsStrict({
          daoConfig: daoConfigPDA,
          member: person3MemberAccount,
          owner: person3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([person3])
        .rpc();

      // Verify member count was updated
      const daoConfig = await program.account.daoConfig.fetch(daoConfigPDA);
      expect(daoConfig.membersCount.toString()).to.equal(membersCountBefore.subn(1).toString());

      // Verify member account was closed
      try {
        await program.account.member.fetch(person3MemberAccount);
        expect.fail("Member account should be closed");
      } catch (error) {
        expect(error.toString()).to.include("Account does not exist");
      }
    });
  });

  async function createRoleOpAccount(targetOwner: PublicKey, opType: number): Promise<PublicKey> {
    const targetMemberAccount = await getMemberAccount(targetOwner);
    const [roleOpPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("role operation"),
        targetOwner.toBuffer(),
        daoConfigPDA.toBuffer(),
        Buffer.from([opType])
      ],
      program.programId
    );
    return roleOpPDA;
  }

  async function createVoteAccount(
    voter: Keypair,
    targetPDA: PublicKey,
    voteType: string,
    vote: number
  ): Promise<PublicKey> {
    const [votePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(voteType),
        targetPDA.toBuffer(),
        voter.publicKey.toBuffer()
      ],
      program.programId
    );

    if (voteType === "role_op_vote") {
      await program.methods
        .voteOnRoleOp(vote)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          roleOp: targetPDA,
          vote: votePDA,
          voter: voter.publicKey,
          voterMember: await getMemberAccount(voter.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();
    } else if (voteType === "proposal_vote") {
      await program.methods
        .voteOnProposal(vote)
        .accountsStrict({
          daoConfig: daoConfigPDA,
          proposal: targetPDA,
          vote: votePDA,
          voter: voter.publicKey,
          voterMember: await getMemberAccount(voter.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();
    }

    return votePDA;
  }
});