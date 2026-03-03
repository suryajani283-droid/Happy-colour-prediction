const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Yeh line "Cannot GET" fix karegi

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- DATABASE SIMULATION ---
let users = {}; 
let gameHistory = []; 
let timeLeft = 30;

// --- FULL UI CODE ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>HAPPY COLOURS</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --primary: #f1c40f; --dark: #121212; --card: #1e1e1e; --win: #27ae60; --loss: #c0392b; }
        body { font-family: 'Poppins', sans-serif; background: var(--dark); color: white; margin: 0; overflow-x: hidden; }
        
        #authPage { text-align: center; padding-top: 80px; position: relative; height: 100vh; background: #121212; overflow: hidden; }
        .emoji-bg { position: absolute; font-size: 25px; animation: float 5s infinite ease-in-out; opacity: 0.4; z-index: 0; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }

        .brand-name { font-size: 40px; color: var(--primary); font-weight: 900; position: relative; z-index: 10; }
        
        /* Drawer */
        .drawer { position: fixed; top: 0; right: -300px; width: 280px; height: 100%; background: #222; z-index: 1000; transition: 0.3s; padding: 20px; overflow-y: auto; }
        .drawer.active { right: 0; }
        .drawer-item { padding: 15px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px; }
        
        .history-card { background: #333; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 12px; border-left: 5px solid #555; text-align: left; }
        .win-border { border-left-color: var(--win); }
        .loss-border { border-left-color: var(--loss); }

        .wallet-card { background: linear-gradient(45deg, #f39c12, #f1c40f); color: black; padding: 20px; border-radius: 15px; margin: 15px; font-weight: bold; text-align: center; }
        .timer-section { font-size: 35px; margin: 15px 0; color: var(--primary); text-align: center; }
        
        .amount-selector { display: flex; justify-content: center; gap: 10px; margin-bottom: 15px; }
        .amt-btn { background: #333; border: 1px solid var(--primary); color: white; padding: 8px 12px; border-radius: 5px; }
        .amt-btn.selected { background: var(--primary); color: black; }

        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 15px; }
        .num-btn { background: #2c3e50; border: none; color: white; padding: 15px 0; border-radius: 8px; font-weight: bold; }
        .color-row { display: flex; gap: 10px; margin: 15px; }
        .c-btn { flex: 1; padding: 15px; border: none; border-radius: 8px; font-weight: bold; color: white; }
        
        .green { background: #27ae60; } .red { background: #c0392b; } .violet { background: #8e44ad; }
        input { width: 80%; padding: 12px; border-radius: 8px; border: none; margin-bottom: 15px; background: #333; color: white; }
    </style>
</head>
<body>

    <div id="drawer" class="drawer">
        <div style="text-align:right" onclick="toggleDrawer()"><i class="fas fa-times"></i> Close</div>
        <div class="drawer-item"><i class="fas fa-wallet"></i> Balance: ₹<span id="drawerBal">0</span></div>
        <h4 style="color: var(--primary); margin-top:20px;">Bet History 😂</h4>
        <div id="betHistoryList"></div>
        <div class="drawer-item" style="color:red; margin-top:20px;" onclick="location.reload()">Logout</div>
    </div>

    <div id="authPage">
        <div class="emoji-bg" style="top:10%; left:10%;">😂</div>
        <div class="emoji-bg" style="top:30%; right:10%;">🤣</div>
        <h1 class="brand-name">HAPPY COLOURS</h1>
        <input type="text" id="mobile" placeholder="Mobile Number">
        <input type="password" id="pass" placeholder="Password">
        <button class="c-btn green" style="width: 85%" onclick="login()">Login 😄</button>
    </div>

    <div id="gamePage" style="display:none">
        <div style="background: var(--card); padding: 15px; display: flex; justify-content: space-between;">
            <span>HAPPY COLOURS</span>
            <i class="fas fa-user-circle fa-2x" onclick="toggleDrawer()"></i>
        </div>

        <div class="wallet-card">
            <div>Balance</div>
            <div style="font-size: 24px;">₹<span id="balDisplay">0</span></div>
        </div>

        <div class="timer-section">00:<span id="timer">30</span></div>

        <div class="amount-selector">
            <button class="amt-btn selected" onclick="setAmt(10, this)">₹10</button>
            <button class="amt-btn" onclick="setAmt(100, this)">₹100</button>
            <button class="amt-btn" onclick="setAmt(1000, this)">₹1000</button>
        </div>

        <div class="color-row">
            <button class="c-btn green" onclick="placeBet('Green')">Green</button>
            <button class="c-btn violet" onclick="placeBet('Violet')">Violet</button>
            <button class="c-btn red" onclick="placeBet('Red')">Red</button>
        </div>

        <div class="grid" id="numGrid"></div>
        <div id="history" style="padding:15px; display:flex; gap:5px; flex-wrap:wrap;"></div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentAmt = 10;
        let myMob = "";

        function toggleDrawer() { document.getElementById('drawer').classList.toggle('active'); }
        function setAmt(v, b) {
            currentAmt = v;
            document.querySelectorAll('.amt-btn').forEach(btn => btn.classList.remove('selected'));
            b.classList.add('selected');
        }

        const grid = document.getElementById('numGrid');
        for(let i=0; i<=9; i++) grid.innerHTML += \`<button class="num-btn" onclick="placeBet('\${i}')">\${i}</button>\`;

        function login() {
            myMob = document.getElementById('mobile').value;
            if(myMob.length < 10) return alert("Number Sahi Daalo!");
            socket.emit('auth', { mobile: myMob });
        }

        function placeBet(type) {
            socket.emit('bet', { mobile: myMob, type: type, amount: currentAmt });
            alert("Bet Lag Gayi on " + type);
        }

        socket.on('auth_success', d => {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('gamePage').style.display = 'block';
            document.getElementById('balDisplay').innerText = d.balance;
        });

        socket.on('timer', t => document.getElementById('timer').innerText = t < 10 ? '0'+t : t);
        
        socket.on('update_ui', d => {
            document.getElementById('balDisplay').innerText = d.balance;
            document.getElementById('drawerBal').innerText = d.balance;
            const list = document.getElementById('betHistoryList');
            list.innerHTML = d.history.map(h => \`
                <div class="history-card \${h.status==='WIN'?'win-border':'loss-border'}">
                    Bet: \${h.type} | Result: \${h.resNum} <br>
                    <b>\${h.status} | \${h.payout}</b>
                </div>
            \`).join('');
        });

        socket.on('round_end', d => {
            document.getElementById('history').innerHTML = d.history.map(x => 
                \`<span style="height:20px; width:20px; border-radius:50%; background:\${x.color.toLowerCase()}; display:inline-block; text-align:center; font-size:12px;">\${x.number}</span>\`
            ).join('');
        });
    </script>
</body>
</html>
`;

// --- FIX FOR "CANNOT GET" ---
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
});

// --- LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const n = Math.floor(Math.random() * 10);
        let c = (n % 2 === 0) ? 'Red' : 'Green';
        if (n === 0 || n === 5) c = 'Violet';
        gameHistory.unshift({ number: n, color: c });
        if(gameHistory.length > 20) gameHistory.pop();

        Object.keys(users).forEach(m => {
            if(users[m].bet) {
                const b = users[m].bet;
                let win = (b.type === c || b.type == n);
                let p = win ? (b.type == n ? b.amount * 8 : b.amount * 1.9) : -b.amount;
                if(win) users[m].balance += (b.type == n ? b.amount * 8 : b.amount * 1.9);
                users[m].userHistory.unshift({ type: b.type, resNum: n, status: win?'WIN':'LOSS', payout: p.toFixed(2), amount: b.amount });
                users[m].bet = null;
                io.emit('update_ui', { mobile: m, balance: users[m].balance.toFixed(2), history: users[m].userHistory });
            }
        });
        io.emit('round_end', { history: gameHistory });
        timeLeft = 30;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', (s) => {
    s.on('auth', (d) => {
        if(!users[d.mobile]) users[d.mobile] = { balance: 1000, bet: null, userHistory: [] };
        s.emit('auth_success', { balance: users[d.mobile].balance });
        s.emit('update_ui', { balance: users[d.mobile].balance, history: users[d.mobile].userHistory });
    });
    s.on('bet', (d) => {
        const u = users[d.mobile];
        if(u && u.balance >= d.amount && timeLeft > 2) {
            u.balance -= d.amount;
            u.bet = d;
            s.emit('update_ui', { balance: u.balance.toFixed(2), history: u.userHistory });
        }
    });
});

server.listen(PORT, () => console.log("Fixed!"));
