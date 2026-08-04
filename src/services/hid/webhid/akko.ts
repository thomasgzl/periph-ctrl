/**
 * Real WebHID connection to Akko/MonsGeek HE keyboards (RongYuan RY5088
 * controller). Protocol reverse-engineered by the monsgeek-akko-linux
 * project: https://github.com/echtzeit-solutions/monsgeek-akko-linux
 *
 * Confirmed against Akko's own official web configurator (web.akkogear.com,
 * itself WebHID-based): its internal device registry lists PID 0x502d as
 * "TAC75 HE" (name "ry5088_akko_tac75he_8k_dm"), and its per-device
 * connection config targets usagePage 0xFFFF / usage 0x02 / interface 2 —
 * NOT usage 0x01, which is a separate, input-only monitoring collection on
 * the same vendor page (that's the one an unfiltered vendorId-only request
 * grabbed on the first attempt, and it has no output/feature reports at
 * all, hence the earlier "Failed to write" errors).
 */

export const AKKO_VENDOR_ID = 0x3151
const CONFIG_USAGE_PAGE = 0xffff
const CONFIG_USAGE = 0x02

// From monsgeek-akko-linux's docs/PROTOCOL.md device table — used only to
// tell the user "this PID is a confirmed model" in the diagnostics, not to
// change behavior.
const KNOWN_PRODUCT_IDS: Record<number, string> = {
  0x5030: 'M1 V5 HE USB (wired)',
  0x503a: 'M1 V5 HE 2.4GHz dongle',
  0x5038: 'M1 V5 HE TMR 2.4GHz dongle',
  0x5027: 'M1 V5 HE Bluetooth',
  0x5029: 'TITAN68HE (wired)',
  0x502d: 'TAC75 HE / X65HE (même PCB RY5088, confirmé via web.akkogear.com)',
}

const GET_LEDPARAM = 0x87
const SET_LEDPARAM = 0x07

// Kept module-level (not in Pinia state) so a live HIDDevice handle never
// gets wrapped in Vue's reactivity proxy — only plain diagnostic data goes
// into the store.
let activeDevice: HIDDevice | null = null
let lastLedParamBytes: number[] | null = null

function toHex(value: number, width = 2): string {
  return value.toString(16).padStart(width, '0')
}

function buildFeatureReport(cmd: number, params: number[] = []): Uint8Array {
  const data = new Uint8Array(64)
  data[0] = cmd
  for (let i = 0; i < 5; i++) data[1 + i] = params[i] ?? 0
  let sum = 0
  for (let i = 0; i < 6; i++) sum = (sum + data[i]) & 0xff
  data[6] = (255 - sum) & 0xff
  return data
}

function describeReports(label: string, reports?: HIDReportItem[]): string {
  if (!reports || reports.length === 0) return `${label}: aucun`
  const ids = reports.map((r) => `0x${toHex(r.reportId ?? 0)}`).join(', ')
  return `${label}: ${ids}`
}

function bytesToHex(view: DataView, max = 16): string {
  const bytes: string[] = []
  for (let i = 0; i < Math.min(view.byteLength, max); i++) bytes.push(toHex(view.getUint8(i)))
  return bytes.join(' ')
}

/** Waits for one 'inputreport' event after sending an output report, with a timeout. */
function sendOutputReportAndWait(device: HIDDevice, reportId: number, data: Uint8Array, timeoutMs = 800): Promise<DataView> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      device.removeEventListener('inputreport', handler)
      reject(new Error(`Timeout (${timeoutMs}ms) : aucun input report reçu en retour`))
    }, timeoutMs)

    function handler(event: HIDInputReportEvent) {
      clearTimeout(timeout)
      device.removeEventListener('inputreport', handler)
      resolve(event.data)
    }

    device.addEventListener('inputreport', handler)
    device.sendReport(reportId, data).catch((error: unknown) => {
      clearTimeout(timeout)
      device.removeEventListener('inputreport', handler)
      reject(error instanceof Error ? error : new Error(String(error)))
    })
  })
}

export interface AkkoProbeResult {
  vendorId: number
  productId: number
  productName: string
  diagnostics: string[]
}

/**
 * Opens the browser's native HID device picker filtered to the Akko/MonsGeek
 * vendor ID, then runs a read-only protocol probe. Must be called from a
 * user-gesture handler (click) — WebHID requires transient user activation.
 * Returns null if the user cancels the picker.
 */
export async function connectAndProbeAkko(): Promise<AkkoProbeResult | null> {
  const devices = await navigator.hid.requestDevice({
    filters: [{ vendorId: AKKO_VENDOR_ID, usagePage: CONFIG_USAGE_PAGE, usage: CONFIG_USAGE }],
  })
  const device = devices[0]
  if (!device) return null

  const diagnostics: string[] = [
    `VID:PID = 0x${toHex(device.vendorId, 4)}:0x${toHex(device.productId, 4)}`,
  ]

  const knownModel = KNOWN_PRODUCT_IDS[device.productId]
  diagnostics.push(
    knownModel
      ? `Ce PID correspond à un modèle confirmé dans la doc communautaire : ${knownModel} — bon signe, même famille de firmware.`
      : "Ce PID n'est dans aucune liste confirmée — famille de firmware probable mais non garantie.",
  )

  if (!device.opened) await device.open()

  diagnostics.push(`${device.collections.length} collection(s) HID sur ce device :`)
  for (const collection of device.collections) {
    diagnostics.push(
      `— usagePage 0x${toHex(collection.usagePage ?? 0, 4)} / usage 0x${toHex(collection.usage ?? 0)} — `
        + `${describeReports('input', collection.inputReports)}, `
        + `${describeReports('output', collection.outputReports)}, `
        + `${describeReports('feature', collection.featureReports)}`,
    )
  }

  const configCollection = device.collections.find(
    (c) => c.usagePage === CONFIG_USAGE_PAGE && c.usage === CONFIG_USAGE,
  )
  if (!configCollection) {
    diagnostics.push(
      "Collection de config (usagePage 0xFFFF / usage 0x02) introuvable sur ce device — le sélecteur du navigateur a peut-être renvoyé une autre interface.",
    )
    return { vendorId: device.vendorId, productId: device.productId, productName: device.productName, diagnostics }
  }
  diagnostics.push('Collection de config (usage 0x02) trouvée — bonne interface cette fois.')

  const report = buildFeatureReport(GET_LEDPARAM)

  try {
    await device.sendFeatureReport(0, report)
    const response = await device.receiveFeatureReport(0)
    diagnostics.push(`GET_LEDPARAM via Feature Report — réponse : ${bytesToHex(response)}`)
    activeDevice = device
    lastLedParamBytes = []
    for (let i = 0; i < response.byteLength; i++) lastLedParamBytes.push(response.getUint8(i))
  } catch (featureError) {
    diagnostics.push(
      `GET_LEDPARAM via Feature Report a échoué (${featureError instanceof Error ? featureError.message : String(featureError)}) — essai via Output/Input report…`,
    )
    try {
      const response = await sendOutputReportAndWait(device, 0, report)
      diagnostics.push(`GET_LEDPARAM via Output/Input report — réponse : ${bytesToHex(response)}`)
    } catch (reportError) {
      diagnostics.push(
        `GET_LEDPARAM via Output/Input report a aussi échoué : ${reportError instanceof Error ? reportError.message : String(reportError)}`,
      )
    }
  }

  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    diagnostics,
  }
}

/**
 * Real SET_LEDPARAM frame layout, confirmed by capturing Akko's own official
 * web app's actual WebHID traffic (monkey-patching HIDDevice.prototype in
 * DevTools while the user changed color red→green):
 *
 *   [0]=0x07 (opcode) [1]=mode [2..4]=3 fixed params [5..7]=R,G,B
 *   [8]=checksum = 255 - (sum(bytes[0..7]) mod 256)
 *
 * This is NOT the same shape as the generic 6-byte/checksum-at-6 guess from
 * the monsgeek-akko-linux docs (that one only held for GET_LEDPARAM, which
 * carries no real params) — SET carries 8 meaningful bytes, so its checksum
 * sits right after them, at offset 8. Confirmed against 3 real colors: pure
 * red (255,0,0), pure blue-ish (0,64,255), and this pure green (0,255,17)
 * capture all landed exactly at positions 5,6,7 with a matching checksum.
 */
function buildSetLedParamFrame(mode: number, p2: number, p3: number, p4: number, r: number, g: number, b: number): Uint8Array {
  const data = new Uint8Array(64)
  data[0] = SET_LEDPARAM
  data[1] = mode
  data[2] = p2
  data[3] = p3
  data[4] = p4
  data[5] = r
  data[6] = g
  data[7] = b
  let sum = 0
  for (let i = 0; i < 8; i++) sum = (sum + data[i]) & 0xff
  data[8] = (255 - sum) & 0xff
  return data
}

async function sendSetLedParamFrame(device: HIDDevice, data: Uint8Array): Promise<string[]> {
  const diagnostics: string[] = [`Envoi SET_LEDPARAM : ${Array.from(data.slice(0, 16)).map((b) => toHex(b)).join(' ')}`]
  try {
    await device.sendFeatureReport(0, data)
    diagnostics.push('Écriture acceptée par le device (aucune erreur levée).')
    const response = await device.receiveFeatureReport(0)
    diagnostics.push(`Relecture après écriture : ${bytesToHex(response)}`)
  } catch (error) {
    diagnostics.push(`Échec de l'écriture : ${error instanceof Error ? error.message : String(error)}`)
  }
  return diagnostics
}

/** #rrggbb -> [r,g,b] */
function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)]
}

/**
 * Sets a real color on the keyboard (static effect), using the confirmed
 * frame layout. Keeps whatever mode/param2-4 were last read so we don't
 * touch effect/speed/brightness — only the color channels change.
 */
export async function setAkkoLedColor(hex: string): Promise<string[]> {
  if (!activeDevice) {
    return ["Aucun clavier connecté — clique d'abord \"Connecter un clavier réel\"."]
  }
  const [r, g, b] = parseHexColor(hex)
  const mode = lastLedParamBytes?.[1] ?? 0x01
  const p2 = lastLedParamBytes?.[2] ?? 0x04
  const p3 = lastLedParamBytes?.[3] ?? 0x04
  const p4 = lastLedParamBytes?.[4] ?? 0x08
  const data = buildSetLedParamFrame(mode, p2, p3, p4, r, g, b)
  return sendSetLedParamFrame(activeDevice, data)
}

// Bytes from the very first successful GET_LEDPARAM read on this exact
// keyboard (2026-08-03), before an earlier buggy test corrupted its state —
// hardcoded so we can restore it even after a page reload wipes the
// in-memory `lastLedParamBytes`. Response shape: [echo, mode, p2, p3, p4, R, G, B].
const KNOWN_TAC75_LEDPARAM_BEFORE_BUG = { mode: 0x02, p2: 0x01, p3: 0x04, p4: 0x08, r: 0x80, g: 0x00, b: 0xff }

/** One-off recovery: restores the exact lighting state read before the round-trip bug. */
export async function restoreKnownTac75Lighting(): Promise<string[]> {
  if (!activeDevice) {
    return ["Aucun clavier connecté — clique d'abord \"Connecter un clavier réel\"."]
  }
  const { mode, p2, p3, p4, r, g, b } = KNOWN_TAC75_LEDPARAM_BEFORE_BUG
  const data = buildSetLedParamFrame(mode, p2, p3, p4, r, g, b)
  return sendSetLedParamFrame(activeDevice, data)
}
