// One-off, idempotent migration: adds the generic tblAppSettings key/value
// table used for things like the supervisor notification email and the
// monthly inventory check date. Safe to run more than once.
const db = require('./db');

function run() {
    db.exec(`CREATE TABLE IF NOT EXISTS tblAppSettings (
        SettingKey TEXT PRIMARY KEY,
        SettingValue TEXT
    )`);
    console.log('tblAppSettings ready.');
}

run();
