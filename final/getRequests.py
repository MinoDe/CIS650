# GrovePi + Grove Ultrasonic Ranger
# http://www.seeedstudio.com/wiki/Grove_-_Ultrasonic_Ranger

from grovepi import *
import time

# Connect the Grove Ultrasonic Ranger to digital port D4
# SIG,NC,VCC,GND
ultrasonic_ranger = 4

bag_ip = False
bag_port = False

from flask import Flask, request
app = Flask(__name__)

@app.route("/setup", methods=['POST'])
def setup():
	data = json.loads(request.data)
	if(bag_ip == False):
		bag_ip = data["ip"]
		bag_port = data["port"]
		while(1):
			time.sleep(2)
			
		
	

@app.route("/hello", methods=['GET', 'POST'])
def hello():
    return readSensor('ranger')

def readSensor(type):
    if(type == 'ranger'):
        response = ""
        try:
            response = str(ultrasonicRead(ultrasonic_ranger))
        except TypeError:
            response = "Error"
        except IOError:
            response = "Error"
        return response


if __name__ == "__main__":
    app.run('0.0.0.0')
