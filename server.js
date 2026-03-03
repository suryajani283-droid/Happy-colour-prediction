const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
        :root { --primary: #f1c40f; --dark: #121212; --card: #1e1e1e; }
        body { font-family: 'Poppins', sans-serif; background: var(--dark); color: white; margin: 0; overflow-x: hidden; }
        
        /* Auth Screen Styling */
        #authPage { 
            text-align: center; 
            padding-top: 80px; 
            position: relative;
            height: 100vh;
            background: linear-gradient(180deg, #121212 0%, #1a1a1a 100%);
            overflow: hidden;
        }
        
        .emoji-bg {
            position: absolute;
            font-size: 25px;
            animation: float 5s infinite ease-in-out;
            opacity: 0.4;
            z-index: 0;
        }
        
        @keyframes float {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(20deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }

        .brand-name { 
            font-size: 45px; 
            color: var(--primary); 
            font-weight: 900; 
            text-shadow: 2px 2px 10px rgba(241, 196, 15, 0.5);
            margin-bottom: 5px;
            z-index: 10;
            position: relative;
        }
        .subtitle { font-size: 14px; margin-bottom: 30px; color: #888; position: relative; z-index: 10;}

        /* Game UI */
        .header { background: var(--card); padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; }
        .drawer { position: fixed; top: 0; right: -280px; width: 250px; height: 100%; background: #222; z-index: 1000; transition: 0.3s; padding: 20px; }
        .drawer.active { right: 0; }
        .drawer-item { padding: 15px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px; }
        
        .wallet-card { background: linear-gradient(45deg, #f39c12, #f1c40f); color: black; padding: 20px; border-radius: 15px; margin: 15px; font-weight: bold; }
        .timer-section { font-size: 35px; margin: 15px 0; color: var(--primary); }
        
        .amount-selector { display: flex; justify-content: center; gap: 10px; margin-bottom: 15px; }
        .amt-btn { background: #333; border: 1px solid var(--primary); color: white; padding: 8px 15px; border-radius: 5px; }
        .amt-btn.selected { background: var(--primary); color: black; }

        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 15px; }
        .num-btn { background: #2c3e50; border: none; color: white; padding: 15px 0; border-radius: 8px; font-size: 18px; font-weight: bold; }
        .color-row { display: flex; gap: 10px; margin: 15px; }
        .c-btn { flex: 1; padding: 15px; border: none; border-radius: 8px; font-weight: bold; color: white; }
        
        .green { background: #27ae60; } .red { background: #c0392b; } .violet { background: #8e44ad; }
        input { width: 80%; padding: 12px; border-radius: 8px; border: none; margin-bottom: 15px; background: #333; color: white; position: relative; z-index: 10; }
    </style>
</head>
<body>

    <div id="drawer" class="drawer">
        <div style="text-align:right" onclick="toggleDrawer()"><i class="fas fa-times"></i></div>
        <div class="drawer-item"><i class="fas fa-user"></i> Profile</div>
        <div class="drawer-item" onclick="alert('Bonus Added!')"><i class="fas fa-wallet"></i> Deposit</div>
        <div class="drawer-item"><i class="fas fa-university"></i> Withdraw</div>
        <div class="drawer-item" onclick="location.reload()"><i class="fas fa-sign-out-alt"></i> Logout</div>
    </div>

    <div id="authPage">
        <div class="emoji-bg" style="top:10%; left:10%;">😂</div>
        <div class="emoji-bg" style="top:20%; right:15%;">🤣</div>
        <div class="emoji-bg" style="top:50%; left:5%;">😄</div>
        <div class="emoji-bg" style="bottom:20%; right:10%;">😆</div>
        <div class="emoji-bg" style="bottom:10%; left:20%;">😂</div>
        <div class="emoji-bg" style="top:40%; right:30%;">🤣</div>

        <h1 class="brand-name">HAPPY COLOURS</h1>
        <p class="subtitle">Predict & Win Dummy Rupees! 😂</p>
        
        <div style="position:relative; z-index:10;">
            <input type="text" id="mobile" placeholder="Mobile Number">
            <input type="password" id="pass" placeholder="Password">
            <button class="c-btn green" style="width: 85%" onclick="login()">Enter Happy World 😄</button>
        </div>
    </div>

    <div id="gamePage" style="display:none">
        <div class="header">
            <span>HAPPY COLOURS</span>
            <div onclick="toggleDrawer()"><i class="fas fa-user-circle fa-2x" style="color:var(--primary)"></i></div>
        </div>

        <div class="wallet-card">
            <div>Happy Balance</div>
            <div style="font-size: 26px;">₹<span id="balDisplay">0</span></div>
        </div>

        <div class="timer-section">Timer: 00:<span id="timer">30</span></div>

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

        <h3>Results History</h3>
        <div id="history" style="padding:10px;"></div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentBetAmount = 10;
        let myMobile = "";

        function toggleDrawer() { document.getElementById('drawer').classList.toggle('active'); }
        function setAmt(v, b) {
            currentBetAmount = v;
            document.querySelectorAll('.amt-btn').forEach(btn => btn.classList.remove('selected'));
            b.classList.add('selected');
        }

        const grid = document.getElementById('numGrid');
        for(let i=0; i<=9; i++) grid.innerHTML += \`<button class="num-btn" onclick="placeBet('\${i}')">\${i}</button>\`;

        function login() {
            const m = document.getElementById('mobile').value;
            if(m.length < 10) return alert("Sahi Mobile Number Daalein!");
            myMobile = m;
            socket.emit('auth', { mobile: m });
        }

        function placeBet(type) {
            socket.emit('bet', { mobile: myMobile, type: type, amount: currentBetAmount });
            alert("Bet Lag Gayi: " + type + " par ₹" + currentBetAmount);
        }

        socket.on('auth_success', d => {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('gamePage').style.display = 'block';
            document.getElementById('balDisplay').innerText = d.balance;
        });

        socket.on('timer', t => document.getElementById('timer').innerText = t < 10 ? '0'+t : t);
        socket.on('update_bal', b => document.getElementById('balDisplay').innerText = b);
        socket.on('round_end', d => {
            document.getElementById('history').innerHTML = d.history.map(x => 
                \`<span style="height:15px; width:15px; border-radius:50%; background:\${x.color.toLowerCase()}; display:inline-block; margin:3px;"></span>\`
            ).join('');
        });
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

// --- SERVER LOGIC (Logic Same Rakha Hai) ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const num = Math.floor(Math.random() * 10);
        let color = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) color = 'Violet';
        const res = { number: num, color: color };
        gameHistory.unshift(res);
        if(gameHistory.length > 20) gameHistory.pop();
        Object.keys(users).forEach(m => {
            if(users[m].bet) {
                if(users[m].bet.type === color) users[m].balance += users[m].bet.amount * 1.9;
                else if(users[m].bet.type == num) users[m].balance += users[m].bet.amount * 8;
                users[m].bet = null;
                io.emit('update_bal_all', { mobile: m, balance: users[m].balance });
            }
        });
        io.emit('round_end', { result: res, history: gameHistory });
        timeLeft = 30;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', (s) => {
    s.on('auth', (d) => {
        if(!users[d.mobile]) users[d.mobile] = { balance: 1000, bet: null };
        s.emit('auth_success', { balance: users[d.mobile].balance });
    });
    s.on('bet', (d) => {
        const u = users[d.mobile];
        if(u && u.balance >= d.amount && timeLeft > 5) {
            u.balance -= d.amount;
            u.bet = d;
            s.emit('update_bal', u.balance);
        }
    });
});

server.listen(PORT, () => console.log("Happy Colours Running!"));
