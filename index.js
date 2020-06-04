require("dotenv").config();
const fs = require("fs");
const Discord = require("discord.js");

const User = require("./models/User");

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.PREFIX;

const client = new Discord.Client();
client.commands = new Discord.Collection();

// reads all .js files from commands folder
const commandFiles = fs
	.readdirSync("./commands")
	.filter((file) => file.endsWith(".js"));

// configures commands
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", async (message) => {
	// doesn't have correct prefix or is bot
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	// splits the argument to an array eg '!duel @hawkmaster' => ['!','duel','@hawkmaster']
	const args = message.content.slice(prefix.length).split(/ +/);
	// removes prefix and sets to lowercase
	const commandName = args.shift().toLowerCase();

	// looks for command or the alias of a command
	const command =
    client.commands.get(commandName) ||
    client.commands.find(
    	(cmd) => cmd.aliases && cmd.aliases.includes(commandName),
    );

	// if not found, do nothing
	if (!command) return;

	// if no arguments provided when argument is expected. eg '!duel' (should be '!duel @fenrew')
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		// returns how to actually use the command
		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		// sends the reply
		return message.channel.send(reply);
	}

	const { author } = message;
	const userExist = await User.exists({ "account.userId": author.id });
	let userProfile;
	if (!userExist) {
		// creates new user if not exist
		userProfile = await createNewUser(author);
	}
	else {
		// finds the user if it exist in database
		userProfile = await User.findOne({ "account.userId": author.id });
	}
	// executes the command
	try {
		command.execute(message, args, userProfile);
	}
	catch (error) {
		console.error(error);
		message.reply("there was an error trying to execute that command!");
	}
});

client.login(token);

const createNewUser = (user) => {
	if (user.bot) {
		console.error("No bots allowed");
		return;
	}
	const account = {
		username: user.username,
		userId: user.id,
	};
	const newUser = new User({
		account,
	});
	return newUser.save();
};
