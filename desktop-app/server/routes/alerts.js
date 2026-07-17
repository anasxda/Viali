const express = require('express');
const db = require('../db');
const { requireAccess } = require('../middleware/auth');
const { refreshAlerts } = require('../lib/alerts');
const { logAudit } = require('../lib/audit');
const { getItemStatusById, getNotifyRecipients } = require('../lib/queries');

const router = express.Router();

router.get('/', requireAccess('Alerts'), (req, res) => {
    refreshAlerts();
    const alerts = db
        .prepare(
            `SELECT al.AlertID, al.ItemID, al.AlertType, im.ItemDescription, sb.BatchNumber, al.AlertDate,
                    CASE WHEN al.IsResolved THEN 'Resolved' ELSE 'Open' END AS StatusText,
                    al.Remarks, al.IsResolved
             FROM tblAlertLog al
             LEFT JOIN tblItemMaster im ON im.ItemID = al.ItemID
             LEFT JOIN tblStockBatch sb ON sb.BatchID = al.BatchID
             ORDER BY al.AlertDate DESC`
        )
        .all();

    // Low Stock rows also carry what a notification email needs, so the
    // Alerts screen can offer a one-click "Notify by Email" action.
    const enriched = alerts.map((a) => {
        if (a.AlertType !== 'Low Stock' || !a.ItemID) return a;
        const status = getItemStatusById(a.ItemID);
        return {
            ...a,
            totalAvailable: status ? status.TotalAvailable : null,
            reorderPoint: status ? status.ReorderPoint : null,
            minStockLevel: status ? status.MinStockLevel : null,
            notifyRecipients: getNotifyRecipients(a.ItemID),
        };
    });
    res.json(enriched);
});

// Acknowledge is a write action - restricted the same as Stock In/Out/Suppliers (Administrator Mode).
router.post('/:id/resolve', requireAccess('Alerts'), (req, res) => {
    const user = req.session.user;
    if (!req.session.isAdminMode) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const alert = db.prepare('SELECT * FROM tblAlertLog WHERE AlertID = ?').get(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const note = req.body.note || '';
    let remarks = (alert.Remarks || '') + ` | Acknowledged by ${user.fullName} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    if (note) remarks += ' - ' + note;

    db.prepare('UPDATE tblAlertLog SET IsResolved = 1, Remarks = ? WHERE AlertID = ?').run(remarks, alert.AlertID);

    logAudit({
        tableName: 'tblAlertLog',
        recordId: alert.AlertID,
        actionType: 'Acknowledge',
        fieldName: 'IsResolved',
        oldValue: false,
        newValue: true,
        changedByUserId: user.userId,
    });

    res.json({ ok: true });
});

module.exports = router;
