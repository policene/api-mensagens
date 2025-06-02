const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { authenticate, authenticateOnlyFromToken } = require('../middlewares/auth.middleware');

router.post('/', authenticate, messageController.sendMessage);

router.post('/worker', authenticate, messageController.processWorkerMessages);

router.get('/', authenticate, messageController.getMessage)

module.exports = router;''