const path = require("path")
const express = require("express")
const http = require('http')
const url = require('url')
const dgram = require('dgram')
const { StringDecoder } = require('string_decoder')

const app = express()

app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("*", function(req, res) {
  res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
})

app.listen(3000, () => {
  console.log("app listening on port 3000")
})