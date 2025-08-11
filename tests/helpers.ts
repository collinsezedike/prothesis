import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Prothesis } from "../target/types/prothesis";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

const { programId } = anchor.workspace.prothesis as Program<Prothesis>;

export async function generateSigner(provider: anchor.AnchorProvider): Promise<Keypair> {
    const keypair = Keypair.generate();
    const signature = await provider.connection.requestAirdrop(keypair.publicKey, 5 * LAMPORTS_PER_SOL);
    const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
    return keypair;
}

export function getDAOConfigPDA(daoId: anchor.BN): PublicKey {
    const [daoConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("dao"), daoId.toBuffer("le", 8)],
        programId
    );
    return daoConfigPDA;
}

export function getDAOTreasury(daoConfigPDA: PublicKey): PublicKey {
    const [treasury] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), daoConfigPDA.toBuffer()],
        programId
    );
    return treasury;
}

export function getMemberAccount(owner: PublicKey, daoConfigPDA: PublicKey): PublicKey {
    const [memberAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), owner.toBuffer(), daoConfigPDA.toBuffer()],
        programId
    );
    return memberAccount;
}

export function getRoleOpPDA(seed: string, nominatedMember: PublicKey, daoConfigPDA: PublicKey): PublicKey {
    const [roleOpPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(seed), nominatedMember.toBuffer(), daoConfigPDA.toBuffer()],
        programId
    );
    return roleOpPDA;
}

export function getProposalPDA(title: string, daoConfigPDA: PublicKey): PublicKey {
    const [roleOpVotePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), Buffer.from(title), daoConfigPDA.toBuffer()],
        programId
    );
    return roleOpVotePDA;
}

export function getVotePDA(voterMember: PublicKey, targetPDA: PublicKey): PublicKey {
    const [votePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), voterMember.toBuffer(), targetPDA.toBuffer()],
        programId
    );
    return votePDA;
}