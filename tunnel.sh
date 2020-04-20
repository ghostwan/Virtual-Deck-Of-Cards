#!/bin/bash

# Use this script after following ngrok tutorial
# https://dashboard.ngrok.com/get-started/setup


# Change region depending where you friends are 
# Region availble are :
# us - United States (Ohio)
# eu - Europe (Frankfurt)
# ap - Asia/Pacific (Singapore)
# au - Australia (Sydney)
# sa - South America (Sao Paulo)
# jp - Japan (Tokyo)
# in - India (Mumbai)

ngrok http -region eu 3000