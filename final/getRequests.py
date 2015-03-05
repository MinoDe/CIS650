# GrovePi + Grove Ultrasonic Ranger
# http://www.seeedstudio.com/wiki/Grove_-_Ultrasonic_Ranger

from grovepi import *

# Connect the Grove Ultrasonic Ranger to digital port D4
# SIG,NC,VCC,GND
ultrasonic_ranger = 4

from flask import Flask
app = Flask(__name__)

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
