"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const axios = require("axios");
const path = require('path');
const png = require('png-metadata');
const fs = require('fs');

exports.name = "oobabooga-testbot";
exports.usage = `
### ！！使用教程！！
https://forum.koishi.xyz/t/topic/2391<br>
https://www.bilibili.com/read/cv24006101? <br>

### 用前需知
当前为正式版本1.3.0<br>
注意！插件更新会导致历史记录与人设重置，请自行保存相关文档！<br>
人设位置：koishi-plugin-oobabooga-testbot\lib\characters<br>
历史记录位置：koishi-plugin-oobabooga-testbot\lib\sessionData<br>

使用前需要自行架设oobabooga-text-generation-webui<br>
github上有一键安装包，包含Windows，Linux，Mac。<br>
github地址:https://github.com/oobabooga/text-generation-webui<br>
架设完成需要打开api服务才行，默认端口号为：http://localhost:5000/api/v1/generate<br>

支持使用Vits语音输出回复了，如果需要使用vits的话需要加载open-vits插件。<br>
open-vits插件：https://github.com/initialencounter/koishi-plugin-open-vits#readme<br>
自建vits后端：https://github.com/Artrajz/vits-simple-api<br>

支持使用语言模型补充tag，并调用AI绘图插件进行绘图了。<br>
NovelAI插件：https://bot.novelai.dev/<br>
rryth插件：https://github.com/MirrorCY/rryth#readme<br>
自建stable-diffusion：秋叶一键包：https://www.bilibili.com/video/BV1iM4y1y7oA/?spm_id_from=333.999.0.0&vd_source=1344ddffb6379f56c5809630eedd7062<br>

### QQ讨论群：719518427
有疑问，出现bug，有改进想法都可以加qq群讨论<br>

### 推荐使用的语言模型：
chatglm-6b：https://huggingface.co/THUDM/chatglm-6b<br>
（注意：chatglm-6b模型需要额外安装icetk,pip install icetk）<br>
RWKV系列模型：https://huggingface.co/RWKV<br>
（注意：RWKV模型由于架构不同，加载模型会出现问题，具体查看手册：https://github.com/oobabooga/text-generation-webui/blob/main/docs/RWKV-model.md）<br>
vicuna-13b-1.1：https://huggingface.co/anon8231489123/vicuna-13b-GPTQ-4bit-128g<br>
stable-vicuna-13B：https://huggingface.co/TheBloke/stable-vicuna-13B-GPTQ<br>
Wizard-Vicuna-13B：https://huggingface.co/TheBloke/Wizard-Vicuna-13B-Uncensored-GPTQ<br>
等模型<br>

### 人设网址分享与处理：
（需要科学上网，直接下载人设png图片文件放入插件根目录下的PNGfile文件，使用oob.readMetadata，就会自动在Metadata文件夹下生成人设文件，需要手动进一步处理）<br>
https://www.characterhub.org/<br>
https://booru.plus/+pygmalion<br>

### 新版本新增：
调整了用前须知，更新了新版本oobabooga的调用格式，增加更多高级选项。<br>
优化了oob.tag指令，新增oob.readMetadata指令，读取png格式的人设文件，读取转化为json格式的人设文件，进一步处理等下个版本发出。<br>
`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        apiURL: koishi_1.Schema.string()
            .description("API服务器地址")
            .default("http://localhost:5000/api/v1/generate"),
        historyLimit: koishi_1.Schema.number()
            .description("历史记录上限(注意这里指的是句子数量，一组对话有两个句子。)")
            .default(10),
        outputMode: koishi_1.Schema.union([
            koishi_1.Schema.const("text").description("只返回文字"),
            koishi_1.Schema.const("voice").description("只返回语音"),
            koishi_1.Schema.const("both").description("同时返回语音与文字"),
            koishi_1.Schema.const("debug").description("调试模式，将返回未处理的文本"),
        ])
            .description("输出模式")
            .default("text"),
        randnum: koishi_1.Schema.number()
            .description("随机回复触发概率，注意这里是百分比，输入0.1就是大约10%的概率")
            .default(0),
        if_at: koishi_1.Schema.boolean()
            .description("是否开启@回复")
            .default(false),
        nicknames: koishi_1.Schema.array(koishi_1.Schema.string())
            .description("昵称，当消息包含这些昵称时将触发 oob 指令")
            .default([]),
        send_glmmtg_response: koishi_1.Schema.boolean()
            .description("使用oob.tag的时候是否会发送tag到会话框")
            .default(false),
        prefix: koishi_1.Schema.string().description("跑图机器人的前缀")
            .default("rr"),
    }).description('基础设置'),
    koishi_1.Schema.object({
        max_new_tokens: koishi_1.Schema.string().description("max_new_tokens")
            .default("250"),
        do_sample: koishi_1.Schema.string().description("do_sample")
            .default("true"),
        do_sample: koishi_1.Schema.string().description("do_sample")
            .default("true"),
        temperature: koishi_1.Schema.string().description("temperature")
            .default("1.3"),
        top_p: koishi_1.Schema.string().description("top_p")
            .default("0.1"),
        typical_p: koishi_1.Schema.string().description("typical_p")
            .default("1"),
        epsilon_cutoff: koishi_1.Schema.string().description("epsilon_cutoff")
            .default("0"),
        eta_cutoff: koishi_1.Schema.string().description("eta_cutoff")
            .default("0"),
        repetition_penalty: koishi_1.Schema.string().description("repetition_penalty")
            .default("1.18"),
        top_k: koishi_1.Schema.string().description("top_k")
            .default("40"),
        min_length: koishi_1.Schema.string().description("min_length")
            .default("0"),
        no_repeat_ngram_size: koishi_1.Schema.string().description("no_repeat_ngram_size")
            .default("0"),
        num_beams: koishi_1.Schema.string().description("num_beams")
            .default("1"),
        penalty_alpha: koishi_1.Schema.string().description("penalty_alpha")
            .default("0"),
        length_penalty: koishi_1.Schema.string().description("length_penalty")
            .default("1"),
        early_stopping: koishi_1.Schema.string().description("early_stopping")
            .default("false"),
        mirostat_mode: koishi_1.Schema.string().description("mirostat_mode")
            .default("0"),
        mirostat_tau: koishi_1.Schema.string().description("mirostat_tau")
            .default("5"),
        mirostat_eta: koishi_1.Schema.string().description("mirostat_eta")
            .default("0.1"),
        seed: koishi_1.Schema.string().description("seed")
            .default("-1"),
        add_bos_token: koishi_1.Schema.string().description("add_bos_token")
            .default("true"),
        truncation_length: koishi_1.Schema.string().description("truncation_length")
            .default("2048"),
        ban_eos_token: koishi_1.Schema.string().description("ban_eos_token")
            .default("false"),
        skip_special_tokens: koishi_1.Schema.string().description("skip_special_tokens")
            .default("true"),
        stopping_strings: koishi_1.Schema.string().description("stopping_strings")
            .default("[]"),
    }).description('高阶设置，如果你不知道你在干什么，请不要修改，保持默认'),
]);


const sessionMap = {
    create(id) {
        let safeId = encodeURIComponent(id);
        fs.writeFileSync(`${__dirname}/sessionData/${safeId}.json`, JSON.stringify([]));
    },
    checkCharacter(characterName) {
        return fs.existsSync(`${__dirname}/characters/${characterName}.json`);
    },
    checkHistory(id) {
        let safeId = encodeURIComponent(id);
        return fs.existsSync(`${__dirname}/sessionData/${safeId}.json`);
    },
    saveHistory(id, history) {
        let safeId = encodeURIComponent(id);
        let filteredHistory = history.filter(message => message !== "");
        fs.writeFileSync(`${__dirname}/sessionData/${safeId}.json`, JSON.stringify(filteredHistory));
    },
    getCharacter(characterName) {
        if (this.checkCharacter(characterName)) {
            let characterObj = JSON.parse(fs.readFileSync(`${__dirname}/characters/${characterName}.json`));
            return characterObj;
        } else {
            return null;
        }
    },
    getHistory(id) {
        let safeId = encodeURIComponent(id);
        let filePath = `${__dirname}/sessionData/${safeId}.json`;
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath);
            if (content.length > 0) {
                return JSON.parse(content);
            } else {
                return [];
            }
        } else {
            return null;
        }
    },
}

function readMetadata() {
    const sourceDir = path.join(__dirname, 'PNGfile');
    const targetDir = path.join(__dirname, 'Metadata');
    const fileNames = fs.readdirSync(sourceDir);
    const pngFileNames = fileNames.filter(fileName => path.extname(fileName) === '.png');
    pngFileNames.forEach(pngFileName => {
        const pngFilePath = path.join(sourceDir, pngFileName);
        const fileData = png.readFileSync(pngFilePath);
        const chunks = png.splitChunk(fileData);

        const metadata = {};
        for (const chunk of chunks) {
            if (chunk.type === 'tEXt') {
                const metadataString = chunk.data.toString('utf8');
                const [key, value] = metadataString.split('\x00');
                const decodedValue = Buffer.from(value, 'base64').toString('utf8');
                metadata[key] = JSON.parse(decodedValue); 
            }
        }
        const jsonFileName = path.join(targetDir, path.basename(pngFileName, '.png') + '.json');
        fs.writeFileSync(jsonFileName, JSON.stringify(metadata, null, 2), 'utf8');
    });
}


async function apply(ctx, config) {
    const oob = ctx.command("oob <message...>", "与AI模型进行对话，基于oobabooga")
        .action(async ({ session }, ...msg) => {
            let message = msg.join(' ');
            // 解析人设名称
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 请先使用oob.load选择人设。\n 所有人设可以使用oob.list查看 \n 当前id: ${session.channelId.toString()} , ${session.userId.toString()}`;
            }
            let sessionId = session.channelId.toString() + "-" + session.userId.toString() + "-" + characterName;
            let history = sessionMap.getHistory(sessionId);

            // 加载人设文件
            let character = sessionMap.getCharacter(characterName);

            // 更新历史记录
            if (history.length >= config.historyLimit) {
                history.shift();
            }
            history.push("You:||" + message + "||");
            let historyStr = character.concat(history).join("\n");
            let prompt = historyStr;

            let request = {
                'prompt': prompt,
                'max_new_tokens': config.max_new_tokens,
                'do_sample': config.do_sample,
                'temperature': config.temperature,
                'top_p': config.top_p,
                'typical_p': config.typical_p,
                'epsilon_cutoff': config.epsilon_cutoff,
                'eta_cutoff': config.eta_cutoff,
                'repetition_penalty': config.repetition_penalty,
                'top_k': config.top_k,
                'min_length': config.min_length,
                'no_repeat_ngram_size': config.no_repeat_ngram_size,
                'num_beams': config.num_beams,
                'penalty_alpha': config.penalty_alpha,
                'length_penalty': config.length_penalty,
                'early_stopping': config.early_stopping,
                'mirostat_mode': config.mirostat_mode,
                'mirostat_tau': config.mirostat_tau,
                'mirostat_eta': config.mirostat_eta,
                'seed': config.seed,
                'add_bos_token': config.add_bos_token,
                'truncation_length': config.truncation_length,
                'ban_eos_token': config.ban_eos_token,
                'skip_special_tokens': config.skip_special_tokens,
                'stopping_strings': config.stopping_strings
            };

            let response = await axios.post(config.apiURL, request);
            if (response.status == 200) {
                let fullResult = response.data['results'][0]['text'];
                let firstIndex = fullResult.indexOf('||') + 2;
                let secondIndex = fullResult.indexOf('||', firstIndex);
                if (secondIndex == -1) {
                    return "模型格式错误，请联系管理员矫正。\n 以下是完整回复:" + fullResult;
                }
                let result = fullResult.slice(firstIndex, secondIndex).trim();
                if (history.length >= config.historyLimit) {
                    history.shift();
                }
                history.push(characterName + ":||" + result + "||");
                // 将历史记录保存到文件
                sessionMap.saveHistory(sessionId, history);
                let resultText = String((0, koishi_1.h)("at", { id: session.userId })) + String(result);
                if (config.outputMode == 'text' || config.outputMode == 'both') {
                    await session.send(resultText);
                }
                if (config.outputMode == 'voice' || config.outputMode == 'both') {
                    await session.execute(`say "${result}"`);
                }
                if (config.outputMode == 'debug') {
                    await session.send(fullResult);;
                }
            } else {
                return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
            }
        });


    ctx.command('oob.load <character>', "加载人设并创建新的历史记录")
        .action(async ({ session }, character) => {
            if (sessionMap.checkCharacter(character)) {
                let channelId = session.channelId.toString();
                let userId = session.userId.toString();
                let files = fs.readdirSync(`${__dirname}/sessionData/`);
                for (let i = 0; i < files.length; i++) {
                    let parts = files[i].split('-');
                    if (parts.length === 3 && parts[0] === encodeURIComponent(channelId) && parts[1] === encodeURIComponent(userId)) {
                        return `已存在一个历史记录，与用户 ${userId} 在频道 ${channelId} 的会话对应。请不要重复创建。`;
                    }
                }
                let sessionId = channelId + "-" + userId + "-" + character;
                sessionMap.create(sessionId);
                return `人设 ${character} 已加载，新的历史记录已创建。`;
            } else {
                return `未找到人设 ${character}。`;
            }
        });


    ctx.command('oob.del', "删除当前用户的历史记录文件，需要重新使用load指令创建。")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString()} \n ${session.userId.toString()}`;
            } else {
                let sessionId = session.channelId.toString() + "-" + session.userId.toString() + "-" + characterName;
                let safeId = encodeURIComponent(sessionId);
                fs.unlinkSync(`${__dirname}/sessionData/${safeId}.json`);
                return `已删除历史记录文件：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName} \n 现在可以使用oob.load来选择新的人设了`;
            }
        });


    ctx.command('oob.reset', "重置历史记录，但是保留人设")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString()} \n ${session.userId.toString()}`;
            } else {
                let sessionId = session.channelId.toString() + "-" + session.userId.toString() + "-" + characterName;
                let safeId = encodeURIComponent(sessionId);
                fs.writeFileSync(`${__dirname}/sessionData/${safeId}.json`, '[]');
                return `已重置历史记录文件：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName}`;
            }
        });


    ctx.command('oob.check', "检查历史记录文件是否存在")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString()} \n ${session.userId.toString()}`;
            }
            return `文件存在：\n channelId: ${channelId}, userId: ${userId}, characterName: ${characterName}`;
        });


    ctx.command("oob.undo", "撤回刚刚的发言，让Ai回到上一句发言之前")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString()} \n ${session.userId.toString()}`;
            } else {
                let sessionId = session.channelId.toString() + "-" + session.userId.toString() + "-" + characterName;
                let history = sessionMap.getHistory(sessionId);
                if (history && history.length > 0) {
                    history.pop();
                    history.pop();
                    sessionMap.saveHistory(sessionId, history);
                    return `已撤回最后一组对话，可以继续聊天哦。`;
                } else {
                    return `历史记录文件为空，无法删除对话。\n channelId: ${channelId}, userId: ${userId}, characterName: ${characterName}`;
                }
            }
        });


    ctx.command("oob.list", "列出所有可用人设")
        .action(async () => {
            let files = fs.readdirSync(`${__dirname}/characters/`);
            if (files.length === 0) {
                return '目前没有可用的人设文件。';
            } else {
                let characterNames = files.map(file => file.replace('.json', ''));
                return '可用的人设有：\n' + characterNames.join('\n');
            }
        });


    ctx.command('oob.tag <tag>', "让AI来写tag并进行绘图")
        .action(async ({ session }, tag) => {
            let characterName = 'tag';
            if (sessionMap.checkCharacter(characterName)) {
                let character = sessionMap.getCharacter(characterName);
                let prompt = character + '\n You:|| Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ' + tag + ' || \n';

                let request = {
                    'prompt': prompt,
                    'max_new_tokens': 150,
                    'do_sample': true,
                    'temperature': 1.3,
                    'top_p': 0.1,
                    'typical_p': 1,
                    'epsilon_cutoff': 0,
                    'eta_cutoff': 0,
                    'repetition_penalty': 1.18,
                    'top_k': 40,
                    'min_length': 0,
                    'no_repeat_ngram_size': 0,
                    'num_beams': 1,
                    'penalty_alpha': 0,
                    'length_penalty': 1,
                    'early_stopping': false,
                    'mirostat_mode': 0,
                    'mirostat_tau': 5,
                    'mirostat_eta': 0.1,
                    'seed': -1,
                    'add_bos_token': true,
                    'truncation_length': 2048,
                    'ban_eos_token': false,
                    'skip_special_tokens': true,
                    'stopping_strings': []
                };

                let response = await axios.post(config.apiURL, request);
                if (response.status == 200) {
                    let fullResult = response.data['results'][0]['text'];
                    let firstIndex = fullResult.indexOf('||') + 2;
                    let secondIndex = fullResult.indexOf('||', firstIndex);
                    let result = "";
                    let msg = "";

                    if (secondIndex == -1) {
                        result = fullResult;
                        if (config.send_glmmtg_response) {
                            msg = "模型回复格式错误，但依然执行了绘图，可能存在缺陷。\n 以下是完整回复:" + fullResult;
                        }
                    } else {
                        result = fullResult.slice(firstIndex, secondIndex).trim();
                        if (config.send_glmmtg_response) {
                            msg = `${config.prefix} ${result}`;
                        }
                    }

                    await session.execute(`${config.prefix} "${result}"`);

                    if (msg !== "") {
                        return msg;
                    }

                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到tag文件。`;
            }
        });



    RegExp.escape = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    let nicknameRegex = new RegExp("^(" + config.nicknames.map(RegExp.escape).join("|") + ")\\s");
    ctx.middleware(async (session, next) => {
        // 随机触发
        if (config.randnum > 0 && Math.random() < config.randnum) {
            console.log('随机触发条件满足');
            let msg = String(session.content);
            await session.execute(`oob ${msg}`);
            return;
        }
        // @触发
        else if (config.if_at && session.parsed.appel) {
            let msg = String(session.content);
            msg = msg.replace(`<at id="${session.selfId}"/> `, '');
            msg = msg.replace(`<at id="${session.selfId}"/>`, '');
            await session.execute(`oob ${msg}`);
        }
        // 昵称触发
        else if (config.nicknames.length > 0) {
            let match = session.content.match(nicknameRegex);
            if (match) {
                let msg = String(session.content);
                msg = msg.slice(match[0].length).trim();
                await session.execute(`oob ${msg}`);
            }
        }
        await next();
    });

    ctx.command('oob.readMetadata', "读取PNGfile文件夹中的所有PNG图片的元数据，并将元数据保存为JSON文件，存储在Metadata文件夹中")
        .action(async ({ session }) => {
            readMetadata();
            return `已将PNGfile文件夹中的所有PNG图片的元数据保存为JSON文件，存储在Metadata文件夹中。`;
        });

}

exports.apply = apply;
