const express = require('express');
const { connectRabbitMQ } = require('./config/rabbitmq');
const messageRoutes = require('./routes/message.routes');

const app = express();
const port = 3000;

app.use(express.json());

connectRabbitMQ().then(() => {
    console.log("Conexão inicial com RabbitMQ estabelecida ou já existente.");
}).catch(error => {
    console.error("Falha crítica ao conectar com RabbitMQ na inicialização. A aplicação pode não funcionar corretamente.", error);
});

// Rotas
app.use('/message', messageRoutes); 

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Aplicativo Express rodando em http://localhost:${port}`);
});
