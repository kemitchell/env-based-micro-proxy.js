var http = require('http')
var semver = require('semver')
var proxy = require('http-proxy').createProxyServer({ })

var TARGET_RE = /^TARGET_(\d+)_HOST$/
var HEADER = 'x-api-version'

// Read the names of all environment variables.
var targets = Object.keys(process.env)
  // Pick out just those that match the proxy target hostname pattern.
  .filter(function(key) { return TARGET_RE.test(key) })
  // Create an Object map from SemVer version to proxy target hostname.
  .reduce(
    function(targets, key) {
      var host = process.env[key]
      if (!host || host.length === 0) {
        process.stderr.write(key + ' is empty\n')
        process.exit(1) }
      var number = TARGET_RE.exec(key)[1]
      var versionKey = ( 'TARGET_' + number + '_VERSION' )
      if (!process.env.hasOwnProperty(versionKey)) {
        process.stderr.write('Missing environment variable: ' + versionKey + '\n')
        process.exit(1) }
      var version = process.env[versionKey]
      if (!semver.valid(version)) {
        process.stderr.write(versionKey + ' is invalid node-semver version ' + version + '\n')
        process.exit(1) }
      targets[version] = process.env[key]
      return targets },
    new Object)

if (Object.keys(targets).length === 0) {
  process.stderr.write('No proxy targets set via environment variables\n')
  process.exit(1) }

var versions = Object.keys(targets)

// Strip the API version header from outgoing requests to proxy targets.
proxy.on('proxyReq', function(proxyRequest) {
  proxyRequest.removeHeader(HEADER) })

var server = http.createServer(function(request, response) {
  if (!request.headers.hasOwnProperty(HEADER)) {
    response.statusCode = 400
    response.end('Missing X-API-Version header') }
  var range = request.headers[HEADER]
  // Iterate version-to-host mappings.
  var length = versions.length
  for (var index = 0; index < length; index++) {
    var version = versions[index]
    // If we find a match, proxy to the corresponding host.
    if (semver.satisfies(version, range)) {
      var host = targets[version]
      proxy.web(request, response, { target: host })
      return } }
  response.statusCode = 400
  response.end('Unsupported X-API-Version') })

server.on('close', function() { proxy.close() })

if (module.parent) {
  module.exports = server }
else {
  server.listen(( process.env.PORT || 8080 ), function() {
    process.stdout.write('Listening on port ' + this.address().port ) }) }
