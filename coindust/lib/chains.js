module.exports = function () {
  var o = {}
  var blockchain = require('./providers/blockchain')
  var blockexplorer = require('./providers/blockexplorer')

  o.balance = function (public) {
    return blockexplorer.getBalance(public)
  }

  o.unspents = function (public) {
    return blockchain.getUnspents(public)
  }

  return o
}()
