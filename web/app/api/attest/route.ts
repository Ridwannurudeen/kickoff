import { NextResponse } from "next/server";
import {
  createPublicClient,
  encodeAbiParameters,
  http,
  isAddress,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { activeChain, CHAIN_ID, RPC_URL } from "@/lib/config";
import { V2_ADDRESSES } from "@/lib/v2-addresses";
import { questEngineAbi } from "@/lib/v2-abis";

/**
 * Admin attestation signer for EXTERNAL_PROOF quests.
 *
 * The on-chain contract (QuestEngine.completeExternalProof) recovers the
 * signer of an EIP-191 personal_sign over:
 *
 *   digest = keccak256(abi.encode(QuestEngine address, chainId, questId, user))
 *
 * and requires it match the address baked into the quest's config bytes. This
 * route signs that digest with ATTESTATION_SIGNER_PK so the user can submit
 * `completeExternalProof(questId, signature)` from their wallet.
 *
 * Demo posture: the route does NOT verify the user actually performed the
 * off-chain action (e.g. shared the post). It only refuses to sign when the
 * quest doesn't exist, isn't EXTERNAL_PROOF, or the user has already
 * completed it. That mirrors the hackathon scope; a production signer would
 * verify the X post via the official API.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AttestRequest = {
  questId: string;
  userAddress: string;
};

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request): Promise<Response> {
  const adminPk = process.env.ATTESTATION_SIGNER_PK;
  if (!adminPk) {
    return NextResponse.json(
      { error: "attestation signer not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }
  const { questId, userAddress } = (body ?? {}) as Partial<AttestRequest>;
  if (typeof questId !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(questId)) {
    return badRequest("questId must be 0x + 64 hex chars");
  }
  if (typeof userAddress !== "string" || !isAddress(userAddress)) {
    return badRequest("userAddress must be a valid 0x address");
  }

  const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(RPC_URL),
  });

  const quest = await publicClient.readContract({
    address: V2_ADDRESSES.questEngine,
    abi: questEngineAbi,
    functionName: "getQuest",
    args: [questId as `0x${string}`],
  });
  // getQuest returns: [qType, startsAt, endsAt, xpReward, dim, config, exists]
  const qType = quest[0];
  const exists = quest[6];
  if (!exists) return badRequest("quest not registered on chain");
  if (qType !== 2)
    return badRequest("quest is not EXTERNAL_PROOF type — won't sign");

  const already = await publicClient.readContract({
    address: V2_ADDRESSES.questEngine,
    abi: questEngineAbi,
    functionName: "completed",
    args: [questId as `0x${string}`, userAddress as `0x${string}`],
  });
  if (already) return badRequest("user has already completed this quest");

  // EIP-191 personal_sign over the digest the contract expects. viem's
  // signMessage with { raw: digest } applies the "\x19Ethereum Signed
  // Message:\n32" prefix and hashes — which matches OZ MessageHashUtils
  // .toEthSignedMessageHash() inside QuestEngine.completeExternalProof.
  const digest = keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "address" },
      ],
      [
        V2_ADDRESSES.questEngine,
        BigInt(CHAIN_ID),
        questId as `0x${string}`,
        userAddress as `0x${string}`,
      ],
    ),
  );

  const account = privateKeyToAccount(adminPk as `0x${string}`);
  const signature = await account.signMessage({ message: { raw: digest } });

  return new NextResponse(JSON.stringify({ signature }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
