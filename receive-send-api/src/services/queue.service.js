const axios = require('axios');
const { connectRabbitMQ } = require('../config/rabbitmq');
const { delCache } = require('../config/redis');
const RECORD_API_URL = 'http://record-api:5000/messages';

async function sendMessage(queueName, messageData) {
    try {
        const channel = await connectRabbitMQ();
        await channel.assertQueue(queueName, { durable: true });
        const messageBuffer = Buffer.from(JSON.stringify(messageData));
        channel.sendToQueue(queueName, messageBuffer, { persistent: true });
        console.log(`[QueueService] Mensagem enviada para a fila ${queueName}: ${JSON.stringify(messageData)}`);
        return { success: true };
    } catch (error) {
        console.error('[QueueService] Erro ao enviar mensagem para RabbitMQ:', error);
        return { success: false, error: 'Failed to queue message.' };
    }
}

async function processMessages(queueName) {

    try {
        const channel = await connectRabbitMQ();
        await channel.assertQueue(queueName, { durable: true });

        const processedMessages = [];
        let msg;
        
        // Loop para consumir todas as mensagens disponíveis na fila
        while ((msg = await channel.get(queueName, { noAck: false }))) {
            if (msg) {
                const content = JSON.parse(msg.content.toString());
                try {
                    // Envia para a API de gravação
                    await axios.post(RECORD_API_URL, {
                        content: content.message,
                        sender_id: content.userIdSend,
                        receiver_id: content.userIdReceive
                    });

                    await delCache(`messages:user:${content.userIdSend}`);

                    channel.ack(msg); 
                    processedMessages.push(content);
                    console.log(`[QueueService] Mensagem da fila ${queueName} processada e enviada para Record-API.`);
                } catch (err) {
                    console.error('[QueueService] Erro ao enviar para Record-API, reenfileirando:', err.message);
                    channel.nack(msg, false, true); 
                }
            }
        }
        return { success: true, processedCount: processedMessages.length, messages: processedMessages };
    } catch (error) {
        console.error('[QueueService] Erro ao processar mensagens da fila:', error);
        return { success: false, error: 'Failed to process messages from queue.' };
    }
}

module.exports = { sendMessage, processMessages };