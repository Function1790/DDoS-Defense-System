from flask import Flask
from pois import Pois

lmbda = 40

app = Flask(__name__)
count = 0

def upCount():
  global count
  count+=1
  print(Pois(count, lmbda))

@app.route("/")
@app.route("/home")
def home():
  upCount()
  return f"""
  <a href="/home">home</a>
  <a href="/user">home</a>
  {count}
  """


@app.route("/user")
def user():
  upCount()
  return "Hello, User!"


@app.route("/test")
def TEST():
  upCount()
  return "ASASFWFSF"


if __name__ == "__main__":
  app.run(debug=True)
