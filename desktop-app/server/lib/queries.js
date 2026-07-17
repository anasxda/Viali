const db = require('../db');

function itemStockBalanceRows() {
    return db.prepare(`
        SELECT im.*,
            c.CategoryName, u.UnitName, l.LocationCode, h.HazardName, h.HazardDescription, mf.ManufacturerName,
            COALESCE((SELECT SUM(QuantityRemaining) FROM tblStockBatch b WHERE b.ItemID = im.ItemID AND b.IsActive = 1), 0) AS TotalAvailable
        FROM tblItemMaster im
        LEFT JOIN tblCategory c ON c.CategoryID = im.CategoryID
        LEFT JOIN tblUnit u ON u.UnitID = im.UnitID
        LEFT JOIN tblLocation l ON l.LocationID = im.LocationID
        LEFT JOIN tblHazardClass h ON h.HazardID = im.HazardID
        LEFT JOIN tblManufacturer mf ON mf.ManufacturerID = im.ManufacturerID
        ORDER BY im.ItemDescription
    `).all();
}

// Mirrors qryItemStockStatus's nested IIf chain, including its ReorderPoint-before-MinStockLevel order.
function withStockStatus(item) {
    let StockStatus;
    if (!item.IsActive) StockStatus = 'Inactive';
    else if (item.TotalAvailable <= 0) StockStatus = 'Out of Stock';
    else if (item.ReorderPoint != null && item.TotalAvailable <= item.ReorderPoint) StockStatus = 'Reorder';
    else if (item.MinStockLevel != null && item.TotalAvailable <= item.MinStockLevel) StockStatus = 'Low Stock';
    else StockStatus = 'OK';
    return { ...item, StockStatus };
}

function itemStockStatusRows() {
    return itemStockBalanceRows().map(withStockStatus);
}

function getItemStatusById(itemId) {
    const row = db
        .prepare(`
            SELECT im.*,
                c.CategoryName, u.UnitName, l.LocationCode, h.HazardName, h.HazardDescription, mf.ManufacturerName,
                COALESCE((SELECT SUM(QuantityRemaining) FROM tblStockBatch b WHERE b.ItemID = im.ItemID AND b.IsActive = 1), 0) AS TotalAvailable
            FROM tblItemMaster im
            LEFT JOIN tblCategory c ON c.CategoryID = im.CategoryID
            LEFT JOIN tblUnit u ON u.UnitID = im.UnitID
            LEFT JOIN tblLocation l ON l.LocationID = im.LocationID
            LEFT JOIN tblHazardClass h ON h.HazardID = im.HazardID
            LEFT JOIN tblManufacturer mf ON mf.ManufacturerID = im.ManufacturerID
            WHERE im.ItemID = ?
        `)
        .get(itemId);
    return row ? withStockStatus(row) : null;
}

// Who a low-stock notification email should go to for a given item: the
// active supplier(s) that item has been received from (so replenishment can
// be requested directly), falling back to any active user with an email on
// file if the item has no supplier email yet.
function getNotifyRecipients(itemId) {
    const supplierEmails = db
        .prepare(`
            SELECT DISTINCT s.Email
            FROM tblStockBatch sb JOIN tblSupplier s ON s.SupplierID = sb.SupplierID
            WHERE sb.ItemID = ? AND s.IsActive = 1 AND s.Email IS NOT NULL AND TRIM(s.Email) <> ''
        `)
        .all(itemId)
        .map((r) => r.Email);
    if (supplierEmails.length) return supplierEmails;

    return db
        .prepare(`SELECT Email FROM tblUser WHERE IsActive = 1 AND Email IS NOT NULL AND TRIM(Email) <> ''`)
        .all()
        .map((r) => r.Email);
}

function lowStockAlertRows() {
    return itemStockStatusRows().filter(
        (i) => i.IsActive && i.ReorderPoint != null && i.TotalAvailable <= i.ReorderPoint
    );
}

function batchExpiryStatusRows() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in90 = new Date(today.getTime() + 90 * 86400000);
    const rows = db.prepare(`
        SELECT sb.*, im.ItemDescription, im.LegacyItemCode, c.CategoryName, s.SupplierName, l.LocationCode
        FROM tblStockBatch sb
        LEFT JOIN tblItemMaster im ON im.ItemID = sb.ItemID
        LEFT JOIN tblCategory c ON c.CategoryID = im.CategoryID
        LEFT JOIN tblSupplier s ON s.SupplierID = sb.SupplierID
        LEFT JOIN tblLocation l ON l.LocationID = sb.LocationID
        ORDER BY sb.ExpiryDate
    `).all();
    return rows.map((b) => {
        let ExpiryStatus = 'OK';
        if (b.ExpiryDate) {
            const exp = new Date(b.ExpiryDate);
            if (exp < today) ExpiryStatus = 'Expired';
            else if (exp <= in90) ExpiryStatus = 'Expiring Soon';
        }
        return { ...b, ExpiryStatus };
    });
}

function expiryAlertRows() {
    return batchExpiryStatusRows().filter(
        (b) => b.IsActive && b.QuantityRemaining > 0 && (b.ExpiryStatus === 'Expired' || b.ExpiryStatus === 'Expiring Soon')
    );
}

function movementHistoryRows(filters = {}) {
    let sql = `
        SELECT sm.MovementID, sm.MovementDate, im.ItemID, im.ItemDescription, c.CategoryName, sb.BatchNumber,
               mt.MovementTypeName, sm.Quantity, sm.Purpose, sm.Remarks, sm.MovementTypeID,
               u.FullName AS PerformedBy
        FROM tblStockMovement sm
        LEFT JOIN tblStockBatch sb ON sb.BatchID = sm.BatchID
        LEFT JOIN tblItemMaster im ON im.ItemID = sb.ItemID
        LEFT JOIN tblCategory c ON c.CategoryID = im.CategoryID
        LEFT JOIN tblMovementType mt ON mt.MovementTypeID = sm.MovementTypeID
        LEFT JOIN tblUser u ON u.UserID = sm.PerformedByUserID
        WHERE 1 = 1
    `;
    const params = [];
    if (filters.itemId) {
        sql += ' AND im.ItemID = ?';
        params.push(filters.itemId);
    }
    if (filters.batchId) {
        sql += ' AND sb.BatchID = ?';
        params.push(filters.batchId);
    }
    if (filters.movementTypeName) {
        sql += ' AND mt.MovementTypeName = ?';
        params.push(filters.movementTypeName);
    }
    sql += ' ORDER BY sm.MovementDate DESC';
    return db.prepare(sql).all(...params);
}

module.exports = {
    itemStockBalanceRows,
    withStockStatus,
    itemStockStatusRows,
    getItemStatusById,
    getNotifyRecipients,
    lowStockAlertRows,
    batchExpiryStatusRows,
    expiryAlertRows,
    movementHistoryRows,
};
