import requests
input()

while True:  # 무한 반복
  # 서버에 트래픽 요청
  res = requests.get("http://127.0.0.1:5500/login")
  print(res)  # 응답 출력
