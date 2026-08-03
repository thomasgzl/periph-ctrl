import { mockDriver } from './mockDriver'
import type { DeviceDriver } from './types'

export * from './types'

/**
 * Real per-brand drivers (WebHID + HID++ for Logitech, OpenRazer-derived
 * protocol for Razer, ...) register here once implemented. The first
 * driver whose isSupported() returns true wins; mockDriver is the fallback
 * so the UI always has something to render.
 */
const drivers: DeviceDriver[] = [mockDriver]

export function getActiveDriver(): DeviceDriver {
  return drivers.find((driver) => driver.isSupported()) ?? mockDriver
}
