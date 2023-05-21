"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const axios = require("axios");
const fs = require('fs');

exports.name = "oobabooga-testbot";
exports.usage = `
### 用前需知
当前为正式版本1.1.0<br>
注意！插件更新会导致历史记录与人设重置，请自行保存相关文档！<br>
人设位置：koishi-plugin-oobabooga-testbot\lib\characters<br>
历史记录位置：koishi-plugin-oobabooga-testbot\lib\sessionData<br>

使用前需要自行架设oobabooga-text-generation-webui<br>
github上有一键安装包，包含Windows，Linux，Mac。<br>
github地址:https://github.com/oobabooga/text-generation-webui<br>
架设完成需要打开api服务才行，默认端口号为：http://localhost:5000/api/v1/generate<br>

支持使用Vits语音输出回复了，如果需要使用vits的话需要加载open-vits插件。<br>
open-vits插件：https://github.com/initialencounter/koishi-plugin-open-vits#readme
自建vits后端：https://github.com/Artrajz/vits-simple-api<br>

支持使用语言模型补充tag，并调用AI绘图插件进行绘图了。<br>
NovelAI插件：https://bot.novelai.dev/
rryth插件：https://github.com/MirrorCY/rryth#readme
自建stable-diffusion：秋叶一键包：https://www.bilibili.com/video/BV1iM4y1y7oA/?spm_id_from=333.999.0.0&vd_source=1344ddffb6379f56c5809630eedd7062<br>

### QQ讨论群：719518427
有疑问，出现bug，有改进想法都可以加qq群讨论<br>

### 推荐使用的语言模型：
chatglm-6b：https://huggingface.co/THUDM/chatglm-6b<br>
（注意：chatglm-6b模型需要额外安装icetk,pip install icetk）<br>
vicuna-13b-1.1：https://huggingface.co/anon8231489123/vicuna-13b-GPTQ-4bit-128g<br>
stable-vicuna-13B：https://huggingface.co/TheBloke/stable-vicuna-13B-GPTQ<br>
Wizard-Vicuna-13B：https://huggingface.co/TheBloke/Wizard-Vicuna-13B-Uncensored-GPTQ<br>
等模型<br>

### 新版本新增：
完善了用前须知，增加了oob.tag指令让AI来写tag同时调用机器人跑图，增加了对vits语音输出的支持。<br>
`;

exports.Config = koishi_1.Schema.object({
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
    ])
        .description("输出模式")
        .default("text"),
    send_glmmtg_response: koishi_1.Schema.boolean()
        .description("使用oob.tag的时候是否会发送tag到会话框")
        .default(false),
    prefix: koishi_1.Schema.string().description("跑图机器人的前缀")
        .default("rr"),
});



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
                'max_new_tokens': 250,
                'do_sample': true,
                'temperature': 1.3,
                'top_p': 0.1,
                'typical_p': 1,
                'repetition_penalty': 1.18,
                'top_k': 40,
                'min_length': 0,
                'no_repeat_ngram_size': 0,
                'num_beams': 1,
                'penalty_alpha': 0,
                'length_penalty': 1,
                'early_stopping': false,
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
                let result = fullResult.slice(fullResult.indexOf('||') + 2, fullResult.lastIndexOf('||')).trim();
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
                return `已删除历史记录文件：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName}`;
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
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString()} \n ${session.userId.toString() }`;
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
                let prompt = character + '\n Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags.What you are currently describing is: ' + tag ;

                let request = {
                    'prompt': prompt,
                    'max_new_tokens': 250,
                    'do_sample': true,
                    'temperature': 1.3,
                    'top_p': 0.1,
                    'typical_p': 1,
                    'repetition_penalty': 1.18,
                    'top_k': 40,
                    'min_length': 0,
                    'no_repeat_ngram_size': 0,
                    'num_beams': 1,
                    'penalty_alpha': 0,
                    'length_penalty': 1,
                    'early_stopping': false,
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
                    if (config.send_glmmtg_response) {
                        await session.send(`${config.prefix} ${fullResult}`);
                    }
                    await session.execute(`${config.prefix} "${fullResult}"`);
                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到tag文件。`;
            }
        });
}

exports.apply = apply;
