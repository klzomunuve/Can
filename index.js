require("dotenv").config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require("@adiwajshing/baileys");
const fs = require("fs");
const path = require("path");

const { initUsers, addUser } = require("./database/users");
const prefix = process.env.PREFIX || ".";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, fs)
    },
    printQRInTerminal: false // we will use pairing code
  });

  sock.ev.on("creds.update", saveCreds);

  // 📌 Pairing Code Login (use once)
  if (!state.creds.registered) {
    const code = await sock.requestPairingCode(process.env.OWNER_NUMBER);
    console.log("📱 Pairing code:", code);
  }

  // Load commands
  const commands = new Map();
  const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(f => f.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
  }

  // Init DB
  await initUsers();

  // Message handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const senderName = msg.pushName || "Unknown";
    await addUser(from, senderName);

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commands.has(commandName)) {
      try {
        await commands.get(commandName).execute(sock, msg, args);
      } catch (err) {
        console.error(err);
        await sock.sendMessage(from, { text: "❌ Error running command" });
      }
    }
  });

  // Handle disconnect
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting...", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ Bot connected as:", sock.user.id);
    }
  });
}

startBot();
