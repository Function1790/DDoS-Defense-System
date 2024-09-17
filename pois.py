import math as m

# m은 수학관련 모듈이다
# x는 확률 변수, l은 람다(np)이다
def Pois(x, l):
  return l**x * m.exp(-l) / m.factorial(x)

import matplotlib.pyplot as plt

x = [i for i in range(50)]
y = [Pois(i, 12) for i in x]

plt.plot(x, y)
plt.show()