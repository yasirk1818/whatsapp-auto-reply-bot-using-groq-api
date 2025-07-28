// --- Libraries Import Karna ---
const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const qrcode = require('qrcode');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

// --- Basic Setup ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

// --- Groq API Setup ---
// APNI GROQ API KEY YAHAN DAALEIN
const groq = new Groq({
    apiKey: "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"
});

// --- MongoDB Connection ---
mongoose.connect('mongodb://127.0.0.1:27017/whatsapp_multi_user_bot')
    .then(() => console.log('MongoDB se connect hogaya!'))
    .catch(err => console.error('MongoDB se connect nahi ho paya:', err));

// --- Schemas ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    status: { type: String, default: 'DISCONNECTED' },
    isBotEnabled: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Session = mongoose.model('Session', sessionSchema);

// --- Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const sessionMiddleware = session({
    secret: 'apni-marzi-ka-koi-bhi-secret-text-yahan-likh-do',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
});
app.use(sessionMiddleware);
io.use((socket, next) => { sessionMiddleware(socket.request, {}, next); });

// --- Global Variables ---
const clients = {};
const conversationHistories = {};

// --- Helper Function (Client Initialize Karna) ---
const createAndInitializeClient = async (sessionId, name, userId) => {
    if (clients[sessionId]) { return; }
    console.log(`Session banayi ja rahi hai: ${sessionId} (${name}) for user: ${userId}`);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: sessionId }),
        puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    const emitToUser = (event, data) => {
        for (const [id, socket] of io.of("/").sockets) {
            if (socket.request.session.userId === userId.toString()) {
                socket.emit(event, data);
            }
        }
    };

    client.on('qr', async (qr) => {
        const qrUrl = await qrcode.toDataURL(qr);
        await Session.updateOne({ sessionId }, { status: 'SCAN_QR' });
        const device = await Session.findOne({ sessionId }).lean();
        if (device) emitToUser('device_update', { ...device, qrCode: qrUrl });
    });

    client.on('ready', async () => {
        const sessionDoc = await Session.findOneAndUpdate({ sessionId }, { status: 'READY' }, { new: true });
        emitToUser('device_update', sessionDoc);
    });

    client.on('disconnected', async (reason) => {
        const sessionDoc = await Session.findOneAndUpdate({ sessionId }, { status: 'DISCONNECTED' }, { new: true });
        emitToUser('device_update', sessionDoc);
        if (clients[sessionId]) {
            try { await clients[sessionId].destroy(); } catch (e) {}
            delete clients[sessionId];
        }
    });

    // ####################################################################
    // ### MESSAGE HANDLER WITH STRICT LANGUAGE CONTROL ###
    // ####################################################################
    client.on('message', async (message) => {
        const sessionData = await Session.findOne({ sessionId });
        if (!sessionData || !sessionData.isBotEnabled || message.fromMe) return;

        const userNumber = message.from;
        
        if (!conversationHistories[userNumber]) {
            conversationHistories[userNumber] = [];
        }
        let userHistory = conversationHistories[userNumber];

        const messagesForGroq = [
            // 1. System Prompt (AI ka character aur zaban define karna)
            {
                role: "system",
                content: `
                Aapka sab se pehla aur ahem tareen usool yeh hai ke aapka har jawab HAMESHA AUR HAR HAAL MEIN sirf Roman Urdu (Roman English) mein hoga. English ya kisi aur zaban ka istemal SAKHTI SE MANA HAI.

                Aapka persona aik aam, modern dost jaisa hai jo sirf Roman Urdu mein chat karta hai. Aap cool aur casual hain, philosopher nahi.

                Aapke Doosre Usool:
                1.  **Mukhtasir Jawab:** Jawab hamesha 1 ya 2 choti lines ka hona chahiye. Lambay paragraphs mat likhein.
                2.  **Casual Andaaz:** Lecture ya zabardasti ke mashwaray na dein.
                3.  **Ehtaram:** Hamesha 'Aap' ka istemal karein.
                4.  **Hassas Mauzu:** Agar koi paison ya aisi cheez ke baray mein poochay jo aap nahi kar sakte, to aam insan ki tarah jawab dein, maslan "Yaar, is mamlay mein to main madad nahi kar sakta."
                `
            },
            // 2. Pichli Guftagu
            ...userHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.parts[0].text
            })),
            // 3. User ka naya message
            {
                role: "user",
                content: message.body
            }
        ];

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: messagesForGroq,
                model: "llama3-8b-8192",
                temperature: 0.7,
                max_tokens: 100,
            });

            const replyText = chatCompletion.choices[0]?.message?.content || "Maaf kijiye, main samajh nahi saka.";
            
            userHistory.push({ role: "user", parts: [{ text: message.body }] });
            userHistory.push({ role: "model", parts: [{ text: replyText }] });

            if (userHistory.length > 8) {
                conversationHistories[userNumber] = userHistory.slice(userHistory.length - 8);
            } else {
                conversationHistories[userNumber] = userHistory;
            }
            
            await client.sendMessage(message.from, replyText);

        } catch (error) {
            console.error(`[${sessionId}] Groq API mein masla:`, error);
            await client.sendMessage(message.from, "Maaf kijiye, guftagu mein kuch dushwari aa rahi hai.");
        }
    });

    clients[sessionId] = client;
    client.initialize().catch(async (err) => {
        const sessionDoc = await Session.findOneAndUpdate({ sessionId }, { status: 'DISCONNECTED' }, { new: true });
        emitToUser('device_update', sessionDoc);
    });
};

// --- AUTH ROUTES ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.redirect('/register?error=missing');
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) return res.redirect('/register?error=exists');
        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username: username.toLowerCase(), password: hashedPassword }).save();
        res.redirect('/login?status=registered');
    } catch (error) { res.redirect('/register?error=server'); }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: username.toLowerCase() });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.username = user.username;
            res.redirect('/');
        } else {
            res.redirect('/login?error=invalid');
        }
    } catch (error) { res.redirect('/login?error=server'); }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

function requireLogin(req, res, next) {
    if (!req.session.userId) { res.redirect('/login'); } else { next(); }
}

app.get('/', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
    const session = socket.request.session;
    if (!session.userId) { return socket.disconnect(true); }
    console.log(`User ${session.username} connected`);

    socket.on('get_initial_devices', async () => {
        const userDevices = await Session.find({ userId: session.userId });
        socket.emit('initial_devices', { devices: userDevices, username: session.username });
        userDevices.forEach(device => {
            if (device.status === 'READY' && !clients[device.sessionId]) {
                createAndInitializeClient(device.sessionId, device.name, session.userId);
            }
        });
    });

    socket.on('add_device', async ({ name }) => {
        const sessionId = `session-${Date.now()}`;
        const newSession = new Session({ sessionId, name, userId: session.userId, status: 'DISCONNECTED' });
        await newSession.save();
        socket.emit('new_device_added', newSession);
    });

    socket.on('connect_device', async ({ sessionId }) => {
        const device = await Session.findOne({ sessionId, userId: session.userId });
        if (device) {
            await Session.updateOne({ sessionId }, { status: 'LOADING' });
            socket.emit('device_update', await Session.findOne({sessionId}));
            createAndInitializeClient(device.sessionId, device.name, session.userId);
        }
    });

    socket.on('toggle_bot', async ({ sessionId, isEnabled }) => {
        const updatedSession = await Session.findOneAndUpdate(
            { sessionId, userId: session.userId }, { isBotEnabled: isEnabled }, { new: true }
        );
        if (updatedSession) socket.emit('device_update', updatedSession);
    });

    socket.on('delete_device', async ({ sessionId }) => {
        const device = await Session.findOne({ sessionId, userId: session.userId });
        if (!device) return;
        if (clients[sessionId]) {
            try { await clients[sessionId].destroy(); } catch (e) {}
            delete clients[sessionId];
        }
        await Session.deleteOne({ _id: device._id });
        const sessionPath = path.join(__dirname, '.wwebjs_auth', `session-${sessionId}`);
        if(fs.existsSync(sessionPath)) await fs.remove(sessionPath);
        socket.emit('device_deleted', { sessionId });
    });

    socket.on('disconnect', () => { console.log(`User ${session.username} disconnected.`); });
});

server.listen(PORT, () => console.log(`Server http://localhost:${PORT} par chal raha hai`));
