var admin = require("firebase-admin");

var serviceAccount = require("./FIREBASE-ADMINSDK-HERE.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://DATABASE-URL-HERE.firebaseio.com"
});

var ref = admin.database().ref();
var users = ref.child('reddit-users');

/////////////////////////////////////////////////////////////////

var Decimal = require('decimal.js')
var request = require('request-promise')

// local
var Copper = require('../copper')
var copper = new Copper

module.exports = function (args) {

  name = args._[0];

  var user = users.child(name)
  var public = user.child('public');

  public.once('value').then(function(snapshot) {

    if (snapshot.exists()) {

      copper.balance(snapshot.val()).then(function (balance) {
        balance = parseFloat(balance)
        var estimate = "?"

        request.get('https://blockchain.info/ticker').then(function (body) {
             estimate = ((balance/100) * ((parseFloat(JSON.parse(body).USD.last)/1000000))).toFixed(2).toString()

             console.log("Your account balance is currently " + (balance/100).toFixed(0) + ' bits (~$' + estimate + ').\n\nYou can deposit bits to the following address to top-up:\n\n[' + snapshot.val().toString() + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + snapshot.val().toString() + '&chld=H|0' + ')\n\nOr you can withdraw your balance by replying to this message saying \'withdraw\'.\n\nPlease note that if you have recently deposited bits and your balance does not reflect this, it can take a little while for transactions to be confirmed.\n\n*P.S. If you wish to support the developer of this project or aren\'t interested in Bitcoin, you can donate your MiniTip balance by simply replying to this message saying \'donate\'.*')
                process.exit();
          });
      })

    } else {

        var key = copper.newKey()

        var payload = {public: key.pub, private: key.priv, address: key.pub}

        admin.database().ref(`/reddit-users/${name}`).set(payload).then(function() {

           console.log('Your account balance is currently 0 bits (~$0.00).\n\nYou can deposit bits to the following address to top-up:\n\n[' + key.pub + '](http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' + key.pub + '&chld=H|0' + ')\n\nOr you can withdraw your balance by [sending this bot a message](https://www.reddit.com/message/compose/?to=MiniTip) saying \'withdraw\'.\n\nIf you have recently deposited bits and your balance does not reflect them, it can take a little while for transactions to be confirmed.')
              process.exit();
        });
    }

  });
}
