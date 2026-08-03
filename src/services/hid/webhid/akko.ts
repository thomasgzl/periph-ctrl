/**
 * Real WebHID connection to Akko/MonsGeek HE keyboards (RongYuan RY5088
 * controller). Protocol reverse-engineered by the monsgeek-akko-linux
 * project: https://github.com/echtzeit-solutions/monsgeek-akko-linux
 *
 * The exact PID for the Akko TAC75 HE isn't in that project's confirmed
 * device list (only other Akko/MonsGeek HE models are), so this only
 * probes the device (a read-only GET_LEDPARAM call) and reports the raw
 * response — no SET/write command is sent until that's verified against
 * a real capture.
 */

export const AKKO_VENDOR_ID = 0x3151

const GET_LEDPARAM = 0x87
const VENDOR_USAGE_PAGE = 0xffff

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
    filters: [{ vendorId: AKKO_VENDOR_ID }],
  })
  const device = devices[0]
  if (!device) return null

  const diagnostics: string[] = [
    `VID:PID = 0x${toHex(device.vendorId, 4)}:0x${toHex(device.productId, 4)}`,
  ]

  const vendorCollection = device.collections.find((c) => c.usagePage === VENDOR_USAGE_PAGE)
  diagnostics.push(
    vendorCollection
      ? `Interface vendor 0xFFFF trouvée (usage 0x${toHex(vendorCollection.usage ?? 0)}) — cohérent avec le protocole RY5088.`
      : "Aucune interface vendor 0xFFFF trouvée — ce périphérique n'utilise probablement pas le même protocole.",
  )

  try {
    if (!device.opened) await device.open()

    const report = buildFeatureReport(GET_LEDPARAM)
    await device.sendFeatureReport(0, report)
    const response = await device.receiveFeatureReport(0)

    const bytes: number[] = []
    for (let i = 0; i < Math.min(response.byteLength, 16); i++) bytes.push(response.getUint8(i))
    diagnostics.push(`Réponse GET_LEDPARAM (16 premiers octets) : ${bytes.map((b) => toHex(b)).join(' ')}`)
  } catch (error) {
    diagnostics.push(
      `Sonde GET_LEDPARAM échouée : ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return {
    vendorId: device.vendorId,
    productId: device.productId,
    productName: device.productName,
    diagnostics,
  }
}
