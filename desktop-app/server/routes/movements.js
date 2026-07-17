const express = require('express');
const { requireAccess } = require('../middleware/auth');
const { movementHistoryRows } = require('../lib/queries');

const router = express.Router();

router.get('/', requireAccess('Movements'), (req, res) => {
    const { itemId, batchId } = req.query;
    res.json(movementHistoryRows({ itemId, batchId }));
});

module.exports = router;
