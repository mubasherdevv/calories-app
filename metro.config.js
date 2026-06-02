const { getSentryExpoConfig } = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)

if (!config.resolver) {
  config.resolver = {}
}

config.resolver.blockList = [
  /.*[\\/]android[\\/]build[\\/].*/,
  /.*[\\/]android[\\/]app[\\/]build[\\/].*/,
  /.*[\\/]ios[\\/]build[\\/].*/,
  /.*[\\/]\.git[\\/].*/
]

module.exports = config
