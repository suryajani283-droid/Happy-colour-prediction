const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- APP CONFIG ---
const PORT = process.env.PORT || 3000;
app.use(express.static('public')); // Serves our frontend files

// --- GAME STATE ---
let timeLeft = 30; 
let gameHistory = [];
let players = {}; 

// --- CORE GAME LOOP ---
setInterval(() => {
    timeLeft--;
    
    if (timeLeft <= 0) {
        // 1. Generate Winning Number (0-9)
        const num = Math.floor(Math.random() * 10);
        let color = (num % 2 === 0) ? 'Red' : 'Green';
        if (num === 0 || num === 5) color = 'Violet';

        const result = { number: num, color: color, id: Date.now() };
        gameHistory.unshift(result);
        if (gameHistory.length > 15) gameHistory.pop();

        // 2. Logic: Check Bets & Update Dummy Balances
        Object.keys(players).forEach(socketId => {
            const p = players[socketId];
            if (p.currentBet) {
                if (p.currentBet.choice === color) {
                    // Win Logic (2x for Red/Green)
                    const profit = p.currentBet.amount * 2;
                    p.balance += profit;
                    io.to(socketId).emit('bet_result', { status: 'win', amount: profit });
                } else {
                    io.to(socketId).emit('bet_result', { status: 'loss' });
                }
                p.currentBet = null; 
            }
        });

        io.emit('round_end', { result, history: gameHistory });
        timeLeft = 30; // Reset Timer
    }
    io.emit('timer_update', timeLeft);
}, 1000);

// --- SOCKET EVENTS ---
io.on('connection', (socket) => {
    // Assign 1000 Dummy Rupees to new players
    players[socket.id] = { balance: 1000, currentBet: null };
    
    socket.emit('init_data', { 
        balance: players[socket.id].balance, 
        history: gameHistory 
    });

    socket.on('place_bet', (data) => {
        const p = players[socket.id];
        if (p.balance >= data.amount && !p.currentBet && timeLeft > 5) {
            p.balance -= data.amount;
            p.currentBet = { amount: data.amount, choice: data.choice };
            socket.emit('update_balance', p.balance);
        } else {
            socket.emit('error_msg', "Invalid bet or time out!");
        }
    });

    socket.on('disconnect', () => delete players[socket.id]);
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

