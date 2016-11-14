const config = new (require('./config'))()
const huejay = require('huejay')
const promiseRetry = require('promise-retry')

module.exports.create = function create () {
  var bridgeAddress, username
  return getBridgeAddress().then(address => {
    bridgeAddress = address
    return getUsername(bridgeAddress)
  }).then(u => {
    username = u
  }).then(() => {
    return new huejay.Client({
      host: bridgeAddress,
      username: username
    })
  })
}

function getBridgeAddress () {
  return config.read('bridge-address').then(address => {
    if (address) return address
    return searchForBridgeAddress().then(address =>
      config.write('bridge-address', address).then(() => address))
  })
}

function searchForBridgeAddress () {
  return huejay.discover().then(bridges => {
    if (bridges.length === 0) return Promise.reject(new Error('No bridges found'))
    if (bridges.length > 1) return Promise.reject(new Error('Multiple bridges found'))
    return bridges[0].ip
  })
}

function getUsername (bridgeAddress) {
  return config.read('username').then(username => {
    if (username) return username
    return pair(bridgeAddress).then(username =>
      config.write('username', username).then(() => username))
  })
}

function pair (bridgeAddress) {
  const client = new huejay.Client({host: bridgeAddress})
  const user = new client.users.User()
  user.deviceType = 'device-presence'

  return promiseRetry((retry, number) => {
    return client.users.create(user)['catch'](error => {
      console.log(error.message)
      if (error.type === 101) retry()
      else console.error(`Unexpected error ${error.type}`)
    })
  }, {retries: 5}).then(user => user.username)
}
