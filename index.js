const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running on port 3000");
});

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const PILOT_ROLE_ID = "1478564123259310090";

const CLAIMED_BY = "CLAIMED_BY:";
const ORIGINAL_NAME = "ORIGINAL_NAME:";

// commands
const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket"),

  new SlashCommandBuilder()
    .setName("unclaimticket")
    .setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const channel = interaction.channel;
  const member = interaction.member;

  if (!channel) return;

  const isPilot = member.roles.cache.has(PILOT_ROLE_ID);

  if (!isPilot) {
    return interaction.reply({
      content: "No permission.",
      ephemeral: true
    });
  }

  // ======================
  // CLAIM
  // ======================
  if (interaction.commandName === "claimticket") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const topic = channel.topic || "";

      if (topic.startsWith(CLAIMED_BY)) {
        return interaction.editReply("This ticket is already claimed.");
      }

      const username = interaction.user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

      const originalName = channel.name;
      const newName = `${originalName}-${username}`;

      await channel.setName(newName);
      await channel.setTopic(`${CLAIMED_BY}${interaction.user.id}|${ORIGINAL_NAME}${originalName}`);

      return interaction.editReply(`Claimed by ${username}`);

    } catch (err) {
      console.error("CLAIM ERROR:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "Claim failed.",
          ephemeral: true
        });
      }
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (interaction.commandName === "unclaimticket") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const topic = channel.topic || "";

      if (!topic.includes(CLAIMED_BY)) {
        return interaction.editReply("This ticket is not claimed.");
      }

      const originalPart = topic
        .split("|")
        .find(p => p.startsWith(ORIGINAL_NAME));

      if (!originalPart) {
        return interaction.editReply("Original name missing.");
      }

      const originalName = originalPart.replace(ORIGINAL_NAME, "");

      await channel.setName(originalName);
      await channel.setTopic("");

      return interaction.editReply("Ticket unclaimed.");

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);

      if (!interaction.replied) {
        return interaction.reply({
          content: "Unclaim failed.",
          ephemeral: true
        });
      }
    }
  }
});

client.login(process.env.TOKEN);
