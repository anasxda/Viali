// One-off, idempotent migration: adds tblStockBatch.LocationID so each batch
// can record where it's physically stored, chosen at Stock In time. Safe to
// run more than once - skips if the column already exists.
const db = require('./db');

function run() {
    const cols = db.prepare(`PRAGMA table_info(tblStockBatch)`).all();
    const hasColumn = cols.some((c) => c.name === 'LocationID');
    if (hasColumn) {
        console.log('tblStockBatch.LocationID already exists - nothing to do.');
        return;
    }
    db.exec(`ALTER TABLE tblStockBatch ADD COLUMN LocationID INTEGER REFERENCES tblLocation(LocationID)`);
    console.log('Added tblStockBatch.LocationID.');
}

run();
