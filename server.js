const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = './users.json';

// --- DATABASE SIMULATION (SAVE/LOAD) ---
let users = {};

// Load data from file if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        users = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log("Data Loaded: Users recovered from memory.");
    } catch (err) {
        console.log("Error loading file, starting fresh.");
        users = {};
    }
}

function saveToDisk() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

let gameHistory = [];
let timeLeft = 60;

// --- FRONTEND CODE ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>HAPPY COLOURS - SECURE</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --blue: #1572e8; --green: #2ecc71; --red: #e74c3c; --violet: #9b59b6; --gray: #8d9498; --light: #f1f4f9; }
        body { font-family: 'Poppins', sans-serif; background: var(--light); margin: 0; padding-bottom: 80px; }
        
        /* Auth/OTP Section */
        #authPage { text-align: center; padding: 60px 20px; background: white; height: 100vh; position: fixed; width: 100%; z-index: 9999; }
        .input-box { width: 90%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 30px; background: #f9f9f9; outline: none; text-align: center; font-size: 16px; }
        .auth-btn { width: 95%; padding: 15px; background: var(--blue); color: white; border: none; border-radius: 30px; font-weight: bold; cursor: pointer; }
        
        /* Floating Emojis */
        .emoji { position: fixed; font-size: 20px; opacity: 0.2; pointer-events: none; animation: float 6s infinite linear; }
        @keyframes float { from { transform: translateY(100vh); } to { transform: translateY(-10vh); } }

        /* Main App UI */
        .page { display: none; }
        .active-page { display: block; }
        .header-blue { background: var(--blue); color: white; padding: 25px 20px 50px; text-align: left; }
        .bal-card { background: white; margin: -40px 15px 15px; padding: 20px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; }

        /* Betting Controls */
        .grid-nums { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 15px; background: white; }
        .n-btn { padding: 12px; border: none; border-radius: 5px; background: #546e7a; color: white; font-weight: bold; }
        .color-row { display: flex; gap: 10px; padding: 15px; background: white; }
        .c-btn { flex: 1; padding: 15px; border: none; border-radius: 8px; color: white; font-weight: bold; }

        /* Footer */
        .footer { position: fixed; bottom: 0; width: 100%; background: white; display: flex; height: 70px; border-top: 1px solid #eee; z-index: 999; }
        .nav-item { flex: 1; text-align: center; padding-top: 15px; color: var(--gray); font-size: 12px; }
        .nav-active { color: var(--blue); font-weight: bold; }
    </style>
</head>
<body>

    <div id="authPage">
        <h1 style="color:var(--blue)">HAPPY COLOURS 😂</h1>
        <div id="step1">
            <p style="color:var(--gray)">Enter Mobile to Receive OTP 🤣</p>
            <input type="number" id="loginMob" class="input-box" placeholder="Mobile Number">
            <button class="auth-btn" onclick="sendOTP()">Send OTP 📩</button>
        </div>
        <div id="step2" style="display:none">
            <p>Enter 4-Digit OTP sent to <br><b id="targetMob"></b></p>
            <input type="number" id="otpInput" class="input-box" placeholder="OTP (Hint: 1234)">
            <button class="auth-btn" onclick="verifyOTP()">Verify & Login 🚀</button>
        </div>
    </div>

    <div id="mainApp" style="display:none">
        
        <div id="winPage" class="page active-page">
            <div class="header-blue"><h2>Win Go</h2></div>
            <div class="bal-card">
                <div>
                    <div style="font-size:12px; color:var(--gray);">Balance</div>
                    <div style="font-size:24px; font-weight:bold;">₹<span id="balDisplay">0.00</span></div>
                </div>
                <button onclick="switchPage('my')" style="background:var(--blue); color:white; border:none; padding:8px 15px; border-radius:5px;">My Account</button>
            </div>

            <div style="background:white; padding:15px; margin-top:5px; display:flex; justify-content:space-between;">
                <span>Period: <b id="period">2024030501</b></span>
                <span>Timer: <b id="timer" style="color:var(--red); font-size:18px;">01:00</b></span>
            </div>

            <div class="color-row">
                <button class="c-btn" style="background:var(--green)" onclick="bet('Green')">Green</button>
                <button class="c-btn" style="background:var(--violet)" onclick="bet('Violet')">Violet</button>
                <button class="c-btn" style="background:var(--red)" onclick="bet('Red')">Red</button>
            </div>
            <div class="grid-nums" id="nGrid"></div>
        </div>

        <div id="myPage" class="page">
            <div style="background:var(--blue); padding:40px 20px; color:white;">
                <h3 id="uMobDisplay">+91 ---</h3>
                <p>Welcome back to Happy World! 😂</p>
            </div>
            <div style="background:white; margin-top:10px; padding:20px;">
                <div style="padding:15px; border-bottom:1px solid #eee;">Balance: <b>₹<span id="myBal">0</span></b></div>
                <div style="padding:15px; border-bottom:1px solid #eee;" onclick="alert('Referral: HAPPY77')">Referral Code <i class="fas fa-chevron-right" style="float:right"></i></div>
                <div style="padding:15px; color:red; font-weight:bold;" onclick="location.reload()">Logout</div>
            </div>
        </div>

        <div class="footer">
            <div class="nav-item nav-active" id="nav-win" onclick="switchPage('win')"><i class="fas fa-trophy fa-lg"></i><br>Win</div>
            <div class="nav-item" id="nav-my" onclick="switchPage('my')"><i class="fas fa-user fa-lg"></i><br>My</div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let userMob = "";

        // Number Grid
        const grid = document.getElementById('nGrid');
        for(let i=0; i<=9; i++) grid.innerHTML += \`<button class="n-btn" onclick="bet('\${i}')">\${i}</button>\`;

        function sendOTP() {
            userMob = document.getElementById('loginMob').value;
            if(userMob.length < 10) return alert("Enter valid number!");
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('targetMob').innerText = userMob;
        }

        function verifyOTP() {
            const otp = document.getElementById('otpInput').value;
            if(otp === "1234") {
                socket.emit('login_verify', { mobile: userMob });
            } else {
                alert("Incorrect OTP! Try 1234 😂");
            }
        }

        socket.on('auth_ok', d => {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('uMobDisplay').innerText = "+91 " + userMob;
            updateBalance(d.balance);
        });

        function switchPage(p) {
            document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active-page'));
            document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('nav-active'));
            if(p === 'win') {
                document.getElementById('winPage').classList.add('active-page');
                document.getElementById('nav-win').classList.add('nav-active');
            } else {
                document.getElementById('myPage').classList.add('active-page');
                document.getElementById('nav-my').classList.add('nav-active');
            }
        }

        function bet(type) {
            let amt = prompt("Enter Bet Amount:", "10");
            if(amt >= 10) socket.emit('place_bet', { mobile: userMob, type, amount: parseInt(amt) });
        }

        socket.on('timer', t => {
            let s = t%60; document.getElementById('timer').innerText = "00:" + (s < 10 ? '0'+s : s);
        });

        socket.on('update_ui', d => { if(d.mobile === userMob) updateBalance(d.balance); });

        function updateBalance(b) {
            document.getElementById('balDisplay').innerText = b.toFixed(2);
            document.getElementById('myBal').innerText = b.toFixed(2);
        }

        // Floating Emojis
        setInterval(() => {
            const e = document.createElement('div');
            e.className = 'emoji';
            e.innerText = ['😂', '🤣', '😄'][Math.floor(Math.random()*3)];
            e.style.left = Math.random() * 100 + "vw";
            document.body.appendChild(e);
            setTimeout(() => e.remove(), 6000);
        }, 3000);
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

        Object.keys(users).forEach(m => {
            if (users[m].currentBet) {
                const b = users[m].currentBet;
                let win = (b.type === col || b.type == num);
                if (win) users[m].balance += (b.type == num ? b.amount * 8 : b.amount * 1.9);
                users[m].currentBet = null;
                saveToDisk(); // Save result to JSON
                io.emit('update_ui', { mobile: m, balance: users[m].balance });
            }
        });
        timeLeft = 60;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', s => {
    s.on('login_verify', d => {
        // Restore existing user or create new
        if (!users[d.mobile]) {
            users[d.mobile] = { balance: 1000, currentBet: null };
            saveToDisk();
        }
        s.emit('auth_ok', users[d.mobile]);
    });

    s.on('place_bet', d => {
        const u = users[d.mobile];
        if (u && u.balance >= d.amount) {
            u.balance -= d.amount;
            u.currentBet = d;
            saveToDisk();
            s.emit('update_ui', { mobile: d.mobile, balance: u.balance });
        }
    });
});

server.listen(PORT, () => console.log("Final Secure Happy Colours Live!"));
