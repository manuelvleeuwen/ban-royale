import process from 'node:process';
import { Events, Client, GatewayIntentBits, SlashCommandBuilder, Routes } from 'discord.js';

if (process.env.NODE_ENV === 'production') process.setUncaughtExceptionCaptureCallback(console.error);

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
];

const client = new Client({ intents });

const commands = [
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user')
        .setDMPermission(false)
        .addUserOption(option => option.setName('member').setDescription('The member to ban').setRequired(true)),
];

client.on(Events.ClientReady, async client => {
    console.log(`Logged in as ${client.user.tag}!`);

    const route = Routes.applicationCommands(client.application.id);

    await client.rest.put(route, { body: commands.map(command => command.toJSON()) });
});

client.on(Events.MessageCreate, async message => {
    const prefix = '?';

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    if (!message.inGuild()) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);

    const command = args.shift()?.toLowerCase();

    switch (command) {
        case 'ban': {
            const arg = args.shift();

            if (!arg) return void message.reply('You need to provide a member to ban!');

            const id = !isNaN(+arg) ? arg : (arg.match(/(?:<@!?)(\d+)>?/) ?? [])[1];

            if (!id) return void message.reply('You need to provide a valid member to ban!');

            const member = await message.guild.members.fetch(id).catch(() => null);

            if (!member) return void message.reply('You need to provide a valid member to ban!');

            if (member.user.bot) return void message.reply('You cannot ban bots!');

            if (!member.bannable) return void message.reply('I cannot ban that member!');

            await member.ban({ reason: `Banned by ${message.author.tag} (${message.author.id})` });

            await message.reply(`Banned **${member.user.tag}**!`);
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.inCachedGuild()) return;

    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply();

    const user = interaction.options.getUser('member', true);

    if (user.bot) return void interaction.editReply('You cannot ban bots!');

    const member = await interaction.guild.members.fetch(user);

    if (!member.bannable) return void interaction.editReply('I cannot ban that member!');

    await member.ban({ reason: `Banned by ${interaction.user.tag} (${interaction.user.id})` });

    await interaction.editReply(`Banned **${member.user.tag}**!`);
});

client.login(process.env.DISCORD_TOKEN);
