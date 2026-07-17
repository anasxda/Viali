const express = require('express');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

function getSetting(key) {
    const row = db.prepare('SELECT SettingValue FROM tblAppSettings WHERE SettingKey = ?').get(key);
    return row ? row.SettingValue : null;
}

function setSetting(key, value) {
    db.prepare(
        `INSERT INTO tblAppSettings (SettingKey, SettingValue) VALUES (?, ?)
         ON CONFLICT(SettingKey) DO UPDATE SET SettingValue = excluded.SettingValue`
    ).run(key, value);
}

function monthlyDueDate(lastCheckDate) {
    const now = new Date();
    const reference = lastCheckDate ? new Date(lastCheckDate) : now;
    const due = new Date(reference.getFullYear(), reference.getMonth() + (lastCheckDate ? 1 : 0), 15, 0, 0, 0, 0);
    return due.toISOString();
}

function parseSupervisorEmails(value) {
    return String(value || '').split(/[;,\s]+/).map((email) => email.trim()).filter(Boolean);
}

// Inventory checks follow a fixed calendar cadence: the 15th of every month.
// With no previous check, the first due date is the 15th of the current month.
function inventoryCheckStatus() {
    const supervisorEmail = getSetting('SupervisorEmail') || '';
    const supervisorEmails = parseSupervisorEmails(supervisorEmail);
    const lastCheckDate = getSetting('LastInventoryCheckDate');
    const nextDueDate = monthlyDueDate(lastCheckDate);
    const isDue = new Date() >= new Date(nextDueDate);
    return { supervisorEmail: supervisorEmails.join(', '), supervisorEmails, lastCheckDate, nextDueDate, isDue };
}

router.get('/inventory-check', requireLogin, (req, res) => {
    res.json(inventoryCheckStatus());
});

router.put('/supervisor-email', requireLogin, (req, res) => {
    if (!req.session.isAdminMode) return res.status(403).json({ error: 'Access denied' });
    const { email } = req.body;
    const emails = parseSupervisorEmails(email);
    const invalidEmail = emails.find((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    if (invalidEmail) return res.status(400).json({ error: `Invalid email address: ${invalidEmail}` });
    const previous = getSetting('SupervisorEmail');
    const normalized = emails.join(', ');
    setSetting('SupervisorEmail', normalized);
    logAudit({
        tableName: 'tblAppSettings',
        recordId: null,
        actionType: 'Update',
        fieldName: 'SupervisorEmail',
        oldValue: previous,
        newValue: normalized,
        changedByUserId: req.session.user.userId,
    });
    res.json(inventoryCheckStatus());
});

router.post('/inventory-check/mark-done', requireLogin, (req, res) => {
    if (!req.session.isAdminMode) return res.status(403).json({ error: 'Access denied' });
    const now = new Date().toISOString();
    const previous = getSetting('LastInventoryCheckDate');
    setSetting('LastInventoryCheckDate', now);
    logAudit({
        tableName: 'tblAppSettings',
        recordId: null,
        actionType: 'Update',
        fieldName: 'LastInventoryCheckDate',
        oldValue: previous,
        newValue: now,
        changedByUserId: req.session.user.userId,
    });
    res.json(inventoryCheckStatus());
});

module.exports = router;
