import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";

export function getDAOConfigPDA(daoId: anchor.BN, programId: PublicKey): PublicKey {
    const [daoConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("dao"), daoId.toBuffer("le")],
        programId
    );
    return daoConfigPDA;
}

export function getDAOTreasury(daoId: anchor.BN, programId: PublicKey): PublicKey {
    const daoConfigPDA = getDAOConfigPDA(daoId, programId);
    const [treasury] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), daoConfigPDA.toBuffer()], 
        programId
    );
    return treasury;
}

export function getMemberAccount(owner: PublicKey, daoId: anchor.BN, programId: PublicKey): PublicKey {
    const daoConfigPDA = getDAOConfigPDA(daoId, programId);
    const [memberAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("member"), owner.toBuffer(), daoConfigPDA.toBuffer()],
        programId
    );
    return memberAccount;
}

