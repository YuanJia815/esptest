import dotenv from 'dotenv'
import mqtt from 'mqtt'
import express from 'express'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
app.use(express.json())

//===================================== Rate Limiting =====================================//
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 25 // limit each IP to 25 requests per windowMs
})
app.use(limiter)
app.use('/gate', limiter)

//===================================== MQTT Setup =====================================//
const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  port: 8883,
})

client.on("connect", () => {
  console.log("✅ MQTT connected")
})

client.on('reconnect', () => {
  console.log('🔄 MQTT reconnecting...')
})

client.on("error", (err) => {
  console.log("❌ MQTT error:", err)
})

//===================================== Middleware（API KEY 驗證） =====================//
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key']

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).send('Unauthorized access')
  }

  next()
}
//===================================== MQTT Publish Function =====================//
// ✅ 統一由這裡發送 MQTT（避免重複寫 publish）
function publishGateCommand(action, userInfo) {
  if (!client.connected) {
    throw new Error('MQTT not connected')
  }

  // 🔥 對應 ESP32 topic 分離設計  PARTIAL:
  switch (action) {
    case "open":
      client.publish("gate/open", userInfo)
      break
    case "close":
      client.publish("gate/close", userInfo)
      break
    case "stop":
      client.publish("gate/stop", userInfo)
      break
    case "pcpower":
      client.publish("pc/power", userInfo)
      break
    default:
      throw new Error("Invalid action")
  }
}

//===================================== API Routes =====================================//

// 健康檢查
app.get('/test', (req, res) => {
  res.send('人生就像泡麵三分鐘熱度然後後悔又開始懷疑')
})

// ✅ 改成 RESTful API（更清楚）
app.post('/gate/:action', authMiddleware, (req, res) => {
  const action = req.params.action.toLowerCase()
  const { user } = req.body;

  const config = JSON.parse(process.env.CONFIG);
  const isAccessLocation = new RegExp(config.loc, 'i').test(user.location);
  const isAuthorizedDevice = config.dvc.includes(user.deviceName);

  // if (!isAccessLocation || !isAuthorizedDevice) {
  //   return res.status(401).send('Unauthorized access')
  // }

  const userInfo = JSON.stringify(user) || "unknown";
  console.log(`🔔 Received command: ${action} from user: ${user.action}`);

  try {
    publishGateCommand(action, userInfo)

    res.send(`
      <h1 style="font-size:50px;">
        Gate ${action.toUpperCase()}
      </h1>
    `)

  } catch (err) {
    res.status(500).send(err.message)
  }
})

//===================================== (可選) 狀態訂閱 =====================//
// 🔥 未來可接 ESP32 回報狀態
client.subscribe("gate/status")

client.on("message", (topic, message) => {
  if (topic === "gate/status") {
    console.log("📡 Gate Status:", message.toString())
  }
})

//===================================== Start Server =====================================//
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('Server running')
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})