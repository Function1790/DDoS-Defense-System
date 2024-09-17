const express = require('express')
const app = express()
const fs = require('fs')

app.use(express.static('public'))
app.use('/views', express.static('views'))

//[--------------------<MySQL>--------------------]
const mysql = require('mysql')
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1790',
    database: 'we2024'
})
connection.connect()

async function sqlQuery(query) {
    let promise = new Promise((resolve, reject) => {
        const rows = connection.query(query, (error, rows, fields) => {

            resolve(rows)
        })
    })
    let result = await promise
    return result
}

//[--------------------<BodyParse>--------------------]
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))

//[--------------------<Cookie>--------------------]
const session = require('express-session')
const Memorystore = require('memorystore')
const cookieParser = require("cookie-parser");

app.use(cookieParser('TouchPay'))

app.use(session({
    secure: true,
    secret: 'SECRET',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        Secure: true
    },
    name: 'data-session',
}))

const cookieConfig = {
    maxAge: 30000,
    path: '/',
    httpOnly: true,
    signed: true
}



//[--------------------<Function>--------------------]
const print = (data) => console.log(data)

function formatToZero(num, length) {
    var strNum = num.toString()
    var result = num.toString()
    for (var i = 0; i < length - strNum.length; i++) {
        result = '0' + result
    }
    return result
}

function dateFormat(day) {
    const y = formatToZero(day.getFullYear(), 2)
    const m = formatToZero(day.getMonth() + 1, 2)
    const d = formatToZero(day.getDate(), 2)
    const h = formatToZero(day.getHours(), 2)
    const M = formatToZero(day.getMinutes(), 2)
    const s = formatToZero(day.getSeconds(), 2)
    return `${y}-${m}-${d} ${h}:${M}:${s}`
}

function isLogined(req, res) {
    if (req.session.uid == undefined) {
        res.send(forcedMoveWithAlertCode("로그인이 필요한 서비스입니다.", '/login'))
        return false
    }
    return true
}


//[--------------------<Render>--------------------]
async function readFile(path) {
    return await new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            resolve(data)
        })
    })
}

function forcedMoveCode(url) {
    return `<script>window.location.href = "${url}"</script>`
}

function forcedMoveWithAlertCode(text, url) {
    return `<title>T SHOP</title><script>alert(\`${text}\`);window.location.href = "${url}"</script>`
}

function goBackWithAlertCode(text) {
    return `<title>T SHOP</title><script>alert("${text}");window.location.href = document.referrer</script>`
}

async function renderFile(req, path, replaceItems = {}) {
    var content = await readFile(path)
    for (i in replaceItems) {
        content = content.replaceAll(`{{${i}}}`, replaceItems[i])
    }
    return content
}

const requestIp = require("request-ip");

const LAMBDA = 20

// 클라이언트(유저에게) 웹사이트를 보여주는 함수
async function sendRender(req, res, path, replaceItems) {
    count++
    const pois = Pois(count, LAMBDA) // 확률값

    //확률값이 0.0001보다 작고 횟수가 평균(람다)보다 크다면
    if (pois < 0.0001 && count > LAMBDA) {
        const ip = requestIp.getClientIp(req) //아이피

        blockedIPs.push(ip) // 차단 아이피 목록에 클라이언트 아이피를 추가
        console.log(`${ip}가 차단되었습니다.`)
        console.log(`POIS: ${pois}`)
        return // 함수 닫기
    }
    console.log(`count: ${count}\tP(count): ${pois}`)

    // 유저에게 웹사이트를 보내주는 부분
    res.send(await renderFile(req, path, replaceItems))
}

function factorial(k) {
    if (k == 1) {
        return 1
    }
    return k * factorial(k - 1)
}

function Pois(x, lambda) {
    return lambda ** x * Math.exp(-lambda) / factorial(x)
}
var count = 0;

const blockedIPs = [];
function ipBlocker(req, res, next) {
    const clientIP = req.ip;

    // 만약 차단된 아이피가 현제 유저의 아이피 라면
    if (blockedIPs.includes(clientIP)) {
        // 403에러와 함께 Access denied를 보낸다.
        res.status(403).send('Access denied');
    } else {
        // 아니라면 skip
        next();
    }
}

app.use(ipBlocker);

//[--------------------<APP>--------------------]
app.get('/', async (req, res) => {
    if (!isLogined(req, res)) { return }
    const result = await sqlQuery('select * from receipt')

    var contain = []
    for (var i in result) {
        var data = JSON.parse(result[i].data)
        for (var j in data) {
            contain.push(result[i])
            break

        }
    }

    linelistHTML = ''
    for (var i in contain) {
        var date = new Date(contain[i].created_date)
        linelistHTML += `<a class="line" href="/receipt/${contain[i].num}">
        <div class="headImgWrap">
            <div class="headImg"></div>
        </div>
        <div class="blockContent">
            <div class="explain">${dateFormat(date)}</div>
            <div class="title">${contain[i].title}</div>
        </div>
    </a>`
    }
    await sendRender(req, res, './views/index.html', { 'linelist': linelistHTML })
})

app.get('/login', async (req, res) => {
    await sendRender(req, res, './views/login.html')
})

app.post('/login-check', async (req, res) => {
    var body = req.body
    const uid = connection.escape(body.uid)
    const upw = connection.escape(body.upw)
    var sqlResult = await sqlQuery(`select * from user where uid=${uid} and upw=${upw}`)

    if (sqlResult.length == 0) {
        res.send(forcedMoveWithAlertCode("아이디/비밀번호가 틀렸습니다.", "/login"))
        return
    }
    req.session.name = sqlResult[0].name
    req.session.uid = sqlResult[0].uid
    req.session.num = sqlResult[0].num
    req.session.isLogined = true
    res.send(forcedMoveWithAlertCode(`${sqlResult[0].name}님 환영합니다.`, "/"))
})

app.get('/receipt/:num', async (req, res) => {
    const result = await sqlQuery(`select * from receipt where num=${req.params.num}`)
    if (isNaN(Number(req.params.num))) {
        res.send(forcedMoveWithAlertCode('에러', '/'))
        return
    }
    if (result.length == 0) {
        res.send(forcedMoveWithAlertCode('존재하지 않는 게시물입니다.', '/'))
    }
    var payListHTML = ''
    const payListJson = JSON.parse(result[0].data)
    for (var i in payListJson) {
        var checkText = "무응답"
        var checkingText = "확인중"
        var aTarget = ""
        if (payListJson[i].uid == req.session.uid) {
            checkText = "확인 요청"
            aTarget = `/check/${req.params.num}`
            if (payListJson[i].status == 1) {
                aTarget = `/check-out/${req.params.num}`
            }
        }
        if (result[0].host_id == req.session.uid) {
            checkingText = "확인하기"
            if (payListJson[i].status == 1) {
                aTarget = `/complete/${req.params.num}?target=${payListJson[i].uid}`
            }
        }
        payListHTML += `<div class="line">
                            <div class="headImgWrap">
                                <div class="headImg"></div>
                            </div>
                            <div class="wrapTextData">
                                <div class="blockContent">
                                    <div class="title">${payListJson[i].name}</div>
                                    <div class="explain">${payListJson[i].price}</div>
                                </div>
                                <div class="checkContent">
                                    <div class="reqCheck">
                                        <a href='${aTarget}'>
                                        ${[checkText, checkingText, "결제 완료"][payListJson[i].status]}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>`
    }
    await sendRender(req, res, './views/receipt.html', {
        title: result[0].title,
        account: result[0].account,
        descript: result[0].descript,
        payList: payListHTML
    })
})

app.get('/logout', async (req, res) => {
    req.session.name = null
    req.session.uid = null
    req.session.num = null
    req.session.isLogined = false
    res.send(forcedMoveWithAlertCode(`로그아웃 되셨습니다.`, "/"))
})

app.get('/check/:num', async (req, res) => {
    const result = await sqlQuery(`select * from receipt where num=${req.params.num}`)
    if (isNaN(Number(req.params.num))) {
        res.send(forcedMoveWithAlertCode('에러', '/'))
        return
    }
    if (result.length == 0) {
        res.send(forcedMoveWithAlertCode('존재하지 않는 게시물입니다.', '/'))
    }
    const payListJson = JSON.parse(result[0].data)
    for (var i in payListJson) {
        if (payListJson[i].uid == req.session.uid) {
            payListJson[i].status = 1
        }
    }
    await sqlQuery(`update receipt set data='${JSON.stringify(payListJson)}' where num=${req.params.num}`)
    res.send(forcedMoveCode(`/receipt/${req.params.num}`))
})

app.get('/check-out/:num', async (req, res) => {
    const result = await sqlQuery(`select * from receipt where num=${req.params.num}`)
    if (isNaN(Number(req.params.num))) {
        res.send(forcedMoveWithAlertCode('에러', '/'))
        return
    }
    if (result.length == 0) {
        res.send(forcedMoveWithAlertCode('존재하지 않는 게시물입니다.', '/'))
    }
    const payListJson = JSON.parse(result[0].data)
    for (var i in payListJson) {
        if (payListJson[i].uid == req.session.uid) {
            payListJson[i].status = 0
        }
    }
    await sqlQuery(`update receipt set data='${JSON.stringify(payListJson)}' where num=${req.params.num}`)
    res.send(forcedMoveCode(`/receipt/${req.params.num}`))
})

app.get('/complete/:num', async (req, res) => {
    const result = await sqlQuery(`select * from receipt where num=${req.params.num}`)
    if (isNaN(Number(req.params.num))) {
        res.send(forcedMoveWithAlertCode('에러', '/'))
        return
    }
    if (result.length == 0) {
        res.send(forcedMoveWithAlertCode('존재하지 않는 게시물입니다.', '/'))
    }
    var targetUID = req.query.target
    const payListJson = JSON.parse(result[0].data)
    for (var i in payListJson) {
        if (payListJson[i].uid == targetUID) {
            payListJson[i].status = 2
        }
    }
    await sqlQuery(`update receipt set data='${JSON.stringify(payListJson)}' where num=${req.params.num}`)
    res.send(forcedMoveCode(`/receipt/${req.params.num}`))
})

app.listen(5500, () => console.log('Server run https://localhost:5500'))