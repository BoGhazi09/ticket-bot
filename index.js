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
  } catch (err) { console.error("Register Error:", err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  // Use defer to stop the "thinking" spinner
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (e) { return; }

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // Safety: If name already ends with -username, don't rename (prevents crash)
      if (channel.name.endsWith(`-${cleanUser}`)) {
        return interaction.editReply("You have already claimed this ticket.");
      }

      const newName = `${channel.name}-${cleanUser}`;
      await channel.setName(newName);
      return interaction.editReply(`Ticket claimed: **${newName}**`);

    } catch (err) {
      console.error("CLAIM ERROR:", err);
      return interaction.editReply("Claim failed. You might be rate-limited (2 renames per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const nameParts = channel.name.split("-");
      
      if (nameParts.length < 2) {
        return interaction.editReply("This ticket is not claimed.");
      }

      // Pop the last part (the username)
      nameParts.pop();
      const restoredName = nameParts.join("-");

      // Safety: If the name is already the restored name, just finish
      if (channel.name === restoredName) {
        return interaction.editReply("Ticket is already unclaimed.");
      }

      await channel.setName(restoredName);
      return interaction.editReply(`Ticket unclaimed: **${restoredName}**`);

    } catch (err) {
      console.error("UNCLAIM ERROR:", err);
      return interaction.editReply("Unclaim failed. Discord limits renames to 2 per 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);
