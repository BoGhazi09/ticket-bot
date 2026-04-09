const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(3000, () => {
  console.log("Web server running");
});

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CLAIMED_TAG = "CLAIMED_BY:";

const commands = [
  new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket and rename the channel")
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

    const pilotRoleId = "1478564123259310090";
    const ownerRoleId = "1478554422303916185";

    const member = interaction.member;
    const channel = interaction.channel;

    if (!channel) {
      return interaction.reply({ content: "Channel not found.", ephemeral: true });
    }

    const isOwner = member.roles.cache.has(ownerRoleId);
    const isPilot = member.roles.cache.has(pilotRoleId);

    if (!isPilot && !isOwner) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true
      });
    }

    const topic = channel.topic || "";
    const alreadyClaimed = topic.includes(CLAIMED_TAG);

    if (alreadyClaimed && !isOwner) {
      return interaction.reply({
        content: "This ticket is already claimed.",
        ephemeral: true
      });
    }

    const username = interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // clean name (remove last part)
    let baseName = channel.name;
    const parts = baseName.split("-");
    if (parts.length > 1) {
      baseName = parts.slice(0, -1).join("-");
    }

    const newName = `${baseName}-${username}`;

    // 🔴 DEBUG RENAME
    try {
      await channel.setTopic(`${CLAIMED_TAG}${interaction.user.id}`);
      await channel.setName(newName);
    } catch (err) {
      console.error("RENAME ERROR:", err);

      return interaction.reply({
        content: "Failed to rename channel. Check Render logs.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `Ticket claimed by ${interaction.user.username}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
