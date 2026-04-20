import { Client, DefaultMediaReceiver } from 'castv2-client'

const client = new Client()

export async function startCast(deviceAddress, videoUrl) {
  client.connect(deviceAddress, () => {
    client.launch(DefaultMediaReceiver, (err, player) => {
      if (err) {
        console.error('[CAST V2] Launch error:', err)
        client.close()
        return
      }

      const media = {
        contentId: videoUrl,
        contentType: 'video/mp4',
        streamType: 'BUFFERED',
        metadata: {
          type: 0,
          metadataType: 0,
          title: 'FreeTube Cast Test',
        }
      }

      player.load(media, { autoplay: true }, (err, status) => {
        if (err) {
          console.error('[CAST V2] Load error:', err)
          client.close()
        }
      })
    })

    client.on('error', function (err) {
      console.error(err)
      client.close()
    })
  })
}

export function stopCast() {
  client.close()
}
