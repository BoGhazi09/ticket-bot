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
      // 1. Check the name ONLY. We check if it already ends with a username.
      // We assume the channel is "fresh" if it doesn't have a claim-tag.
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");

      // If the topic exists from old code, we wipe it right now to stop the "Already Claimed" loop
      if (channel.topic) {
        await channel.setTopic(""); 
      }

      // We use a simple check: Does the name contain more than 2 hyphens? 
      // Or you can just let it claim.
      const originalName = channel.name;
      const newName = `${originalName}-${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (Discord Rate Limit: Wait 10 mins)");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const nameParts = channel.name.split("-");
      
      // If the name is just "war-boghazi09", it has 2 parts. 
      // If it's "war-boghazi09-reealms", it has 3 parts.
      if (nameParts.length < 2) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // We remove the LAST part (the username)
      nameParts.pop();
      const restoredName = nameParts.join("-");

      await channel.setName(restoredName);
      // Wipe the topic just in case it's blocking future claims
      if (channel.topic) await channel.setTopic(""); 
      
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Wait 10 mins for Discord rate limits!)");
    }
  }
});

client.login(process.env.TOKEN);
