const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- DATABASE SIMULATION ---
let users = {}; 
let gameHistory = []; // Game results (numbers/colors)
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
        
        #authPage { text-align: center; padding-top: 80px; position: relative; height: 100vh; background: linear-gradient(180deg, #121212 0%, #1a1a1a 100%); overflow: hidden; }
        .emoji-bg { position: absolute; font-size: 25px; animation: float 5s infinite ease-in-out; opacity: 0.4; z-index: 0; }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(20deg); } }

        .brand-name { font-size: 45px; color: var(--primary); font-weight: 900; text-shadow: 2px 2px 10px rgba(241, 196, 15, 0.5); position: relative; z-index: 10; }
        .subtitle { font-size: 14px; margin-bottom: 30px; color: #888; position: relative; z-index: 10;}

        /* Side Drawer */
        .drawer { position: fixed; top: 0; right: -300px; width: 280px; height: 100%; background: #222; z-index: 1000; transition: 0.3s; padding: 20px; box-shadow: -5px 0 15px rgba(0,0,0,0.5); overflow-y: auto; }
        .drawer.active { right: 0; }
        .drawer-item { padding: 15px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 15px; cursor: pointer; }
        
        /* Bet History List */
        .history-card { background: #333; padding: 10px; border-radius: 8px; margin-top: 10px; font-size: 12px; border-left: 5px solid #555; }
        .history-win { border-left-color: var(--win); }
        .history-loss { border-left-color: var(--loss); }

        .wallet-card { background: linear-gradient(45deg, #f39c12, #f1c40f); color: black; padding: 20px; border-radius: 15px; margin: 15px; font-weight: bold; }
        .timer-section { font-size: 35px; margin: 15px 0; color: var(--primary); text-align: center;}
        
        .amount-selector { display: flex; justify-content: center; gap: 10px; margin-bottom: 15px; }
        .amt-btn { background: #333; border: 1px solid var(--primary); color: white; padding: 8px 15px; border-radius: 5px; }
        .amt-btn.selected { background: var(--primary); color: black; }

        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 15px; }
        .num-btn { background: #2c3e50; border: none; color: white; padding: 15px 0; border-radius: 8px; font-size: 18px; font-weight: bold; }
        .color-row { display: flex; gap: 10px; margin: 15px; }
        .c-btn { flex: 1; padding: 15px; border: none; border-radius: 8px; font-weight: bold; color: white; cursor: pointer; }
        
        .green { background: #27ae60; } .red { background: #c0392b; } .violet { background: #8e44ad; }
        input { width: 80%; padding: 12px; border-radius: 8px; border: none; margin-bottom: 15px; background: #333; color: white; position: relative; z-index: 10; }
    </style>
</head>
<body>

    <div id="drawer" class="drawer">
        <div style="text-align:right; font-size: 20px;" onclick="toggleDrawer()"><i class="fas fa-times"></i></div>
        <div class="drawer-item"><i class="fas fa-user"></i> My Profile</div>
        <div class="drawer-item"><i class="fas fa-wallet"></i> Wallet Balance: ₹<span id="drawerBal">0</span></div>
        
        <h4 style="margin-top:20px; color: var(--primary); border-bottom: 1px solid #444; padding-bottom: 5px;">
            <i class="fas fa-history"></i> Recent Bet History
        </h4>
        <div id="betHistoryList">
            <p style="color:#666; font-size: 12px;">No bets placed yet 😂</p>
        </div>

        <div class="drawer-item" style="margin-top:30px; color: var(--loss);" onclick="location.reload()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </div>
    </div>

    <div id="authPage">
        <div class="emoji-bg" style="top:10%; left:10%;">😂</div>
        <div class="emoji-bg" style="top:20%; right:15%;">🤣</div>
        <div class="emoji-bg" style="top:50%; left:5%;">😄</div>
        <div class="emoji-bg" style="bottom:20%; right:10%;">😆</div>
        <div class="emoji-bg" style="bottom:10%; left:20%;">😂</div>
        <h1 class="brand-name">HAPPY COLOURS</h1>
        <p class="subtitle">Predict & Win! 😄</p>
        <input type="text" id="mobile" placeholder="Mobile Number">
        <input type="password" id="pass" placeholder="Password">
        <button class="c-btn green" style="width: 85%" onclick="login()">Enter Happy World 😄</button>
    </div>

    <div id="gamePage" style="display:none">
        <div style="background: var(--card); padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333;">
            <span style="color:var(--primary); font-weight: bold;">HAPPY COLOURS</span>
            <div onclick="toggleDrawer()"><i class="fas fa-user-circle fa-2x" style="color:var(--primary)"></i></div>
        </div>

        <div class="wallet-card">
            <div>Total Balance</div>
            <div style="font-size: 26px;">₹<span id="balDisplay">0</span></div>
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

        <h3 style="margin-left:15px;">Period History</h3>
        <div id="history" style="padding:15px; display: flex; flex-wrap: wrap; gap: 5px;"></div>
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
            if(m.length < 10) return alert("Sahi Number Daalein!");
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
            document.getElementById('drawerBal').innerText = d.balance;
        });

        socket.on('timer', t => document.getElementById('timer').innerText = t < 10 ? '0'+t : t);
        
        socket.on('update_ui', data => {
            document.getElementById('balDisplay').innerText = data.balance;
            document.getElementById('drawerBal').innerText = data.balance;
            
            // Update Bet History in Sidebar
            const historyDiv = document.getElementById('betHistoryList');
            if(data.userHistory && data.userHistory.length > 0) {
                historyDiv.innerHTML = data.userHistory.map(h => \`
                    <div class="history-card \${h.status === 'WIN' ? 'history-win' : 'history-loss'}">
                        <b>Bet: \${h.type}</b> | Result: \${h.resultNum} (\${h.resultColor})<br>
                        <span style="color: \${h.status === 'WIN' ? '#27ae60' : '#c0392b'}">
                            \${h.status} | Amount: ₹\${h.amount} -> <b>\${h.payout}</b>
                        </span>
                    </div>
                \`).join('');
            }
        });

        socket.on('round_end', d => {
            document.getElementById('history').innerHTML = d.history.map(x => 
                \`<span style="height:20px; width:20px; border-radius:50%; background:\${x.color.toLowerCase()}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">\${x.number}</span>\`
            ).join('');
        });
    </script>
</body>
</html>
`;

// --- SERVER LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const num = Math.floor(Math.random() * 10);
        let color = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) color = 'Violet';
        
        const roundResult = { number: num, color: color };
        gameHistory.unshift(roundResult);
        if(gameHistory.length > 20) gameHistory.pop();

        // Process Bets & History
        Object.keys(users).forEach(m => {
            if(users[m].currentBet) {
                const bet = users[m].currentBet;
                let isWin = false;
                let payout = 0;

                if (bet.type === color) { isWin = true; payout = bet.amount * 1.9; }
                else if (bet.type == num) { isWin = true; payout = bet.amount * 8; }
                else { payout = -bet.amount; }

                if(isWin) users[m].balance += (bet.amount * (bet.type == num ? 8 : 1.9));
                
                // Add to User's Personal History
                users[m].history.unshift({
                    type: bet.type,
                    amount: bet.amount,
                    resultNum: num,
                    resultColor: color,
                    status: isWin ? 'WIN' : 'LOSS',
                    payout: isWin ? '+₹'+payout.toFixed(2) : '-₹'+bet.amount
                });
                if(users[m].history.length > 10) users[m].history.pop();
                
                users[m].currentBet = null;
                // Instant update for the specific user
                io.emit('update_ui', { mobile: m, balance: users[m].balance.toFixed(2), userHistory: users[m].history });
            }
        });

        io.emit('round_end', { result: roundResult, history: gameHistory });
        timeLeft = 30;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', (s) => {
    s.on('auth', (d) => {
        if(!users[d.mobile]) users[d.mobile] = { balance: 1000, currentBet: null, history: [] };
        s.emit('auth_success', { balance: users[d.mobile].balance.toFixed(2) });
        s.emit('update_ui', { balance: users[d.mobile].balance.toFixed(2), userHistory: users[d.mobile].history });
    });

    s.on('bet', (d) => {
        const u = users[d.mobile];
        if(u && u.balance >= d.amount && timeLeft > 2) {
            u.balance -= d.amount;
            u.currentBet = d;
            s.emit('update_ui', { balance: u.balance.toFixed(2), userHistory: u.history });
        }
    });
});

server.listen(PORT, () => console.log("Happy Colours with History Running!"));
