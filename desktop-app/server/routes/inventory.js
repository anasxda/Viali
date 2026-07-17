const express = require('express');
const db = require('../db');
const { requireLogin, requireAccess } = require('../middleware/auth');
const { itemStockStatusRows } = require('../lib/queries');

const router = express.Router();

router.get('/', requireLogin, (req, res) => {
    res.json(itemStockStatusRows());
});

router.get('/:id', requireLogin, (req, res) => {
    const item = itemStockStatusRows().find((i) => i.ItemID === Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const batches = db
        .prepare(
            `SELECT sb.*, s.SupplierName, l.LocationCode
             FROM tblStockBatch sb
             LEFT JOIN tblSupplier s ON s.SupplierID = sb.SupplierID
             LEFT JOIN tblLocation l ON l.LocationID = sb.LocationID
             WHERE sb.ItemID = ?
             ORDER BY sb.ReceivedDate DESC`
        )
        .all(item.ItemID);

    res.json({ ...item, batches });
});

router.put('/:id/barcode', requireAccess('Administration'), (req, res) => {
    const itemId = Number(req.params.id);
    const barcode = String(req.body.barcode || '').trim() || null;
    if (!db.prepare('SELECT ItemID FROM tblItemMaster WHERE ItemID = ?').get(itemId)) return res.status(404).json({ error: 'Item not found' });
    if (barcode && db.prepare('SELECT ItemID FROM tblItemMaster WHERE BarcodeValue = ? AND ItemID <> ?').get(barcode, itemId)) return res.status(409).json({ error: 'This barcode is already assigned to another item.' });
    db.prepare('UPDATE tblItemMaster SET BarcodeValue = ?, DateModified = ? WHERE ItemID = ?').run(barcode, new Date().toISOString(), itemId);
    res.json({ ItemID: itemId, BarcodeValue: barcode });
});

module.exports = router;
