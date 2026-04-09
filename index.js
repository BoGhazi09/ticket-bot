const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(3000, () => console.log("Web server started"));

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  // Added GuildMessages to ensure it can see interactions in threads
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const PILOT_ROLE_ID = "1478564123259310090";
const CLAIM_PREFIX = "CLAIMED_BY:";

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
    console.log("Commands registered");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { channel, member, commandName, user } = interaction;

  // 1. Check Permissions
  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", ephemeral: true });
  }

  // 2. Handle Claim Logic
  if (commandName === "claimticket") {
    await interaction.deferReply({ ephemeral: true });

    try {
      // NOTE: Standard Threads do NOT have topics. 
      // We will check the channel name for the prefix instead.
      if (channel.name.includes("-claimed-")) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${channel.name}-claimed-${cleanUsername}`;

      await channel.setName(newName);
      
      // If it's a thread, we can't set a topic, so we send a message instead
      return interaction.editReply(`Ticket successfully claimed by **${user.username}**.`);

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return interaction.editReply("Claim failed. Does the bot have 'Manage Channels' or 'Manage Threads' permissions?");
    }
  }

  // 3. Handle Unclaim Logic
  if (commandName === "unclaimticket") {
    await interaction.deferReply({ ephemeral: true });

    try {
      if (!channel.name.includes("-claimed-")) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Logic to strip the "-claimed-username" part
      // This splits at the start of the claim string and takes the first part
      const baseName = channel.name.split("-claimed-")[0];

      await channel.setName(baseName);
      return interaction.editReply("Ticket has been unclaimed.");

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);
      return interaction.editReply("Unclaim failed. Check bot permissions.");
    }
  }
});

client.login(process.env.TOKEN);
