const { verifyToken } = require('../services/auth.service');

async function authenticate(req, res, next) {
    const userId = req.body?.userIdSend || req.query?.userId;
    const authHeader = req.headers['authorization'];

    if (!userId) {
        return res.status(400).json({ error: "userId is required for authentication." });
    }

    const authResult = await verifyToken(userId, authHeader);

    if (!authResult.isAuthenticated) {
        return res.status(authResult.status || 401).json({ error: authResult.error || "Authentication failed." });
    }

    next();
}


module.exports = { authenticate };