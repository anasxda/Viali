const db = require('../db');

function logAudit({ tableName, recordId, actionType, fieldName = null, oldValue = null, newValue = null, changedByUserId = null }) {
    try {
        db.prepare(
            `INSERT INTO tblAuditLog (TableName, RecordID, ActionType, FieldName, OldValue, NewValue, ChangedByUserID, ChangedDate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            tableName,
            recordId,
            actionType,
            fieldName,
            oldValue === null || oldValue === undefined ? null : String(oldValue),
            newValue === null || newValue === undefined ? null : String(newValue),
            changedByUserId,
            new Date().toISOString()
        );
    } catch (err) {
        // Audit logging must never block the primary transaction.
        console.error('LogAudit failed:', err.message);
    }
}

module.exports = { logAudit };
