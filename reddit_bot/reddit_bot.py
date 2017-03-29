#!/usr/bin/python3
import praw
import config
import json
import datetime
import urllib.request
import re
from pytz import timezone

def login():
	r = praw.Reddit(username = config.username,
				password = config.password,
				client_id = config.client_id,
				client_secret = config.client_secret,
				user_agent = "MiniTip v0.1")
	return r

def getAmount(message):
	amount = None
	message = message.lower()
	matches = re.findall('\d+ +bits', message)

	try:
		if len(matches) == 1:
			amount = matches[0].replace(' bits', '').strip()
			amount = abs(int(float(amount)))
		elif len(matches) > 1:
			matches1 = re.findall('/u/minitip.*\d+ +bits', message)
			if len(matches1) == 0:
				amount = re.findall('\d+ +bits', matches[-1])[0]
				amount = amount.replace(' bits', '').strip()
				amount = abs(int(float(amount)))
			else:
				amount = re.findall('\d+ +bits', matches1[0])[0]
				amount = amount.replace(' bits', '').strip()
				amount = abs(int(float(amount)))
		elif len(matches) == 0:
			matches1 = re.findall('\d+', message)
			if len(matches1) > 0:
				amount = abs(int(float(matches1[-1])))

	except:
		amount = None

	return amount

def run(r):

	# pm handling
	for message in r.inbox.unread(limit=25):
		body = message.body
		lowerBody = body.strip().lower()
		authorName = message.author.name.lower()
		if ('deposit' in lowerBody):
			print(json.dumps([authorName, message.fullname, 'deposit']))
		elif ('history' in lowerBody):
			print(json.dumps([authorName, message.fullname, 'history']))
		elif ('balance' in lowerBody):
			print(json.dumps([authorName, message.fullname, 'balance']))
		elif ('withdraw' in lowerBody):
			print(json.dumps([authorName, message.fullname, 'withdraw']))
		elif ('donate' in lowerBody):
			print(json.dumps([authorName, message.fullname, 'donate']))
		elif (body[0].strip().isdigit()):
			address = body.split()[0]
			print(json.dumps([authorName, message.fullname, address, 'address']))
		message.mark_read()

	# tip handling
	final = []

	for mention in r.inbox.mentions(limit=25):

		body = mention.body
		name = mention.fullname
		try:
			author = mention.author.name.lower()
		except:
			continue
		identity = mention.id
		timestamp = mention.created
		try:
			parent = r.comment(identity).parent()
		except:
			continue

		if (any(char.isdigit() for char in body)):

			try:
				receiver = parent.author.name.lower()
			except:
				continue

			EST = timezone('America/New_York')
			try:
				parentPermalink = str("https://www.reddit.com" + parent.permalink())
			except:
				parentPermalink = str(parent.shortlink)
			sender = author
			amount = getAmount(body)
			if amount is None:
				continue
			timestamp = EST.fromutc(datetime.datetime.utcfromtimestamp(int(timestamp)).replace(tzinfo=EST))
			month = timestamp.strftime('%B')
			year = timestamp.strftime('%Y')
			date = timestamp.strftime('%d')
			day = timestamp.strftime('%A')
			hms = timestamp.strftime('%I:%M%p').lstrip('0').lower()

			history = 'You sent ' + str(amount) + ' bits to /u/' + receiver + ' on ' + day + ' ' + month + ' ' + date + ', ' + year + ' at ' + hms + ' (EST) for the following post:\n' + parentPermalink
			receiverHistory = 'You received ' + str(amount) + ' bits from /u/' + sender + ' on ' + day + ' ' + month + ' ' + date + ', ' + year + ' at ' + hms + ' (EST) for the following post:\n' + parentPermalink

			final.append([sender, receiver, amount, parentPermalink, history, name, receiverHistory])

	final.append('tip')
	print(json.dumps(final))

r = login()
run(r)