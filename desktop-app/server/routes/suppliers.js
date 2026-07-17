const express = require('express');
const db = require('../db');
const { requireAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAccess('Suppliers'), (req, res) => {
    const suppliers = db
        .prepare(
            `SELECT SupplierID, SupplierName, ContactPerson, Email, Phone,
                    CASE WHEN IsActive THEN 'Active' ELSE 'Inactive' END AS StatusText, IsActive
             FROM tblSupplier
             ORDER BY SupplierName`
        )
        .all();
    res.json(suppliers);
});

router.get('/:id', requireAccess('Suppliers'), (req, res) => {
    const supplier = db.prepare('SELECT * FROM tblSupplier WHERE SupplierID = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const items = db
        .prepare(
            `SELECT DISTINCT im.ItemID, im.ItemDescription, im.LegacyItemCode
             FROM tblStockBatch sb JOIN tblItemMaster im ON im.ItemID = sb.ItemID
             WHERE sb.SupplierID = ?
             ORDER BY im.ItemDescription`
        )
        .all(supplier.SupplierID);

    res.json({ ...supplier, items });
});

module.exports = router;
