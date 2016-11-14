const config = new (require('./config'))()
const shortid = require('shortid')
const chalk = require('chalk')
const ping = require('ping')

const args = require('args')
  .option(['r', 'host'], 'Host to ping')
  .option('interval', 'How often (in seconds) to ping the device', 30, s => 1000 * s)
  .option('delay', 'How long (in seconds) the device must be gone before reporting no presence', 15 * 60, s => 1000 * s)
  .parse(process.argv, {
    usageFilter: f => { return f.replace(' [command]', '') }
  })

if (!args.host) missingArgument('host')

require('./HueApiFactory').create().then(client => {
  getSensor().then(sensor => {
    var lastSeen = new Date(0)

    update()
    setInterval(update, args.interval)

    function update () {
      var now = new Date()

      ping.promise.probe(args.host).then(res => {
        if (res.alive) lastSeen = now

        sensor.state.presence = now - lastSeen < args.delay

        return client.sensors.save(sensor)
      }).then(null, e => console.error(e))
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

function missingArgument (arg) {
  var carg = chalk.bold(arg)
  var cf = chalk.red('Fatal:')
  console.log(`${cf} missing argument ${carg}`)
  process.exit(9)
}
