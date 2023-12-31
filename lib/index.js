"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const axios = require("axios");
const path = require('path');
const png = require('png-metadata');
const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);


exports.name = "oobabooga-testbot";
exports.usage = `
### ！！使用教程！！
https://forum.koishi.xyz/t/topic/2391<br>
https://www.bilibili.com/read/cv24006101? <br>

### 用前需知
### 注意！1.9版本大改，遇到问题可以积极反馈！QQ讨论群：719518427
### 当前为正式版本1.9.3
注意！插件更新会导致历史记录与默认人设重置，请自行保存相关文档！<br>
使用前需要自行架设oobabooga-text-generation-webui后端<br>
使用前需要自行架设novelai组件或者rryth组件<br>
新增了自定义人设目录，可以将你自定义的人设都放在外置目录里，这样就不会因为插件更新导致人设消失了。<br>
默认人设位置：koishi-plugin-oobabooga-testbot\\lib\\characters<br>
历史记录位置：koishi-plugin-oobabooga-testbot\\lib\\sessionData<br>


github上有一键安装包，包含Windows，Linux，Mac。<br>
也可以直接使用b站大佬：coyude制作的懒人包：https://www.bilibili.com/read/cv23495183<br>
github地址:https://github.com/oobabooga/text-generation-webui<br>
架设完成需要打开api服务才行，默认端口号为：http://localhost:5000/api/v1/generate<br>

支持使用Vits语音输出回复了，如果需要使用vits的话需要加载open-vits插件。<br>
open-vits插件：https://github.com/initialencounter/koishi-plugin-open-vits#readme<br>
自建vits后端：https://github.com/Artrajz/vits-simple-api<br>

支持使用语言模型补充tag，并调用AI绘图插件进行绘图了。<br>
NovelAI插件：https://bot.novelai.dev/<br>
rryth插件：https://github.com/MirrorCY/rryth#readme<br>
自建stable-diffusion：秋叶一键包：https://www.bilibili.com/video/BV1iM4y1y7oA/?<br>

### QQ讨论群：719518427
有疑问，出现bug，有改进想法都可以加qq群讨论<br>

### 推荐使用的语言模型：
chatglm3-6b：https://huggingface.co/THUDM/chatglm2-6b<br>
Nous-Hermes-13b-Chinese-plus-GPTQ：https://huggingface.co/coyude/Nous-Hermes-13b-Chinese-plus-GPTQ<br>
强烈推荐：openbuddy-llama2-13b：https://huggingface.co/TheBloke/OpenBuddy-Llama2-13B-v11.1-GPTQ<br>
强烈推荐：Nous-Capybara-34b-gptq：https://huggingface.co/TheBloke/Nous-Capybara-34B-GPTQ<br>
等模型<br>

### 人设网址分享与处理：
### 特别鸣谢：hakureiyuyuko 大佬制作并分享人设库，此库内的人设都可以直接在本插件使用。
hakureiyuyuko 大佬制作的人设库：https://github.com/hakureiyuyuko/characters<br>
（以下网址，需要科学上网，直接下载人设png图片文件放入插件根目录下的PNGfile文件，使用oob.Metadata，就会自动生成基础人设文件）<br>
https://www.characterhub.org/<br>
https://booru.plus/+pygmalion<br>

### 新版本新增：
调整了用前须知。<br>
修复：tts合成文本过长的提示发送失败的bug。<br>
详情可以去：https://forum.koishi.xyz/t/topic/2391 查看更新日志<br>
`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        apiURL: koishi_1.Schema.string()
            .description('API服务器地址')
            .default('http://127.0.0.1:5000/v1/completions'),
        historyLimit: koishi_1.Schema.number()
            .description('历史记录上限(注意这里指的是句子数量，一组对话有两个句子。)')
            .default(10),
        outputMode: koishi_1.Schema.union([
            koishi_1.Schema.const('text').description('只返回文字'),
            koishi_1.Schema.const('voice').description('只返回语音'),
            koishi_1.Schema.const('both').description('同时返回语音与文字'),
            koishi_1.Schema.const('extra').description('同时返回语音与文字，独立语音'),
            koishi_1.Schema.const('debug').description('调试模式，将返回未处理请求与返回文本'),
        ])
            .description('输出模式')
            .default('text'),
        auto_use_character: koishi_1.Schema.boolean()
            .description('在未创建人设的情况下被唤醒是否会自动选择人设。')
            .default(false),
        select_character_notice: koishi_1.Schema.boolean()
            .description('自动选取人设时是否提示选取内容。')
            .default(true),
        auto_use_character_name: koishi_1.Schema.string().description('自动选择人设的人设名称')
            .default('assistant'),
        randnum: koishi_1.Schema.number()
            .description('随机回复触发概率，注意这里是百分比，输入0.1就是大约10%的概率')
            .default(0),
        if_at: koishi_1.Schema.boolean()
            .description('是否开启@回复')
            .default(false),
        nicknames: koishi_1.Schema.array(koishi_1.Schema.string())
            .description('昵称，当消息包含这些昵称时将触发 oob 指令')
            .default([]),
        if_private: koishi_1.Schema.boolean()
            .description('是否开启高级私聊模式，唤醒不需要前缀')
            .default(false),
    }).description('基础设置'),
    koishi_1.Schema.object({
        prefix: koishi_1.Schema.string().description('跑图机器人的前缀')
            .default('nai'),
        send_oobmtg_response: koishi_1.Schema.boolean()
            .description('使用oob.tag的时候是否会发送tag到会话框')
            .default(false),
        use_oobmtg_auto_response: koishi_1.Schema.union([
            koishi_1.Schema.const('off').description('关闭'),
            koishi_1.Schema.const('keyword').description('关键词触发直接绘图（无算力额外要求，耗时短）'),
            koishi_1.Schema.const('keyword2').description('关键词触发AI补充绘图（算力要求较低，耗时短）'),
            koishi_1.Schema.const('AI').description('AI自动识别绘图（对算力要求中等，耗时中等）'),
            koishi_1.Schema.const('doubleAI').description('二次AI补充绘图（对算力要求较大，耗时中等，图质量中等）'),
            koishi_1.Schema.const('tripleAI').description('三次AI补充绘图（对算力要求较大，耗时长，但出图质量高）')
        ])
            .description('AI自动判断绘图选项')
            .default('off'),
        drawing_prefix: koishi_1.Schema.string()
            .description('为了稳定绘图质量使用的前缀(只影响自动绘图)')
            .default('(masterpiece:1.2), extremely detailed,best quality,1 gril,'),
        send_auto_oobmtg_judge: koishi_1.Schema.boolean()
            .description('AI自动判断绘图模式Debug开关，发送AI自动识别绘图判断')
            .default(false),
        resolution: koishi_1.Schema.string().description('设定图片尺寸')
            .default('512x768'),
        steps: koishi_1.Schema.number().description('设定迭代步数')
            .default(48),
        scale: koishi_1.Schema.number().description('设定对输入的服从度')
            .default(10),
        hires_fix: koishi_1.Schema.boolean().description('启用高分辨率修复')
            .default(false),
        trigger_keywords: koishi_1.Schema.array(koishi_1.Schema.string())
            .description('触发绘图的关键词')
            .default(['照片', '图片', '图像', 'picture', 'pic', '绘图', 'paint', '自拍', '合影', 'image', 'photo', 'snapshot', 'selfie']),
    }).description('绘图设置，涉及oob.tag指令与AI自动识别绘图模式'),
    koishi_1.Schema.object({
        ttsurl: koishi_1.Schema.string()
            .description('vits-simple-api的url(默认值为http://127.0.0.1:23456/)')
            .default('http://127.0.0.1:23456/'),
        bertorvits: koishi_1.Schema.boolean()
            .description('是否是bert-vits2模型')
            .default(false),
        ttsemotion: koishi_1.Schema.number()
            .description('情感控制')
            .default(8),
        ttsspeechlength: koishi_1.Schema.number()
            .description('语音速度')
            .default(1),
        ttsmaxlength: koishi_1.Schema.number()
            .description('最大合成长度')
            .default(128),
        ttsspeakerID: koishi_1.Schema.number()
            .description('tts语音服务的默认speakerid')
            .default(0),
        ttsformat: koishi_1.Schema.union([
            koishi_1.Schema.const('ogg').description('ogg'),
            koishi_1.Schema.const('wav').description('wav'),
            koishi_1.Schema.const('mp3').description('mp3'),
            koishi_1.Schema.const('amr').description('amr'),
        ])
            .description('音频格式')
            .default('mp3'),
        ttslanguage: koishi_1.Schema.union([
            koishi_1.Schema.const('auto').description('auto'),
            koishi_1.Schema.const('zh').description('zh'),
            koishi_1.Schema.const('en').description('en'),
            koishi_1.Schema.const('ja').description('ja'),
        ])
            .description('语言标记（建议auto）')
            .default('auto'),
    }).description('tts相关设置'),
    koishi_1.Schema.object({
        suan_ming: koishi_1.Schema.boolean()
            .description('是否开启对话中自动调用赛博算命')
            .default(false),
        trigger_suan_ming_keywords: koishi_1.Schema.array(koishi_1.Schema.string())
            .description('触发赛博算命的关键词(有不连续检测机制)')
            .default(['帮我算命', '帮我算卦', '帮我算一卦','算一卦']),
        suan_ming_plus: koishi_1.Schema.boolean()
            .description('是否开启赛博缘算命解读')
            .default(false),
    }).description('赛博算命相关设置'),
    koishi_1.Schema.object({
        send_welcome: koishi_1.Schema.boolean()
            .description('是否开启入群欢迎')
            .default(false),
        welcome_words: koishi_1.Schema.string().description('入群欢迎词')
            .default('欢迎加入群聊！我是群智能助手。您可以使用Help指令来查询具体功能。'),
    }).description('入群欢迎相关设置'),
    koishi_1.Schema.object({
        Custom_character_dir: koishi_1.Schema.string().description('自定义人设目录，留空就不会启用')
            .default(''),
        Custom_PNG_dir: koishi_1.Schema.string().description('oob.Metadata指令的外置PNG图片人设目录，留空就不会启用，目录不存在的话会直接创建')
            .default(''),
        Custom_Sorted_dir: koishi_1.Schema.string().description('oob.Metadata指令处理后的文件存储目标目录，留空就不会启用，目录不存在的话会直接创建')
            .default(''),
    }).description('目录相关设置'),
    koishi_1.Schema.object({
        max_tokens: koishi_1.Schema.number().description('max_tokens')
            .default(250),
        do_sample: koishi_1.Schema.boolean().description('do_sample')
            .default(true),
        temperature: koishi_1.Schema.number().description('temperature')
            .default(1.3),
        top_p: koishi_1.Schema.number().description('top_p')
            .default(0.1),
        typical_p: koishi_1.Schema.number().description('typical_p')
            .default(1),
        epsilon_cutoff: koishi_1.Schema.number().description('epsilon_cutoff')
            .default(0),
        eta_cutoff: koishi_1.Schema.number().description('eta_cutoff')
            .default(0),
        repetition_penalty: koishi_1.Schema.number().description('repetition_penalty')
            .default(1.18),
        top_k: koishi_1.Schema.number().description('top_k')
            .default(40),
        min_length: koishi_1.Schema.number().description('min_length')
            .default(0),
        no_repeat_ngram_size: koishi_1.Schema.number().description('no_repeat_ngram_size')
            .default(0),
        num_beams: koishi_1.Schema.number().description('num_beams')
            .default(1),
        penalty_alpha: koishi_1.Schema.number().description('penalty_alpha')
            .default(0),
        length_penalty: koishi_1.Schema.number().description('length_penalty')
            .default(1),
        early_stopping: koishi_1.Schema.boolean().description('early_stopping')
            .default(false),
        mirostat_mode: koishi_1.Schema.number().description('mirostat_mode')
            .default(0),
        mirostat_tau: koishi_1.Schema.number().description('mirostat_tau')
            .default(5),
        mirostat_eta: koishi_1.Schema.number().description('mirostat_eta')
            .default(0.1),
        seed: koishi_1.Schema.number().description('seed')
            .default(-1),
        add_bos_token: koishi_1.Schema.boolean().description('add_bos_token')
            .default(true),
        truncation_length: koishi_1.Schema.number().description('truncation_length')
            .default(2048),
        ban_eos_token: koishi_1.Schema.boolean().description('ban_eos_token')
            .default(false),
        skip_special_tokens: koishi_1.Schema.boolean().description('skip_special_tokens')
            .default(true),
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
    check_buildin_Character(characterName) {
        return fs.existsSync(`${__dirname}/buildincharacters/${characterName}.json`);
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
    get_builtin_Character(characterName) {
        if (this.check_buildin_Character(characterName)) {
            let characterObj = JSON.parse(fs.readFileSync(`${__dirname}/buildincharacters/${characterName}.json`));
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

function processspeakersData(data) {
    // 确定包含BERT-VITS2数组
    if (!data["BERT-VITS2"]) {
        return "No BERT-VITS2 data found.";
    }
    const bertVits2 = data["BERT-VITS2"];
    let maxId = -1;
    const formattedString = bertVits2.map(item => {
        if (item.id > maxId) {
            maxId = item.id;
        }
        return `${item.id}:${item.name}`;
    }).join('\n');
    return { formattedString: `Id对照表:\n${formattedString}`, maxId: maxId };
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

async function moveCharacters(session, sourceDir) {
    if (!fs.existsSync(sourceDir)) {
        await session.send('外置人设目录不存在，请修改');
        throw new Error(`人设目录 ${sourceDir} 不存在`);
    }
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
        if (path.extname(file) !== '.json') {
            continue;
        }
        const sourceFilePath = path.join(sourceDir, file);
        const destFilePath = path.join(__dirname, 'characters', file);
        fs.copyFileSync(sourceFilePath, destFilePath);
    }
}


async function movePNG(session, sourceDir) {
    if (!fs.existsSync(sourceDir)) {
        await session.send('外置PNG文件夹不存在，请检查');
        throw new Error(`外置PNG文件夹 ${sourceDir} 不存在`);
    }
    let destDir = path.join(__dirname, 'PNGfile');
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir);
    }
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
        if (path.extname(file).toLowerCase() !== '.png') {
            continue;
        }
        const sourceFilePath = path.join(sourceDir, file);
        const destFilePath = path.join(destDir, file);
        fs.copyFileSync(sourceFilePath, destFilePath);
    }
}


function copyDirectory(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        const srcFilePath = path.join(srcDir, file);
        const destFilePath = path.join(destDir, file);
        if (fs.statSync(srcFilePath).isDirectory()) {
            copyDirectory(srcFilePath, destFilePath);
        } else {
            if (path.extname(file) === '.json') {
                fs.copyFileSync(srcFilePath, destFilePath);
            }
        }
    }
}


async function sortAndSaveMetadata(session, config) {
    const sourceDir = path.join(__dirname, 'Metadata');
    const targetDir = path.join(__dirname, 'Sorted');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
    }

    const fileNames = await readdir(sourceDir);
    const jsonFileNames = fileNames.filter(fileName => path.extname(fileName) === '.json');

    for (const jsonFileName of jsonFileNames) {
        const filePath = path.join(sourceDir, jsonFileName);
        const content = await readFile(filePath, 'utf8');
        const data = JSON.parse(content);

        const sortedData = [];
        if (data.chara.name) sortedData.push(data.chara.name);
        if (data.chara.description) sortedData.push(data.chara.description);
        if (data.chara.personality) sortedData.push(data.chara.personality);
        if (data.chara.mes_example) sortedData.push(data.chara.mes_example);
        if (data.chara.first_mes) sortedData.push(data.chara.first_mes);

        const newFilePath = path.join(targetDir, `${sortedData[0]}.json`);
        await writeFile(newFilePath, JSON.stringify(sortedData, null, 2), 'utf8');
    }
}

async function selectCharacter(session, config, autocharactername) {
    if (config.select_character_notice) {
        await session.send('未检测到对应历史记录文件，已自动选择人设。');
    }
    await session.execute(`oob.load ${autocharactername}`);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


async function apply(ctx, config) {
    const oob = ctx.command("oob <message...>", "与AI模型进行对话，基于oobabooga")
      .action(async ({ session }, ...msg) => {
          if (msg.length === 0) {
              await session.send(`请至少输入一个字符`)
              await session.execute(`help oob`)
              return
          }
            let message = msg.join(' ');
            // 解析人设名称
          let channelId = '';
          let userId = '';
          let characterName = '';
          let speakerid = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            let autocharactername = config.auto_use_character_name;
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (config.outputMode == `extra`) {
                    if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2]);
                        speakerid = decodeURIComponent(parts[3].replace('.json', ''));
                        break;
                    }
                } else {
                    if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2].replace('.json', ''));
                        break;
                    }
                }
          }
            //自动人设加载
            let tempspeakerID = ''
            if (!channelId && config.auto_use_character) {
                await selectCharacter(session, config, autocharactername);
                characterName = autocharactername;
                tempspeakerID = config.ttsspeakerID
            }
            else if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 请先使用oob.load选择人设。\n 所有人设可以使用oob.list查看 \n 当前id: ${session.channelId.toString().replace(/-/g, '') } , ${session.userId.toString()}`;
            }

          let sessionId = ''
          if (config.outputMode == `extra`) {
              if (!channelId) {
                  sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + tempspeakerID;
              } else {
                  sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + speakerid;
              }
          } else {
              sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName;
          }
          let history = sessionMap.getHistory(sessionId);

            // 加载人设文件
            let character = sessionMap.getCharacter(characterName);

            // 更新历史记录
            if (history.length >= config.historyLimit) {
                history.shift();
            }         
            history.push("You:" + message + '。'+`\n` );

            let historyStr = "";
            if (history.length > 0) {
                historyStr = character.concat(history).join("\n");
            } else {
                historyStr = character.join("\n");
            }
            let response = ``;
            let prompt = historyStr+`\n`+characterName+`:`;
            let request = {
                "prompt": prompt,
                "max_tokens": config.max_tokens,
                "do_sample": config.do_sample,
                "temperature": config.temperature,
                "top_p": config.top_p,
                "typical_p": config.typical_p,
                "epsilon_cutoff": config.epsilon_cutoff,
                "eta_cutoff": config.eta_cutoff,
                "repetition_penalty": config.repetition_penalty,
                "top_k": config.top_k,
                "min_length": config.min_length,
                "no_repeat_ngram_size": config.no_repeat_ngram_size,
                "num_beams": config.num_beams,
                "penalty_alpha": config.penalty_alpha,
                "length_penalty": config.length_penalty,
                "early_stopping": config.early_stopping,
                "mirostat_mode": config.mirostat_mode,
                "mirostat_tau": config.mirostat_tau,
                "mirostat_eta": config.mirostat_eta,
                "seed": config.seed,
                "add_bos_token": config.add_bos_token,
                "truncation_length": config.truncation_length,
                "ban_eos_token": config.ban_eos_token,
                "skip_special_tokens": config.skip_special_tokens,
            };

            //判断是否算命
            let SMkeywords = config.trigger_suan_ming_keywords;
            let regexPattern = new RegExp(`.*(${SMkeywords.join("|")}).*`, "i")
            if (config.suan_ming && regexPattern.test(message)) {
                await session.send(`正在调用赛博缘`)
                let SMcharacterName = 'suan_ming';
                let SMcharacterdata = sessionMap.get_builtin_Character(SMcharacterName);
                let SMcharacter = SMcharacterdata.concat().join("\n");
                let random = getRandomInt(0, 100);
                let suan_ming_output
                if (random === 0) {
                    suan_ming_output = `您今天的运势为“厄运当头” (${random}/100)`;
                } else if (random >= 1 && random <= 30) {
                    suan_ming_output = `您今天的运势为“末凶” (${random}/100)`;
                } else if (random >= 31 && random <= 50) {
                    suan_ming_output = `您今天的运势为“小凶” (${random}/100)`;
                } else if (random >= 51 && random <= 70) {
                    suan_ming_output = `您今天的运势为“小吉” (${random}/100)`;
                } else if (random >= 71 && random <= 90) {
                    suan_ming_output = `您今天的运势为“大吉” (${random}/100)`;
                } else if (random >= 91 && random <= 100) {
                    suan_ming_output = `您今天的运势为“吉星高照” (${random}/100)`;
                }
                if (config.suan_ming_plus) {
                    let suan_ming_prompt = SMcharacter + `\n` + suan_ming_output + `\n接下来我将根据关键词对您今天的运势做解读：`;
                    let prompt = suan_ming_prompt;
                    let request = {
                        "prompt": prompt,
                        "max_tokens": 350,
                        "do_sample": true,
                        "temperature": 1.3,
                        "top_p": 0.1,
                        "typical_p": 1,
                        "epsilon_cutoff": 0,
                        "eta_cutoff": 0,
                        "repetition_penalty": 1.18,
                        "top_k": 40,
                        "min_length": 0,
                        "no_repeat_ngram_size": 0,
                        "num_beams": 1,
                        "penalty_alpha": 0,
                        "length_penalty": 1,
                        "early_stopping": false,
                        "mirostat_mode": 0,
                        "mirostat_tau": 5,
                        "mirostat_eta": 0.1,
                        "seed": -1,
                        "add_bos_token": true,
                        "truncation_length": 2048,
                        "ban_eos_token": false,
                        "skip_special_tokens": true,
                    };
                    let SMresponse = await axios.post(config.apiURL, request);
                    let SMfullResult = SMresponse.data.choices[0].text;
                    let SMoutput = suan_ming_output + `\n接下来我将对您今天的运势做解读：` + SMfullResult;
                    await session.send(SMoutput)
                    //更新历史记录
                    if (history.length >= config.historyLimit) {
                        history.shift();
                    }
                    history.push("赛博缘:" + SMfullResult + '。' +`\n`);

                } else {
                    await session.send(suan_ming_output);
                    //更新历史记录
                    if (history.length >= config.historyLimit) {
                        history.shift();
                    }
                    history.push(suan_ming_output+`\n`);
                }
                //读取加入算命后的历史记录
                if (history.length > 0) {
                    historyStr = character.concat(history).join("\n");
                } else {
                    historyStr = character.join("\n");
                }
                //发送请求
                let prompt = historyStr+characterName+`:`;
                let request = {
                    "prompt": prompt,
                    "max_tokens": config.max_tokens,
                    "do_sample": config.do_sample,
                    "temperature": config.temperature,
                    "top_p": config.top_p,
                    "typical_p": config.typical_p,
                    "epsilon_cutoff": config.epsilon_cutoff,
                    "eta_cutoff": config.eta_cutoff,
                    "repetition_penalty": config.repetition_penalty,
                    "top_k": config.top_k,
                    "min_length": config.min_length,
                    "no_repeat_ngram_size": config.no_repeat_ngram_size,
                    "num_beams": config.num_beams,
                    "penalty_alpha": config.penalty_alpha,
                    "length_penalty": config.length_penalty,
                    "early_stopping": config.early_stopping,
                    "mirostat_mode": config.mirostat_mode,
                    "mirostat_tau": config.mirostat_tau,
                    "mirostat_eta": config.mirostat_eta,
                    "seed": config.seed,
                    "add_bos_token": config.add_bos_token,
                    "truncation_length": config.truncation_length,
                    "ban_eos_token": config.ban_eos_token,
                    "skip_special_tokens": config.skip_special_tokens,
                };
                response = await axios.post(config.apiURL, request);

            } else {
                //不算命
                response = await axios.post(config.apiURL, request);
            }

            if (response.status == 200) {
                
                //AI识别绘图处理部分
                if (config.use_oobmtg_auto_response == 'AI' || config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'tripleAI' || config.use_oobmtg_auto_response == 'keyword' || config.use_oobmtg_auto_response == 'keyword2') {
                    if (config.use_oobmtg_auto_response == 'keyword') {
                        let fullResult = response.data.choices[0].text;
                        let keywords =config.trigger_keywords;
                        if (keywords.some(keyword => message.includes(keyword))) {
                            if (config.hires_fix) {
                                session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n ${config.drawing_prefix} ${fullResult}`);
                            } else {
                                session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n ${config.drawing_prefix} ${fullResult}`);
                            }
                        }
                    }
                    if (config.use_oobmtg_auto_response == 'keyword2') {
                        let fullResult = response.data.choices[0].text;
                        let keywords = config.trigger_keywords;
                        if (keywords.some(keyword => message.includes(keyword))) {
                            session.execute(`oob.tag ${fullResult}`);
                        }
                    }
                    if (config.use_oobmtg_auto_response == 'AI' || config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'tripleAI') {
                        let fullResult = response.data.choices[0].text;
                        let checkcharacterName = 'check-if-pic';
                        let checkcharacterdata = sessionMap.get_builtin_Character(checkcharacterName);
                        let checkcharacter = checkcharacterdata.concat().join("\n");
                        let checkrequest_prompt = checkcharacter + "\n Answer only in 'Yes' or 'No'.Please determine if a picture needs to be generated for this conversation:" + "You:" + message + ';' + fullResult + '\n';
                        let checkrequest_prompt2 = checkrequest_prompt+`AI:`
                        let checkrequest = {
                            "prompt": checkrequest_prompt2,
                            "max_tokens": 30,
                            "do_sample": true,
                            "temperature": 1.3,
                            "top_p": 0.1,
                            "typical_p": 1,
                            "epsilon_cutoff": 0,
                            "eta_cutoff": 0,
                            "repetition_penalty": 1.18,
                            "top_k": 40,
                            "min_length": 0,
                            "no_repeat_ngram_size": 0,
                            "num_beams": 1,
                            "penalty_alpha": 0,
                            "length_penalty": 1,
                            "early_stopping": false,
                            "mirostat_mode": 0,
                            "mirostat_tau": 5,
                            "mirostat_eta": 0.1,
                            "seed": -1,
                            "add_bos_token": true,
                            "truncation_length": 2048,
                            "ban_eos_token": false,
                            "skip_special_tokens": true,
                        };
                        let checkrequest_result = await axios.post(config.apiURL, checkrequest)
                        let checkrequest_reply = checkrequest_result.data.choices[0].text;
                        if (config.send_auto_oobmtg_judge) {
                            if (checkrequest_reply.includes("Yes") || checkrequest_reply.includes("yes")) {
                                session.send("AI判断绘图:Yes")
                            } else {
                                session.send("AI判断绘图:No")
                            }
                        }
                        if (checkrequest_reply.includes("Yes") || checkrequest_reply.includes("yes")) {
                            if (config.use_oobmtg_auto_response == 'AI') {
                                let describe_prompt = prompt + fullResult + "\n You: Describe your appearance, your surroundings and what you are doing right now. 请描述自己的外貌、周围的环境以及当前正在做什么。\n"
                                let describe_prompt2 = describe_prompt + characterName + `:`;
                                let describe = {
                                    "prompt": describe_prompt2,
                                    "max_tokens": 150,
                                    "do_sample": true,
                                    "temperature": 1.3,
                                    "top_p": 0.1,
                                    "typical_p": 1,
                                    "epsilon_cutoff": 0,
                                    "eta_cutoff": 0,
                                    "repetition_penalty": 1.18,
                                    "top_k": 40,
                                    "min_length": 0,
                                    "no_repeat_ngram_size": 0,
                                    "num_beams": 1,
                                    "penalty_alpha": 0,
                                    "length_penalty": 1,
                                    "early_stopping": false,
                                    "mirostat_mode": 0,
                                    "mirostat_tau": 5,
                                    "mirostat_eta": 0.1,
                                    "seed": -1,
                                    "add_bos_token": true,
                                    "truncation_length": 2048,
                                    "ban_eos_token": false,
                                    "skip_special_tokens": true,
                                };
                                let describe_reply = await axios.post(config.apiURL, describe);
                                let describe_reply_result = describe_reply.data.choices[0].text;
                                if (config.hires_fix) {
                                    session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n ${config.drawing_prefix} ${describe_reply_result}`);
                                } else {
                                    session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n ${config.drawing_prefix} ${describe_reply_result}`);
                                }
                            }
                            if (config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'tripleAI') {
                                let describe_prompt_outlook = prompt + fullResult + "\n You: Describe your appearance. 请详细描述你自己的外貌。\n"
                                let describe_prompt_outlook2 = describe_prompt_outlook + characterName + `:`;
                                let describe_outlook = {
                                    "prompt": describe_prompt_outlook2,
                                    "max_tokens": 150,
                                    "do_sample": true,
                                    "temperature": 1.3,
                                    "top_p": 0.1,
                                    "typical_p": 1,
                                    "epsilon_cutoff": 0,
                                    "eta_cutoff": 0,
                                    "repetition_penalty": 1.18,
                                    "top_k": 40,
                                    "min_length": 0,
                                    "no_repeat_ngram_size": 0,
                                    "num_beams": 1,
                                    "penalty_alpha": 0,
                                    "length_penalty": 1,
                                    "early_stopping": false,
                                    "mirostat_mode": 0,
                                    "mirostat_tau": 5,
                                    "mirostat_eta": 0.1,
                                    "seed": -1,
                                    "add_bos_token": true,
                                    "truncation_length": 2048,
                                    "ban_eos_token": false,
                                    "skip_special_tokens": true,
                                };
                                let describe_reply_outlook = await axios.post(config.apiURL, describe_outlook);
                                let outlook = describe_reply_outlook.data.choices[0].text;
                                let outlook_result = outlook;

                                let describe_prompt_surround_doing = prompt + fullResult + "\n You: Describe your surroundings and what you are doing right now. 请详细描述你周围的环境以及你当前正在做什么。\n"
                                let describe_prompt_surround_doing2 = describe_prompt_surround_doing + characterName + `:`;
                                let describe_surround_doing = {
                                    "prompt": describe_prompt_surround_doing2,
                                    "max_tokens": 150,
                                    "do_sample": true,
                                    "temperature": 1.3,
                                    "top_p": 0.1,
                                    "typical_p": 1,
                                    "epsilon_cutoff": 0,
                                    "eta_cutoff": 0,
                                    "repetition_penalty": 1.18,
                                    "top_k": 40,
                                    "min_length": 0,
                                    "no_repeat_ngram_size": 0,
                                    "num_beams": 1,
                                    "penalty_alpha": 0,
                                    "length_penalty": 1,
                                    "early_stopping": false,
                                    "mirostat_mode": 0,
                                    "mirostat_tau": 5,
                                    "mirostat_eta": 0.1,
                                    "seed": -1,
                                    "add_bos_token": true,
                                    "truncation_length": 2048,
                                    "ban_eos_token": false,
                                    "skip_special_tokens": true,
                                };
                                let describe_reply_surround_doing = await axios.post(config.apiURL, describe_surround_doing);
                                let surround_doing = describe_reply_surround_doing.data.choices[0].text;
                                let surround_doing_result = surround_doing;

                                let describe_reply_result = outlook_result + '.' + surround_doing_result

                                if (config.use_oobmtg_auto_response == 'doubleAI') {
                                    if (config.hires_fix) {
                                        session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n ${config.drawing_prefix} ${describe_reply_result}`);
                                    } else {
                                        session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n ${config.drawing_prefix} ${describe_reply_result}`);
                                    }
                                }
                                if (config.use_oobmtg_auto_response == 'tripleAI') {
                                    let characterName = 'tag2';
                                    if (sessionMap.check_buildin_Character(characterName)) {
                                        let characterdata = sessionMap.get_builtin_Character(characterName);
                                        let character = characterdata.concat().join("\n");
                                        let prompt1 = character + '\n You: Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ' + outlook_result + ' \n';
                                        let prompt2 = prompt1+`AI:`
                                        let request1 = {
                                            "prompt": prompt2,
                                            "max_tokens": 250,
                                            "do_sample": true,
                                            "temperature": 1.3,
                                            "top_p": 0.1,
                                            "typical_p": 1,
                                            "epsilon_cutoff": 0,
                                            "eta_cutoff": 0,
                                            "repetition_penalty": 1.18,
                                            "top_k": 40,
                                            "min_length": 0,
                                            "no_repeat_ngram_size": 0,
                                            "num_beams": 1,
                                            "penalty_alpha": 0,
                                            "length_penalty": 1,
                                            "early_stopping": false,
                                            "mirostat_mode": 0,
                                            "mirostat_tau": 5,
                                            "mirostat_eta": 0.1,
                                            "seed": -1,
                                            "add_bos_token": true,
                                            "truncation_length": 2048,
                                            "ban_eos_token": false,
                                            "skip_special_tokens": true,
                                        };
                                        let tripleAI_response_raw1 = await axios.post(config.apiURL, request1);
                                        let tripleAI_response1 = tripleAI_response_raw1.data.choices[0].text;
                                        let tripleAI_response_result1 = tripleAI_response1;

                                        let prompt3 = character + '\n You: Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ' + surround_doing_result + ' \n';
                                        let prompt4 = prompt3 +`AI:`
                                        let request2 = {
                                            "prompt": prompt4,
                                            "max_tokens": 250,
                                            "do_sample": true,
                                            "temperature": 1.3,
                                            "top_p": 0.1,
                                            "typical_p": 1,
                                            "epsilon_cutoff": 0,
                                            "eta_cutoff": 0,
                                            "repetition_penalty": 1.18,
                                            "top_k": 40,
                                            "min_length": 0,
                                            "no_repeat_ngram_size": 0,
                                            "num_beams": 1,
                                            "penalty_alpha": 0,
                                            "length_penalty": 1,
                                            "early_stopping": false,
                                            "mirostat_mode": 0,
                                            "mirostat_tau": 5,
                                            "mirostat_eta": 0.1,
                                            "seed": -1,
                                            "add_bos_token": true,
                                            "truncation_length": 2048,
                                            "ban_eos_token": false,
                                            "skip_special_tokens": true,
                                        };
                                        let tripleAI_response_raw2 = await axios.post(config.apiURL, request2);
                                        let tripleAI_response2 = tripleAI_response_raw2.data.choices[0].text;
                                        let tripleAI_response_result2 = tripleAI_response2;

                                        let tripleAI_response_result = tripleAI_response_result1 + ',' + tripleAI_response_result2

                                        if (config.hires_fix) {
                                            session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n ${config.drawing_prefix} ${tripleAI_response_result}`);
                                        } else {
                                            session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n ${config.drawing_prefix} ${tripleAI_response_result}`);
                                        }

                                    } else {
                                        return `未找到tag2文件。`;
                                    }

                                }
                            }
                        }
                    }
                }

                //读取返回的fullresult
                let fullresultraw = response.data.choices[0].text;

                //切掉You后防止自问自答
                let fullresult = ``;
                let regex = /You[:：]/;
                let index = fullresultraw.search(regex);
                if (index !== -1) {
                    fullresult = fullresultraw.substring(0, index);
                } else {
                    fullresult = fullresultraw;
                }

                history.push(characterName + ":" + fullresult);
                // 将历史记录保存到文件
                sessionMap.saveHistory(sessionId, history);
                let resultText = "";
                if (!session.channelId.includes("private")) {
                    resultText = String((0, koishi_1.h)("at", { id: session.userId })) + String(fullresult);
                } else {
                    resultText = String(fullresult);
                }
                if (config.outputMode == 'text' || config.outputMode == 'both') {
                    await session.send(resultText);
                }
                if (config.outputMode == 'voice' || config.outputMode == 'both') {
                    await session.execute(`say "${fullresult}"`);
                }
                if (config.outputMode == 'debug') {
                    await session.send(JSON.stringify(request));
                    await session.send(fullresultraw);
                }
                if (config.outputMode == 'extra') {
                    await session.send(resultText);
                    if (fullresult.length > config.ttsmaxlength) {
                        return `文本过长，tts生成失败`;
                    } else {
                        let url = ``
                        if (!channelId) {
                            if (config.bertorvits) {
                                url = `${config.ttsurl}/voice/bert-vits2?text=${encodeURIComponent(fullresult)}&id=${config.ttsspeakerID}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}&emotion=${config.ttsemotion}`;
                            } else {
                                url = `${config.ttsurl}/voice/vits?text=${encodeURIComponent(fullresult)}&id=${config.ttsspeakerID}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}`;
                            }
                        } else {
                            if (config.bertorvits) {
                                url = `${config.ttsurl}/voice/bert-vits2?text=${encodeURIComponent(fullresult)}&id=${speakerid}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}&emotion=${config.ttsemotion}`;
                            } else {
                                url = `${config.ttsurl}/voice/vits?text=${encodeURIComponent(fullresult)}&id=${speakerid}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}`;
                            }
                        }
                        const response = await axios.get(url, { responseType: 'arraybuffer' });
                        return koishi_1.h.audio(response.data, 'audio/mpeg');
                    }
                }
            } else {
                return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
            }
        });


    ctx.command('oob.load <character:text>', ":\n(别名：加载人设)\n加载人设并创建新的历史记录")
        .alias("加载人设")
        .action(async ({ session }, character) => {
            if (!character || character.trim() === "") {
                await session.send(`请至少输入一个人设名称`)
                await session.execute(`help oob.load`)
                return
            }
            if (config.Custom_character_dir.trim() !== '') {
                const customDir = config.Custom_character_dir;
                try {
                    await moveCharacters(session, customDir);
                } catch (err) {
                    console.error(err);
                }
            }
            if (config.outputMode == 'extra') {
                if (sessionMap.checkCharacter(character)) {
                    let channelId = session.channelId.toString().replace(/-/g, '');
                    let userId = session.userId.toString();
                    let files = fs.readdirSync(`${__dirname}/sessionData/`);
                    for (let i = 0; i < files.length; i++) {
                        let parts = files[i].split('-');
                        if (parts.length === 4 && parts[0] === encodeURIComponent(channelId) && parts[1] === encodeURIComponent(userId)) {
                            return `已存在一个历史记录，与用户 ${userId} 在频道 ${channelId} 的会话对应。请不要重复创建。\n如需更换人设请先使用oob.del（别名：删除人设）指令。`;
                        }
                    }
                    let sessionId = channelId + "-" + userId + "-" + character + "-" + config.ttsspeakerID;
                    sessionMap.create(sessionId);
                    if (config.select_character_notice) {
                        return `人设 ${character} 已加载，语音角色已绑定为${config.ttsspeakerID}，新的历史记录已创建。`;
                    }
                    return;
                } else {
                    return `未找到人设 ${character}。`;
                }
            } else {
                if (sessionMap.checkCharacter(character)) {
                    let channelId = session.channelId.toString().replace(/-/g, '');
                    let userId = session.userId.toString();
                    let files = fs.readdirSync(`${__dirname}/sessionData/`);
                    for (let i = 0; i < files.length; i++) {
                        let parts = files[i].split('-');
                        if (parts.length === 3 && parts[0] === encodeURIComponent(channelId) && parts[1] === encodeURIComponent(userId)) {
                            return `已存在一个历史记录，与用户 ${userId} 在频道 ${channelId} 的会话对应。请不要重复创建。\n如需更换人设请先使用oob.del（别名：删除人设）指令。`;
                        }
                    }
                    let sessionId = channelId + "-" + userId + "-" + character;
                    sessionMap.create(sessionId);
                    if (config.select_character_notice) {
                        return `人设 ${character} 已加载，新的历史记录已创建。`;
                    }
                    return;
                } else {
                    return `未找到人设 ${character}。`;
                }
            }
        });


    ctx.command('oob.speaker <newspeakerid:text>', ":\n(别名：更换语音)\n更换语音角色，只在语音绑定模式生效")
        .alias("更换语音")
        .action(async ({ session }, newspeakerid) => {
            if (!newspeakerid || newspeakerid.trim() === "") {
                await session.send(`请至少输入一个id`)
                await session.execute(`help oob.speaker`)
                try {
                    let speaker_get = await ctx.http.get(`${config.ttsurl}/voice/speakers`);
                    let speaker_id_raw = processspeakersData(speaker_get);
                    let speaker_text = speaker_id_raw.formattedString;
                    return `${speaker_text}`
                } catch (error) {
                    console.error(error);
                    return '在处理请求时发生错误,请检查url是否正确';
                }
                return
            }
            if (config.outputMode !== 'extra') {
                await session.send(`此指令仅在同时返回语音与文字，独立语音模式下生效。\n请联系管理员打开此模式再使用。`)
                return
            }

            try {
                let speaker_get = await ctx.http.get(`${config.ttsurl}/voice/speakers`);
                let speaker_id_raw = processspeakersData(speaker_get);
                if (speaker_id_raw === "No BERT-VITS2 data found.") {
                    return `更换语音功能暂时只对bert_vits2生效`
                }
                let MAXID = speaker_id_raw.maxId;
                let speaker_text = speaker_id_raw.formattedString;

                if (isNaN(newspeakerid) || newspeakerid < 0 || newspeakerid > MAXID) {
                    return `请输入一个介于0到${MAXID}之间的数字\n${speaker_text}`;
                }
            } catch (error) {
                console.error(error);
                return '在处理请求时发生错误,请检查url是否正确';
            }

            let channelId = '';
            let userId = '';
            let characterName = '';
            let oldspeakerid = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2]);
                    oldspeakerid = decodeURIComponent(parts[3].replace('.json', ''))
                    break;
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '')} \n ${session.userId.toString()}`;
            } else {
                let sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + oldspeakerid;
                let newsessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + newspeakerid;
                let safeId = encodeURIComponent(sessionId);
                let newsafeId = encodeURIComponent(newsessionId);
                let oldFilePath = `${__dirname}/sessionData/${safeId}.json`;
                let newFilePath = `${__dirname}/sessionData/${newsafeId}.json`;
                fs.renameSync(oldFilePath, newFilePath);
                return `已更改绑定语音角色：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName}，语音角色：${newspeakerid}`;
            }
        });


    ctx.command('oob.del', ":\n(别名：删除人设)\n删除当前人设")
        .alias("删除人设")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let speakerid = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (config.outputMode == `extra`) {
                    if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2]);
                        speakerid = decodeURIComponent(parts[3].replace('.json', ''));
                        break;
                    }
                } else {
                    if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2].replace('.json', ''));
                        break;
                    }
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '')} \n ${session.userId.toString()}`;
            } else {
                let sessionId = ''
                if (config.outputMode == `extra`) {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + speakerid;
                } else {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName;
                }
                let safeId = encodeURIComponent(sessionId);
                fs.unlinkSync(`${__dirname}/sessionData/${safeId}.json`);
                return `已删除历史记录文件：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName} \n 现在可以使用oob.load（别名：加载人设）来选择新的人设了`;
            }
        });


    ctx.command('oob.reset', ":\n(别名：重置人设)\n重置当前人设")
        .alias("重置人设")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let speakerid = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (config.outputMode == `extra`) {
                    if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2]);
                        speakerid = decodeURIComponent(parts[3].replace('.json', ''));
                        break;
                    }
                } else {
                    if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2].replace('.json', ''));
                        break;
                    }
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '') } \n ${session.userId.toString()}`;
            } else {
                let sessionId = ''
                if (config.outputMode == `extra`) {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + speakerid;
                } else {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName;
                }
                let safeId = encodeURIComponent(sessionId);
                fs.writeFileSync(`${__dirname}/sessionData/${safeId}.json`, '[]');
                return `已重置历史记录文件：\n channelId: ${channelId}, userId: ${userId}, 人设: ${characterName} \n 如果需要选择新的人设请使用oob.load（别名：加载人设）指令`;
            }
        });


    ctx.command('oob.check', ":\n(别名：当前人设)\n检查历史记录文件是否存在")
        .alias("当前人设")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (config.outputMode == `extra`) {
                    if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2]);
                        break;
                    }
                } else {
                    if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2].replace('.json', ''));
                        break;
                    }
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '') } \n ${session.userId.toString()}`;
            }
            return `文件存在：\n channelId: ${channelId}, userId: ${userId}, characterName: ${characterName}`;
        });


    ctx.command("oob.undo", ":\n(别名：撤回)\n撤回刚刚的发言，让Ai回到上一句发言之前")
        .alias("撤回")
        .action(async ({ session }) => {
            let channelId = '';
            let userId = '';
            let characterName = '';
            let speakerid = '';
            let files = fs.readdirSync(`${__dirname}/sessionData/`);
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (config.outputMode == `extra`) {
                    if (parts.length === 4 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2]);
                        speakerid = decodeURIComponent(parts[3].replace('.json', ''));
                        break;
                    }
                } else {
                    if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString().replace(/-/g, '')) && parts[1] == encodeURIComponent(session.userId.toString())) {
                        channelId = decodeURIComponent(parts[0]);
                        userId = decodeURIComponent(parts[1]);
                        characterName = decodeURIComponent(parts[2].replace('.json', ''));
                        break;
                    }
                }
            }
            if (!channelId) {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '') } \n ${session.userId.toString()}`;
            } else {
                let sessionId = ''
                if (config.outputMode == `extra`) {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName + "-" + speakerid;
                } else {
                    sessionId = session.channelId.toString().replace(/-/g, '') + "-" + session.userId.toString() + "-" + characterName;
                }
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


    ctx.command("oob.list", ":\n(别名：人设列表)\n列出所有可用人设")
        .alias("人设列表")
        .action(async () => {
            if (config.Custom_character_dir.trim() !== '') {
                let srcDir = config.Custom_character_dir
                let destDir = path.join(__dirname, 'characters');
                await copyDirectory(srcDir, destDir);
            }
            let files = fs.readdirSync(`${__dirname}/characters/`);
            if (files.length === 0) {
                return '目前没有可用的人设文件。';
            } else {
                let characterNames = files.map(file => file.replace('.json', ''));
                return '可用的人设有：\n' + characterNames.join('\n') + '\n请使用oob.load+名称选择人设';
            }
        });


    ctx.command("oob.tag <tag...>", ":\n(别名：AI绘图)\n让AI来写tag并进行绘图")
        .alias("AI绘图")
        .action(async ({ session }, ...tag) => {
            if (tag.length === 0) {
                await session.send(`请至少输入一个关键词`)
                await session.execute(`help oob.tag`)
                return
            }
            let characterName = 'tag';
            if (sessionMap.check_buildin_Character(characterName)) {
                let characterdata = sessionMap.get_builtin_Character(characterName);
                let character = characterdata.concat().join("\n");
                let prompt = character + '\n You: Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ' + tag + ' \n';
                let prompt2 = prompt + `AI:`;
                let request = {
                    "prompt": prompt2,
                    "max_tokens": 250,
                    "do_sample": true,
                    "temperature": 1.3,
                    "top_p": 0.1,
                    "typical_p": 1,
                    "epsilon_cutoff": 0,
                    "eta_cutoff": 0,
                    "repetition_penalty": 1.18,
                    "top_k": 40,
                    "min_length": 0,
                    "no_repeat_ngram_size": 0,
                    "num_beams": 1,
                    "penalty_alpha": 0,
                    "length_penalty": 1,
                    "early_stopping": false,
                    "mirostat_mode": 0,
                    "mirostat_tau": 5,
                    "mirostat_eta": 0.1,
                    "seed": -1,
                    "add_bos_token": true,
                    "truncation_length": 2048,
                    "ban_eos_token": false,
                    "skip_special_tokens": true,
                };

                let response = await axios.post(config.apiURL, request);

                if (response.status == 200) {
                    let fullresult = response.data.choices[0].text;
                    if (config.hires_fix) {
                        await session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n  ${fullresult}`);
                    } else {
                        await session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n  ${fullresult}`);
                    }
                    //是否发送tag
                    if (config.send_oobmtg_response) {
                        return `${config.prefix} ${fullresult}`;
                    }

                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到tag文件。`;
            }
        });


    ctx.command("oob.translate <text...>", ":\n(别名：AI翻译)\n让AI来翻译，暂时只支持中英文互译")
        .alias("AI翻译")
        .action(async ({ session }, ...text) => {
            if (text.length === 0) {
                await session.send(`请至少输入一个关键词`)
                await session.execute(`help oob.tag`)
                return
            }
            let characterName = 'translate';
            if (sessionMap.check_buildin_Character(characterName)) {
                let characterdata = sessionMap.get_builtin_Character(characterName);
                let character = characterdata.concat().join("\n");
                let prompt = character + '\n You: 请对接下来给你的文本进行翻译，如果给你中文就翻译成英文，如果给你英文就翻译成中文。你现在要翻译的是：' + text + '\n';
                let prompt2 =prompt + `AI:`
                let request = {
                    "prompt": prompt2,
                    "max_tokens": 250,
                    "do_sample": true,
                    "temperature": 1.3,
                    "top_p": 0.1,
                    "typical_p": 1,
                    "epsilon_cutoff": 0,
                    "eta_cutoff": 0,
                    "repetition_penalty": 1.18,
                    "top_k": 40,
                    "min_length": 0,
                    "no_repeat_ngram_size": 0,
                    "num_beams": 1,
                    "penalty_alpha": 0,
                    "length_penalty": 1,
                    "early_stopping": false,
                    "mirostat_mode": 0,
                    "mirostat_tau": 5,
                    "mirostat_eta": 0.1,
                    "seed": -1,
                    "add_bos_token": true,
                    "truncation_length": 2048,
                    "ban_eos_token": false,
                    "skip_special_tokens": true,
                };

                let response = await axios.post(config.apiURL, request);
                if (response.status == 200) {
                    let fullresult = response.data.choices[0].text;
                    return fullresult;
                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到translate文件。`;
            }
        });




    ctx.command("oob.yuan <text...>", ":\n(别名：赛博缘)\n让赛博缘来给你算运势，需要至少输入一个关键词")
        .alias("赛博缘")
        .action(async ({ session }, ...text) => {
            let characterName = 'suan_ming';
            if (text.length === 0) {
                await session.send("请至少输入一个关键词");
                await session.execute(`help oob.yuan`)
                return;
            } else {
                if (sessionMap.check_buildin_Character(characterName)) {
                    let characterdata = sessionMap.get_builtin_Character(characterName);
                    let character = characterdata.concat().join("\n");
                    await session.send(`赛博缘祈福中……`)
                    let random = getRandomInt(0, 100);
                    let suan_ming_output
                    if (random === 0) {
                        suan_ming_output = `您今天的运势为“厄运当头” (${random}/100)`;
                    } else if (random >= 1 && random <= 30) {
                        suan_ming_output = `您今天的运势为“末凶” (${random}/100)`;
                    } else if (random >= 31 && random <= 50) {
                        suan_ming_output = `您今天的运势为“小凶” (${random}/100)`;
                    } else if (random >= 51 && random <= 70) {
                        suan_ming_output = `您今天的运势为“小吉” (${random}/100)`;
                    } else if (random >= 71 && random <= 90) {
                        suan_ming_output = `您今天的运势为“大吉” (${random}/100)`;
                    } else if (random >= 91 && random <= 100) {
                        suan_ming_output = `您今天的运势为“吉星高照” (${random}/100)`;
                    }
                    if (config.suan_ming_plus) {
                        let suan_ming_prompt = character +`\n` + suan_ming_output + `\n您输入的关键词为：${text}\n接下来我将根据关键词对您今天的运势做解读：`;

                        let prompt = suan_ming_prompt;
                        let request = {
                            "prompt": prompt,
                            "max_tokens": 350,
                            "do_sample": true,
                            "temperature": 1.3,
                            "top_p": 0.1,
                            "typical_p": 1,
                            "epsilon_cutoff": 0,
                            "eta_cutoff": 0,
                            "repetition_penalty": 1.18,
                            "top_k": 40,
                            "min_length": 0,
                            "no_repeat_ngram_size": 0,
                            "num_beams": 1,
                            "penalty_alpha": 0,
                            "length_penalty": 1,
                            "early_stopping": false,
                            "mirostat_mode": 0,
                            "mirostat_tau": 5,
                            "mirostat_eta": 0.1,
                            "seed": -1,
                            "add_bos_token": true,
                            "truncation_length": 2048,
                            "ban_eos_token": false,
                            "skip_special_tokens": true,
                        };
                        let response = await axios.post(config.apiURL, request);

                        if (response.status == 200) {
                            let fullresult = response.data.choices[0].text;
                            await session.send(suan_ming_output + `\n您输入的关键词为：${text}\n接下来我将根据关键词对您今天的运势做解读：` + fullresult)
                        } else {
                            return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                        }


                    } else {
                        await session.send(`您输入的关键词为：${text}\n` + suan_ming_output);
                    }

                } else {
                    return `未找到赛博缘人设。`;
                }
            }
        });




    ctx.command('oob.Metadata', ":\n(别名：人设处理)\nPNG图片人设读取与处理")
        .alias("人设处理")
        .action(async ({ session }) => {
            const Custom_PNG_dir = config.Custom_PNG_dir;
            if (Custom_PNG_dir) {
                await movePNG(session, config.Custom_PNG_dir)
            }
            readMetadata();
            await sortAndSaveMetadata(session, config);
            const sortedDir = path.join(__dirname, 'Sorted');
            await session.send(`已将PNGfile文件夹中的所有PNG图片的元数据存储在Metadata文件夹中，处理结果保存在Sorted文件夹中。`)
            const customSortedDir = config.Custom_Sorted_dir;
            if (!customSortedDir) {
                return;
            }
            if (fs.existsSync(sortedDir) && customSortedDir) {
                await session.send(`检测到外置目录，已将结果转入。`)
                copyDirectory(sortedDir, customSortedDir);
            }
            return;
        });


    ctx.on('guild-member-added', async (session) => {
        if (config.send_welcome) {
            session.send(config.welcome_words)
        }
    });

    RegExp.escape = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    let nicknameRegex = new RegExp("^(" + config.nicknames.map(RegExp.escape).join("|") + ")\\s");
    ctx.middleware(async (session, next) => {
        if (ctx.bots[session.uid])
            return;
        // 随机触发
        if (config.randnum > 0 && Math.random() < config.randnum) {
            console.log('随机触发条件满足');
            let msg = String(session.content);
            await session.execute(`oob ${msg}`);
            return;
        }
        // @触发
        if (config.if_at && session.parsed.appel) {
            let msg = String(session.content);
            msg = msg.replace(`<at id="${session.selfId}"/> `, '');
            msg = msg.replace(`<at id="${session.selfId}"/>`, '');
            if (msg.indexOf(session.selfId)) {
                msg = msg.replace(/<[^>]+>/g, '');
            }
            await session.execute(`oob ${msg}`);
        }
        // 昵称触发
        if (config.nicknames.length > 0) {
            let match = session.content.match(nicknameRegex);
            if (match) {
                let msg = String(session.content);
                msg = msg.slice(match[0].length).trim();
                await session.execute(`oob ${msg}`);
            }
        }
        // 私聊触发
        if (session.channelId == "private:" + String(session.userId) && config.if_private) {
            let msg = String(session.content);
            if (msg.startsWith("[自动回复]")) {
                return;
            }
            await session.execute(`oob ${msg}`);
            return;
        }
        await next();
    });


}

exports.apply = apply;
