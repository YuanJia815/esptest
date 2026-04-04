import mqtt from 'mqtt'
import dotenv from 'dotenv'

dotenv.config()

let client = null;

// client = mqtt.connect("mqtts://fb65afa1d6c34fa29ba74f059d62716c.s1.eu.hivemq.cloud", {
//   username: process.env.MQTT_USERNAME,
//   password: process.env.MQTT_PASSWORD,
//   port: 8883,
// });
// client.on("connect", () => {
//   console.log("MQTT connected");
//   client.publish("gate/control", "open");
// });
// client.on("error", (err) => {
//   console.log("MQTT error:", err);
// });

async function getClient() {

  client = await mqtt.connectAsync("mqtts://fb65afa1d6c34fa29ba74f059d62716c.s1.eu.hivemq.cloud", {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    port: 8883
  });
  client.on("connect", async () => {
    console.log("MQTT connected");
    await client.publishAsync("gate/control", "open");
  });
  client.on("error", (err) => {
    console.log("MQTT error:", err);
  });

  return client;
};

function sendCommand(client, cmd) {
  client.publish("gate/control", cmd);
  console.log("sendCommand");
}

let lastCommand = null;

export default async function handler(req, res) {


  // 寫入指令（Shortcut 用）
  if (req.method === "POST") {
    const { action } = req.body || {};

    if (!["open", "close", "stop"].includes(action)) {
      return res.status(400).send("invalid");
    }

    const mqttClient = await getClient();
    //sendCommand(mqttClient, 'open');

    lastCommand = {
      action,
      time: Date.now()
    };

    return res.json({ success: true });
  }

  // ESP32 來拿指令
  if (req.method === "GET") {
    if (!lastCommand) {
      return res.json({ action: null });
    }

    // 只用一次（避免重複觸發）
    const cmd = lastCommand;
    lastCommand = null;

    return res.json(cmd);
  }

  res.status(405).send("Method not allowed");
}