require("dotenv").config();

const Discord = require("discord.js");
const Guild2Channel = {};
const Airtable = require("airtable");
const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
  process.env.BASE
);
const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

const getReapChannel = async (id) => {
  if (Guild2Channel[id]) {
    return Guild2Channel[id];
  }
  let records = await base("Guilds")
    .select({ filterByFormula: `{GuildID}='${id}'` })
    .all();
  Guild2Channel[id] = records[0].get("Channel");
  return records[0].get("Channel");
};

client.on("message", async (m) => {
  if (m.content == "!setchannel") {
    let records = await base("Guilds")
      .select({ filterByFormula: `{GuildID}='${m.guild.id}'` })
      .all();
    if (records.length == 0) {
      await base("Guilds").create([
        {
          fields: {
            GuildID: m.guild.id,
            Time: Date.now() / 1000,
            Channel: m.channel.id,
          },
        },
      ]);
      Guild2Channel[m.guild.id] = m.channel.id;
      m.reply(`Set the reaper channel to <#${m.channel.id}>`);
    } else {
      await records[0].updateFields({
        Channel: m.channel.id,
      });
      Guild2Channel[m.guild.id] = m.channel.id;
      m.reply(`Set the reaper channel to <#${m.channel.id}>`);
    }
  }

  if ((await getReapChannel(m.guild.id)) == m.channel.id) {
    switch (m.content.toLowerCase()) {
      case "reap":
        let now = Math.floor(Date.now() / 1000);
        let person = await base("People")
          .select({ filterByFormula: `{Tag}='${m.author.id}'` })
          .all();
        if (person.length == 0) {
          let guild = await base("Guilds")
            .select({ filterByFormula: `{GuildID}='${m.guild.id}'` })
            .all();
          let newNumber = now - guild[0].get("Time");
          await base("People").create([
            {
              fields: {
                Tag: m.author.id,
                Guild: [guild[0].id],
                Points: newNumber,

                Last: now,
              },
            },
          ]);
          guild[0].updateFields({
            Time: now,
          });

          m.reply(
            `REAPPPEEDDDD!!! You now have ${Math.floor(newNumber)} points`
          );
        } else {
          if (now - person[0].get("Last") < 43200) {
            m.reply(
              `NOOOO you need to wait 12 hours. So fair you have waited ${new Date(
                (now - person[0].get("Last")) * 1000
              )
                .toISOString()
                .substr(11, 8)} hours`
            );
            return;
          }
          let newNumber =
            person[0].get("Points") + (now - person[0].get("Time"));
          person[0].updateFields({
            Points: newNumber,
            Last: now,
          });
          await base("Guilds").update([
            {
              id: person[0].get("Guild")[0],
              fields: {
                Time: now,
              },
            },
          ]);

          m.reply(
            `REAPPPEEDDDD!!! You now have ${Math.floor(newNumber)} points`
          );
        }
        break;
      case "timer":
        let guild = await base("Guilds")
          .select({ filterByFormula: `{GuildID}='${m.guild.id}'` })
          .all();
        m.reply(
          `The reap time is ${Math.floor(
            Date.now() / 1000 - guild[0].get("Time")
          )} mwhahahah`
        );
        break;
      case "rank":
        let checkPerson = await base("People")
          .select({ filterByFormula: `{Tag}='${m.author.id}'` })
          .all();
        if (checkPerson.length == 0) {
          m.reply("yOUUUu HAvEbvveVe 0 point you fuggin loozer");
        } else {
          m.reply(
            `Theee has ${checkPerson[0].get(
              "Points"
            )} points. I shall reappp YOU SOON mAHAHWHAGHW`
          );
        }
        break;
      case "start":
        break;
      case "leaderboard":
        let people = await base("People")
          .select({
            filterByFormula: `{GuildID}='${m.guild.id}'`,
          })
          .all();

        people = people.map((person) => {
          return { did: person.get("Tag"), points: person.get("Points") };
        });

        people.sort((a, b) => b.points - a.points);

        m.channel.send(
          `LEADERBOARD:\n\n${people
            .map((v, i) => `#${i + 1}) <@${v.did}>: ${v.points}\n`)
            .join("")}`
        );
        break;
    }
  }
});

client.login(process.env.BOT_TOKEN);
