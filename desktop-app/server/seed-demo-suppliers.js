// One-off, idempotent seed: adds 6 example suppliers (random emails/phones)
// for demo purposes. Safe to run more than once - skips if they already exist.
const db = require('./db');

const DEMO_SUPPLIERS = [
    { SupplierName: 'Al-Rashid Chemical Trading Co.', ContactPerson: 'Faisal Al-Rashid', Email: 'faisal.alrashid@rashidchem-demo.com', Phone: '+966 50 214 7783', Address: 'Industrial Area 2, Jubail, Saudi Arabia' },
    { SupplierName: 'Gulf Scientific Supplies LLC', ContactPerson: 'Mona Al-Sabah', Email: 'mona.alsabah@gulfscientific-demo.com', Phone: '+966 55 872 3391', Address: 'King Fahd Rd, Dammam, Saudi Arabia' },
    { SupplierName: 'Nordic LabChem AB', ContactPerson: 'Erik Lindqvist', Email: 'erik.lindqvist@nordiclabchem-demo.se', Phone: '+46 70 334 8821', Address: 'Kemistvägen 12, Gothenburg, Sweden' },
    { SupplierName: 'Pacific Reagents Inc.', ContactPerson: 'Grace Tanaka', Email: 'grace.tanaka@pacificreagents-demo.com', Phone: '+1 415 902 6647', Address: '4400 Bayview Ave, San Jose, CA, USA' },
    { SupplierName: 'Al-Noor Industrial Materials', ContactPerson: 'Yousef Al-Harbi', Email: 'yousef.alharbi@alnoor-demo.com', Phone: '+966 53 601 9924', Address: 'Second Industrial City, Riyadh, Saudi Arabia' },
    { SupplierName: 'EuroChem Distribution GmbH', ContactPerson: 'Anna Fischer', Email: 'anna.fischer@eurochem-demo.de', Phone: '+49 173 445 2280', Address: 'Industriestraße 8, Leverkusen, Germany' },
];

function run() {
    const insert = db.prepare(
        `INSERT INTO tblSupplier (SupplierName, ContactPerson, Email, Phone, Address, IsActive) VALUES (?, ?, ?, ?, ?, 1)`
    );
    const exists = db.prepare(`SELECT 1 FROM tblSupplier WHERE SupplierName = ?`);

    let added = 0;
    for (const s of DEMO_SUPPLIERS) {
        if (exists.get(s.SupplierName)) continue;
        insert.run(s.SupplierName, s.ContactPerson, s.Email, s.Phone, s.Address);
        added++;
    }
    console.log(`Demo suppliers: ${added} added, ${DEMO_SUPPLIERS.length - added} already present.`);
}

run();
