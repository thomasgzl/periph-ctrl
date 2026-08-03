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
