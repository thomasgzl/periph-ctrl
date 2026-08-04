/**
 * Real WebHID connection to Pulsar gaming mice. Unlike Akko, Pulsar has no
 * official web-based configurator (Pulsar Fusion is a native Windows app),
 * so there's no JS bundle to grep for ground truth here — this starts at
 * detection + read-only interface introspection only, same as the very
 * first cautious step taken with the keyboard.
 *
 * Community reverse-engineering (https://github.com/packerlschupfer/pulsar-mouse-linux)
 * documents two vendor IDs depending on connection type, and only confirms
 * the protocol for the X2A/X2H family — the user's Xlite V3 isn't in that
 * project's confirmed device list, so nothing beyond detection is
 * implemented until a capture (Wireshark/USBPcap, since there's no web app
 * to monkey-patch) confirms the real frame layout for this exact model.
 */

import { describeCollections, toHex } from './shared'

// 0x3710: wired Pulsar mice (X2A/X2H/Xlite v4 per community docs).
// 0x3554: Nordic-based wireless dongle mice (X2A Wireless / X2 V2 Mini).
export const PULSAR_VENDOR_IDS = [0x3710, 0x3554]

const KNOWN_PRODUCT_IDS: Record<number, string> = {
  0x1404: 'X2A Medium Wired (confirmé par pulsar-mouse-linux)',
  0x1403: 'X2H Wired Medium (confirmé par pulsar-mouse-linux)',
  0x3401: 'Xlite v4 (non testé par pulsar-mouse-linux, protocole supposé identique au X2A)',
}

export interface PulsarProbeResult {
  vendorId: number
  productId: number
  productName: string
  diagnostics: string[]
}

/**
 * Opens the browser's native HID device picker filtered to Pulsar's known
 * vendor IDs. Detection + interface introspection only — no read or write
 * attempted, since we don't have a confirmed protocol for this exact
 * model. Must run from a user-gesture handler. Returns null if cancelled.
 */
export async function connectAndProbePulsar(): Promise<PulsarProbeResult | null> {
  const devices = await navigator.hid.requestDevice({
    filters: PULSAR_VENDOR_IDS.map((vendorId) => ({ vendorId })),
  })
  const device = devices[0]
  if (!device) return null

  const diagnostics: string[] = [
    `VID:PID = 0x${toHex(device.vendorId, 4)}:0x${toHex(device.productId, 4)}`,
  ]

  const knownModel = KNOWN_PRODUCT_IDS[device.productId]
  diagnostics.push(
    knownModel
      ? `Ce PID correspond à un modèle confirmé : ${knownModel}`
      : "Ce PID n'est dans aucune liste confirmée pour l'instant — protocole non vérifié pour ce modèle exact.",
  )

  if (!device.opened) await device.open()

  diagnostics.push(...describeCollections(device))
  diagnostics.push(
    "Détection uniquement pour l'instant : aucune lecture/écriture DPI tentée tant que le protocole n'est pas confirmé pour ce PID (capture USB nécessaire, pas de configurateur web officiel chez Pulsar).",
  )

  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    diagnostics,
  }
}
