#!/usr/bin/env python
##################################################################################################################
# This is a project example for using the GoPiGo with the compass as a turtle robot
#                             
# http://www.dexterindustries.com/GoPiGo      
# Compass module: http://www.seeedstudio.com/depot/Grove-3Axis-Digital-Compass-p-759.html
#                                                       
# History
# ------------------------------------------------
# Author     Date      		Comments
# Karan      22 July 14  	Initial Authoring
# 			                                                             
# These files have been made available online through a Creative Commons Attribution-ShareAlike 3.0  license.
# (http://creativecommons.org/licenses/by-sa/3.0/)           
#
# Refer to the datasheet to add additional functionality https://www.seeedstudio.com/wiki/images/4/42/HMC5883.pdf
#
# Command:
#	f dist 	:	move forward by "dist" (distance = dist/4 encoder counts. 1 rotation=18 encoder counts) e.g.: f 100
#	l 45	:	rotate left by 45 degrees
#	r 45	:	rotate right by 45 degrees
#
#	NOTE	:	There might be a bug with the Grove Compass which causes it to rotate by more than what you want.
#					Try the compass test to see that you get proper reading when you rotate the compass 360 degrees in
#					Try the compass test to see that you get proper reading when you rotate the compas 360 degrees in
#				90 degree increments.
####################################################################################################################

from grove_compass_lib import *
from gopigo import *
import smbus
import turtle

en_turtle=0		#Enable turtle graphics
debug=1			#Disable debug mode

if en_turtle:
	turtle.Turtle()
	
#c=compass()
divider=4		
set_speed(110)

while True:
	print "CMD:",			#Wait for a command
	cmd=raw_input()
	print cmd
	try:
		if cmd[0]=='f':		#If command is f, move forward by dist/4 encoder counts
			dist=int(cmd[2]+cmd[3])/divider
			speed=int(cmd[5])
			print str(dist)
			print str(speed)
			set_speed(speed)
			enc_tgt(1,1,dist)
			fwd()
			print read_status()
			if en_turtle:
				turtle.forward(dist*divider)
		elif cmd[0]=='s':
			stop()
				
		elif cmd[0]=='l':	#If command is l, rotate left
			angle=int(cmd[2:])
			if angle >360 or angle <0:
				print "Wrong angle"
				continue
				
#			c.update()
#			start=360-c.headingDegrees	# compass counts go from 360 -> 0 when turning left, so invert the count
			#adding a temp start value
			start = 0
			#target= (start+angle)%360	# If target >360 degrees, wrap it to 0
			target = angle
			current = 0
			left_rot()
			while True:
				current = current +0.05
#				current=360-c.headingDegrees
				if debug:
					print start,target,current
				if target-start>0:		# Stop when target reached (works when start and target <360
					if current>target:
						#right_rot()
						left_rot()
						time.sleep(.15)
						stop()
						break;
				else:
					if current>target:# and current <start-5:	#If target has been wrapped then the check condition changes and keep some tolerence 
						#right_rot()
						left_rot()
						time.sleep(.15)
						stop()
						break;
#				c.update()
				#time.sleep(.1)
			if en_turtle:
				turtle.left(angle)			
				
		elif cmd [0]=='r': 				#Rotate right if command if r
			angle=int(cmd[2:]) 
			if angle >360 or angle <0:
				print "Wrong angle"
				continue
				
#			c.update()
			start=0#c.headingDegrees
			target= angle#(start+angle)%360
			current = 0
			right_rot()
			while True:
				current=current+0.045
				if debug:
					print start,target,current
				if target-start>0:
					if current>target:
						stop()
						break;
				else:
					if current>target:    # and current <start-5:
						stop()
						break;
				#c.update()
				#time.sleep(.1)
			if en_turtle:
				turtle.right(angle)
				
		elif cmd[0]=='x':	#Exit on x
			print "Exiting"
			if en_turtle:
				turtle.bye()
			break
			
		elif cmd[0]=='d':	#Show the current reading from the compass
			c.update()
			print c.headingDegrees,360-c.headingDegrees
		elif cmd[0] == 'u':
			distance_to_stop=20		#Distance from obstacle where the GoPiGo should stop
			print "Press ENTER to start"
			print us_dist(15)*0.39
			#raw_input()				#Wait for input to start
			fwd()					#Start moving

			while True:
				dist=us_dist(15)			#Find the distance of the object in front
				print "Dist:",dist*0.39,'inches'
				if dist<distance_to_stop:	#If the object is closer than the "distance_to_stop" distance, stop the GoPiGo
					print "Stopping"
					stop()					#Stop the GoPiGo
					break
				#time.sleep(.1)
		else:
			print "Wrong command"
	except ValueError:
		print "Wrong command"
	
	time.sleep(.1)
	#print heading
	
	time.sleep(.1)
