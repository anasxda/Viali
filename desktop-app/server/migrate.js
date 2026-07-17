const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'viali.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const EXPORT_DIR = path.join(__dirname, '..', 'data-export');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// This script DROPs and rebuilds every table from data-export/*.json. Refuse to
// run against a database that already has live data unless --force is passed,
// so a re-run can never silently wipe transactions posted after the first setup.
if (fs.existsSync(DB_PATH) && !process.argv.includes('--force')) {
    const existing = new DatabaseSync(DB_PATH);
    let hasData = false;
    try {
        const row = existing.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='tblItemMaster'").get();
        if (row.n > 0) {
            hasData = existing.prepare('SELECT COUNT(*) AS n FROM tblItemMaster').get().n > 0;
        }
    } catch {
        // Table doesn't exist yet - safe to proceed.
    }
    existing.close();
    if (hasData) {
        console.error(
            `Refusing to run: ${DB_PATH} already contains data.\n` +
            'This script drops and rebuilds every table from data-export/*.json, which would ' +
            'discard any transactions posted since the last migration.\n' +
            'Re-run with --force if you really intend to reset to the original exported data.'
        );
        process.exit(1);
    }
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = OFF;');

const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schemaSql);

// Order matters: parents before children.
const TABLES = [
    'tblRole', 'tblUser', 'tblCategory', 'tblUnit', 'tblLocation',
    'tblHazardClass', 'tblManufacturer', 'tblMovementType', 'tblSupplier',
    'tblItemMaster', 'tblStockBatch', 'tblStockMovement', 'tblAlertLog', 'tblAuditLog',
];

// The Access export produced naive local-time strings (no timezone marker), while
// the server writes new timestamps as full UTC ISO strings (via Date#toISOString).
// Mixing the two formats breaks lexicographic ORDER BY ... DESC sorting and makes
// displayed times inconsistent. Normalize true point-in-time audit/log columns to
// UTC ISO here (interpreting the naive string as this machine's local time, which
// is what produced it). Pure calendar-date columns (ExpiryDate, ReceivedDate,
// DateCreated, DateModified) are left alone since converting them to UTC could
// shift the calendar day.
const DATETIME_COLUMNS = {
    tblStockMovement: ['MovementDate'],
    tblAlertLog: ['AlertDate'],
    tblAuditLog: ['ChangedDate'],
};

function normalizeRow(table, row) {
    const cols = DATETIME_COLUMNS[table];
    if (!cols) return row;
    const out = { ...row };
    for (const c of cols) {
        if (out[c]) out[c] = new Date(out[c]).toISOString();
    }
    return out;
}

db.exec('BEGIN');
try {
    for (const table of TABLES) {
        const file = path.join(EXPORT_DIR, `${table}.json`);
        if (!fs.existsSync(file)) {
            console.warn(`Skipping ${table}: no export file found`);
            continue;
        }
        let raw = fs.readFileSync(file, 'utf8');
        if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
        const rows = JSON.parse(raw);
        if (!rows.length) {
            console.log(`${table}: 0 rows`);
            continue;
        }
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const stmt = db.prepare(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        );
        for (const rawRow of rows) {
            const row = normalizeRow(table, rawRow);
            const values = columns.map((c) => (row[c] === undefined ? null : row[c]));
            stmt.run(...values);
        }
        console.log(`${table}: ${rows.length} rows imported`);
    }
    db.exec('COMMIT');
} catch (err) {
    db.exec('ROLLBACK');
    throw err;
}

db.exec('PRAGMA foreign_keys = ON;');
console.log('Migration complete ->', DB_PATH);
db.close();
