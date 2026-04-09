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

  // We use a specific identifier to ensure the loop works
  const CLAIM_TAG = "-claimedby-";

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      // 1. Check if already claimed
      if (channel.name.includes(CLAIM_TAG)) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${channel.name}${CLAIM_TAG}${cleanUser}`;

      // We wipe the topic just in case old code left "Already Claimed" text there
      if (channel.topic) await channel.setTopic(""); 

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);

    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (Discord Rate Limit: You can only rename a channel twice every 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (!channel.name.includes(CLAIM_TAG)) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Split at the tag and take the FIRST part (the original name)
      const parts = channel.name.split(CLAIM_TAG);
      const originalName = parts[0];

      await channel.setName(originalName);
      
      // Safety: Clear topic again
      if (channel.topic) await channel.setTopic(""); 

      await interaction.editReply("Ticket unclaimed. You can now claim it again.");

    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Discord Rate Limit: Wait 10 minutes to rename again).");
    }
  }
});

client.login(process.env.TOKEN);
