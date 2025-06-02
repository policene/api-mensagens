const amqp = require('amqplib');

const rabbitMQConnectionString = 'amqp://rabbitmq'; 
let channel = null;

async function connectRabbitMQ() {
    if (channel) {
        return channel;
    }
    try {
        const connection = await amqp.connect(rabbitMQConnectionString);
        channel = await connection.createChannel();
        console.log('Conectado ao RabbitMQ e canal criado.');

        connection.on('error', (err) => {
            console.error('Erro na conexão RabbitMQ:', err);
            channel = null;
        });
        connection.on('close', () => {
            console.warn('Conexão RabbitMQ fechada.');
            channel = null;
        });
    } catch (error) {
        console.error('Falha ao conectar ao RabbitMQ:', error);
        throw error;
    }
    return channel;
}

module.exports = { connectRabbitMQ };