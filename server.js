const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs'); // Data save karne ke liye

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = './users.json';

// --- DATABASE LOAD/SAVE LOGIC ---
let users = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) { users = {}; }
}

function saveToDisk() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

let gameHistory = [];
let timeLeft = 60;

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>HAPPY COLOURS - OFFICIAL</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --blue: #1572e8; --green: #2ecc71; --red: #e74c3c; --violet: #9b59b6; --gray: #8d9498; --light: #f1f4f9; }
        body { font-family: 'Poppins', sans-serif; background: var(--light); margin: 0; padding-bottom: 80px; overflow-x: hidden; }
        
        #authPage { text-align: center; padding: 60px 20px; background: white; height: 100vh; position: fixed; width: 100%; z-index: 9999; }
        .input-box { width: 90%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 30px; background: #f9f9f9; outline: none; text-align: center; }
        .auth-btn { width: 95%; padding: 15px; background: var(--blue); color: white; border: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(21, 114, 232, 0.3); }

        .page { display: none; padding: 10px; }
        .active-page { display: block; }
        .header-blue { background: var(--blue); color: white; padding: 25px 20px 50px; text-align: left; }
        .bal-card { background: white; margin: -40px 15px 15px; padding: 20px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
        .bal-row { display: flex; justify-content: space-between; align-items: center; }
        .game-tabs { display: flex; background: white; margin-bottom: 2px; border-radius: 8px; overflow: hidden; }
        .tab { flex: 1; padding: 15px; text-align: center; font-size: 14px; color: var(--gray); cursor: pointer; }
        .active-tab { color: var(--blue); border-bottom: 3px solid var(--blue); font-weight: bold; background: #f0f7ff; }
        .timer-row { display: flex; justify-content: space-between; padding: 15px; background: white; border-bottom: 1px solid #eee; margin-top: 5px; border-radius: 8px; }
        .color-row { display: flex; gap: 10px; padding: 15px 0; }
        .c-btn { flex: 1; padding: 15px; border: none; border-radius: 8px; color: white; font-weight: bold; font-size: 14px; cursor: pointer; }
        .num-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }
        .n-btn { padding: 12px; border: none; border-radius: 5px; background: #546e7a; color: white; font-weight: bold; }
        .profile-header { background: var(--blue); padding: 40px 20px; color: white; display: flex; align-items: center; gap: 20px; }
        .avatar { width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 35px; }
        .menu-list { background: white; margin-top: 15px; border-radius: 10px; }
        .menu-item { padding: 18px; border-bottom: 1px solid #f1f1f1; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; }
        .modal-content { background: white; width: 85%; margin: 20% auto; padding: 20px; border-radius: 15px; position: relative; }
        .footer { position: fixed; bottom: 0; width: 100%; background: white; display: flex; height: 70px; border-top: 1px solid #eee; z-index: 999; }
        .nav-item { flex: 1; text-align: center; padding-top: 15px; color: var(--gray); font-size: 12px; }
        .nav-active { color: var(--blue); font-weight: bold; }
        .record-table { width: 100%; background: white; margin-top: 10px; border-radius: 8px; border-collapse: collapse; }
        .record-table td { padding: 12px; text-align: center; border-bottom: 1px solid #eee; font-size: 13px; }
    </style>
</head>
<body>

    <div id="authPage">
        <h1 style="color:var(--blue); margin-bottom: 5px;">HAPPY COLOURS 😂</h1>
        <div id="loginStep">
            <p style="color:var(--gray);">Enter Mobile for OTP 🤣</p>
            <input type="number" id="loginMob" class="input-box" placeholder="Mobile Number">
            <button class="auth-btn" onclick="sendOTP()">Send OTP 🚀</button>
        </div>
        <div id="otpStep" style="display:none">
            <p style="color:var(--gray);">Enter 4-Digit OTP 📩</p>
            <input type="number" id="otpInput" class="input-box" placeholder="OTP (Hint: 1234)">
            <button class="auth-btn" onclick="verifyOTP()">Verify & Login 🚀</button>
        </div>
    </div>

    <div id="mainApp" style="display:none">
        <div id="winPage" class="page active-page">
            <div class="header-blue"><h2 style="margin:0">Win Go</h2></div>
            <div class="bal-card">
                <div class="bal-row">
                    <div>
                        <div style="font-size:12px; color:var(--gray);">Available Balance</div>
                        <div style="font-size:24px; font-weight:bold; color: #333;">₹<span id="balDisplay">0.00</span></div>
                    </div>
                    <button onclick="switchPage('my')" style="background:var(--green); color:white; border:none; padding:10px 20px; border-radius:20px; font-weight:bold;">Recharge</button>
                </div>
            </div>

            <div class="game-tabs">
                <div class="tab active-tab">Parity</div><div class="tab">Sapre</div><div class="tab">Bcone</div><div class="tab">Emerd</div>
            </div>

            <div class="timer-row">
                <div><div style="font-size:12px; color:var(--gray);"><i class="fas fa-trophy"></i> Period</div><div id="periodId" style="font-weight:bold;">20240304001</div></div>
                <div style="text-align:right"><div style="font-size:12px; color:var(--gray);">Count Down</div><div id="timer" style="font-size:22px; font-weight:bold; color:var(--red);">01:00</div></div>
            </div>

            <div class="color-row">
                <button class="c-btn" style="background:var(--green)" onclick="openBet('Green')">Join Green</button>
                <button class="c-btn" style="background:var(--violet)" onclick="openBet('Violet')">Join Violet</button>
                <button class="c-btn" style="background:var(--red)" onclick="openBet('Red')">Join Red</button>
            </div>
            <div class="num-grid" id="numberGrid"></div>
            <table class="record-table"><thead><tr style="background:#f8f9fa"><th>Period</th><th>Number</th><th>Result</th></tr></thead><tbody id="gameRecords"></tbody></table>
        </div>

        <div id="myPage" class="page">
            <div class="profile-header"><div class="avatar"><i class="fas fa-user"></i></div>
            <div><div id="uMobile" style="font-size:20px; font-weight:bold;">+91 ---</div><div style="font-size:13px; opacity:0.8;">User ID: <span id="uId">HC5521</span></div></div></div>
            <div class="bal-card" style="margin-top:-20px; display:flex; justify-content:space-between; align-items:center;">
                <div>Mobile: <b id="dispMob">---</b></div><button class="c-btn" style="background:var(--blue); flex:none; padding:5px 15px;" onclick="showWithdraw()">Withdraw</button>
            </div>
            <div class="menu-list">
                <div class="menu-item" onclick="alert('Referral: HAPPY77')"><span><i class="fas fa-share-alt"></i> Promotion</span> <i class="fas fa-chevron-right"></i></div>
                <div class="menu-item" style="color:var(--red)" onclick="location.reload()"><span><i class="fas fa-sign-out-alt"></i> Logout</span> <i class="fas fa-chevron-right"></i></div>
            </div>
        </div>

        <div id="withdrawModal" class="modal"><div class="modal-content"><h3>Withdrawal</h3><input type="number" id="withdrawAmt" class="input-box" placeholder="Min ₹530"><button class="auth-btn" onclick="processWithdraw()">Confirm</button></div></div>

        <div class="footer">
            <div class="nav-item" onclick="alert('Home Soon')"><i class="fas fa-home fa-lg"></i><br>Home</div>
            <div class="nav-item nav-active" id="nav-win" onclick="switchPage('win')"><i class="fas fa-trophy fa-lg"></i><br>Win</div>
            <div class="nav-item" id="nav-my" onclick="switchPage('my')"><i class="fas fa-user fa-lg"></i><br>My</div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentMobile = "";

        const nGrid = document.getElementById('numberGrid');
        for(let i=0; i<=9; i++) nGrid.innerHTML += \`<button class="n-btn" onclick="openBet('\${i}')">\${i}</button>\`;

        function sendOTP() {
            currentMobile = document.getElementById('loginMob').value;
            if(currentMobile.length < 10) return alert("Invalid Number!");
            document.getElementById('loginStep').style.display = 'none';
            document.getElementById('otpStep').style.display = 'block';
        }

        function verifyOTP() {
            if(document.getElementById('otpInput').value === "1234") {
                socket.emit('auth_verified', { mobile: currentMobile });
            } else { alert("Wrong OTP! Try 1234"); }
        }

        socket.on('auth_success', d => {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('uMobile').innerText = "+91 " + currentMobile;
            document.getElementById('dispMob').innerText = currentMobile;
            updateUI(d);
        });

        function switchPage(p) {
            document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active-page'));
            document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('nav-active'));
            if(p === 'win') { document.getElementById('winPage').classList.add('active-page'); document.getElementById('nav-win').classList.add('nav-active'); }
            else { document.getElementById('myPage').classList.add('active-page'); document.getElementById('nav-my').classList.add('nav-active'); }
        }

        function openBet(type) {
            const amt = prompt("Amount (Min ₹10):", "10");
            if(amt >= 10) socket.emit('bet', { mobile: currentMobile, type, amount: parseInt(amt) });
        }

        socket.on('timer', t => {
            let m = Math.floor(t/60); let s = t%60;
            document.getElementById('timer').innerText = \`0\${m}:\${s < 10 ? '0'+s : s}\`;
        });

        socket.on('update_user', d => { if(d.mobile === currentMobile) updateUI(d); });

        socket.on('round_end', d => {
            document.getElementById('gameRecords').innerHTML = d.history.map((h, i) => \`
                <tr><td>2024030\${100-i}</td><td>\${h.number}</td><td><span style="color:\${h.color.toLowerCase()}">\${h.color}</span></td></tr>
            \`).join('');
        });

        function updateUI(d) {
            document.getElementById('balDisplay').innerText = d.balance.toFixed(2);
            let myBal = document.getElementById('myBal');
            if(myBal) myBal.innerText = d.balance.toFixed(2);
        }

        function showWithdraw() { document.getElementById('withdrawModal').style.display='block'; }
        function processWithdraw() { alert("Request Sent!"); document.getElementById('withdrawModal').style.display='none'; }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

// --- SERVER LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const num = Math.floor(Math.random() * 10);
        let col = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) col = 'Violet';
        gameHistory.unshift({ number: num, color: col });
        if(gameHistory.length > 20) gameHistory.pop();

        Object.keys(users).forEach(m => {
            if(users[m].currentBet) {
                const b = users[m].currentBet;
                let isWin = (b.type === col || b.type == num);
                if(isWin) users[m].balance += (b.type == num ? b.amount * 8 : b.amount * 1.9);
                users[m].currentBet = null;
                saveToDisk(); // Har result ke baad save
                io.emit('update_user', { mobile: m, balance: users[m].balance });
            }
        });
        io.emit('round_end', { history: gameHistory });
        timeLeft = 60;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', s => {
    s.on('auth_verified', d => {
        if(!users[d.mobile]) {
            users[d.mobile] = { balance: 1000, currentBet: null };
            saveToDisk();
        }
        s.emit('auth_success', { balance: users[d.mobile].balance });
    });
    s.on('bet', d => {
        const u = users[d.mobile];
        if(u && u.balance >= d.amount) {
            u.balance -= d.amount;
            u.currentBet = d;
            saveToDisk();
            s.emit('update_user', { mobile: d.mobile, balance: u.balance });
        }
    });
});

server.listen(PORT, () => console.log("OTP & Persistence Live!"));
