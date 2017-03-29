var admin = require("firebase-admin");

var serviceAccount = require("./FIREBASE-ADMINSDK-HERE.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://DATABASE-URL-HERE.firebaseio.com"
});

var ref = admin.database().ref();
var requests = ref.child('reddit-requests');
var tips = ref.child('reddit-tips');
var donations = ref.child('reddit-donations');
var users = ref.child('reddit-users');

/////////////////////////////////////////////////////////////////

var REQUEST_SCAN_INTERVAL = 60 * 1000;
var cmd = require('node-cmd');
var request = require('request-promise')
var PythonShell = require('python-shell');

setInterval(function() {

	// Start scanning for new requests via the bot
	var pyshell = new PythonShell('./reddit_bot/reddit_bot.py');

	// Handle new requests
	pyshell.on('message', function (message) {

		try {
			data = JSON.parse(message);
		} catch (e) {
			console.log(e.stack);
		}

		if (!(data[data.length-1] === 'tip')) {
			var name = data[0]
			var id = data[1]
			var newaddress = data[2]
			var category = data[data.length - 1]
			var greeting = 'Dear ' + name + ',\n\n';
			var farewell = '\n\nFor more info, or if you need any help, click [here](http://minitip.org).\n\nHappy tipping!\n';
			var message;

			requestid = requests.child(id)
			requestid.once('value').then(function(snapshot) {

				// Return if request id has already been served
	    		if (snapshot.exists()) {

	    			return;

	    		} else {

					if (category === "history") {

						cmd.get('coindust/coindust history ' + name, function(response) {

							message = greeting + response + farewell + 'history'
							var history = new PythonShell('./reddit_bot/send_message.py');
							history.send(message);
							history.end(function (err) {
							  	if (err) throw err;
							});
							var update = {}
							update[id] = true
							requests.update(update)

			        	});

					// Deposit and balance do the same thing
					} else if ((category === "balance") || (category === "deposit")) {

						cmd.get('coindust/coindust balance ' + name, function(response) {

							message = greeting + response + farewell + 'balance'
							var balance = new PythonShell('./reddit_bot/send_message.py');
							balance.send(message);
							balance.end(function (err) {
							  	if (err) throw err;
							});
							var update = {}
							update[id] = true
							requests.update(update)

			        	});

					} else if (category === "address") {

						cmd.get('coindust/coindust address ' + name + ' ' + newaddress, function(response) {

							if (!(response === 'invalid')) {
								message = greeting + response + farewell + 'address'
								var address = new PythonShell('./reddit_bot/send_message.py');
								address.send(message);
								address.end(function (err) {
								  	if (err) throw err;
								});
							}
							var update = {}
							update[id] = true
							requests.update(update)

			        	});

					} else if (category === "withdraw") {

						cmd.get('coindust/coindust tx ' + '--in ' + name + ' --out ' + name + ' --sweep', function(response) {

							message = greeting + response + farewell + 'withdraw'
							var withdraw = new PythonShell('./reddit_bot/send_message.py');
							withdraw.send(message);
							withdraw.end(function (err) {
							  	if (err) throw err;
							});
							var update = {}
							update[id] = true
							requests.update(update)

			        	});

					} else if (category === "donate") {

						var input = users.child(name);

					    input.once('value').then(function(snapshot) {

					      if (snapshot.exists()) {
							var don = {}
        					var private = snapshot.child('private').val();
							var donkey = donations.push().key;
							don[donkey] = private
							donations.update(don)
							input.remove()
					      }
					  	});

					  	message = greeting + 'Your MiniTip account balance has been donated.\n\nThank you very much for your generous support!\ndonation'
						var donate = new PythonShell('./reddit_bot/send_message.py');
						donate.send(message);
						donate.end(function (err) {
						  	if (err) throw err;
						});
						var update = {}
						update[id] = true
						requests.update(update)

					}

	    		}
			});

		} else if (data[data.length-1] === 'tip') {

			data.pop();
			data.forEach(function(item, i) {

				var sender = item[0]
				var receiver = item[1]
				var amount = item[2]
				var parentPermalink = item[3]
				var historyString = item[4]
				var commentId = item[5]
				var receiverHistoryString = item[6]

				requestid = requests.child(commentId)
				requestid.once('value').then(function(snapshot) {

		    		if (snapshot.exists()) {

		    			return;

		    		} else {

						cmd.get('coindust/coindust tx ' + '--in ' + sender + ' --out ' + receiver + ' --amount ' + amount.toString(), function(response) {

			    			var pl = {}
							pl[commentId] = true;
							requests.update(pl);

							var estimate = '?'

							request.get('https://blockchain.info/ticker').then(function (body) {

					             estimate = (amount * ((parseFloat(JSON.parse(body).USD.last)/1000000))).toFixed(2);

								if (response.startsWith("Here is the")) {

									var transaction = response.substring(response.indexOf("(")+1,response.indexOf(")"));

									historyString = historyString.replace("sent", "[sent](" + transaction + ")")
									receiverHistoryString = receiverHistoryString.replace("received", "[received](" + transaction + ")")

									var greeting = 'Sent Bitcoin tip of ' + amount.toString() + ' bits (~$' + estimate + ') to *' + receiver + '*.';
									var farewell = '\n\n[*^(What is MiniTip?)*](http://minitip.org)\n';
									var message;

									var pmGreeting = 'Dear ' + receiver + ',\n\n';
									var pmMessage = 'You have [received](' + transaction +') a Bitcoin tip of ' + amount.toString() + ' bits (~$' + estimate + ') from /u/' + sender + ' for your post:\n' + parentPermalink + '\n\n';
									pmMessage += '*If you wish to support the developer of this project or aren\'t interested in Bitcoin, you can donate your MiniTip balance by simply replying to this message saying \'donate\'.*\n\nIf you have already registered your own Bitcoin address with MiniTip, the tip has been sent directly to you; no further action is needed on your part, and you may safely ignore the rest of this message.\n\nIf you already have a Bitcoin address and want to claim your tip, reply to this message with your Bitcoin address and, once the transaction is confirmed, message once again saying \'withdraw\'.\n\n'
									pmMessage += 'If you are new to Bitcoin and would like to learn more about it, you can check out [Bitcoin.org](https://bitcoin.org/en/) or stop by the r/Bitcoin subreddit.\n\n'
									pmMessage += 'Please note that it can take a while for the transaction to confirm and show up in your account balance ready for withdrawal.\n\nYou can check your confirmed account balance by replying to this message saying \'balance\'.\n\nInstead of withdrawing, you can also use your account balance to tip others on reddit by replying to posts/comments with \'/u/MiniTip [amount] bits\' anywhere in your comment.'
									var pmFarewell = '\n\nFor more info or if you need any help, click [here](http://minitip.org).\n\nHappy tipping!\n';

									var key = tips.child(sender).push().key;

									var payload = {}
									payload[sender + '/' + key] = {'sent': true,'historyString': historyString};
									payload[receiver + '/' + key] = {'sent': false, 'historyString': receiverHistoryString};
									tips.update(payload);

									message = greeting + farewell + commentId
									var comment = new PythonShell('./reddit_bot/send_comment.py');
									comment.send(message);
									comment.end(function (err) {
									  	if (err) throw err;
										var senderGreeting = 'Dear ' + sender + ',\n\n';
										var senderMessage = response
										var senderFarewell = '\n\nFor more info or if you need any help, click [here](http://minitip.org).\n\nHappy tipping!\n';
										sendermsg = senderGreeting + senderMessage + senderFarewell + 'your tip has been sent!'
										var senderpm = new PythonShell('./reddit_bot/send_message.py');
										senderpm.send(sendermsg);
										senderpm.end(function (err) {
										  	if (err) throw err;
											pmmsg = pmGreeting + pmMessage + pmFarewell + 'you have received a tip!'
											var pm = new PythonShell('./reddit_bot/send_message.py');
											pm.send(pmmsg);
											pm.end(function (err) {
											  	if (err) throw err;
												console.log(sender + ' ' + greeting)
											});
										});
									});


								} else {
									var senderGreeting = 'Dear ' + sender + ',\n\n';
									var senderMessage = response
									var senderFarewell = '\n\nFor more info or if you need any help, click [here](http://minitip.org).\n\nHappy tipping!\n';
									sendermsg = senderGreeting + senderMessage + senderFarewell + 'there was a problem sending your tip'
									var senderpm = new PythonShell('./reddit_bot/send_message.py');
									senderpm.send(sendermsg);
									senderpm.end(function (err) {
									  	if (err) throw err;
										console.log(sendermsg)
									});
								}
					            
					          });
			        	});
					}
				});
			});

		} else {
			// console.log(data)
		}

	});

	pyshell.end(function (err) {
	  	if (err) throw err;
	});

}, REQUEST_SCAN_INTERVAL);