import { reactive } from 'vue'

/**
 * Shared reactive singleton that bridges the Shaka UI CastButton (outside Vue)
 * and the CastPopover Vue component.
 *
 * Usage:
 *   - CastButton.js  → import { castStore } from './castStore'
 *   - CastPopover.vue → import { castStore } from './castStore'
 *
 * When cast status changes, a 'ft-caststatuschanged' CustomEvent is dispatched
 * on `document` so that non-Vue code (e.g. the Shaka UI CastButton) can react
 * without polling.
 */
export const castStore = reactive({
    /** @type {boolean} Whether the device-list popup is visible */
    isOpen: false,

    /** @type {boolean} Whether discovery is in progress */
    isDiscovering: false,

    /** @type {{ id: string, name: string, type: string, address: string }[]} */
    devices: [],

    /** @type {string | null} ID of the device we are currently casting to */
    activeDeviceId: null,

    /** @type {string | null} Human-readable name of the active receiver */
    activeDeviceName: null,

    /** @type {string | null} Human-readable discovery/cast error */
    error: null,

    /**
     * Anchor rect used to position the popover near the cast button.
     * @type {DOMRect | null}
     */
    anchorRect: null,
})

/** Notify all listeners (Shaka button, etc.) that cast status has changed */
function dispatchCastStatusChanged() {
    document.dispatchEvent(new CustomEvent('ft-caststatuschanged', {
        detail: {
            isCasting: castStore.activeDeviceId != null,
            deviceName: castStore.activeDeviceName,
        }
    }))
}

/** Open the popover and kick off device discovery */
export async function openCastPopover(anchorRect) {
    castStore.anchorRect = anchorRect
    castStore.isOpen = true
    castStore.error = null
    castStore.devices = []
    castStore.isDiscovering = true

    try {
        const devices = await window.ftElectron.discoverCastDevices()
        castStore.devices = devices ?? []
    } catch (err) {
        console.error('[castStore] Device discovery failed:', err)
        castStore.error = err?.message ?? 'Discovery failed'
    } finally {
        castStore.isDiscovering = false
    }
}

/** Connect to a specific device */
export async function connectToDevice(device) {
    castStore.error = null
    try {
        await window.ftElectron.connectCastDevice(device.id)
        castStore.activeDeviceId = device.id
        castStore.activeDeviceName = device.name
        castStore.isOpen = false
        dispatchCastStatusChanged()
    } catch (err) {
        console.error('[castStore] Cast connection failed:', err)
        castStore.error = err?.message ?? 'Connection failed'
    }
}

/** Stop casting and disconnect */
export async function stopCasting() {
    castStore.error = null
    try {
        await window.ftElectron.stopCasting()
        castStore.activeDeviceId = null
        castStore.activeDeviceName = null
        dispatchCastStatusChanged()
    } catch (err) {
        console.error('[castStore] Stop cast failed:', err)
        castStore.error = err?.message ?? 'Stop failed'
    }
}

/** Close the popover without disconnecting */
export function closeCastPopover() {
    castStore.isOpen = false
}