const path = require("path")
const http = require('http')
const url = require('url')
const express = require("express")
const dgram = require('dgram')
const { StringDecoder } = require('string_decoder')

console.log("Starting server!");

const PORT = 3000

const app = express()

const test_devices = [
    {
        id: 1,
        imei: "9999999999",
        lat: 35,
        lng: 35.1,
        alt: 0
    },
    {
        id: 2,
        imei: "8888888888",
        lat: 35.1,
        lng: 35.1,
        alt: 10
    },
    {
        id: 3,
        imei: "7777777777",
        lat: 35.3,
        lng: 35.2,
        alt: 2
    },
    {
        id: 4,
        imei: "6666666666",
        lat: 34.9,
        lng: 35.1,
        alt: 100
    },
]

const test_device1_history = [
    {
        lat: 35,
        lng: 35.1,
        alt: 0,
        date: new Date()
    },
    {
        lat: 35.1,
        lng: 35.2,
        alt: 0,
        date: new Date()
    },
    {
        lat: 35.3,
        lng: 35.1,
        alt: 0,
        date: new Date()
    },
    {
        lat: 35.4,
        lng: 35.1,
        alt: 0,
        date: new Date()
    },
];


app.use(express.static(path.resolve(__dirname, '../client/build')));

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.get("/hello", function(req, res) {
    console.log("got 'hello'!!");

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)
    res.end(JSON.stringify({ success: true, message: 'ok' }))
})

app.get("/devices", function(req, res) {
    console.log("/Devices requested...")

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)

    res.end(JSON.stringify({ devices: test_devices }))
})

app.get("/device/:id", function(req, res) {
    console.log("Requested history for device: ", req.params.id);

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)

    res.end(JSON.stringify({ locations: test_device1_history }))
})

app.get("*", function(req, res) {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
})

const server = http.createServer(app);

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