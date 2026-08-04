// Small helpers shared by every per-brand WebHID module (akko.ts, pulsar.ts, ...).

export function toHex(value: number, width = 2): string {
  return value.toString(16).padStart(width, '0')
}

export function describeReports(label: string, reports?: HIDReportItem[]): string {
  if (!reports || reports.length === 0) return `${label}: aucun`
  const ids = reports.map((r) => `0x${toHex(r.reportId ?? 0)}`).join(', ')
  return `${label}: ${ids}`
}

export function bytesToHex(view: DataView, max = 16): string {
  const bytes: string[] = []
  for (let i = 0; i < Math.min(view.byteLength, max); i++) bytes.push(toHex(view.getUint8(i)))
  return bytes.join(' ')
}

export function describeCollections(device: HIDDevice): string[] {
  const lines = [`${device.collections.length} collection(s) HID sur ce device :`]
  for (const collection of device.collections) {
    lines.push(
      `— usagePage 0x${toHex(collection.usagePage ?? 0, 4)} / usage 0x${toHex(collection.usage ?? 0)} — `
        + `${describeReports('input', collection.inputReports)}, `
        + `${describeReports('output', collection.outputReports)}, `
        + `${describeReports('feature', collection.featureReports)}`,
    )
  }
  return lines
}

/** Waits for one 'inputreport' event after sending an output report, with a timeout. */
export function sendOutputReportAndWait(device: HIDDevice, reportId: number, data: Uint8Array, timeoutMs = 800): Promise<DataView> {
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
