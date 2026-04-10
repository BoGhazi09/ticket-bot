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

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "");

  // ======================
  // CLAIM
  // ======================
  if (commandName === "claimticket") {
    try {
      if (channel.name.endsWith("-" + cleanUser)) {
        return interaction.editReply("You already claimed this ticket!");
      }

      // Check if claimed by someone else — look for any pilot's suffix
      // Simple approach: warn if name already looks claimed (has any suffix after last hyphen)
      // You can expand this if you store claim state externally
      const newName = `${channel.name}-${cleanUser}`;

      if (newName.length > 100) {
        return interaction.editReply("Channel name would exceed Discord's 100-character limit.");
      }

      await channel.setName(newName);
      await interaction.editReply(`✅ Claimed: \`${newName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Claim failed. You may be rate-limited (2 renames per 10 mins).");
    }
  }

  // ======================
  // UNCLAIM
  // ======================
  if (commandName === "unclaimticket") {
    try {
      const currentName = channel.name;
      const suffix = "-" + cleanUser;

      // Only allow unclaim if the channel ends with THIS user's suffix
      if (!currentName.endsWith(suffix)) {
        // Give a more helpful message depending on context
        const isClaimed = currentName.lastIndexOf("-") !== -1;
        if (isClaimed) {
          return interaction.editReply("You didn't claim this ticket — only the claimer can unclaim it.");
        } else {
          return interaction.editReply("This ticket is not claimed.");
        }
      }

      // Safely remove only this user's suffix from the end
      const restoredName = currentName.slice(0, currentName.length - suffix.length);

      if (!restoredName) {
        return interaction.editReply("Cannot unclaim: restoring the name would leave it empty.");
      }

      await channel.setName(restoredName);
      await interaction.editReply(`✅ Unclaimed: \`${restoredName}\``);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Unclaim failed. Discord rate limit reached — wait 10 mins.");
    }
  }
});

client.login(process.env.TOKEN);
