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

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  } catch (err) { console.error(err); }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { channel, member, commandName, user } = interaction;

  if (!member.roles.cache.has(PILOT_ROLE_ID)) {
    return interaction.reply({ content: "No permission.", flags: MessageFlags.Ephemeral });
  }

  // Defer immediately to prevent "Interaction Failed"
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // If the name already ends with this user, don't do it again
      if (channel.name.endsWith("-" + cleanUser)) {
        return interaction.editReply("You already claimed this!");
      }

      const newName = `${channel.name}-${cleanUser}`;
      await channel.setName(newName);
      await interaction.editReply(`Claimed: ${newName}`);
    } catch (err) {
      await interaction.editReply("Claim failed. You are likely rate-limited (2 per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const currentName = channel.name;
      const lastHyphenIndex = currentName.lastIndexOf("-");

      // If there is no hyphen, it's already unclaimed
      if (lastHyphenIndex === -1) {
        return interaction.editReply("This ticket is not claimed.");
      }

      // Cut the name at the very last hyphen found
      const restoredName = currentName.substring(0, lastHyphenIndex);

      await channel.setName(restoredName);
      await interaction.editReply(`Unclaimed: ${restoredName}`);
    } catch (err) {
      await interaction.editReply("Unclaim failed. Discord limit reached. Wait 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);
