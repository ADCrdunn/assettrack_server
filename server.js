const http = require('http')
const url = require('url')
const dgram = require('dgram')
const { StringDecoder } = require('string_decoder')

const PORT = process.env.PORT || 3000

// http/tcp server
const server = http.createServer((req, res) => {
  const method = req.method.toLowerCase()
  const parsed = url.parse(req.url, true)
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '')
  const query = parsed.query
  const headers = req.headers

  const decoder = new StringDecoder('utf-8')
  let body = ''
  req.on('data', (data) => (body += decoder.write(data)))
  req.on('end', () => {
    body += decoder.end()

    console.log({
      kind: 'HTTP_REQUEST',
      method,
      path,
      query,
      headers,
      body
    })

    // TODO: process request

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)
    res.end(JSON.stringify({ success: true, message: 'ok' }))
  })
})

// udp server
const socket = dgram.createSocket(
  {
    type: 'udp4',
    reuseAddr: true // <- NOTE: we are asking OS to let us reuse port
  },
  (buffer, sender) => {
    const message = buffer.toString()
    console.log({
      kind: 'UDP_MESSAGE',
      message,
      sender
    })

    // demo: respond to sender
    socket.send(message.toUpperCase(), sender.port, sender.address, (error) => {
      if (error) {
        console.error(error)
      } else {
        console.log({
          kind: 'RESPOND',
          message: message.toUpperCase(),
          sender
        })
      }
    })
  }
)

// POI: bind two servers to same port
server.listen(PORT)
socket.bind(PORT)