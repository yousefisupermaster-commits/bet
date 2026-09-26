const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// إنشاء سيرفر وهمي يبقي البوت نشطاً على منصات الاستضافة
const app = express();
app.get('/', (req, res) => res.send('Bot is Online!'));
app.listen(3000, () => console.log('Web server ready.'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DATA_FILE = path.join(__dirname, 'data.json');

// دالة لقراءة رصيد النقاط من الملف
function loadBalances() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
        return {};
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading data.json:', err);
        return {};
    }
}

// دالة لحفظ النقاط في الملف
function saveBalances(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error writing to data.json:', err);
    }
}

const PREFIX = '!';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    const balances = loadBalances();

    // إعطاء المستخدم 100 نقطة كمكافأة بداية إذا كان جديداً
    if (balances[userId] === undefined) {
        balances[userId] = 100;
        saveBalances(balances);
    }

    // 1. أمر الاستعلام عن الرصيد (!bal أو !balance)
    if (command === 'bal' || command === 'balance') {
        const points = balances[userId];
        return message.reply(`💰 رصيدك الحالي هو: **${points}** نقطة.`);
    }

    // 2. أمر المراهنة (!bet <المبلغ>)
    if (command === 'bet') {
        const amount = parseInt(args[0]);
        const currentBalance = balances[userId];

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يرجى إدخال مبلغ صحيح للمراهنة. مثال: `!bet 50`');
        }

        if (amount > currentBalance) {
            return message.reply(`❌ ليس لديك نقاط كافية! رصيدك الحالي: **${currentBalance}**`);
        }

        // نسبة الفوز 45% والخسارة 55%
        const isWin = Math.random() < 0.45;

        if (isWin) {
            balances[userId] += amount;
            saveBalances(balances);
            return message.reply(`🎉 **مبروك!** كسبت **${amount}** نقطة. رصيدك الجديد: **${balances[userId]}**`);
        } else {
            balances[userId] -= amount;
            saveBalances(balances);
            return message.reply(`📉 **للأسف!** خسرت **${amount}** نقطة. رصيدك الجديد: **${balances[userId]}**`);
        }
    }

    // 3. أمر إضافة نقاط للمستخدمين (!addpoints @user <المبلغ>) - للأدمن فقط
    if (command === 'addpoints') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ ليس لديك صلاحية أدمن لاستخدام هذا الأمر!');
        }

        const targetUser = message.mentions.users.first();
        const amountToAdd = parseInt(args[1]);

        if (!targetUser || isNaN(amountToAdd)) {
            return message.reply('❌ الاستخدام الصحيح: `!addpoints @User 500`');
        }

        const targetId = targetUser.id;
        balances[targetId] = (balances[targetId] || 0) + amountToAdd;
        saveBalances(balances);

        return message.reply(`✅ تم إضافة **${amountToAdd}** نقطة لـ <@${targetId}>. رصيده الجديد: **${balances[targetId]}**`);
    }
});

// تسجيل الدخول باستخدام التوكن الممرر في بيئة التشغيل
client.login(process.env.TOKEN);