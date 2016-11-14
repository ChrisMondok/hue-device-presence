const config = new (require('./config'))()
const shortid = require('shortid')
const ping = require('ping')

const UPDATE_INTERVAL = 30000

config.readRequired('host').then(host => {
  require('./HueApiFactory').create().then(client => {
    getSensor().then(sensor => {
      update()
      setInterval(update, UPDATE_INTERVAL)

      function update () {
        ping.promise.probe(host).then(res => {
          sensor.state.presence = res.alive
          client.sensors.save(sensor).then(null, e => {
            console.error(e)
          })
        }, e => {
          console.error(e)
        })
      }
    })

    function getSensor () {
      return config.read('sensor-id').then(sid => {
        if (sid) return client.sensors.getById(Number(sid))
        else {
          return createSensor().then(sensor => {
            config.write('sensor-id', sensor.id)
            return sensor
          })
        }
      })
    }

    function createSensor () {
      var sensor = new client.sensors.Sensor()

      sensor.type = 'CLIPPresence'
      sensor.name = 'device-presence-sensor'
      sensor.modelId = 'device-presence-sensor'
      sensor.uniqueId = shortid.generate()
      sensor.manufacturer = 'Chris Mondok'
      sensor.softwareVersion = '1'

      return client.sensors.create(sensor).then(s => config.write('sensor-id', s.id))
    }
  })
})

