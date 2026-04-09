const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(3000, () => console.log("Web server started"));

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const PILOT_ROLE_ID = "1478564123259310090";

const commands = [
  new SlashCommandBuilder().setName("claimticket").setDescription("Claim this ticket"),
  new SlashCommandBuilder().setName("unclaimticket").setDescription("Unclaim this ticket")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered");
  } catch (err) { console.error(err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) { return; }

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      // If there is already a topic, it means the original name is stored there (already claimed)
      if (channel.topic && channel.topic.length > 0) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const originalName = channel.name;
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${originalName}-${cleanUser}`;

      // 1. Store the original name in the topic first
      await channel.setTopic(originalName);
      // 2. Rename the channel
      await channel.setName(newName);
      
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (You are likely rate-limited. Wait 10 mins!)");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      // If the topic is empty, there is nothing to restore
      if (!channel.topic || channel.topic.length === 0) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      const originalName = channel.topic;

      // 1. Restore the name from the topic "Vault"
      await channel.setName(originalName);
      // 2. Clear the topic so it can be claimed again later
      await channel.setTopic(""); 
      
      await interaction.editReply("Ticket unclaimed and reset.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Wait 10 mins for Discord rate limits!)");
    }
  }
});

client.login(process.env.TOKEN);
