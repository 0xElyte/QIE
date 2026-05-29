import { ethers } from "ethers";

// ═══════════════════════════════════════════
//  Score Signing Utilities
//  Used by both frontend (fallback) and Unity (primary)
// ═══════════════════════════════════════════

/**
 * Generate the metadata hash for score submission.
 * Must match exactly what the Unity client produces.
 *
 * @param matchId - On-chain match ID
 * @param score - Final score (integer)
 * @param salt - Random bytes32 for uniqueness
 * @returns keccak256 hash of packed values
 */
export function computeScoreHash(
  matchId: number,
  score: number,
  salt: string = ethers.utils.hexlify(ethers.utils.randomBytes(32))
): { hash: string; salt: string } {
  const hash = ethers.utils.solidityKeccak256(
    ["uint256", "uint256", "bytes32"],
    [matchId, score, salt]
  );
  return { hash, salt };
}

/**
 * Sign a score hash with the connected wallet.
 * Uses eth_sign (personal_sign) for compatibility.
 *
 * @param provider - Ethers.js provider (from ThirdWeb or window.ethereum)
 * @param hash - The bytes32 hash to sign
 * @returns ECDSA signature (bytes)
 */
export async function signScoreHash(
  provider: ethers.providers.Web3Provider,
  hash: string
): Promise<string> {
  const signer = provider.getSigner();

  // Use signMessage for personal_sign (prefixed)
  // The contract uses ECDSA.recover which handles the prefix
  const signature = await signer.signMessage(
    ethers.utils.arrayify(hash)
  );

  return signature;
}

/**
 * Full flow: compute hash → sign → return args ready for submitFinalScore()
 */
export async function prepareScoreSubmission(
  provider: ethers.providers.Web3Provider,
  matchId: number,
  score: number
): Promise<{
  score: number;
  metadataHash: string;
  signature: string;
}> {
  const { hash, salt } = computeScoreHash(matchId, score);
  const signature = await signScoreHash(provider, hash);

  return {
    score,
    metadataHash: hash,
    signature,
  };
}

/**
 * Verify a signature locally (for debugging)
 */
export function verifyScoreSignature(
  hash: string,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    const recovered = ethers.utils.verifyMessage(
      ethers.utils.arrayify(hash),
      signature
    );
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}
