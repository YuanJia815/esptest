import mqtt from 'mqtt'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express();
app.use(express.json());

//===================================== MQTT Setup =====================================//
const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  port: 8883,
});
client.on("connect", () => {
  console.log("MQTT connected");
  client.publish("gate/control", "open");
});
client.on('reconnect', () => {
  console.log('🔄 reconnecting...');
});
client.on("error", (err) => {
  console.log("MQTT error:", err);
});
//===================================== HTTP API Setup =====================================//
app.get('/test', (req, res) => {
  res.send('人生就像泡麵三分鐘熱度然後後悔又開始懷疑');
});

app.post('/gate/control', (req, res) => {
  const { action } = req.body;

  if (!client.connected) {
    return res.status(500).send('MQTT not connected');
  }

  if (!["open", "close", "stop"].includes(action)) {
    return res.status(400).send('Invalid action');
  }

  client.publish('gate/control', action);

  res.send(`
    <h1 style="font-size:50px;">Gate ${state}</h1>
  `);
});

//===================================== Start Server =====================================//
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});