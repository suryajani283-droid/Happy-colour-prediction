const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- SETTINGS ---
const PORT = process.env.PORT || 3000;
let timeLeft = 30;
let gameHistory = [];
let players = {};

// --- THE HTML PAGE (Combined here to fix "Cannot GET") ---
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Color Trade Mobile</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: sans-serif; text-align: center; background: #121212; color: white; }
        .timer { font-size: 50px; color: #f1c40f; margin: 20px; }
        .wallet { font-size: 20px; background: #333; padding: 10px; border-radius: 10px; display: inline-block; }
        .btn { padding: 15px 25px; margin: 5px; border: none; border-radius: 5px; color: white; font-weight: bold; width: 30%; }
        .red { background: #ff4d4d; } .green { background: #2ecc71; } .violet { background: #9b59b6; }
        .dot { height: 20px; width: 20px; border-radius: 50%; display: inline-block; margin: 2px; }
    </style>
</head>
<body>
    <h1>Color Trading</h1>
    <div class="wallet">Dummy Rupees: ₹<span id="bal">1000</span></div>
    <div class="timer" id="timer">30</div>
    <div>
        <button class="btn green" onclick="bet('Green')">Green</button>
        <button class="btn violet" onclick="bet('Violet')">Violet</button>
        <button class="btn red" onclick="bet('Red')">Red</button>
    </div>
    <p>History:</p>
    <div id="history"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        function bet(c) { socket.emit('place_bet', { choice: c, amount: 100 }); alert('Bet Placed!'); }
        socket.on('timer_update', t => document.getElementById('timer').innerText = t);
        socket.on('update_balance', b => document.getElementById('bal').innerText = b);
        socket.on('init', d => { document.getElementById('bal').innerText = d.balance; updateH(d.history); });
        socket.on('round_end', d => { updateH(d.history); alert('Result: ' + d.result.color); });
        function updateH(h) { 
            document.getElementById('history').innerHTML = h.map(x => \`<span class="dot" style="background:\${x.color.toLowerCase()}"></span>\`).join('');
        }
    </script>
</body>
</html>
`;

// --- ROUTES ---
app.get('/', (req, res) => {
    res.send(htmlContent); // This sends the HTML directly!
});

// --- GAME LOGIC ---
setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
        const num = Math.floor(Math.random() * 10);
        let color = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) color = 'Violet';
        const result = { color };
        gameHistory.unshift(result);
        if (gameHistory.length > 10) gameHistory.pop();
        
        // Simple payout logic
        Object.keys(players).forEach(id => {
            if (players[id].bet && players[id].bet === color) {
                players[id].balance += 200; 
            }
            players[id].bet = null;
        });

        io.emit('round_end', { result, history: gameHistory });
        timeLeft = 30;
    }
    io.emit('timer_update', timeLeft);
}, 1000);

io.on('connection', (socket) => {
    players[socket.id] = { balance: 1000, bet: null };
    socket.emit('init', { balance: 1000, history: gameHistory });
    socket.on('place_bet', (data) => {
        if(players[socket.id].balance >= 100) {
            players[socket.id].balance -= 100;
            players[socket.id].bet = data.choice;
            socket.emit('update_balance', players[socket.id].balance);
        }
    });
});

server.listen(PORT, () => console.log('Server Live'));
