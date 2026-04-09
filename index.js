const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Slash command
const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket and rename it")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "claimticket") {

    const channel = interaction.channel;

    if (!channel) {
      return interaction.reply({ content: "No channel found.", ephemeral: true });
    }

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // 🧠 FIXED: replace only last part of channel name
    let parts = channel.name.split("-");

    if (parts.length > 1) {
      parts.pop(); // remove old claimer
    }

    parts.push(username); // add new claimer

    const newName = parts.join("-");

    await interaction.deferReply({ ephemeral: true });

    try {
      const updated = await channel.setName(newName);

      console.log("Renamed to:", updated.name);

      return interaction.editReply(`Renamed to ${updated.name}`);
    } catch (err) {
      console.error("RENAME ERROR:", err);

      return interaction.editReply("Rename failed (check permissions or channel type).");
    }
  }
});

client.login(process.env.TOKEN);
