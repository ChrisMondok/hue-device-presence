const config = new (require('./config'))()
const shortid = require('shortid')
const ping = require('ping')

const UPDATE_INTERVAL = 30 * 1000 // 30 seconds
const DEPARTURE_DELAY = 15 * 60 * 1000 // 15 minutes

config.readRequired('host').then(host => {
  require('./HueApiFactory').create().then(client => {
    getSensor().then(sensor => {
      var lastSeen = new Date(0)

      update()
      setInterval(update, UPDATE_INTERVAL)

      function update () {
        var now = new Date()

        ping.promise.probe(host).then(res => {
          if (res.alive) lastSeen = now

          sensor.state.presence = now - lastSeen < DEPARTURE_DELAY

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

