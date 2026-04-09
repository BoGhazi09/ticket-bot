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
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // If the channel name already ends with ANY username-like string after a hyphen, 
      // but we want to be safe, we check if it already contains the user's name.
      if (channel.name.endsWith(`-${cleanUser}`)) {
        return interaction.editReply("You have already claimed this ticket!");
      }

      // To prevent claiming twice, we check if the channel has a topic "CLAIMED"
      // I've added a fallback so it doesn't get stuck.
      if (channel.topic === "CLAIMED") {
        return interaction.editReply("This ticket is already claimed by someone else!");
      }

      const originalName = channel.name;
      const newName = `${originalName}-${cleanUser}`;

      // Set topic to "CLAIMED" to act as a simple toggle
      await channel.setTopic("CLAIMED");
      await channel.setName(newName);
      
      await interaction.editReply(`Ticket claimed by **${user.username}**.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. (Discord Rate Limit: Max 2 renames per 10 mins)");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      if (channel.topic !== "CLAIMED") {
        return interaction.editReply("This ticket is not currently claimed.");
      }

      const nameParts = channel.name.split("-");
      if (nameParts.length < 2) {
        // If there's no hyphen, we just clear the topic
        await channel.setTopic("");
        return interaction.editReply("Ticket status reset.");
      }

      // Remove the last part (the username)
      nameParts.pop();
      const restoredName = nameParts.join("-");

      await channel.setName(restoredName);
      await channel.setTopic(""); // Clear the claimed status
      
      await interaction.editReply("Ticket unclaimed.");
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. (Wait 10 mins for Discord rate limits!)");
    }
  }
});

client.login(process.env.TOKEN);
