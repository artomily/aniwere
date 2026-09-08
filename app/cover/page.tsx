"use client";

import { freeCapital, minutesAgo, SAMPLE_EPOCH } from "@/lib/data";
import { useAniWere, useNow } from "@/lib/useAniWere";
import { BuyCover } from "./CoverForm";
import { Card } from "../_components/ui";
import { ConnectButton } from "../_components/ConnectButton";
import { ProbeButton } from "../_components/Actions";

/** Waktu acuan untuk data contoh; diganti waktu asli setelah mount. */
const SAMPLE_NOW = SAMPLE_EPOCH;

export default function CoverPage() {
  const { source, deployed, connected, snapshot, policy, vault, refetch } = useAniWere();
  const liveNow = useNow(SAMPLE_NOW);
  // Data contoh dibekukan bersama jamnya — lihat catatan yang sama di app/page.tsx.
  const now = source === "chain" ? liveNow : SAMPLE_NOW;

  if (deployed && !connected) {
    return (
      <Card className="mx-auto max-w-[520px] px-7 py-9 text-center">
        <h2 className="font-display text-[20px] font-semibold">Connect to buy cover</h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[13px] text-ink-3">
          Cover is priced against your own verified snapshot, so there is nothing to quote
          until we know whose position it is.
        </p>
        <div className="mt-5 flex justify-center">
          <ConnectButton />
        </div>
      </Card>
    );
  }

  if (deployed && connected && !snapshot) {
    return (
      <Card className="mx-auto max-w-[560px] px-7 py-9">
        <h2 className="text-center font-display text-[20px] font-semibold">
          Prove your position first
        </h2>
        <p className="mx-auto mt-2 max-w-[46ch] text-center text-[13px] text-ink-3">
          The contract refuses to sell cover without a fresh verified snapshot. Not a UI
          rule — <code className="font-mono text-[11.5px]">buyCover</code> reverts with{" "}
          <code className="font-mono text-[11.5px]">NoSnapshot</code>.
        </p>
        <div className="mt-5">
          <ProbeButton onProbed={refetch} />
        </div>
      </Card>
    );
  }

  return (
    <BuyCover
      live={source === "chain"}
      freeCapital={freeCapital(vault)}
      snapshotAgeMinutes={minutesAgo(snapshot!.verifiedAt, now)}
      healthFactor={snapshot!.healthFactor}
      hasActivePolicy={policy?.active === true}
      policyExpiresAt={policy?.expiresAt ?? null}
      onBought={refetch}
    />
  );
}
