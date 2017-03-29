var admin = require("firebase-admin");

var serviceAccount = require("./FIREBASE-ADMINSDK-HERE.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://DATABASE-URL-HERE.firebaseio.com"
});

var ref = admin.database().ref();
var users = ref.child('reddit-users');
var tipref = ref.child('reddit-tips');

/////////////////////////////////////////////////////////////////

var Copper = require('../copper')
var copper = new Copper

module.exports = function (args) {

  var name

  if (args._.length > 0) {
    name = args._.join(' ')
  }

  if (name) {

    var user = users.child(name);
    var tips = tipref.child(name);
    var msg = "";
    var counter = 1;

    tips.once("value")
      .then(function(snapshot) {
        if (snapshot.exists()) {
          snapshot.forEach(function(tip) {
            var timestring = tip.child('timestring').val().toString();
            count = counter.toString() + '. '
            msg += count
            msg += timestring
            msg += '\n\n'
            counter += 1
          });
        } else {
          msg = "You haven't tipped anyone yet. You can do so by replying to posts/comments with \'/u/MiniTip [amount] bits\' anywhere in your comment."      
        }
      }).then(function() {

        msg = msg.trim()
		if (msg.length >= 5000) {
			msg = msg.substr(msg.length - 5000)
			msg = msg.substring(msg.indexOf('\n\n')+1)
			msg = "...\n" + msg
			msg = msg.trim()
		}
        console.log(msg)
        process.exit();

      })
  }
}
