# GrovePi + Grove Ultrasonic Ranger
# http://www.seeedstudio.com/wiki/Grove_-_Ultrasonic_Ranger

from grovepi import *
import time

# Connect the Grove Ultrasonic Ranger to digital port D4
# SIG,NC,VCC,GND
ultrasonic_ranger = 4

## 192.168.0.120
bag_ip = '192.168.0.106'
bag_port = '3000'

from flask import Flask, request
app = Flask(__name__)


app.config['SERVER_NAME']='myapp.dev:3000'

@app.route("/setup", methods=['POST'])
def setup():
  data = json.loads(request.data)
  #if(bag_ip == False):
    #bag_ip = data["ip"]
    #bag_port = data["port"]
  while(1):
    print "Just entered while loop, about to call check_job"
    time.sleep(2)
    check_job()
    ## post request to bag
    ## check if job exists, 
            
@app.post("/check", data=dict(readRequested=True), follow_redirects=True)

def check_job():
  app.post("/check", data=dict(readRequested=True), follow_redirects=True)
  print "Just posted to check"

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
