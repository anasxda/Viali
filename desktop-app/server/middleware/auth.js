function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'Not signed in' });
    next();
}

// Administration, Stock In and Suppliers require Administrator Mode to be
// unlocked for the current session (see /api/auth/admin-mode). Stock Out
// (dispatching items) is open to any signed-in user, same as Dashboard,
// Inventory, Movements, Alerts read and Reports.
function requireAccess(area) {
    return (req, res, next) => {
        const user = req.session.user;
        if (!user) return res.status(401).json({ error: 'Not signed in' });

        // Normal mode can only dispatch. Every other named area requires the
        // password-unlocked Administrator Mode session.
        const allowed = area === 'StockOut' || !!req.session.isAdminMode;

        if (!allowed) return res.status(403).json({ error: 'Access denied' });
        next();
    };
}

module.exports = { requireLogin, requireAccess };
