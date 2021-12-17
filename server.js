const path = require("path")
const http = require('http')
const url = require('url')
const express = require("express")
const dgram = require('dgram')
const { StringDecoder } = require('string_decoder')
const fs = require('fs')

console.log("Starting server!");

const DATA_DIR = "/data";
// const DATA_DIR = "./test"; // test data dir

const PORT = 3000
const MARKER_FILE = `${DATA_DIR}/ebs.txt`
const DATA_FILE = `${DATA_DIR}/devices.json`

const app = express()

const test_devices = [
    {
        id: 1,
        imei: "9999999999",
        lat: 35,
        lng: 35.1,
        alt: 0,
        history: []
    },
    {
        id: 2,
        imei: "8888888888",
        lat: 35.1,
        lng: 35.1,
        alt: 10,
        history: []
    },
    {
        id: 3,
        imei: "7777777777",
        lat: 35.3,
        lng: 35.2,
        alt: 2,
        history: []
    },
    {
        id: 4,
        imei: "6666666666",
        lat: 34.9,
        lng: 35.1,
        alt: 100,
        history: []
    },
]

var ID_COUNT = 0;
var CURR_DEVICES = {};

try {
    fs.readFileSync(MARKER_FILE, 'utf8')

    CURR_DEVICES = readDevicesFile();
} catch(e) {
    console.log("Failed to read marker file");
    CURR_DEVICES = test_devices;
}

function readDevicesFile() {
    let devs = {};
    try {
        const raw_devices_str = fs.readFileSync(DATA_FILE, 'utf8');
        devs = JSON.parse(raw_devices_str);
    } catch(e) {
        console.log("Failed to read devices file", e.message);
    }

    return devs;
}

function writeDevicesFile(devices) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(devices))
    } catch(e) {
        console.log("Failed to write to devices file", e.message);
    }
}


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

app.get("/hello", (req, res) => {
    console.log("got 'hello'!!");

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)
    res.end(JSON.stringify({ success: true, message: 'ok' }))
})

app.get("/devices", (req, res) => {
    console.log("/Devices requested...")

    let devicesList = Object.keys(CURR_DEVICES).map((key) => {
        return {
            id: CURR_DEVICES[key].id,
            imei: key,
            lat: CURR_DEVICES[key].lat,
            lng: CURR_DEVICES[key].lng,
            alt: CURR_DEVICES[key].alt,
        }
    });

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)
    console.log("Returning devies: ", devicesList);
    res.end(JSON.stringify({ devices: devicesList }))
})

app.get("/device/:id", (req, res) => {
    console.log("Requested history for device: ", req.params.id);

    let devHistory = [];

    // build history for device if we have it
    for (const [key, value] of Object.entries(CURR_DEVICES)) {
        if (value.id == req.params.id) {
            devHistory = value.history;
            break;
        }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.writeHead(200)

    res.end(JSON.stringify({ locations: devHistory }))
})

app.get("*", (req, res) => {
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

    if (!message) {
        console.log("Failed to parse UDP message");
        return;
    }

    let rawData = message.split(",");

    if (!rawData || rawData.length < 8) {
        console.log("Invalid UDP message: ", message);
        return;
    }
    let imei = rawData[0];

    let dataPoint = {};
    try {
        dataPoint = {
            lat: parseFloat(rawData[1]), // start at 1. since idx 0 is imei
            lng: parseFloat(rawData[2]),
            alt: rawData[3],
            acc: rawData[4],
            speed: rawData[5],
            heading: rawData[6],
            date: rawData[7],
        };
    } catch (e) {
        console.log(e);
        return;
    }

    // update or add new device
    if (!CURR_DEVICES.hasOwnProperty(imei)) {
        console.log("New device: ", imei);
        CURR_DEVICES[imei] = {
            id: ID_COUNT,
            lat: parseFloat(rawData[1]),
            lng: parseFloat(rawData[2]),
            alt: rawData[3],
            history: [dataPoint],
        };

        ID_COUNT += 1;
    } else {
        CURR_DEVICES[imei].lat = parseFloat(rawData[1]); // start at 1. since idx 0 is imei
        CURR_DEVICES[imei].lng = parseFloat(rawData[2]); // start at 1. since idx 0 is imei
        CURR_DEVICES[imei].alt = rawData[3]; // start at 1. since idx 0 is imei
        CURR_DEVICES[imei].history.push(dataPoint);
    }

    writeDevicesFile(CURR_DEVICES);

    console.log("updated data");
    console.log(JSON.stringify(CURR_DEVICES));
  }
)

// POI: bind two servers to same port
server.listen(PORT)
socket.bind(PORT)