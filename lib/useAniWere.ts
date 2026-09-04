"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  ASC_ADDRESS,
  ascAbi,
  isDeployed,
  vaultAbi,
} from "./contracts";
import { creditcoinTestnet } from "./chains";
import {
  policy as samplePolicy,
  snapshot as sampleSnapshot,
  vault as sampleVault,
  type Policy,
  type Snapshot,
  type VaultState,
} from "./data";

/**
 * Satu lapisan antara kontrak dan komponen.
 *
 * Komponen tidak boleh tahu soal bigint, desimal, atau wagmi. Ia cuma perlu
 * tahu dua hal: angkanya berapa, dan angka itu datang dari chain atau dari
 * data contoh. Yang kedua sama pentingnya — kalau komponen tidak bisa
 * membedakan, ia akan menampilkan keduanya dengan keyakinan yang sama.
 */

export type Source = "chain" | "sample";

const POSITION_VERIFIED = parseAbiItem(
  "event PositionVerified(address indexed user, uint256 collateral, uint256 debt, uint256 healthFactor, uint256 sourceBlock)",
);
const CLAIM_SETTLED = parseAbiItem(
  "event ClaimSettled(address indexed holder, uint256 payout, uint256 sourceBlock)",
);

/** Aave base currency memakai 8 desimal, bukan 18. */
const BASE_DECIMALS = 100_000_000;

/** HF di Aave 18 desimal, dan `type(uint256).max` berarti "tidak punya hutang". */
function toHealthFactor(raw: bigint): number {
  if (raw > 2n ** 200n) return Infinity;
  return Number(raw) / 1e18;
}

const toBase = (raw: bigint) => Number(raw) / BASE_DECIMALS;
const toCtc = (raw: bigint) => Number(raw) / 1e18;

/**
 * Waktu sekarang, tapi aman terhadap hydration.
 *
 * Server merender dengan `reference`, client langsung mengambil alih dengan
 * waktu asli. Dibungkus `useSyncExternalStore` karena memang itu bentuknya:
 * jam adalah sumber data di luar React, bukan state yang perlu di-set dari
 * dalam effect.
 *
 * Nilainya dibulatkan ke kelipatan `intervalMs` supaya `getSnapshot`
 * mengembalikan nilai yang sama selama satu interval. Tanpa pembulatan itu
 * React akan menganggap store berubah di setiap render.
 */
export function useNow(reference: Date, intervalMs = 30_000): Date {
  const bucket = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const id = setInterval(onChange, intervalMs);
        return () => clearInterval(id);
      },
      [intervalMs],
    ),
    () => Math.floor(Date.now() / intervalMs),
    () => Math.floor(reference.getTime() / intervalMs),
  );

  return useMemo(() => new Date(bucket * intervalMs), [bucket, intervalMs]);
}

export type AniWereState = {
  source: Source;
  deployed: boolean;
  connected: boolean;
  loading: boolean;
  /** Alamat yang sedang dilihat. `null` kalau belum connect. */
  address: `0x${string}` | null;
  /** `null` berarti user memang belum punya snapshot terbukti. */
  snapshot: Snapshot | null;
  /** `null` berarti belum ada polis aktif. */
  policy: Policy | null;
  vault: VaultState;
  vaultAddress: `0x${string}` | null;
  refetch: () => void;
};

export function useAniWere(): AniWereState {
  const { address, isConnected } = useAccount();
  const enabled = isDeployed && isConnected && !!address;

  const { data: vaultAddress } = useReadContract({
    address: ASC_ADDRESS ?? undefined,
    abi: ascAbi,
    functionName: "VAULT",
    chainId: creditcoinTestnet.id,
    query: { enabled: isDeployed },
  });

  const user = useReadContracts({
    contracts: [
      {
        address: ASC_ADDRESS ?? undefined,
        abi: ascAbi,
        functionName: "latestSnapshot",
        args: address ? [address] : undefined,
        chainId: creditcoinTestnet.id,
      },
      {
        address: ASC_ADDRESS ?? undefined,
        abi: ascAbi,
        functionName: "policies",
        args: address ? [address] : undefined,
        chainId: creditcoinTestnet.id,
      },
    ],
    query: { enabled },
  });

  const vaultReads = useReadContracts({
    contracts: [
      {
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "totalCapital",
        chainId: creditcoinTestnet.id,
      },
      {
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "lockedCapital",
        chainId: creditcoinTestnet.id,
      },
    ],
    query: { enabled: !!vaultAddress },
  });

  const refetch = () => {
    void user.refetch();
    void vaultReads.refetch();
  };

  // Belum di-deploy, atau wallet belum tersambung. Tampilkan data contoh, dan
  // katakan bahwa itu data contoh — jangan pernah dua-duanya terlihat sama.
  if (!enabled) {
    return {
      source: "sample",
      deployed: isDeployed,
      connected: isConnected,
      loading: false,
      address: address ?? null,
      snapshot: sampleSnapshot,
      policy: samplePolicy,
      vault: sampleVault,
      vaultAddress: vaultAddress ?? null,
      refetch,
    };
  }

  const snapRaw = user.data?.[0]?.result;
  const polRaw = user.data?.[1]?.result;

  // `verifiedAt == 0` berarti belum pernah ada proof untuk address ini.
  // Ini bukan error dan bukan angka nol — ini "belum ada", dan UI harus
  // mengatakannya begitu, bukan menampilkan HF 0.00.
  const snapshot: Snapshot | null =
    snapRaw && snapRaw[4] !== 0n
      ? {
          collateralEth: null,
          collateralUsd: toBase(snapRaw[0]),
          debtUsd: toBase(snapRaw[1]),
          healthFactor: toHealthFactor(snapRaw[2]),
          sourceBlock: Number(snapRaw[3]),
          verifiedAt: new Date(Number(snapRaw[4]) * 1000),
          liquidationThresholdPct: null,
        }
      : null;

  const policy: Policy | null =
    polRaw && polRaw[4]
      ? {
          id: address!.slice(2, 6).toUpperCase(),
          coverAmount: toCtc(polRaw[0]),
          premiumPaid: toCtc(polRaw[1]),
          hfAtPurchase: toHealthFactor(polRaw[2]),
          startedAt: null,
          expiresAt: new Date(Number(polRaw[3]) * 1000),
          active: polRaw[4],
          claimed: polRaw[5],
          holder: address!,
        }
      : null;

  const total = vaultReads.data?.[0]?.result;
  const locked = vaultReads.data?.[1]?.result;

  return {
    source: "chain",
    deployed: true,
    connected: true,
    loading: user.isLoading || vaultReads.isLoading,
    address: address ?? null,
    snapshot,
    policy,
    vault: {
      totalCapital: total === undefined ? 0 : toCtc(total),
      locked: locked === undefined ? 0 : toCtc(locked),
    },
    vaultAddress: vaultAddress ?? null,
    refetch,
  };
}

// ─────────────────────────────────────────────────────────────
// Riwayat proof
// ─────────────────────────────────────────────────────────────

export type ProofEvent = {
  kind: "snapshot" | "claim";
  /** Block Sepolia yang dibuktikan, bukan block Creditcoin. */
  sourceBlock: number;
  /** Block Creditcoin tempat proof-nya diterima. */
  creditcoinBlock: number;
  txHash: `0x${string}`;
  healthFactor: number | null;
  debtUsd: number | null;
  payoutCtc: number | null;
};

/**
 * Riwayat proof milik satu address, dibaca dari log AniWereASC.
 *
 * Kontrak hanya menyimpan snapshot TERAKHIR — `latestSnapshot` menimpa yang
 * sebelumnya. Riwayatnya tetap ada, tapi di log, bukan di storage. Itu memang
 * pilihan yang benar: menyimpan seluruh riwayat di storage berarti membayar gas
 * untuk data yang tidak pernah dipakai kontrak dalam pengambilan keputusan.
 *
 * Konsekuensinya, grafik "verified health history" harus dibangun dari event.
 * Tiap titik di grafik itu satu proof yang benar-benar terjadi.
 */
export function useProofHistory(): {
  events: ProofEvent[];
  source: Source;
  loading: boolean;
} {
  const { address, isConnected } = useAccount();
  const client = usePublicClient({ chainId: creditcoinTestnet.id });
  const enabled = isDeployed && isConnected && !!address && !!client;

  const query = useQuery({
    queryKey: ["proof-history", address, ASC_ADDRESS],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<ProofEvent[]> => {
      if (!client || !address || !ASC_ADDRESS) return [];

      const head = await client.getBlockNumber();
      // Rentang dibatasi supaya RPC publik tidak menolak permintaan.
      // ~100k block Creditcoin sekitar tiga minggu, jauh lebih panjang dari
      // durasi polis maksimum.
      const fromBlock = head > 100_000n ? head - 100_000n : 0n;

      const [verified, settled] = await Promise.all([
        client.getLogs({
          address: ASC_ADDRESS,
          event: POSITION_VERIFIED,
          args: { user: address },
          fromBlock,
          toBlock: head,
        }),
        client.getLogs({
          address: ASC_ADDRESS,
          event: CLAIM_SETTLED,
          args: { holder: address },
          fromBlock,
          toBlock: head,
        }),
      ]);

      const events: ProofEvent[] = [
        ...verified.map((l) => ({
          kind: "snapshot" as const,
          sourceBlock: Number(l.args.sourceBlock ?? 0n),
          creditcoinBlock: Number(l.blockNumber ?? 0n),
          txHash: l.transactionHash!,
          healthFactor: l.args.healthFactor === undefined ? null : toHealthFactor(l.args.healthFactor),
          debtUsd: l.args.debt === undefined ? null : toBase(l.args.debt),
          payoutCtc: null,
        })),
        ...settled.map((l) => ({
          kind: "claim" as const,
          sourceBlock: Number(l.args.sourceBlock ?? 0n),
          creditcoinBlock: Number(l.blockNumber ?? 0n),
          txHash: l.transactionHash!,
          healthFactor: null,
          debtUsd: null,
          payoutCtc: l.args.payout === undefined ? null : toCtc(l.args.payout),
        })),
      ];

      return events.sort((a, b) => a.creditcoinBlock - b.creditcoinBlock);
    },
  });

  return {
    events: query.data ?? [],
    source: enabled ? "chain" : "sample",
    loading: query.isLoading,
  };
}
