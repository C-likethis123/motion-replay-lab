import { db, type DeviceRecord } from "../db";

const DEVICE_RECORD_ID = "local";
const STORAGE_SAFETY_MARGIN_BYTES = 128 * 1024 * 1024;

export async function getOrCreateDevice(): Promise<DeviceRecord> {
  const existing = await db.devices.get(DEVICE_RECORD_ID);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  const record: DeviceRecord = {
    id: DEVICE_RECORD_ID,
    deviceId,
    displayName: defaultDeviceName(),
    createdAt: Date.now(),
  };
  await db.devices.put(record);
  return record;
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function requestStorageReadiness() {
  const persisted = navigator.storage?.persist
    ? await navigator.storage.persist()
    : false;
  const estimate = navigator.storage?.estimate
    ? await navigator.storage.estimate()
    : {};
  const quota = estimate.quota ?? null;
  const usage = estimate.usage ?? null;
  const available = quota === null || usage === null
    ? null
    : Math.max(0, quota - usage - STORAGE_SAFETY_MARGIN_BYTES);

  return {
    persisted,
    quota,
    usage,
    available,
    canReceiveBytes: (byteLength: number) => available === null || byteLength <= available,
  };
}

export async function cleanupAbandonedTransfers(maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  const transfers = await db.syncTransfers.where("updatedAt").below(cutoff).toArray();
  await db.transaction("rw", [db.syncTransfers, db.syncChunks], async () => {
    for (const transfer of transfers) {
      await db.syncChunks.where("transferId").equals(transfer.id).delete();
      await db.syncTransfers.delete(transfer.id);
    }
  });
}

function defaultDeviceName() {
  const userAgentData = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = userAgentData.userAgentData?.platform || navigator.platform || "Browser";
  return `${platform} browser`;
}
