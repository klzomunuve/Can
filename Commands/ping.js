module.exports = {
  name: "ping",
  description: "Check if bot is alive",
  execute: async (sock, msg) => {
    await sock.sendMessage(msg.key.remoteJid, { text: "✅ Bot is alive!" });
  }
};
