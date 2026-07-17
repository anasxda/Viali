const express = require('express');
const db = require('../db');
const { requireAccess } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();
router.use(requireAccess('Administration'));

// ---- Users -----------------------------------------------------------
router.get('/users', (req, res) => {
    res.json(
        db
            .prepare(
                `SELECT u.UserID, u.WindowsUsername, u.FullName, u.RoleID, r.RoleName, u.Email, u.IsActive
                 FROM tblUser u JOIN tblRole r ON r.RoleID = u.RoleID
                 ORDER BY u.FullName`
            )
            .all()
    );
});

router.post('/users', (req, res) => {
    const { windowsUsername, fullName, roleId, email } = req.body;
    if (!fullName || !roleId) return res.status(400).json({ error: 'FullName and RoleID are required.' });
    const result = db
        .prepare(
            `INSERT INTO tblUser (WindowsUsername, FullName, RoleID, Email, IsActive) VALUES (?, ?, ?, ?, 1)`
        )
        .run(windowsUsername || null, fullName, roleId, email || null);
    const newId = Number(result.lastInsertRowid);
    logAudit({ tableName: 'tblUser', recordId: newId, actionType: 'Insert', changedByUserId: req.session.user.userId });
    res.json(db.prepare('SELECT * FROM tblUser WHERE UserID = ?').get(newId));
});

router.put('/users/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM tblUser WHERE UserID = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { windowsUsername, fullName, roleId, email, isActive } = req.body;
    db.prepare(
        `UPDATE tblUser SET WindowsUsername = ?, FullName = ?, RoleID = ?, Email = ?, IsActive = ? WHERE UserID = ?`
    ).run(
        windowsUsername ?? existing.WindowsUsername,
        fullName ?? existing.FullName,
        roleId ?? existing.RoleID,
        email ?? existing.Email,
        isActive === undefined ? existing.IsActive : (isActive ? 1 : 0),
        req.params.id
    );
    logAudit({
        tableName: 'tblUser',
        recordId: Number(req.params.id),
        actionType: 'Update',
        fieldName: 'IsActive',
        oldValue: existing.IsActive,
        newValue: isActive === undefined ? existing.IsActive : (isActive ? 1 : 0),
        changedByUserId: req.session.user.userId,
    });
    res.json(db.prepare('SELECT * FROM tblUser WHERE UserID = ?').get(req.params.id));
});

router.delete('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    if (id === req.session.user.userId) {
        return res.status(400).json({ error: 'You cannot delete the account you are currently signed in as.' });
    }
    const existing = db.prepare('SELECT * FROM tblUser WHERE UserID = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    try {
        db.prepare('DELETE FROM tblUser WHERE UserID = ?').run(id);
        logAudit({ tableName: 'tblUser', recordId: id, actionType: 'Delete', changedByUserId: req.session.user.userId });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({
            error: 'Cannot delete: this user has stock, movement, or audit history on file. Deactivate them instead.',
        });
    }
});

// ---- Audit log ---------------------------------------------------------
router.get('/audit-log', (req, res) => {
    res.json(
        db
            .prepare(
                `SELECT al.*, COALESCE(u.FullName, 'System') AS ChangedByName
                 FROM tblAuditLog al LEFT JOIN tblUser u ON u.UserID = al.ChangedByUserID
                 ORDER BY al.ChangedDate DESC`
            )
            .all()
    );
});

// ---- Reference data ------------------------------------------------------
const REFERENCE_TABLES = {
    roles: { table: 'tblRole', idCol: 'RoleID', cols: ['RoleName'] },
    categories: { table: 'tblCategory', idCol: 'CategoryID', cols: ['CategoryName'] },
    units: { table: 'tblUnit', idCol: 'UnitID', cols: ['UnitName'] },
    locations: { table: 'tblLocation', idCol: 'LocationID', cols: ['LocationCode'] },
    'hazard-classes': { table: 'tblHazardClass', idCol: 'HazardID', cols: ['HazardName', 'HazardDescription'] },
    manufacturers: { table: 'tblManufacturer', idCol: 'ManufacturerID', cols: ['ManufacturerName'] },
    'movement-types': { table: 'tblMovementType', idCol: 'MovementTypeID', cols: ['MovementTypeName', 'StockEffect'] },
};

router.get('/reference/:resource', (req, res) => {
    const def = REFERENCE_TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Unknown reference resource' });
    res.json(db.prepare(`SELECT * FROM ${def.table} ORDER BY ${def.idCol}`).all());
});

router.post('/reference/:resource', (req, res) => {
    const def = REFERENCE_TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Unknown reference resource' });
    const values = def.cols.map((c) => req.body[c] ?? null);
    const placeholders = def.cols.map(() => '?').join(', ');
    const result = db
        .prepare(`INSERT INTO ${def.table} (${def.cols.join(', ')}) VALUES (${placeholders})`)
        .run(...values);
    const newId = Number(result.lastInsertRowid);
    logAudit({ tableName: def.table, recordId: newId, actionType: 'Insert', changedByUserId: req.session.user.userId });
    res.json(db.prepare(`SELECT * FROM ${def.table} WHERE ${def.idCol} = ?`).get(newId));
});

router.put('/reference/:resource/:id', (req, res) => {
    const def = REFERENCE_TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Unknown reference resource' });
    const setClause = def.cols.map((c) => `${c} = ?`).join(', ');
    const values = def.cols.map((c) => req.body[c] ?? null);
    db.prepare(`UPDATE ${def.table} SET ${setClause} WHERE ${def.idCol} = ?`).run(...values, req.params.id);
    logAudit({ tableName: def.table, recordId: Number(req.params.id), actionType: 'Update', changedByUserId: req.session.user.userId });
    res.json(db.prepare(`SELECT * FROM ${def.table} WHERE ${def.idCol} = ?`).get(req.params.id));
});

router.delete('/reference/:resource/:id', (req, res) => {
    const def = REFERENCE_TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Unknown reference resource' });
    try {
        db.prepare(`DELETE FROM ${def.table} WHERE ${def.idCol} = ?`).run(req.params.id);
        logAudit({ tableName: def.table, recordId: Number(req.params.id), actionType: 'Delete', changedByUserId: req.session.user.userId });
        res.json({ ok: true });
    } catch (err) {
        res.status(400).json({ error: 'Cannot delete: this value is still referenced by existing records.' });
    }
});

module.exports = router;
