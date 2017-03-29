#!/usr/bin/python3
import praw
import config
import json
import sys

def read_in():
    lines = sys.stdin.readlines()
    return lines

def login():
	r = praw.Reddit(username = config.username,
				password = config.password,
				client_id = config.client_id,
				client_secret = config.client_secret,
				user_agent = "MiniTip v0.1")
	return r

def run(r):
	datain = read_in()
	commentid = datain.pop().strip()
	comment = r.comment(commentid[3:])
	msg = ''.join([str(x) for x in datain]).strip()
	try:
		comment.reply(msg)
	except:
		pass

r = login()
run(r)