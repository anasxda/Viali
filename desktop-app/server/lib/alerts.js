const db = require('../db');
const { lowStockAlertRows, expiryAlertRows } = require('./queries');

// Mirrors modAlerts.RefreshAlerts: keeps tblAlertLog in sync with the live
// low-stock / expiry conditions. Safe to call as often as needed - never
// creates a duplicate open alert, and auto-resolves alerts whose condition cleared.
function refreshAlerts() {
    syncLowStockAlerts();
    syncExpiryAlerts();
}

function syncLowStockAlerts() {
    const lowStock = lowStockAlertRows();
    const openCountStmt = db.prepare(
        `SELECT COUNT(*) AS n FROM tblAlertLog WHERE AlertType = 'Low Stock' AND ItemID = ? AND IsResolved = 0`
    );
    const insertStmt = db.prepare(`
        INSERT INTO tblAlertLog (AlertType, ItemID, AlertDate, IsResolved, Remarks)
        VALUES ('Low Stock', ?, ?, 0, 'Auto-generated: stock at or below reorder point.')
    `);
    for (const item of lowStock) {
        const { n } = openCountStmt.get(item.ItemID);
        if (n === 0) insertStmt.run(item.ItemID, new Date().toISOString());
    }

    const lowStockItemIds = new Set(lowStock.map((i) => i.ItemID));
    const openAlerts = db
        .prepare(`SELECT AlertID, ItemID, Remarks FROM tblAlertLog WHERE AlertType = 'Low Stock' AND IsResolved = 0`)
        .all();
    const resolveStmt = db.prepare(`UPDATE tblAlertLog SET IsResolved = 1, Remarks = ? WHERE AlertID = ?`);
    for (const alert of openAlerts) {
        if (!lowStockItemIds.has(alert.ItemID)) {
            resolveStmt.run((alert.Remarks || '') + ' | Auto-resolved: stock replenished.', alert.AlertID);
        }
    }
}

function syncExpiryAlerts() {
    const expiring = expiryAlertRows();
    const openCountStmt = db.prepare(
        `SELECT COUNT(*) AS n FROM tblAlertLog WHERE AlertType = ? AND BatchID = ? AND IsResolved = 0`
    );
    const insertStmt = db.prepare(`
        INSERT INTO tblAlertLog (AlertType, ItemID, BatchID, AlertDate, IsResolved, Remarks)
        VALUES (?, ?, ?, ?, 0, ?)
    `);
    for (const batch of expiring) {
        const { n } = openCountStmt.get(batch.ExpiryStatus, batch.BatchID);
        if (n === 0) {
            insertStmt.run(
                batch.ExpiryStatus,
                batch.ItemID,
                batch.BatchID,
                new Date().toISOString(),
                `Auto-generated: batch ${batch.ExpiryStatus}.`
            );
        }
    }

    const stillApplies = new Set(expiring.map((b) => `${b.ExpiryStatus}:${b.BatchID}`));
    const openAlerts = db
        .prepare(
            `SELECT AlertID, BatchID, AlertType, Remarks FROM tblAlertLog
             WHERE (AlertType = 'Expired' OR AlertType = 'Expiring Soon') AND IsResolved = 0`
        )
        .all();
    const resolveStmt = db.prepare(`UPDATE tblAlertLog SET IsResolved = 1, Remarks = ? WHERE AlertID = ?`);
    for (const alert of openAlerts) {
        if (!stillApplies.has(`${alert.AlertType}:${alert.BatchID}`)) {
            resolveStmt.run((alert.Remarks || '') + ' | Auto-resolved: no longer applies.', alert.AlertID);
        }
    }
}

module.exports = { refreshAlerts };
