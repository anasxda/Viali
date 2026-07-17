// One-off, idempotent seed: fills in HazardDescription for the standard
// hazard classes that don't have one yet. Safe to run more than once - never
// overwrites a description someone has already set (blank or custom).
const db = require('./db');

const DESCRIPTIONS = {
    Carcinogen: 'May cause cancer with prolonged or repeated exposure. Avoid skin contact and inhalation.',
    Caustic: 'Causes severe skin burns and eye damage on contact. Wear gloves and eye protection.',
    Corrosive: 'Causes severe skin burns and eye damage; can corrode metals. Handle with appropriate PPE.',
    Flammable: 'Highly flammable liquid and vapor. Keep away from heat, sparks, open flames and hot surfaces.',
    'Flammable/Harmful': 'Flammable, and harmful if swallowed, inhaled, or absorbed through skin.',
    'Flammable/Irritant': 'Flammable, and causes skin and eye irritation on contact.',
    Harmful: 'Harmful if swallowed, inhaled, or in contact with skin.',
    'Harmful/Oxidizing': 'Harmful, and may intensify fire - keep away from combustible materials.',
    Irritant: 'Causes skin irritation and serious eye irritation.',
    'Irritant/Flammable': 'Flammable, and causes skin and eye irritation on contact.',
    'Irritant/Toxic': 'Toxic if swallowed or inhaled, and causes irritation on contact.',
    'Not Specified': 'No hazard classification has been recorded for this item yet.',
    Oxidizing: 'May cause or intensify fire; an oxidizer. Keep away from combustible materials.',
    Poisonous: 'Fatal or toxic if swallowed, inhaled, or absorbed through skin. Handle with extreme care.',
    Toxic: 'Toxic if swallowed, inhaled, or in contact with skin.',
    Explosive: 'Explosive substance or mixture. Keep away from heat, shock, friction, sparks, and ignition sources.',
    'Gas Under Pressure': 'Contains gas under pressure and may explode if heated. Refrigerated gas may cause cryogenic burns.',
    'Environmental Hazard': 'Toxic to aquatic life and may cause long-lasting environmental effects. Prevent release to drains and waterways.',
    'Serious Health Hazard': 'May cause serious long-term health effects such as organ damage, respiratory sensitization, or aspiration hazard.',
    'Reproductive Toxicity': 'May damage fertility or the unborn child. Avoid exposure and follow controlled-handling procedures.',
    'Respiratory Sensitizer': 'May cause allergy or asthma symptoms or breathing difficulties if inhaled. Use suitable respiratory protection.',
};

function run() {
    const find = db.prepare(`SELECT HazardID FROM tblHazardClass WHERE LOWER(TRIM(HazardName)) = LOWER(TRIM(?))`);
    const insert = db.prepare(`INSERT INTO tblHazardClass (HazardName, HazardDescription) VALUES (?, ?)`);
    const update = db.prepare(`UPDATE tblHazardClass SET HazardDescription = ? WHERE HazardName = ? AND (HazardDescription IS NULL OR TRIM(HazardDescription) = '')`);
    let updated = 0;
    let added = 0;
    for (const [name, description] of Object.entries(DESCRIPTIONS)) {
        if (!find.get(name)) {
            insert.run(name, description);
            added += 1;
        } else {
            const result = update.run(description, name);
            updated += result.changes;
        }
    }
    console.log(`Hazard classes: ${added} added, ${updated} descriptions updated.`);
}

run();
