const queueService = require('../services/queue.service');
const axios = require('axios');
const { getCache, setCache } = require('../config/redis');


async function sendMessage(req, res) {
    const { userIdSend, userIdReceive, message } = req.body;

    if (!userIdSend || !userIdReceive || !message) {
        return res.status(400).json({ error: "All fields (userIdSend, userIdReceive, message) must be filled." });
    }
    if (userIdSend === userIdReceive) {
        return res.status(400).json({ error: "Sender and receiver IDs can't be equal." });
    }

    const queueName = `${userIdSend}${userIdReceive}`;
    const messageForQueue = {
        userIdSend,
        userIdReceive,
        message,
        timestamp: new Date().toISOString()
    };

    const result = await queueService.sendMessage(queueName, messageForQueue);

    if (result.success) {
        return res.status(200).json({ message: 'Message sent to queue successfully.' });
    } else {
        return res.status(500).json({ error: result.error });
    }
}

async function processWorkerMessages(req, res) {
    const { userIdSend, userIdReceive } = req.body;

    if (!userIdSend || !userIdReceive) {
        return res.status(400).json({ error: "All fields (userIdSend, userIdReceive) must be filled." });
    }
    if (userIdSend === userIdReceive) {
        return res.status(400).json({ error: "Sender and receiver IDs can't be equal." });
    }

    const queueName = `${userIdSend}${userIdReceive}`;
    const result = await queueService.processMessages(queueName, userIdSend, userIdReceive);

    if (result.success) {
        return res.status(200).json({ 
            message: 'Messages processed from queue.', 
            processedCount: result.processedCount,
        });
    } else {
        return res.status(500).json({ error: result.error });
    }
}

async function getMessage(req, res) {
    const userIdFromQuery = parseInt(req.query.userId);

    if (!userIdFromQuery) {
        return res.status(400).json({ error: 'ID is required' });
    }

    const cacheKey = `messages:user:${userIdFromQuery}`;

    try {

        const cachedData = await getCache(cacheKey);

        if (cachedData) {
            return res.status(200).json(cachedData);
        }

        const response = await axios.get(`http://record-api:5000/messages`, {
            params: {
                user: userIdFromQuery,
            }
        });

        await setCache(cacheKey, response.data, 60);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching messages:', error.message);
        res.status(500).json({ error: 'Error fetching messages' });
    }

}

module.exports = {
    sendMessage,
    processWorkerMessages,
    getMessage
};