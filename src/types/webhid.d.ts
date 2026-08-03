// Minimal WebHID typings (not yet in TypeScript's lib.dom.d.ts).
// Covers only what this project uses. Spec: https://wicg.github.io/webhid/

interface HIDReportInfo {
  reportId?: number
}

interface HIDCollectionInfo {
  usagePage?: number
  usage?: number
  inputReports?: HIDReportInfo[]
  outputReports?: HIDReportInfo[]
  featureReports?: HIDReportInfo[]
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
