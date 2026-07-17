const express = require('express');
const db = require('../db');
const { requireAccess } = require('../middleware/auth');
const { logAudit } = require('../lib/audit');
const { getItemStatusById, getNotifyRecipients } = require('../lib/queries');

const CONCERNING_STATUSES = new Set(['Low Stock', 'Reorder', 'Out of Stock']);

const router = express.Router();

function getMovementTypeId(name) {
    const row = db.prepare('SELECT MovementTypeID FROM tblMovementType WHERE MovementTypeName = ?').get(name);
    return row ? row.MovementTypeID : 0;
}

// Mirrors modStock.PostStockIn: creates a new batch and its receipt movement together.
router.post('/in', requireAccess('StockIn'), (req, res) => {
    const { itemId, supplierId, locationId, hazardId, batchNumber, certificateNumber, receivedDate, expiryDate, quantity, remarks } = req.body;
    const qty = Number(quantity);

    if (!itemId) return res.status(400).json({ error: 'Item is required.' });
    if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantity received must be greater than zero.' });
    }

    const movementTypeId = getMovementTypeId('Receipt');
    if (!movementTypeId) {
        return res.status(500).json({ error: "Movement type 'Receipt' is not configured." });
    }

    const now = new Date().toISOString();
    const userId = req.session.user.userId;

    db.exec('BEGIN');
    try {
        const batchResult = db
            .prepare(
                `INSERT INTO tblStockBatch
                    (ItemID, BatchNumber, CertificateNumber, ExpiryDate, QuantityReceived, QuantityRemaining,
                     ReceivedDate, SupplierID, ReceivedByUserID, Remarks, IsActive, LocationID)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
            )
            .run(
                itemId,
                batchNumber || null,
                certificateNumber || null,
                expiryDate || null,
                qty,
                qty,
                receivedDate || now,
                supplierId || null,
                userId,
                remarks || null,
                locationId || null
            );
        const newBatchId = Number(batchResult.lastInsertRowid);

        db.prepare(
            `INSERT INTO tblStockMovement (BatchID, MovementTypeID, Quantity, MovementDate, PerformedByUserID, Purpose, Remarks)
             VALUES (?, ?, ?, ?, ?, 'Stock In - Batch Receiving', ?)`
        ).run(newBatchId, movementTypeId, qty, now, userId, remarks || null);

        // Hazard classification lives on the item, not the batch - setting it
        // here (when a batch's item doesn't have one yet, or is being
        // corrected) saves a separate trip through Administration.
        let hazardChanged = false;
        let previousHazardId = null;
        if (hazardId !== undefined) {
            const currentItem = db.prepare('SELECT HazardID FROM tblItemMaster WHERE ItemID = ?').get(itemId);
            previousHazardId = currentItem ? currentItem.HazardID : null;
            const newHazardId = hazardId || null;
            if (previousHazardId !== newHazardId) {
                db.prepare('UPDATE tblItemMaster SET HazardID = ? WHERE ItemID = ?').run(newHazardId, itemId);
                hazardChanged = true;
            }
        }

        db.exec('COMMIT');

        logAudit({
            tableName: 'tblStockBatch',
            recordId: newBatchId,
            actionType: 'Insert',
            fieldName: 'QuantityReceived',
            newValue: qty,
            changedByUserId: userId,
        });
        if (hazardChanged) {
            logAudit({
                tableName: 'tblItemMaster',
                recordId: Number(itemId),
                actionType: 'Update',
                fieldName: 'HazardID',
                oldValue: previousHazardId,
                newValue: hazardId || null,
                changedByUserId: userId,
            });
        }

        const batch = db.prepare('SELECT * FROM tblStockBatch WHERE BatchID = ?').get(newBatchId);
        res.json(batch);
    } catch (err) {
        db.exec('ROLLBACK');
        res.status(500).json({ error: 'Stock-in could not be posted: ' + err.message });
    }
});

// Mirrors modStock.PostStockOut: re-validates available quantity inside the
// transaction so a negative balance can never be committed.
router.post('/out', requireAccess('StockOut'), (req, res) => {
    const { batchId, quantity, purpose, remarks } = req.body;
    const qty = Number(quantity);

    if (!batchId) return res.status(400).json({ error: 'Batch is required.' });
    if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantity to issue must be greater than zero.' });
    }

    const movementTypeId = getMovementTypeId('Issue');
    if (!movementTypeId) {
        return res.status(500).json({ error: "Movement type 'Issue' is not configured." });
    }

    const now = new Date().toISOString();
    const userId = req.session.user.userId;

    db.exec('BEGIN');
    try {
        const batch = db.prepare('SELECT * FROM tblStockBatch WHERE BatchID = ?').get(batchId);
        if (!batch) {
            db.exec('ROLLBACK');
            return res.status(404).json({ error: 'Batch not found.' });
        }

        const available = batch.QuantityRemaining;
        if (qty > available) {
            db.exec('ROLLBACK');
            return res.status(400).json({ error: `Cannot issue ${qty}. Only ${available} is available in this batch.` });
        }

        const newRemaining = available - qty;
        db.prepare('UPDATE tblStockBatch SET QuantityRemaining = ? WHERE BatchID = ?').run(newRemaining, batchId);

        db.prepare(
            `INSERT INTO tblStockMovement (BatchID, MovementTypeID, Quantity, MovementDate, PerformedByUserID, Purpose, Remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(batchId, movementTypeId, qty, now, userId, purpose || null, remarks || null);

        db.exec('COMMIT');

        logAudit({
            tableName: 'tblStockBatch',
            recordId: Number(batchId),
            actionType: 'Dispatch',
            fieldName: 'QuantityRemaining',
            oldValue: available,
            newValue: newRemaining,
            changedByUserId: userId,
        });

        const itemStatus = getItemStatusById(batch.ItemID);
        const response = { ...batch, QuantityRemaining: newRemaining };
        if (itemStatus && CONCERNING_STATUSES.has(itemStatus.StockStatus)) {
            response.lowStockWarning = {
                itemId: itemStatus.ItemID,
                itemDescription: itemStatus.ItemDescription,
                stockStatus: itemStatus.StockStatus,
                totalAvailable: itemStatus.TotalAvailable,
                reorderPoint: itemStatus.ReorderPoint,
                minStockLevel: itemStatus.MinStockLevel,
                notifyRecipients: getNotifyRecipients(batch.ItemID),
            };
        }

        res.json(response);
    } catch (err) {
        db.exec('ROLLBACK');
        res.status(500).json({ error: 'Stock-out could not be posted: ' + err.message });
    }
});

// Physical Count / Stock Take: reconciles the system quantity against a
// counted quantity for each item in one batch submission. Increases are
// attributed to the most recently received batch; decreases are depleted
// FIFO (oldest batch first) across the item's active batches - mirrors how
// a real stock take gets posted without asking the counter to pick batches.
router.post('/physical-count', requireAccess('StockIn'), (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'No counted items were submitted.' });
    }

    const increaseTypeId = getMovementTypeId('Stock Adjustment (+)');
    const decreaseTypeId = getMovementTypeId('Stock Adjustment (-)');
    if (!increaseTypeId || !decreaseTypeId) {
        return res.status(500).json({ error: "Stock Adjustment movement types are not configured." });
    }

    const now = new Date().toISOString();
    const userId = req.session.user.userId;
    const results = { adjusted: [], skipped: [] };

    db.exec('BEGIN');
    try {
        for (const entry of items) {
            const itemId = Number(entry.itemId);
            const counted = Number(entry.countedQty);
            if (!itemId || !Number.isFinite(counted) || counted < 0) continue;

            const item = db.prepare('SELECT ItemID, ItemDescription FROM tblItemMaster WHERE ItemID = ?').get(itemId);
            if (!item) continue;

            const batches = db
                .prepare(`SELECT * FROM tblStockBatch WHERE ItemID = ? AND IsActive = 1 ORDER BY ReceivedDate ASC`)
                .all(itemId);
            const currentTotal = batches.reduce((sum, b) => sum + b.QuantityRemaining, 0);
            const diff = counted - currentTotal;
            if (diff === 0) continue;

            const remarks = `Physical count adjustment. System qty: ${currentTotal}, Counted qty: ${counted}.`;

            if (diff > 0) {
                if (!batches.length) {
                    results.skipped.push({
                        itemId,
                        itemDescription: item.ItemDescription,
                        reason: 'No existing batch for this item - use Stock In to create one first.',
                    });
                    continue;
                }
                const target = batches[batches.length - 1];
                const newQty = target.QuantityRemaining + diff;
                db.prepare('UPDATE tblStockBatch SET QuantityRemaining = ? WHERE BatchID = ?').run(newQty, target.BatchID);
                db.prepare(
                    `INSERT INTO tblStockMovement (BatchID, MovementTypeID, Quantity, MovementDate, PerformedByUserID, Purpose, Remarks)
                     VALUES (?, ?, ?, ?, ?, 'Physical Count', ?)`
                ).run(target.BatchID, increaseTypeId, diff, now, userId, remarks);
                logAudit({
                    tableName: 'tblStockBatch',
                    recordId: target.BatchID,
                    actionType: 'Update',
                    fieldName: 'QuantityRemaining',
                    oldValue: target.QuantityRemaining,
                    newValue: newQty,
                    changedByUserId: userId,
                });
            } else {
                let remainingToRemove = -diff;
                for (const batch of batches) {
                    if (remainingToRemove <= 0) break;
                    if (batch.QuantityRemaining <= 0) continue;
                    const take = Math.min(batch.QuantityRemaining, remainingToRemove);
                    const newQty = batch.QuantityRemaining - take;
                    db.prepare('UPDATE tblStockBatch SET QuantityRemaining = ? WHERE BatchID = ?').run(newQty, batch.BatchID);
                    db.prepare(
                        `INSERT INTO tblStockMovement (BatchID, MovementTypeID, Quantity, MovementDate, PerformedByUserID, Purpose, Remarks)
                         VALUES (?, ?, ?, ?, ?, 'Physical Count', ?)`
                    ).run(batch.BatchID, decreaseTypeId, take, now, userId, remarks);
                    logAudit({
                        tableName: 'tblStockBatch',
                        recordId: batch.BatchID,
                        actionType: 'Update',
                        fieldName: 'QuantityRemaining',
                        oldValue: batch.QuantityRemaining,
                        newValue: newQty,
                        changedByUserId: userId,
                    });
                    remainingToRemove -= take;
                }
            }

            results.adjusted.push({
                itemId,
                itemDescription: item.ItemDescription,
                systemQty: currentTotal,
                countedQty: counted,
                difference: diff,
            });
        }

        db.exec('COMMIT');
        res.json(results);
    } catch (err) {
        db.exec('ROLLBACK');
        res.status(500).json({ error: 'Physical count could not be posted: ' + err.message });
    }
});

module.exports = router;
