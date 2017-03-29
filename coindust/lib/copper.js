// Roughly modified version of coindust's copper.js, may contain unused code

// npm
var bitcoin = require('bitcoinjs-lib')
var Promise = require('bluebird')
var Decimal = require('decimal.js')

// local
var chains = require('./chains')
var ed = require('./ed')

module.exports = function () {

  this.balance = function (public) {
    return chains.balance(public)
  }

  this.unspents = function (public) {
    return chains.unspents(public)
  }

  // this.keyFromAddress = function (address) {
  //   if (this.isBitcoinPublicAddress(address)) {
  //     return { priv: null, pub: address }
  //   }
  //   if (this.isBitcoinPrivateAddress(address)) {
  //     var priv = this.fromWIF(address)
  //     return { priv: address, pub: priv.pub.getAddress().toString() }
  //   }
  // }

  this.isBitcoinPublicAddress = function (word) {
    return (word.length >= 33 && word.length <= 35) && word[0] == '1'
  }

  // this.isBitcoinPrivateAddress = function (word) {
  //   return (word.length == 52 && (word[0] == 'L' || word[0] == 'K')) ||
  //   (word.length == 51 && word[0] == '5')
  // }

  this.transaction = function () {
    return new bitcoin.TransactionBuilder()
  }

  this.fromWIF = function (privKey) {
    return bitcoin.ECKey.fromWIF(privKey)
  }

  this.keyFind = function (keys, publicKey) {
    for (var idx in keys) {
      var key = keys[idx]
      if (key.pub === publicKey) {
        return key
      }
    }
  }

  this.newKey = function (priv) {
    var key
    if (priv) {
      key = this.fromWIF(priv)
    } else {
      key = bitcoin.ECKey.makeRandom()
    }

    return { priv: ed.e(key.toWIF()), pub: key.pub.getAddress().toString() }
  }

  this.build = function(senderPrivate, senderPublic, satoshi_fee, satoshi_send, unspents, out_address) {
      var satoshi_total = satoshi_send + satoshi_fee

      tx = this.transaction()
      var available = 0
      var used_unspents = []
      unspents.map(function (u) {
        if (available < satoshi_total) {
          tx.addInput(u.tx_hash_big_endian, u.tx_output_n)
          available = available + u.value
          used_unspents.push(u)
        }
      })

      tx.addOutput(out_address, satoshi_send)
      var change = available - satoshi_send - satoshi_fee
      if (change > 0) {
        tx.addOutput(senderPublic, change)
      }
      var inKey = this.fromWIF(senderPrivate)
      tx.inputs.forEach(function (input, idx) {
        tx.sign(idx, inKey)
      })
      return {used: used_unspents, tx: tx.build(), change: change}
  }

  function loadWalletDump (lines) {
    return lines.map(function (line) {
      var parts = line.match(/^\s*(\w{51,52})\s+.*#\s+addr=(\w{34})/)
      if (parts) {
        return { priv: parts[1], pub: parts[2]}
      }
    }).filter(function (key) {return key})
  }

}
