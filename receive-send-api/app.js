const express = require('express'); // Importa o módulo Express
const axios = require('axios');
const amqp = require('amqplib')

const app = express();
const port = 3000;

app.use(express.json());

const rabbitMQConnectionString = 'amqp://rabbitmq'; // Mude se seu RabbitMQ estiver em outro lugar
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


app.post('/message', async (req, res) => {
  
  const userIdSend = req.body.userIdSend
  const userIdReceive = req.body.userIdReceive
  const message = req.body.message
  
  if (!userIdSend || !userIdReceive || !message) {
    return res.status(400).json({error: "All fields must be filled."})
  }

  if (userIdSend == userIdReceive) {
    return res.status(400).json({error: "IDs can't be equal."})
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(400).json({error: "Authorization is not working."})
  }

  try {
    const response = await axios.get(
      'http://auth-api:8000/token',
      {
        params: {id: userIdSend},
        headers: {Authorization: authHeader}
      }
    );

    const isAuthenticated = response.data.auth

    if (!isAuthenticated) {
      return res.status(401).json({msg: "Not auth."})
    }

    const queueName = `${userIdSend}${userIdReceive}`;
    const messageForQueue = {
      userIdSend: userIdSend,
      userIdReceive: userIdReceive,
      message: message,
      timestamp: new Date().toISOString()
    }

    const messageBuffer = Buffer.from(JSON.stringify(messageForQueue));

    try {
            const currentChannel = await connectRabbitMQ();
            await currentChannel.assertQueue(queueName, { durable: true });

            currentChannel.sendToQueue(queueName, messageBuffer, { persistent: true });

            console.log(`[Receive-Send-API] Mensagem enviada para a fila ${queueName}: ${JSON.stringify(messageForQueue)}`);

            return res.status(200).json({ message: 'Message sended with success' });

        } catch (rabbitError) {
            console.error('[Receive-Send-API] Erro ao enviar mensagem para RabbitMQ:', rabbitError);

            return res.status(500).json({ error: 'Failed to queue message.' });
        }

  } catch (err) {

    return res.status(500).json({ error: 'Erro ao conectar com a outra API' });

  }

})

app.post('/message/worker', async (req, res) => {

  const userIdSend = req.body.userIdSend
  const userIdReceive = req.body.userIdReceive

  if (!userIdSend || !userIdReceive) {
    return res.status(400).json({error: "All fields must be filled."})
  }

  if (userIdSend == userIdReceive) {
    return res.status(400).json({error: "IDs can't be equal."})
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(400).json({error: "Authorization is not working."})
  }

  try {
    const response = await axios.get(
      'http://auth-api:8000/token',
      {
        params: {id: userIdSend},
        headers: {Authorization: authHeader}
      }
    );

    const isAuthenticated = response.data.auth

    if (!isAuthenticated) {
      return res.status(401).json({msg: "Not auth."})
    }

    const queueName = `${userIdSend}${userIdReceive}`;

    const currentChannel = await connectRabbitMQ();

    await currentChannel.assertQueue(queueName, { durable: true });

    const messages = [];
    let msg;
    do {
      msg = await currentChannel.get(queueName, { noAck: false });
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        try {
          await axios.post('http://record-api:5000/messages', {
            content: content.message,              
            sender_id: content.userIdSend,      
            receiver_id: content.userIdReceive
          })
          currentChannel.ack(msg);
          messages.push(content);
        } catch (err) {
          console.error('Erro ao enviar para Record-API:', err);
          currentChannel.nack(msg);
        }
        
      }
    } while (msg);

    return res.status(200).json({ msg: 'ok', processed: messages.length });

  } catch (err) {
    return res.status(500).json({ error: 'Erro ao conectar com a outra API' });
  }

})

app.listen(port, () => {
  console.log(`Aplicativo Express rodando em http://localhost:${port}`);
});