var admin = require("firebase-admin");

var serviceAccount = require("./FIREBASE-ADMINSDK-HERE.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://DATABASE-URL-HERE.firebaseio.com"
});

var ref = admin.database().ref();
var users = ref.child('reddit-users');

/////////////////////////////////////////////////////////////////

var SATOSHI_FEE = 10000;
var Insight = require('bitcore-explorers').Insight;
var insight = new Insight();

// local
var Copper = require('../copper')
var ed = require('../ed')
var copper = new Copper

module.exports = function (args) {
  
  if (args.in) {

    var senderName = args.in;

    var sender = users.child(senderName);

    sender.once('value').then(function(snapshot) {

      if (snapshot.exists()) {

        senderPublic = snapshot.child('public').val();
        senderPrivate = ed.d(snapshot.child('private').val());

        copper.unspents(senderPublic)
          .then(function (unspents) {
            copper.balance(senderPublic).then(function (balance) {
            if (args.out) {
              var receiverName = args.out;
              var receiver = users.child(receiverName);

              receiver.once('value').then(function(snapshot1) {

                if (!snapshot1.exists()) {

                  var key = copper.newKey()

                  var payload = {public: key.pub, private: key.priv, address: key.pub}

                  admin.database().ref(`/reddit-users/${receiverName}`).set(payload).then(function() {

                    receiverAddress = key.pub;
                    if (senderPublic === receiverAddress) {
                      console.log("You have not set a withdrawal address yet.\n\nIf you would like to set your own address to recieve tips directly, please reply to this message with your address in the body.")
                      process.exit();
                    }

                    var satoshi_unspent_total = unspents.reduce(function (memo, u) {return memo += u.value }, 0)
                    if (satoshi_unspent_total > balance) {
                      satoshi_unspent_total = balance;
                    }
                    var satoshi_fee = SATOSHI_FEE
                    var satoshi_send;

                    if (args.amount) {
                        var satoshi_check = args.amount * 100
                        var satoshi_total = satoshi_check + satoshi_fee
                        if (satoshi_unspent_total >= satoshi_total) {
                          satoshi_send = satoshi_check
                        } else {
                            console.log('Your existing balance of', satoshi_unspent_total / 100 + ' bits is insufficient to send', (satoshi_check / 100) + ' bits',
                            'with a miner\'s fee of', (satoshi_fee / 100) + ' bits.\n\nIf you have recently received or deposited bits, please note that it can take a while for transactions to confirm.\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                            process.exit();
                        }
                    }

                    if (args.sweep) {
                      satoshi_send = satoshi_unspent_total - satoshi_fee
                      if (satoshi_send <= 0) {
                          console.log('Your existing balance of ' + satoshi_unspent_total / 100 + ' bits is insufficient to complete the withdrawal, given a miner\'s fee of ' + (satoshi_fee / 100) + ' bits.\n\nIf you have recently received or deposited bits, please note that it can take a while for transactions to confirm.')
                          process.exit();
                      }
                    }

                    if (satoshi_send) {
                      var tx_detail = copper.build(senderPrivate, senderPublic, satoshi_fee, satoshi_send, unspents, receiverAddress)

                      tx_detail.used.forEach(function(u, idx){
                        var input_prefix
                        if(idx == 0) {
                          input_prefix= ' input:'
                        } else {
                          input_prefix= '       '
                        }
                        var input_value = u.value / 100000000
                      })

                      var bits_send = satoshi_send / 100
                      var amount = bits_send - satoshi_fee

                      var tx_hex = tx_detail.tx.toHex()
                      var tx_len = new Buffer(tx_hex, 'hex').length
                      var fee_rate = satoshi_fee / tx_len
                      var fee_total = satoshi_fee / 100
                      insight.broadcast(tx_hex, function (err, returnedTxId) {
                        if (err) {
                          console.log("It seems there was an issue with your transaction, please message /u/MiniTip and explain what happened so that we can fix it.")
                            process.exit();
                        } else {
                          if (args.amount) {
                            console.log('Here is the [transaction confirmation](https://blockchain.info/tx/' + returnedTxId.toString() + ') for your tip of ' +  (args.amount).toFixed(0) + ' bits to /u/' + receiverName + ' with a fee of 100 bits.\n\nYour new account balance is ' + ((satoshi_unspent_total / 100)-args.amount-(satoshi_fee / 100)).toFixed(0) + ' bits.\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                          } else {
                          console.log('Here is the [transaction confirmation](https://blockchain.info/tx/' + returnedTxId.toString() + ') for your withdrawal of your MiniTip balance.\n\nYour new account balance is 0 bits (~$0.00).\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                          }
                          process.exit();
                        }
                      });
                    }

                  });

                } else {

                  receiverAddress = snapshot1.child('address').val();
                  if (senderPublic === receiverAddress) {
                    console.log("You have not set a withdrawal address yet.\n\nIf you would like to set your own address to recieve tips directly, please reply to this message with your address in the body.")
                      process.exit();
                  }

                  var satoshi_unspent_total = unspents.reduce(function (memo, u) {return memo += u.value }, 0)
                  if (satoshi_unspent_total > balance) {
                    satoshi_unspent_total = balance;
                  }
                  var satoshi_fee = SATOSHI_FEE
                  var satoshi_send

                  if (args.amount) {
                      var satoshi_check = args.amount * 100
                      var satoshi_total = satoshi_check + satoshi_fee
                      if (satoshi_unspent_total >= satoshi_total) {
                        satoshi_send = satoshi_check
                      } else {
                        console.log('Your existing balance of', satoshi_unspent_total / 100 + ' bits is insufficient to send', (satoshi_check / 100) + ' bits',
                          'with a miner\'s fee of', (satoshi_fee / 100) + ' bits.\n\nIf you have recently received or deposited bits, please note that it can take a while for transactions to confirm.\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                          process.exit();
                      }
                  }

                  if (args.sweep) {
                    satoshi_send = satoshi_unspent_total - satoshi_fee
                      if (satoshi_send <= 0) {
                        console.log('Your existing balance of ' + satoshi_unspent_total / 100 + ' bits is insufficient to complete the withdrawal, given a miner\'s fee of ' + (satoshi_fee / 100) + ' bits.\n\nIf you have recently received or deposited bits, please note that it can take a while for transactions to confirm.')
                          process.exit();
                      }
                  }

                  if (satoshi_send) {

                    var tx_detail = copper.build(senderPrivate, senderPublic, satoshi_fee, satoshi_send, unspents, receiverAddress)

                    tx_detail.used.forEach(function(u, idx){
                      var input_prefix
                      if(idx == 0) {
                        input_prefix= ' input:'
                      } else {
                        input_prefix= '       '
                      }
                      var input_value = u.value / 100000000
                    })

                    var bits_send = satoshi_send / 100
                    var amount = bits_send - satoshi_fee

                    var tx_hex = tx_detail.tx.toHex()
                    var tx_len = new Buffer(tx_hex, 'hex').length
                    var fee_rate = satoshi_fee / tx_len
                    var fee_total = satoshi_fee / 100
                    insight.broadcast(tx_hex, function (err, returnedTxId) {
                      if (err) {
                        console.log("It seems there was an issue with your transaction, please message /u/MiniTip and explain what happened so that we can fix it.")
                          process.exit();
                      } else {
                        if (args.amount) {
                          console.log('Here is the [transaction confirmation](https://blockchain.info/tx/' + returnedTxId.toString() + ') for your tip of ' +  (args.amount).toString() + ' bits to /u/' + receiverName + ' with a fee of 100 bits.\n\nYour new account balance is ' + ((satoshi_unspent_total / 100)-args.amount-(satoshi_fee / 100)).toFixed(0) + ' bits.\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                        } else {
                          console.log('Here is the [transaction confirmation](https://blockchain.info/tx/' + returnedTxId.toString() + ') for your withdrawal of your MiniTip balance.\n\nYour new account balance is 0 bits (~$0.00).\n\nYou can deposit bits to the following address to top-up:\n\n[' + senderPublic + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + senderPublic + '&chld=H|0' + ')')
                        }
                        process.exit();
                      }
                    });
                  }
                }
              });
            } else {
              // console.log('No output address specified')
              process.exit();
            }
        });
        });
      } else {

        console.log('Try checking your balance first by replying to this message saying \'balance\'.');
        process.exit();

      }
    });
  } else {
      // console.log('No input address specified')
      process.exit();
  }
}
