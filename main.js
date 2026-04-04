import mqtt from 'mqtt'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()

const app = express();
app.use(express.json());

let client = null;

client = mqtt.connect("mqtts://fb65afa1d6c34fa29ba74f059d62716c.s1.eu.hivemq.cloud", {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  port: 8883,
});
client.on("connect", () => {
  console.log("MQTT connected");
  client.publish("gate/control", "open");
});
client.on("error", (err) => {
  console.log("MQTT error:", err);
});

// ✅ HTTP API
app.get('/on', (req, res) => {
  client.publish('gate/control', 'open');
  res.send('LED ON');
});

app.get('/off', (req, res) => {
  client.publish('gate/control', 'close');
  res.send('LED OFF');
});

// Render 需要用 PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});