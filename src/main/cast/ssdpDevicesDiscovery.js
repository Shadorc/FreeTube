import dgram from 'node:dgram'
import http from 'node:http'

const SSDP_MULTICAST_ADDRESS = '239.255.255.250'
const SSDP_MULTICAST_PORT = 1900
const SSDP_RESPONSE_TIMEOUT_MS = 3000
const SSDP_SCAN_DURATION_MS = 5000
const SSDP_MAX_RESPONSE_TIME = 3

const M_SEARCH_REQUEST = `M-SEARCH * HTTP/1.1\r
HOST: ${SSDP_MULTICAST_ADDRESS}:${SSDP_MULTICAST_PORT}\r
MAN: "ssdp:discover"\r
MX: ${SSDP_MAX_RESPONSE_TIME}\r
ST:urn:dial-multiscreen-org:service:dial:1\r
\r
`

class SSDPDeviceScanner {
  constructor(onDeviceDiscovered) {
    this.onDeviceDiscovered_ = onDeviceDiscovered
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    this.discoveredLocations_ = new Set()
  }

  /** @private */
  async fetchDeviceDescription_(url) {
    return new Promise((resolve) => {
      const request = http.get(
        url,
        { timeout: SSDP_RESPONSE_TIMEOUT_MS },
        (response) => {
          let data = ''

          response.on('data', (chunk) => {
            data += chunk
          })

          response.on('end', () => {
            resolve(data)
          })
        }
      )

      request.on('error', () => {
        resolve(null)
      })

      request.on('timeout', () => {
        request.destroy()
        resolve(null)
      })
    })
  }

  /** @private */
  parseResponseHeaders_(message) {
    const headers = {}

    message
      .toString()
      .split('\r\n')
      .forEach((line) => {
        const separatorIndex = line.indexOf(':')

        if (separatorIndex !== -1) {
          const headerName = line.slice(0, separatorIndex).toUpperCase()
          const headerValue = line.slice(separatorIndex + 1).trim()

          headers[headerName] = headerValue
        }
      })

    return headers
  }

  /** @private */
  extractFriendlyName_(xmlData) {
    const friendlyNameMatch = xmlData.match(
      /<friendlyName>(.*)<\/friendlyName>/
    )

    if (!friendlyNameMatch) {
      return null
    }

    return friendlyNameMatch[1].trim()
  }

  /** @private */
  async handleDeviceDiscovery_(message, remoteInfo) {
    const headers = this.parseResponseHeaders_(message)
    const locationUrl = headers.LOCATION

    if (!locationUrl || this.discoveredLocations_.has(locationUrl)) {
      return
    }

    this.discoveredLocations_.add(locationUrl)

    const xmlDescription = await this.fetchDeviceDescription_(locationUrl)
    if (!xmlDescription) {
      return
    }

    const friendlyName = this.extractFriendlyName_(xmlDescription)

    const device = {
      id: locationUrl,
      address: remoteInfo.address,
      location: locationUrl,
      applicationUrl: headers['APPLICATION-URL'] ?? null,
      name: friendlyName ?? remoteInfo.address,
      type: headers.SERVER ?? headers.ST ?? 'cast-device'
    }

    this.onDeviceDiscovered_(device)
  }

  startScan() {
    this.socket.on('message', (message, remoteInfo) => {
      this.handleDeviceDiscovery_(message, remoteInfo)
        .catch((error) => {
          console.error('Error during device discovery:', error)
        })
    })

    this.socket.bind(0, () => {
      const searchMessage = Buffer.from(M_SEARCH_REQUEST)
      this.socket.send(
        searchMessage,
        SSDP_MULTICAST_PORT,
        SSDP_MULTICAST_ADDRESS
      )

      setTimeout(() => {
        this.socket.close()
      }, SSDP_SCAN_DURATION_MS)
    })
  }
}

export default SSDPDeviceScanner
