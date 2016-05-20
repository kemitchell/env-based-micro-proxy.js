process.env.TARGET_1_HOST = 'http://www.example.org'
process.env.TARGET_1_VERSION = '1.0.1'
process.env.TARGET_2_HOST = 'http://www.example.net'
process.env.TARGET_2_VERSION = '2.2.1'
process.env.TARGET_100_HOST = 'http://www.example.com'
process.env.TARGET_100_VERSION = '2.3.0'

var assert = require('assert')
var concat = require('concat-stream')
var http = require('http')
var series = require('async.series')
var server = require('./server')

server.listen(0, function() {
  var server = this
  var port = server.address().port
  assert(port, 'Acquired a random high port')
  series(
    [ function(done) {
        var options = { port: port, path: '/', headers: { } }
        http.get(options, function(response) {
          assert.equal(response.statusCode, 400)
          response.pipe(concat(function(buffered) {
            assert.equal(buffered.toString(), 'Missing X-API-Version header')
            done() })) }) },
      function(done) {
        var options = {
          port: port, path: '/index.html',
          headers: { 'X-API-Version': '1.x' } }
        http.get(options, function(response) {
          assert.equal(response.statusCode, 200)
          done() }) },
      function(done) {
        var options = {
          port: port, path: '/index.html',
          headers: { 'X-API-Version': '2.x' } }
        http.get(options, function(response) {
          assert.equal(response.statusCode, 200)
          done() }) },
      function(done) {
        var options = {
          port: port, path: '/index.html',
          headers: { 'X-API-Version': '3.x' } }
        http.get(options, function(response) {
          assert.equal(response.statusCode, 400)
          response.pipe(concat(function(buffered) {
            assert.equal(buffered.toString(), 'Unsupported X-API-Version')
            done() })) }) } ],
    function() {
      server.close() }) })
