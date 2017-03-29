var admin = require("firebase-admin");

var serviceAccount = require("./FIREBASE-ADMINSDK-HERE.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://DATABASE-URL-HERE.firebaseio.com"
});

var ref = admin.database().ref();
var users = ref.child('reddit-users');

/////////////////////////////////////////////////////////////////

var Copper = require('../copper')
var copper = new Copper

module.exports = function (args) {

  var name = args._[0];
  var address = args._[1];

  if (typeof name != undefined && typeof address != undefined) {

    var key = copper.newKey()

    var payload = {public: key.pub, private: key.priv, address: address}

    var user = users.child(name);

    user.once('value').then(function(snapshot) {
      if (snapshot.exists()) {
        if ((address.length >= 20) && (address.length <= 40)) {
          user.update({'address': address}).then(function() {
          console.log("Your tip receiving address has been successfully set to " + address.toString())
          process.exit();
          })
        } else {
          console.log("invalid")
          process.exit();
        }
      } else {
        admin.database().ref(`/reddit-users/${name}`).set(payload).then(function() {
        console.log("Your tip receiving address has been successfully set to " + address.toString());
        process.exit();
        });
      }
    });
  }
}
