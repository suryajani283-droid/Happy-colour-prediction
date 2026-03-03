const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- DATABASE (Temporary - Resets on Restart) ---
let users = {}; // Stores { mobile: { password, balance, history } }
let gameHistory = [];
let timeLeft = 30;
let currentResult = { number: 5, color: 'Violet' };

// --- HTML CONTENT ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Win Go Pro</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #1a1a1a; color: white; text-align: center; margin: 0; }
        .auth-container { padding: 50px 20px; }
        .game-container { display: none; }
        input { width: 80%; padding: 12px; margin: 10px; border-radius: 5px; border: none; }
        .btn { padding: 12px 20px; border: none; border-radius: 5px; color: white; font-weight: bold; cursor: pointer; }
        .btn-auth { background: #f1c40f; color: black; width: 85%; }
        .timer { font-size: 40px; color: #f1c40f; margin: 10px; }
        .wallet-box { background: #333; padding: 15px; margin: 10px; border-radius: 10px; }
        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; padding: 10px; }
        .num-btn { background: #444; color: white; padding: 15px 0; border-radius: 5px; border: 1px solid #555; }
        .color-btns { display: flex; justify-content: space-around; margin: 15px 0; }
        .green { background: #2ecc71; } .red { background: #e74c3c; } .violet { background: #9b59b6; }
        .dot { height: 15px; width: 15px; border-radius: 50%; display: inline-block; margin: 2px; }
    </style>
</head>
<body>

    <div id="authPage" class="auth-container">
        <h2>Win Go Login</h2>
        <input type="text" id="mobile" placeholder="Mobile Number">
        <input type="password" id="pass" placeholder="Password">
        <button class="btn btn-auth" onclick="handleAuth()">Login / Sign Up</button>
        <p style="font-size: 12px; color: #888;">New users get ₹1000 Bonus!</p>
    </div>

    <div id="gamePage" class="game-container">
        <div class="wallet-box">
            <span>Balance: ₹<span id="balDisplay">0</span></span>
        </div>
        
        <div class="timer" id="timer">30</div>

        <div class="color-btns">
            <button class="btn green" onclick="placeBet('Green')">Green</button>
            <button class="btn violet" onclick="placeBet('Violet')">Violet</button>
            <button class="btn red" onclick="placeBet('Red')">Red</button>
        </div>

        <div class="grid" id="numberGrid">
            </div>

        <h3>Recent Results</h3>
        <div id="history"></div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let myMobile = "";

        // Generate Number Buttons
        const grid = document.getElementById('numberGrid');
        for(let i=0; i<=9; i++) {
            grid.innerHTML += \`<button class="num-btn" onclick="placeBet('\${i}')">\${i}</button>\`;
        }

        function handleAuth() {
            const m = document.getElementById('mobile').value;
            const p = document.getElementById('pass').value;
            if(m.length < 10) return alert("Enter valid mobile");
            myMobile = m;
            socket.emit('auth', { mobile: m, pass: p });
        }

        socket.on('auth_success', (data) => {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('gamePage').style.display = 'block';
            document.getElementById('balDisplay').innerText = data.balance;
        });

        function placeBet(type) {
            const amount = 100; // Default bet
            socket.emit('bet', { mobile: myMobile, type: type, amount: amount });
            alert("Bet placed on " + type);
        }

        socket.on('timer', t => document.getElementById('timer').innerText = t);
        socket.on('update_bal', b => document.getElementById('balDisplay').innerText = b);
        
        socket.on('round_end', data => {
            alert("Result: " + data.result.number + " (" + data.result.color + ")");
            updateHistory(data.history);
        });

        function updateHistory(h) {
            document.getElementById('history').innerHTML = h.map(x => \`
                <span class="dot" style="background:\${x.color.toLowerCase()}"></span>
            \`).join('');
        }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(htmlContent));

// --- LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        // Generate Winner
        const num = Math.floor(Math.random() * 10);
        let color = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) color = 'Violet';
        
        currentResult = { number: num, color: color };
        gameHistory.unshift(currentResult);
        if(gameHistory.length > 20) gameHistory.pop();

        // Process Wins
        Object.keys(users).forEach(mob => {
            const user = users[mob];
            if (user.currentBet) {
                const bet = user.currentBet;
                // Color win (2x)
                if (bet.type === color) user.balance += bet.amount * 2;
                // Number win (9x)
                else if (bet.type == num) user.balance += bet.amount * 9;
                
                user.currentBet = null;
                io.emit('update_bal_all', { mobile: mob, balance: user.balance });
            }
        });

        io.emit('round_end', { result: currentResult, history: gameHistory });
        timeLeft = 30;
    }
    io.emit('timer', timeLeft);
}, 1000);

io.on('connection', (socket) => {
    socket.on('auth', (data) => {
        if (!users[data.mobile]) {
            // Register New User with 1000 Bonus
            users[data.mobile] = { password: data.pass, balance: 1000, currentBet: null };
        }
        socket.emit('auth_success', { balance: users[data.mobile].balance });
    });

    socket.on('bet', (data) => {
        const u = users[data.mobile];
        if (u && u.balance >= data.amount && timeLeft > 5) {
            u.balance -= data.amount;
            u.currentBet = data;
            socket.emit('update_bal', u.balance);
        }
    });
});

server.listen(PORT, () => console.log("Win Go Live"));
