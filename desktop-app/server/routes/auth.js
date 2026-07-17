const express = require('express');
const os = require('node:os');
const db = require('../db');

const router = express.Router();

// Shared password that unlocks Administrator Mode for a browser session.
// Anyone who knows it can act as an administrator without being an
// Administrator on file - this deliberately replaces the old per-user role
// gate for Stock In/Out, Suppliers and Administration.
const ADMIN_MODE_PASSWORD = '123123';

function roleName(roleId) {
    const row = db.prepare('SELECT RoleName FROM tblRole WHERE RoleID = ?').get(roleId);
    return row ? row.RoleName : '';
}

function sessionUserFrom(user, isAdminMode) {
    return {
        userId: user.UserID,
        fullName: user.FullName,
        windowsUsername: user.WindowsUsername,
        roleId: user.RoleID,
        roleName: roleName(user.RoleID),
        isAdmin: !!isAdminMode,
    };
}

function normalUserRoleId() {
    const existing = db.prepare(`SELECT RoleID FROM tblRole WHERE RoleName = 'Normal User'`).get();
    if (existing) return existing.RoleID;
    const result = db.prepare(`INSERT INTO tblRole (RoleName) VALUES ('Normal User')`).run();
    return Number(result.lastInsertRowid);
}

// The Windows account of whoever is running this PC's local server process -
// each install runs under the signed-in user, so this identifies them without
// needing a password. Formatted to match the DOMAIN\username values already
// on file (e.g. "SAMNET\thubyaaa").
function currentWindowsUsername() {
    let username;
    try {
        username = os.userInfo().username;
    } catch {
        return null;
    }
    if (!username) return null;
    const domain = process.env.USERDOMAIN;
    return domain ? `${domain}\\${username}` : username;
}

router.get('/users', (req, res) => {
    const users = db
        .prepare(
            `SELECT u.UserID, u.FullName, u.WindowsUsername, r.RoleName
             FROM tblUser u JOIN tblRole r ON r.RoleID = u.RoleID
             WHERE u.IsActive = 1
             ORDER BY u.FullName`
        )
        .all();
    res.json(users);
});

router.post('/login', (req, res) => {
    const { userId } = req.body;
    const user = db.prepare(`SELECT * FROM tblUser WHERE UserID = ?`).get(userId);

    if (!user || !user.IsActive) {
        return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.session.isAdminMode = false;
    req.session.user = sessionUserFrom(user, false);
    res.json(req.session.user);
});

// Identifies the person by their Windows login and signs them in
// automatically as a normal user - auto-provisioning a new account the first
// time a given Windows login opens the app on this PC.
router.post('/whoami-login', (req, res) => {
    const windowsUsername = currentWindowsUsername();
    if (!windowsUsername) {
        return res.status(404).json({ error: 'Could not determine the Windows username on this PC.' });
    }

    let user = db.prepare(`SELECT * FROM tblUser WHERE LOWER(WindowsUsername) = LOWER(?)`).get(windowsUsername);

    if (!user) {
        const displayName = windowsUsername.includes('\\') ? windowsUsername.split('\\').pop() : windowsUsername;
        const result = db
            .prepare(`INSERT INTO tblUser (WindowsUsername, FullName, RoleID, IsActive) VALUES (?, ?, ?, 1)`)
            .run(windowsUsername, displayName, normalUserRoleId());
        user = db.prepare('SELECT * FROM tblUser WHERE UserID = ?').get(Number(result.lastInsertRowid));
    } else if (!user.IsActive) {
        return res.status(403).json({ error: 'This account has been deactivated. Ask an Administrator to reactivate it.' });
    }

    req.session.isAdminMode = false;
    req.session.user = sessionUserFrom(user, false);
    res.json(req.session.user);
});

router.post('/admin-mode', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not signed in' });
    const { password } = req.body;
    if (password !== ADMIN_MODE_PASSWORD) {
        return res.status(403).json({ error: 'Incorrect password.' });
    }
    req.session.isAdminMode = true;
    req.session.user = { ...req.session.user, isAdmin: true };
    res.json(req.session.user);
});

router.post('/exit-admin-mode', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not signed in' });
    req.session.isAdminMode = false;
    req.session.user = { ...req.session.user, isAdmin: false };
    res.json(req.session.user);
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
    // A missing session is an expected first-visit state, not an authorization
    // failure. Returning null lets the client try Windows auto-identification
    // without producing a misleading browser-console error.
    res.json(req.session.user || null);
});

module.exports = router;
