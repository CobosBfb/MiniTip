// Roughly modified version of coindust's coindust.js, may contain unused code

// local
var pjson = require('root-require')('./package.json')
var Copper = require('./copper')
var copper = new Copper()

module.exports = function (args, home_dir) {

  var cmd = args._.shift()

  if (args.help || args['?']) {
    cmd = 'help'
  }

  if (cmd === 'balance') {
    action = require('./commands/balance')
    action(args)
  }

  if (cmd === 'history') {
    action = require('./commands/history')
    action(args)
  }

  if (cmd === 'address') {
    action = require('./commands/address')
    action(args)
  }

  if (cmd === 'tx') {
    action = require('./commands/tx')
    action(args)
  }

  if (cmd === 'help') {
    help()
  }
}

function help () {
  console.log(fs.readFileSync(__dirname + '/../help.txt', 'utf8'))
}
