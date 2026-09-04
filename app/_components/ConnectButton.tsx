"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

/**
 * Connect/disconnect di header.
 *
 * Sebelumnya di tempat ini ada alamat hardcoded yang terlihat seperti wallet
 * tersambung padahal tidak ada apa-apa di baliknya.
 */
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const injected = connectors[0];

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect"
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2.5 font-mono text-[12.5px] whitespace-nowrap text-ink-2 shadow-card hover:text-ink"
      >
        <i aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-safe" />
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!injected || isPending}
      onClick={() => injected && connect({ connector: injected })}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending
        ? "Connecting…"
        : !injected
          ? "No wallet found"
          : error
            ? "Retry connect"
            : "Connect wallet"}
    </button>
  );
}
