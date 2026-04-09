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
const CLAIM_SEPARATOR = "-claimed-by-"; // Using a unique string for easy splitting

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
  } catch (err) {
    console.error(err);
  }
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
  // CLAIM LOGIC
  // ======================
  if (commandName === "claimticket") {
    try {
      // Check if already claimed
      if (channel.name.includes(CLAIM_SEPARATOR)) {
        return interaction.editReply("This ticket is already claimed!");
      }

      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      const newName = `${channel.name}${CLAIM_SEPARATOR}${cleanUser}`;

      await channel.setName(newName);
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to claim. (Rate limit or Permissions issue)");
    }
  }

  // ======================
  // UNCLAIM LOGIC
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (!channel.name.includes(CLAIM_SEPARATOR)) {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      // Split at the separator and take the first part (the original name)
      const originalName = channel.name.split(CLAIM_SEPARATOR)[0];

      await channel.setName(originalName);
      await interaction.editReply("Ticket unclaimed and reset.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to unclaim. Discord limits name changes to 2 per 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);
