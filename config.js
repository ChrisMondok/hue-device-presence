const fs = require('fs')
const path = require('path')

const writeOptions = {
  mode: 0o600,
  encoding: 'utf8'
}

function Configuration (configDir = `${process.env.HOME}/.config/hue-device-presence`) {
  fs.access(configDir, (err) => {
    if (err && err.code === 'ENOENT') {
      fs.mkdir(configDir, (err) => {
        if (err) throw err
        else console.log(`Created config directory ${configDir}`)
      })
    }
  })

  this._configDir = configDir
}

Configuration.prototype.read = function readConfig (key) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(this._configDir, key), 'utf8', (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  }).then(text => JSON.parse(text), err => {
    if (err.code === 'ENOENT') return undefined
    else return Promise.reject(err)
  })
}

Configuration.prototype.write = function writeConfig (key, value) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(this._configDir, key), JSON.stringify(value), writeOptions, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

module.exports = Configuration
