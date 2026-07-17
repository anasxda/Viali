const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 4000;

// Keep the standard hazard catalogue complete without changing any custom
// descriptions maintained by the company.
require('./seed-hazard-descriptions');

// Each install gets its own random session-signing secret, generated once and
// persisted alongside the database - never a value baked into shipped source.
const SECRET_PATH = path.join(__dirname, '..', 'data', '.session-secret');
fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true });
let sessionSecret;
if (fs.existsSync(SECRET_PATH)) {
    sessionSecret = fs.readFileSync(SECRET_PATH, 'utf8').trim();
} else {
    sessionSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_PATH, sessionSecret, { mode: 0o600 });
}

app.use(express.json());
app.use(
    session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 12 },
    })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));

// Serve the built React client in production.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`VIALI Home server running at ${url}`);

    // Open the default browser without shelling out through cmd.exe (some
    // corporate policies disable cmd.exe entirely, which would silently break
    // the old "start <url>" approach since that's a cmd.exe built-in).
    // explorer.exe resolves and launches the default browser directly.
    if (process.platform === 'win32' && !process.env.NO_BROWSER) {
        spawn('explorer.exe', [url], { detached: true, stdio: 'ignore' }).unref();
    }
});
