// One-off, idempotent seed: (re)creates the two Stock Adjustment movement
// types used by the Physical Count feature. Safe to run more than once.
const db = require('./db');

const TYPES = [
    { MovementTypeName: 'Stock Adjustment (+)', StockEffect: 1 },
    { MovementTypeName: 'Stock Adjustment (-)', StockEffect: -1 },
];

function run() {
    const exists = db.prepare('SELECT 1 FROM tblMovementType WHERE MovementTypeName = ?');
    const insert = db.prepare('INSERT INTO tblMovementType (MovementTypeName, StockEffect) VALUES (?, ?)');
    let added = 0;
    for (const t of TYPES) {
        if (exists.get(t.MovementTypeName)) continue;
        insert.run(t.MovementTypeName, t.StockEffect);
        added++;
    }
    console.log(`Adjustment movement types: ${added} added.`);
}

run();
