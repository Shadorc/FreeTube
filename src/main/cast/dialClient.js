import http from 'node:http'
import https from 'node:https'

function dialRequest(url, { method, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const transport = target.protocol === 'https:' ? https : http

    const request = transport.request(target, {
      method,
      headers,
    }, (response) => {
      const chunks = []

      response.on('data', (chunk) => {
        chunks.push(chunk)
      })

      response.on('end', () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8')
        })
      })
    })

    request.on('error', reject)
    request.setTimeout(5000, () => {
      request.destroy(new Error('DIAL request timed out'))
    })

    if (body) {
      request.write(body)
    }

    request.end()
  })
}

export async function launchYouTubeApp(deviceApplicationUrl, videoId) {
  if (typeof deviceApplicationUrl !== 'string' || deviceApplicationUrl.length === 0) {
    throw new Error('Cast device does not expose an application URL')
  }

  if (typeof videoId !== 'string' || videoId.length === 0) {
    throw new Error('No video ID available to cast')
  }

  const appUrl = new URL('YouTube', ensureTrailingSlash(deviceApplicationUrl)).toString()
  const body = new URLSearchParams({ v: videoId }).toString()

  const response = await dialRequest(appUrl, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    }
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Failed to launch YouTube on cast device (${response.statusCode})`)
  }

  const location = response.headers.location

  return {
    appUrl,
    sessionUrl: typeof location === 'string' && location.length > 0
      ? new URL(location, appUrl).toString()
      : null
  }
}

export async function stopDialApp(sessionUrl) {
  if (typeof sessionUrl !== 'string' || sessionUrl.length === 0) {
    return
  }

  const response = await dialRequest(sessionUrl, {
    method: 'DELETE'
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Failed to stop cast session (${response.statusCode})`)
  }
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`
}
