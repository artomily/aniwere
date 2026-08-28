import { freeCapital, minutesAgo, snapshot, vault } from "@/lib/data";
import { BuyCover } from "./CoverForm";

/** Waktu acuan demo. Diganti `new Date()` begitu data sudah dari chain. */
const NOW = new Date("2026-08-27T09:14:00Z");

export default function CoverPage() {
  return (
    <BuyCover
      freeCapital={freeCapital(vault)}
      snapshotAgeMinutes={minutesAgo(snapshot.verifiedAt, NOW)}
      healthFactor={snapshot.healthFactor}
    />
  );
}
