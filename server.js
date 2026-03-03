const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- DUMMY DATABASE ---
let users = {}; 
let gameHistory = { Parity: [], Sapre: [], Bcone: [], Emerd: [] };
let timeLeft = 60; // 1 Minute Period

// --- PROFESSIONAL UI ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>HAPPY COLOURS - PRO</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        :root { --blue: #007bff; --green: #28a745; --red: #dc3545; --violet: #6f42c1; --dark-bg: #f8f9fa; }
        body { font-family: 'Helvetica', sans-serif; background: #eeeeee; color: #333; margin: 0; padding-bottom: 60px; }
        
        /* Top Balance Header */
        .top-banner { background: var(--blue); color: white; padding: 20px; text-align: left; position: relative; }
        .balance-title { font-size: 14px; opacity: 0.9; }
        .balance-amt { font-size: 24px; font-weight: bold; margin: 5px 0; }
        .banner-btns { display: flex; gap: 10px; margin-top: 10px; }
        .action-btn { background: white; color: var(--blue); border: none; padding: 8px 15px; border-radius: 5px; font-weight: bold; font-size: 12px; }
        .recharge { background: var(--green); color: white; }

        /* Game Tabs */
        .tabs { display: flex; background: white; border-bottom: 1px solid #ddd; }
        .tab { flex: 1; padding: 12px; text-align: center; font-size: 14px; cursor: pointer; color: #666; }
        .tab.active { color: var(--blue); border-bottom: 3px solid var(--blue); font-weight: bold; }

        /* Period & Timer */
        .period-info { display: flex; justify-content: space-between; padding: 15px; background: white; margin-top: 5px; }
        .period-label { color: #888; font-size: 13px; }
        .timer-val { font-size: 20px; font-weight: bold; color: #333; }

        /* Betting Controls */
        .bet-box { background: white; padding: 15px; margin-top: 5px; text-align: center; }
        .btn-row { display: flex; justify-content: space-around; margin-bottom: 15px; }
        .join-btn { padding: 10px 20px; border: none; border-radius: 5px; color: white; font-weight: bold; width: 30%; }
        
        .num-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .n-btn { background: var(--violet); color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold; }

        /* Transaction History */
        .record-title { padding: 10px 15px; font-weight: bold; color: #555; display: flex; align-items: center; gap: 10px; }
        .trans-item { background: white; padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .win-txt { color: var(--green); font-weight: bold; }
        .loss-txt { color: var(--red); font-weight: bold; }

        /* Bottom Nav */
        .bottom-nav { position: fixed; bottom: 0; width: 100%; background: white; display: flex; border-top: 1px solid #ddd; height: 55px; }
        .nav-item { flex: 1; text-align: center; padding-top: 10px; color: #666; font-size: 12px; }
        .nav-item.active { color: var(--blue); }

        /* Drawer */
        .drawer { position: fixed; top: 0; right: -100%; width: 80%; height: 100%; background: white; z-index: 2000; transition: 0.3s; box-shadow: -2px 0 10px rgba(0,0,0,0.1); }
        .drawer.open { right: 0; }
    </style>
</head>
<body>

    <div id="gameUI" style="display:none">
        <div class="top-banner">
            <div class="balance-title">Available balance: ₹<span id="bal1">0</span></div>
            <div class="balance-amt">₹ <span id="balDisplay">0.00</span></div>
            <div class="banner-btns">
                <button class="action-btn recharge" onclick="alert('Recharge Gateway Opening...')">Recharge</button>
                <button class="action-btn" onclick="showWithdrawal()">Withdrawal</button>
                <i class="fas fa-sync-alt" style="position:absolute; right:20px; top:40px;" onclick="location.reload()"></i>
            </div>
        </div>

        <div class="tabs">
            <div class="tab active">Parity</div>
            <div class="tab">Sapre</div>
            <div class="tab">Bcone</div>
            <div class="tab">Emerd</div>
        </div>

        <div class="period-info">
            <div>
                <div class="period-label"><i class="fas fa-trophy"></i> Period</div>
                <div style="font-weight:bold; margin-top:5px;" id="periodId">20240303101</div>
            </div>
            <div style="text-align:right">
                <div class="period-label">Count Down</div>
                <div class="timer-val" id="timer">01:00</div>
            </div>
        </div>

        <div class="bet-box">
            <div class="btn-row">
                <button class="join-btn" style="background:var(--green)" onclick="openBet('Green')">Join Green</button>
                <button class="join-btn" style="background:var(--violet)" onclick="openBet('Violet')">Join Violet</button>
                <button class="join-btn" style="background:var(--red)" onclick="openBet('Red')">Join Red</button>
            </div>
            <div class="num-grid" id="numGrid"></div>
        </div>

        <div class="record-title"><i class="fas fa-trophy"></i> Parity Record</div>
        <div id="transHistory"></div>
    </div>

    <div id="authPage" style="text-align:center; padding-top:100px;">
        <h2 style="color:var(--blue)">HAPPY COLOURS 😂</h2>
        <input type="text" id="mob" placeholder="Mobile Number" style="width:80%; padding:10px; margin:10px; border:1px solid #ddd; border-radius:5px;">
        <input type="password" id="pw" placeholder="Password" style="width:80%; padding:10px; margin:10px; border:1px solid #ddd; border-radius:5px;">
        <button onclick="auth()" style="width:85%; padding:12px; background:var(--blue); color:white; border:none; border-radius:5px; font-weight:bold;">Login / Register</button>
        <p style="font-size:12px; color:#888;">Bonus ₹1000 on New Signup! 🤣</p>
    </div>

    <div class="bottom-nav">
        <div class="nav-item active"><i class="fas fa-home"></i><br>Home</div>
        <div class="nav-item"><i class="fas fa-search"></i><br>Search</div>
        <div class="nav-item"><i class="fas fa-trophy"></i><br>Win</div>
        <div class="nav-item" onclick="toggleProfile()"><i class="fas fa-user"></i><br>My</div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myMob = "";

        // UI Initialization
        const nGrid = document.getElementById('numGrid');
        for(let i=0; i<=9; i++) nGrid.innerHTML += \`<button class="n-btn" onclick="openBet('\${i}')">\${i}</button>\`;

        function auth() {
            myMob = document.getElementById('mob').value;
            if(myMob.length < 10) return alert("Valid Mobile Daalein!");
            socket.emit('login', { mob: myMob });
        }

        socket.on('login_ok', d => {
            document.getElementById('authPage').style.display='none';
            document.getElementById('gameUI').style.display='block';
            updateUI(d);
        });

        function openBet(type) {
            let amt = prompt("Enter Bet Amount (Min ₹10):", "10");
            if(amt >= 10) {
                socket.emit('place_bet', { mob: myMob, type: type, amount: parseInt(amt) });
            }
        }

        socket.on('timer', t => {
            let min = Math.floor(t / 60);
            let sec = t % 60;
            document.getElementById('timer').innerText = \`0\${min}:\${sec < 10 ? '0'+sec : sec}\`;
        });

        socket.on('update_data', d => updateUI(d));

        function updateUI(d) {
            document.getElementById('balDisplay').innerText = d.balance.toFixed(2);
            const hist = document.getElementById('transHistory');
            hist.innerHTML = d.history.map(h => \`
                <div class="trans-item">
                    <div>
                        <div style="font-size:14px; font-weight:bold;">Join Period (\${h.type})</div>
                        <div style="font-size:11px; color:#999;">\${new Date().toLocaleTimeString()}</div>
                    </div>
                    <div class="\${h.status==='WIN'?'win-txt':'loss-txt'}">
                        \${h.status==='WIN'?'+':''}\${h.payout}
                    </div>
                </div>
            \`).join('');
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

// --- SERVER LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const winNum = Math.floor(Math.random() * 10);
        let winCol = (winNum % 2 === 0) ? 'Red' : 'Green';
        if (winNum === 0 || winNum === 5) winCol = 'Violet';

        Object.keys(users).forEach(m => {
            const u = users[m];
            if (u.bet) {
                let win = (u.bet.type === winCol || u.bet.type == winNum);
                let p = win ? (u.bet.type == winNum ? u.bet.amount * 8 : u.bet.amount * 1.9) : -u.bet.amount;
                if(win) u.balance += (u.bet.type == winNum ? u.bet.amount * 8 : u.bet.amount * 1.9);
                
                u.history.unshift({ type: u.bet.type, status: win?'WIN':'LOSS', payout: p.toFixed(2) });
                if(u.history.length > 15) u.history.pop();
                u.bet = null;
                io.emit('update_data', { mob: m, balance: u.balance, history: u.history });
            }
        });
        timeLeft = 60;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', s => {
    s.on('login', d => {
        if(!users[d.mob]) users[d.mob] = { balance: 1000, history: [], bet: null };
        s.emit('login_ok', users[d.mob]);
    });
    s.on('place_bet', d => {
        const u = users[d.mob];
        if(u && u.balance >= d.amount && timeLeft > 5) {
            u.balance -= d.amount;
            u.bet = d;
            s.emit('update_data', u);
        }
    });
});

server.listen(PORT, () => console.log("Happy Colours PRO is Live!"));
