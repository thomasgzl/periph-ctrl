// Minimal WebHID typings (not yet in TypeScript's lib.dom.d.ts).
// Covers only what this project uses. Spec: https://wicg.github.io/webhid/

interface HIDReportItem {
  reportId?: number
}

interface HIDCollectionInfo {
  usagePage?: number
  usage?: number
  inputReports?: HIDReportItem[]
  outputReports?: HIDReportItem[]
  featureReports?: HIDReportItem[]
}

interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice
  readonly reportId: number
  readonly data: DataView
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  readonly collections: HIDCollectionInfo[]
  open(): Promise<void>
  close(): Promise<void>
  sendReport(reportId: number, data: Uint8Array): Promise<void>
  sendFeatureReport(reportId: number, data: Uint8Array): Promise<void>
  receiveFeatureReport(reportId: number): Promise<DataView>
  addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void
  removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void
}

interface HIDDeviceFilter {
  vendorId?: number
  productId?: number
  usagePage?: number
  usage?: number
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[]
}

interface HID extends EventTarget {
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>
  getDevices(): Promise<HIDDevice[]>
}

interface Navigator {
  readonly hid: HID
}
