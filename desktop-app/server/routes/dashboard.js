const express = require('express');
const db = require('../db');
const { requireAccess } = require('../middleware/auth');
const { itemStockStatusRows, movementHistoryRows } = require('../lib/queries');
const { refreshAlerts } = require('../lib/alerts');

const router = express.Router();

router.get('/', requireAccess('Dashboard'), (req, res) => {
    refreshAlerts();

    const items = itemStockStatusRows();
    const totalItems = items.filter((i) => i.IsActive).length;
    const lowStockCount = items.filter((i) => i.IsActive && (i.StockStatus === 'Low Stock' || i.StockStatus === 'Reorder')).length;
    const outOfStockCount = items.filter((i) => i.IsActive && i.StockStatus === 'Out of Stock').length;

    const openAlerts = db
        .prepare(
            `SELECT al.AlertID, al.AlertType, al.ItemID, im.ItemDescription, al.AlertDate, al.Remarks
             FROM tblAlertLog al LEFT JOIN tblItemMaster im ON im.ItemID = al.ItemID
             WHERE al.IsResolved = 0
             ORDER BY al.AlertDate DESC`
        )
        .all();

    const recentMovements = movementHistoryRows().slice(0, 10);

    res.json({
        totalItems,
        lowStockCount,
        outOfStockCount,
        openAlertsCount: openAlerts.length,
        openAlerts: openAlerts.slice(0, 8),
        recentMovements,
    });
});

module.exports = router;
