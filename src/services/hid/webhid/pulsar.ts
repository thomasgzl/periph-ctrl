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

import { bytesToHex, describeCollections, toHex } from './shared'

// 0x3710: wired Pulsar mice (X2A/X2H/Xlite v4 per community docs).
// 0x3554: Nordic-based wireless dongle mice (X2A Wireless / X2 V2 Mini).
export const PULSAR_VENDOR_IDS = [0x3710, 0x3554]

// Found by inspecting every granted interface on the user's real Xlite V3
// (2026-08-03): interface 1's usagePage 0xff04 / usage 0x02 collection has
// a real Feature report (id 0x06) — matches pulsar-mouse-linux's
// description of the X2A's config channel ("Interface 3, HID Feature
// report"), even though this is a different VID (0x3554 nordic family).
const CONFIG_USAGE_PAGE = 0xff04
const CONFIG_USAGE = 0x02
const CONFIG_FEATURE_REPORT_ID = 0x06

// Kept module-level, like akko.ts's activeDevice, so the live HIDDevice
// handle never gets wrapped in Vue's reactivity proxy.
let activeConfigDevice: HIDDevice | null = null

const KNOWN_PRODUCT_IDS: Record<number, string> = {
  0x1404: 'X2A Medium Wired (confirmé par pulsar-mouse-linux)',
  0x1403: 'X2H Wired Medium (confirmé par pulsar-mouse-linux)',
  0x3401: 'Xlite v4 (non testé par pulsar-mouse-linux, protocole supposé identique au X2A)',
  0xf507: 'X2A Wireless / X2 V2 Mini (confirmé par pulsar-mouse-linux, support batterie)',
  0xf508: 'X2A Wireless / X2 V2 Mini (confirmé par pulsar-mouse-linux, support batterie)',
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

  // A single picker selection can grant access to *every* HID interface of
  // that physical device at once — requestDevice() then resolves with one
  // HIDDevice entry per interface, not just one. Only inspecting devices[0]
  // meant we could easily miss a separate vendor config interface sitting
  // right next to the protected standard-mouse one. Report on all of them.
  const diagnostics: string[] = [
    `VID:PID = 0x${toHex(device.vendorId, 4)}:0x${toHex(device.productId, 4)}`,
    `${devices.length} interface(s) HID accordée(s) pour ce périphérique.`,
  ]

  const knownModel = KNOWN_PRODUCT_IDS[device.productId]
  diagnostics.push(
    knownModel
      ? `Ce PID correspond à un modèle confirmé : ${knownModel}`
      : "Ce PID n'est dans aucune liste confirmée pour l'instant — protocole non vérifié pour ce modèle exact.",
  )

  let configDevice: HIDDevice | undefined
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i]
    if (!d.opened) await d.open()
    diagnostics.push(`--- Interface ${i} ---`)
    diagnostics.push(...describeCollections(d))
    if (d.collections.some((c) => c.usagePage === CONFIG_USAGE_PAGE && c.usage === CONFIG_USAGE)) {
      configDevice = d
    }
  }

  if (configDevice) {
    activeConfigDevice = configDevice
    diagnostics.push('Interface de config (usagePage 0xff04 / usage 0x02) trouvée — tentative de lecture pure (aucun envoi).')
    try {
      const response = await configDevice.receiveFeatureReport(CONFIG_FEATURE_REPORT_ID)
      diagnostics.push(`Lecture Feature Report 0x06 : ${bytesToHex(response)}`)
    } catch (error) {
      diagnostics.push(`Lecture échouée : ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    diagnostics.push("Interface de config (0xff04/0x02) non trouvée sur ce périphérique.")
  }

  diagnostics.push(
    "Aucune écriture DPI tentée pour l'instant tant que le protocole n'est pas confirmé pour ce PID (capture USB nécessaire, pas de configurateur web officiel chez Pulsar).",
  )

  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    diagnostics,
  }
}

/**
 * Calculated-risk read attempt using pulsar-mouse-linux's *fragmentary*
 * description of the X2A's DPI query — "category 0x05, register
 * 0x04(read)/0x84(write), subcommand 0x21/0x15" — with no documented exact
 * byte offsets, and confirmed only for the wired X2A (VID 0x3710), not this
 * nordic wireless mouse (VID 0x3554). This is a guess: category at byte 0,
 * register at byte 1, subcommand at byte 2, checksum = 16-bit little-endian
 * sum of bytes[0:62] at bytes[62:64] (that checksum shape *is* documented
 * for the X2A). Read-only (register 0x04, never 0x84/write). May simply
 * fail or return nonsense — that's expected and fine, it's read-only either
 * way.
 */
export async function attemptDpiRead(): Promise<string[]> {
  if (!activeConfigDevice) {
    return ["Aucune souris connectée — clique d'abord \"Connecter une souris réelle\"."]
  }

  const data = new Uint8Array(64)
  data[0] = 0x05 // category (guessed position)
  data[1] = 0x04 // register: read
  data[2] = 0x21 // subcommand (guessed — doc lists 0x21/0x15, meaning unclear)

  let sum = 0
  for (let i = 0; i < 62; i++) sum = (sum + data[i]) & 0xffff
  data[62] = sum & 0xff
  data[63] = (sum >> 8) & 0xff

  const diagnostics: string[] = [
    `Essai (non confirmé, lecture seule) : ${Array.from(data.slice(0, 16)).map((b) => toHex(b)).join(' ')}`,
  ]

  try {
    await activeConfigDevice.sendFeatureReport(CONFIG_FEATURE_REPORT_ID, data)
    diagnostics.push('Envoi accepté (aucune erreur levée).')
    const response = await activeConfigDevice.receiveFeatureReport(CONFIG_FEATURE_REPORT_ID)
    diagnostics.push(`Réponse : ${bytesToHex(response)}`)
  } catch (error) {
    diagnostics.push(`Échec : ${error instanceof Error ? error.message : String(error)}`)
  }

  return diagnostics
}
