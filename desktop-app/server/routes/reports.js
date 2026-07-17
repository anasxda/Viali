const express = require('express');
const db = require('../db');
const { requireLogin, requireAccess } = require('../middleware/auth');
const {
    itemStockStatusRows,
    lowStockAlertRows,
    batchExpiryStatusRows,
    movementHistoryRows,
} = require('../lib/queries');

const router = express.Router();
router.use(requireAccess('Reports'));

router.get('/current-inventory-balance', requireLogin, (req, res) => {
    res.json(itemStockStatusRows());
});

router.get('/low-stock', requireLogin, (req, res) => {
    res.json(lowStockAlertRows());
});

router.get('/expiring-batches', requireLogin, (req, res) => {
    res.json(batchExpiryStatusRows().filter((b) => b.ExpiryStatus === 'Expiring Soon'));
});

router.get('/expired-batches', requireLogin, (req, res) => {
    res.json(batchExpiryStatusRows().filter((b) => b.ExpiryStatus === 'Expired'));
});

router.get('/movement-history', requireLogin, (req, res) => {
    res.json(movementHistoryRows());
});

router.get('/stock-in-transactions', requireLogin, (req, res) => {
    res.json(movementHistoryRows({ movementTypeName: 'Receipt' }));
});

router.get('/stock-out-transactions', requireLogin, (req, res) => {
    res.json(movementHistoryRows({ movementTypeName: 'Issue' }));
});

router.get('/supplier-inventory', requireLogin, (req, res) => {
    const rows = db
        .prepare(
            `SELECT s.SupplierID, s.SupplierName, im.ItemID, im.ItemDescription, im.LegacyItemCode,
                    sb.BatchID, sb.BatchNumber, sb.QuantityRemaining, sb.ExpiryDate, sb.ReceivedDate
             FROM tblStockBatch sb
             JOIN tblSupplier s ON s.SupplierID = sb.SupplierID
             JOIN tblItemMaster im ON im.ItemID = sb.ItemID
             WHERE sb.IsActive = 1
             ORDER BY s.SupplierName, im.ItemDescription`
        )
        .all();
    res.json(rows);
});

// Item Transaction History - item-picker driven.
router.get('/item-transaction-history', requireLogin, (req, res) => {
    const { itemId } = req.query;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    res.json(movementHistoryRows({ itemId }));
});

module.exports = router;
