"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const koishi_1 = require("koishi");
const axios = require("axios");
const path = require('path');
const png = require('png-metadata');
const cheerio = require('cheerio');
const fs = require('fs');
const util = require('util');
const { channel } = require("diagnostics_channel");
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const HttpsProxyAgent = require('https-proxy-agent');


exports.name = "oobabooga-testbot";
exports.usage = `
### ！！使用教程！！
https://forum.koishi.xyz/t/topic/2391<br>
https://www.bilibili.com/read/cv24006101? <br>

### 用前需知
### 注意！3.0版本大改，可以积极反馈！QQ讨论群：719518427
### 当前为正式版本3.3.0
注意！插件更新会导致历史记录与默认人设重置，请自行保存相关文档！<br>
使用前需要自行架设oobabooga-text-generation-webui后端<br>
使用前需要自行架设novelai组件或者rryth组件<br>
默认人设位置：koishi-plugin-oobabooga-testbot\\lib\\characters<br>
历史记录位置：koishi-plugin-oobabooga-testbot\\lib\\sessionData<br>


github上有一键安装包，包含Windows，Linux，Mac。<br>
也可以直接使用我制作的一键懒人包：https://www.bilibili.com/video/BV1Te411U7me<br>
github地址:https://github.com/oobabooga/text-generation-webui<br>
架设完成需要打开api服务才行，默认API端口号为：http://127.0.0.1:5000/<br>

支持使用Vits语音输出回复，需要加载任意tts插件比如open-vits插件，或者直接使用内置接口。<br>
可以通过编辑设置中的指令开头，来调整使用的插件格式。比如openvits插件就可以直接用：say<br>
open-vits插件：https://github.com/initialencounter/koishi-plugin-open-vits#readme<br>
自建vits后端：https://github.com/Artrajz/vits-simple-api<br>

支持使用语言模型补充tag，并调用AI绘图插件进行绘图。<br>
NovelAI插件：https://bot.novelai.dev/<br>
rryth插件：https://github.com/MirrorCY/rryth#readme<br>
自建stable-diffusion：秋叶一键包：https://www.bilibili.com/video/BV1iM4y1y7oA/?<br>

### QQ讨论群：719518427
有疑问，出现bug，有改进想法都可以加qq群讨论<br>

### 推荐使用的语言模型：
Nous-Hermes-13b-Chinese-plus-GPTQ：https://huggingface.co/coyude/Nous-Hermes-13b-Chinese-plus-GPTQ<br>
强烈推荐：openbuddy-llama2-13b：https://huggingface.co/TheBloke/OpenBuddy-Llama2-13B-v11.1-GPTQ<br>
强烈推荐：Nous-Capybara-34b-gptq：https://huggingface.co/TheBloke/Nous-Capybara-34B-GPTQ<br>
超级推荐：dolphin-2.9.1-yi-1.5-34b-4.65bpw-h6-exl2：https://hf-mirror.com/LoneStriker/dolphin-2.9.1-yi-1.5-34b-4.65bpw-h6-exl2<br>
等模型<br>

### 人设网址分享与处理：
（以下网址，需要科学上网，直接下载人设png图片文件放入插件根目录下的PNGfile文件，使用oob.Metadata，就会自动生成基础人设文件）<br>
https://www.characterhub.org/<br>
https://booru.plus/+pygmalion<br>

### 新版本新增：
工具调用能力，包括天气查询，时间查询，Google搜索<br>
调整oob.undo删除方式<br>
调整部分默认参数<br>
补全系统消息，让模型知道已经发送图片<br>
详情可以去：https://forum.koishi.xyz/t/topic/2391 查看更新日志<br>
`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        apiURL: koishi_1.Schema.string()
            .description('API服务器地址')
            .default('http://127.0.0.1:5000/'),
        historyLimit: koishi_1.Schema.number()
            .description('历史记录上限(注意这里指的是句子数量，一组对话有两个句子。)')
            .default(10),
        outputMode: koishi_1.Schema.union([
            koishi_1.Schema.const('text').description('只返回文字'),
            koishi_1.Schema.const('voice').description('只返回语音'),
            koishi_1.Schema.const('both').description('同时返回语音与文字'),
            koishi_1.Schema.const('extra').description('同时返回语音与文字(使用内置独立语音接口)'),
        ])
            .description('音频与文字输出模式')
            .default('text'),
        groupmessage: koishi_1.Schema.boolean()
            .description('！！是否开启真群聊模式(模型不够聪明千万别开)！！')
            .default(false),
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
        oobtag_ON: koishi_1.Schema.boolean()
            .description('是否启动oob.tag指令(关闭后会直接关闭所有绘图相关内容)')
            .default(false),
        setu_ON: koishi_1.Schema.boolean()
            .description('在未启动oob.tag的时候是否要开启与setu插件的联动(需要配置setu插件才能生效)')
            .default(false),
        setuprefix: koishi_1.Schema.string().description('色图插件前缀(例如setu插件是setu)')
            .default('setu'),
        prefix: koishi_1.Schema.string().description('跑图插件前缀(例如novelai插件是nai)')
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
            .default(['照片', '图片', '图像', 'picture', 'pic', '绘图', 'paint', '自拍', '合影', 'image', 'photo', 'snapshot', 'selfie'])
            .collapse(true),
    }).description('绘图设置，涉及oob.tag指令与AI自动识别绘图模式'),
    koishi_1.Schema.object({
        ttscommand: koishi_1.Schema.string()
            .description('对接插件使用的指令(如果是对接其他语音插件只需要填写这个，下面的都不用管)')
            .default('say'),
        ttsurl: koishi_1.Schema.string()
            .description('vits-simple-api的url，默认值为http://127.0.0.1:23456/')
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
        FixStartReply: koishi_1.Schema.string()
            .description('让AI固定以此句子开始回复')
            .default(''),
        DelFixStartReply: koishi_1.Schema.boolean()
            .description('是否在回复中显示固定句子开头')
            .default(false)
    }).description('回复起始相关设定'),
    koishi_1.Schema.object({
        UseTool: koishi_1.Schema.boolean()
            .description('开启工具调用')
            .default(false),
        UseTool_fullreply: koishi_1.Schema.boolean()
            .description('发送精确数据')
            .default(true),
        Google_Proxy: koishi_1.Schema.string()
            .description('谷歌搜索引擎的代理地址，默认本地clash')
            .default('http://127.0.0.1:7890'),
        search_keywords: koishi_1.Schema.array(koishi_1.Schema.string())
            .description('触发搜索的关键词(在模型判断需要搜索且用户输入包含如下内容时，搜索生效)')
            .default(['搜索', '检索', '找', '搜', '查', '上网', '详细知识', '详细信息', '链接'])
            .collapse(true),
        UseTool_reply: koishi_1.Schema.boolean()
            .description('显示调用工具判断(Debug模式)')
            .default(false)
    }).description('工具调用相关设定(最好使用34b及以上的模型才会有较好的效果)'),
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
        temperature: koishi_1.Schema.number().description('temperature')
            .default(0.9),
        instruction_template: koishi_1.Schema.string().description('instruction_template')
            .default(''),
        frequency_penalty: koishi_1.Schema.number().description('frequency_penalty')
            .default(0),
        presence_penalty: koishi_1.Schema.number().description('presence_penalty')
            .default(0),
        stop: koishi_1.Schema.string().description('stop')
            .default("\n\n"),
        top_p: koishi_1.Schema.number().description('top_p')
            .default(0.9),
        min_p: koishi_1.Schema.number().description('min_p')
            .default(0),
        top_k: koishi_1.Schema.number().description('top_k')
            .default(20),
        repetition_penalty: koishi_1.Schema.number().description('repetition_penalty')
            .default(1.15),
        repetition_penalty_range: koishi_1.Schema.number().description('repetition_penalty_range')
            .default(1024),
        typical_p: koishi_1.Schema.number().description('typical_p')
            .default(1),
        tfs: koishi_1.Schema.number().description('tfs')
            .default(1),
        top_a: koishi_1.Schema.number().description('top_a')
            .default(0),
        epsilon_cutoff: koishi_1.Schema.number().description('epsilon_cutoff')
            .default(0),
        eta_cutoff: koishi_1.Schema.number().description('eta_cutoff')
            .default(0),
        guidance_scale: koishi_1.Schema.number().description('guidance_scale')
            .default(1),
        negative_prompt: koishi_1.Schema.string().description('negative_prompt')
            .default(''),
        penalty_alpha: koishi_1.Schema.number().description('penalty_alpha')
            .default(0),
        mirostat_mode: koishi_1.Schema.number().description('mirostat_mode')
            .default(0),
        mirostat_tau: koishi_1.Schema.number().description('mirostat_tau')
            .default(5),
        mirostat_eta: koishi_1.Schema.number().description('mirostat_eta')
            .default(0.1),
        temperature_last: koishi_1.Schema.boolean().description('temperature_last')
            .default(false),
        do_sample: koishi_1.Schema.boolean().description('do_sample')
            .default(true),
        seed: koishi_1.Schema.number().description('seed')
            .default(-1),
        encoder_repetition_penalty: koishi_1.Schema.number().description('encoder_repetition_penalty')
            .default(1),
        no_repeat_ngram_size: koishi_1.Schema.number().description('no_repeat_ngram_size')
            .default(0),
        min_length: koishi_1.Schema.number().description('min_length')
            .default(0),
        num_beams: koishi_1.Schema.number().description('num_beams')
            .default(1),
        length_penalty: koishi_1.Schema.number().description('length_penalty')
            .default(1),
        early_stopping: koishi_1.Schema.boolean().description('early_stopping')
            .default(false),
        truncation_length: koishi_1.Schema.number().description('truncation_length')
            .default(0),
        max_tokens_second: koishi_1.Schema.number().description('max_tokens_second')
            .default(0),
        custom_token_bans: koishi_1.Schema.string().description('custom_token_bans')
            .default(''),
        auto_max_new_tokens: koishi_1.Schema.boolean().description('auto_max_new_tokens')
            .default(false),
        ban_eos_token: koishi_1.Schema.boolean().description('ban_eos_token')
            .default(false),
        add_bos_token: koishi_1.Schema.boolean().description('add_bos_token')
            .default(true),
        skip_special_tokens: koishi_1.Schema.boolean().description('skip_special_tokens')
            .default(true),
        grammar_string: koishi_1.Schema.string().description('grammar_string')
            .default(''),
    }).description('高阶设置，如果你不知道你在干什么，请不要修改，保持默认'),
]);


//sessionMap
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



//创建requestbody
function createRequestBody(config, customConfig = {}) {
    const defaultConfig = {
        "messages": [{}],
        "continue_": false,
        "instruction_template":config.instruction_template,
        "frequency_penalty": config.frequency_penalty,
        "max_tokens": config.max_tokens,
        "presence_penalty": config.presence_penalty,
        "stop": config.stop,
        "temperature": config.temperature,
        "top_p": config.top_p,
        "min_p": config.min_p,
        "top_k": config.top_k,
        "repetition_penalty": config.repetition_penalty,
        "repetition_penalty_range": config.repetition_penalty_range,
        "typical_p": config.typical_p,
        "tfs": config.tfs,
        "top_a": config.top_a,
        "epsilon_cutoff": config.epsilon_cutoff,
        "eta_cutoff": config.eta_cutoff,
        "guidance_scale": config.guidance_scale,
        "negative_prompt": config.negative_prompt,
        "penalty_alpha": config.penalty_alpha,
        "mirostat_mode": config.mirostat_mode,
        "mirostat_tau": config.mirostat_tau,
        "mirostat_eta": config.mirostat_eta,
        "temperature_last": config.temperature_last,
        "do_sample": config.do_sample,
        "seed": config.seed,
        "encoder_repetition_penalty": config.encoder_repetition_penalty,
        "no_repeat_ngram_size": config.no_repeat_ngram_size,
        "min_length": config.min_length,
        "num_beams": config.num_beams,
        "length_penalty": config.length_penalty,
        "early_stopping": config.early_stopping,
        "truncation_length": config.truncation_length,
        "max_tokens_second": config.max_tokens_second,
        "custom_token_bans": config.custom_token_bans,
        "auto_max_new_tokens": config.auto_max_new_tokens,
        "ban_eos_token": config.ban_eos_token,
        "add_bos_token": config.add_bos_token,
        "skip_special_tokens": config.skip_special_tokens,
        "grammar_string": config.grammar_string
    };

    return Object.assign({}, defaultConfig, customConfig);
}

//准备url
function prepareURL(config) {
    let url = '';
    if (config.apiURL.endsWith('/')) {
        url = config.apiURL + 'v1/chat/completions';
    } else {
        url = config.apiURL + '/v1/chat/completions';
    }
    return url;
}

// 解析人设名称
async function getSessionData(session,config) {
    let safefilename = await CheckSessionFile(session, config);
    let filename = decodeURIComponent(safefilename.replace(/\.json$/, ''));
    let parts = filename.split('-');
    let channelId = parts[0];
    let userId = parts[1];
    let characterName = parts[2];
    let speakerId = parts[3];
    return {
        channelId: channelId,
        userId: userId,
        characterName: characterName,
        speakerId: speakerId
    };
}

//自动选择人设
async function selectCharacter(session, config, autocharactername) {
    if (config.select_character_notice) {
        await session.send('未检测到对应历史记录文件，已自动选择人设。');
    }
    await session.execute(`oob.load ${autocharactername}`);
}

//创建sessionId
function buildSessionId(session, config, characterName, speakerId) {
    let sessionIdParts = [
        session.channelId.toString().replace(/-/g, '')
    ];

    if (!config.groupmessage) {
        sessionIdParts.push(session.userId.toString());
    } else {
        sessionIdParts.push('public')
    }

    sessionIdParts.push(characterName);
    sessionIdParts.push(speakerId);

    return sessionIdParts.join('-');
}

//检查现有的历史记录文件
async function CheckSessionFile(session, config) {
    const channelId = encodeURIComponent(session.channelId.toString().replace(/-/g, ''));
    const userId = encodeURIComponent(session.userId.toString());
    const files = fs.readdirSync(`${__dirname}/sessionData/`);
    let prefixPattern;

    if (config.groupmessage) {
        prefixPattern = new RegExp(`^${channelId}-public`);
    } else {
        prefixPattern = new RegExp(`^${channelId}-${userId}`);
    }

    for (let file of files) {
        if (prefixPattern.test(file)) {
            return file;
        }
    }
    return ""; 
}

//读取speakers
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

//读取metadata
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

//移动人设
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

//移动png
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

//复制json文件
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

//处理metadata
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

//随机数
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//读取时间
function getTime() {
    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    month = month < 10 ? '0' + month : month;
    date = date < 10 ? '0' + date : date;
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return '时间查询结果：\n当前日期：' + year + '年' + month + '月' + date + '日' + '\n当前时间：' + hours + '时' + minutes + '分';
}

//读取城市id
function loadCityIds(filePath) {
    const cityIdMap = {};
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n');

    lines.forEach(line => {
        const [id, city] = line.split('=');
        if (id && city) {
            cityIdMap[city.trim()] = id.trim();
        }
    });

    return cityIdMap;
}

//读取天气
async function getWeather(ctx, session, config, cityName) {
    const cityIdMap = loadCityIds(path.join(__dirname, 'Tools', 'cityid.txt'));
    const cityId = cityIdMap[cityName];

    if (!cityId) {
        await session.send(`未找到城市 ${cityName} 的ID`);
        return `无法查询到${cityName}对应的城市id，天气工具调用失败。`;
    }
    try {
        const response = await ctx.http.get(`http://t.weather.itboy.net/api/weather/city/${cityId}`);
        if (response.status === 200) {
            const data = response;
            //天气数据
            const todayWeather = data.data;
            const cityInfo = data.cityInfo;
            const shidu = todayWeather.shidu;
            const pm25 = todayWeather.pm25;
            const pm10 = todayWeather.pm10;
            const quality = todayWeather.quality;
            const wendu = todayWeather.wendu;
            const ganmao = todayWeather.ganmao;
            return `天气查询结果：城市：${cityInfo.city}\n湿度：${shidu}\nPM2.5：${pm25}\nPM10：${pm10}\n空气质量：${quality}\n温度：${wendu}\n温馨提示：${ganmao}`;
        } else {
            if (config.UseTool_reply) {
                await session.send('天气工具调用失败，数据请求失败');
            }
            console.log('天气工具调用失败，数据请求失败');
            return '天气工具调用失败';
        }
    } catch (error) {
        if (config.UseTool_reply) {
            await session.send('API请求出错:' + error);
        }
        console.log('API请求出错:' + error);
        return '天气工具调用失败';
    }
}

//搜索并读取网页URL
async function searchWeb(config, question) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36"
    };
    // 设置代理，默认Clash
    const proxy = config.Google_Proxy;
    const agent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
    try {
        const response = await axios.get(`https://www.google.com/search?hl=zh-CN&q=${question}`, {
            headers,
            httpsAgent: agent
        });
        if (response.status !== 200) {
            console.log(response)
            throw new Error("无法连接到google");
        }
        const $ = cheerio.load(response.data);
        // 获取所有搜索结果
        const searchResults = [];
        const results = $('.tF2Cxc');

        if (results.length === 0) {
            console.log(`没有检索到相关内容:${response}`);
            return `没有检索到相关内容，检索条目:${question}`;
        }
        //取前三条
        let Search_Count = 0;
        results.each((i, result) => {
            if (Search_Count >= 3) return false;
            const titleTag = $(result).find('h3');
            const urlTag = $(result).find('a');

            if (titleTag.length && urlTag.length) {
                const title = titleTag.text();
                const url = urlTag.attr('href');
                searchResults.push(`标题：${title} URL：${url}`);
                Search_Count++;
            } else {
                console.log(`缺少标题或URL链接地址: ${$(result).html()}`);
            }
        });
        return searchResults.join('\n');

    } catch (error) {
        console.error('检索出错Error:', error);
        return `检索出错，无法连接到Google，检索条目:${question}`;
    }
}

//工具判断
async function WhichTool(config, message) {
    let UseTool_data = sessionMap.get_builtin_Character('Tools');
    const UserMessage = `这里是你需要判断意图，并决定工具调用的文本：${message}`;
    UseTool_data.push({ "role": "user", "content": UserMessage });
    //准备request
    const url = prepareURL(config)
    const customRequest = {
        "messages": UseTool_data,
        "temperature": 0.2,
        "max_tokens": 20,
    };
    const request = createRequestBody(config, customRequest)
    //post request and get output
    let response = await axios.post(url, request);
    let Tool_reply = response.data.choices[0].message.content
    return Tool_reply
}

//工具总调用
async function UseTool(ctx, session, config, message, Tool_reply) {
    //显示具体回复
    if (config.UseTool_reply) {
        await session.send(Tool_reply)
    }
    //时间工具
    if (Tool_reply.includes("Time")) {
        const Time = await getTime();
        if (config.UseTool_fullreply) {
            await session.send(Time);
        }
        const Tool_info = '\nSystem Information:\n(来自系统的消息，请你提供给用户)\n' + Time;
        return Tool_info;
    }
    //天气工具
    if (Tool_reply.includes("Weather")) {
        const cityNameMatch = Tool_reply.match(/\[Weather=\s*(.*?)\]/);
        if (cityNameMatch) {
            const cityName = cityNameMatch[1];
            const weather = await getWeather(ctx, session, config, cityName);
            if (config.UseTool_fullreply) {
                await session.send(weather);
            }
            const Tool_info = `\nSystem Information:\n(来自系统的消息，请你提供给用户)\n调用天气工具获得的${cityName}天气为：\n` + weather;
            return Tool_info;
        }
    }
    //搜索引擎
    if (Tool_reply.includes("Search")) {
        const keywords = config.search_keywords
        //包涵keywords
        if (keywords.some(keyword => message.includes(keyword))) {
            let Search_data = sessionMap.get_builtin_Character('Search');
            const UserMessage = `这里是你需要判断意图，并转化的文本：${message}`;
            Search_data.push({ "role": "user", "content": UserMessage });
            //准备request
            const url = prepareURL(config)
            const customRequest = {
                "messages": Search_data,
                "temperature": 0.2,
                "max_tokens": 50,
            };
            const request = createRequestBody(config, customRequest)
            //post request and get output
            const reply = await axios.post(url, request);
            const question = reply.data.choices[0].message.content
            //调用搜索
            const search = await searchWeb(config, question);
            if (config.UseTool_fullreply) {
                await session.send(`搜索问题：\n"${question}"\n搜索结果：\n${search}`);
            }
            let Tool_info = `\nSystem Information:\n(来自系统的消息，请你提供给用户)\n调用搜索引擎检索："${question}"\n获得如下参考链接，请将其提供给用户：\n${search}`;
            return Tool_info;
        } else {
            return 'None';
        }
    } else {
        return 'None';
    }
}

//执行绘图
async function executeNAI(session,config, fullResult, sessionId) {
    let command = `${config.prefix} -r ${config.resolution} -t ${config.steps} -c ${config.scale}`;
    if (config.hires_fix) {
        command += " -H";
    }
    command += `\n${config.drawing_prefix} ${fullResult}`;
    await session.execute(command);

    if (sessionId) {
        // 添加图片发送历史记录告知ai已经发送图片
        let history = await sessionMap.getHistory(sessionId);
        history.push({ "role": "assistant", "content": `System Information:\n图片发送成功` })
        await sessionMap.saveHistory(sessionId, history);
    }
}

//绘图逻辑
async function AutoNai(session, config, response, message, characterName, url, fullinput, sessionId) {
    //AI识别绘图处理部分
    if (config.use_oobmtg_auto_response !== 'off') {
        let fullResult = response.data.choices[0].message.content;
        let keywords = config.trigger_keywords;
        //关键词触发直接绘图
        if (config.use_oobmtg_auto_response == 'keyword') {
            if (keywords.some(keyword => message.includes(keyword))) {
                await executeNAI(session, config, fullResult, sessionId);
            }
        }
        //关键词触发AI补充绘图
        if (config.use_oobmtg_auto_response == 'keyword2') {
            if (keywords.some(keyword => message.includes(keyword))) {
                session.execute(`oob.tag ${fullResult}`);
            }
        }
        //一次，二次，三次AI绘图
        if (config.use_oobmtg_auto_response == 'AI' || config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'tripleAI') {
            let if_pic_data = sessionMap.get_builtin_Character('check-if-pic');
            let if_pic_prompt = `Answer only in 'Yes' or 'No'.Please determine if a picture needs to be generated for this conversation: user: ${message} ; ${characterName}: ${fullResult}`;
            if_pic_data.push({ "role": "user", "content": if_pic_prompt });
            //准备request
            const customRequest = {
                "messages": if_pic_data,
                "temperature": 0.4,
                "max_tokens": 5,
            };
            const request = createRequestBody(config, customRequest);
            //post request and get output
            let response = await axios.post(url, request);
            let checkrequest_reply = response.data.choices[0].message.content
            //自动判断的debug模式
            if (config.send_auto_oobmtg_judge) {
                if (checkrequest_reply.includes("Yes") || checkrequest_reply.includes("yes")) {
                    session.send("AI判断绘图:Yes")
                } else {
                    session.send("AI判断绘图:No")
                }
            }
            if (checkrequest_reply.includes("Yes") || checkrequest_reply.includes("yes")) {
                //一次AI绘图
                if (config.use_oobmtg_auto_response == 'AI') {
                    fullinput.push({ "role": "assistant", "content": fullResult })
                    fullinput.push({ "role": "user", "content": "Describe your appearance, your surroundings and what you are doing right now. 请描述自己的外貌、周围的环境以及当前正在做什么。" })
                    //准备request
                    const customRequest = {
                        "messages": fullinput,
                        "max_tokens": 150,
                        "temperature": 0.6,
                    };
                    const request = createRequestBody(config, customRequest);
                    //post request and get output
                    let response = await axios.post(url, request);
                    let oneAI = response.data.choices[0].message.content
                    await executeNAI(session, config, oneAI, sessionId);
                }
                //二次AI绘图
                if (config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'tripleAI') {
                    fullinput.pop()
                    fullinput.push({ "role": "user", "content": "Describe your appearance. 请详细描述你自己的外貌。" })
                    //准备request
                    const customRequest1 = {
                        "messages": fullinput,
                        "max_tokens": 150,
                        "temperature": 0.6,
                    };
                    const request1 = createRequestBody(config, customRequest1);
                    //post request and get output
                    let response1 = await axios.post(url, request1);
                    let outlook_result = response1.data.choices[0].message.content

                    fullinput.pop()
                    fullinput.push({ "role": "user", "content": "Describe your surroundings and what you are doing right now. 请详细描述你周围的环境以及你当前正在做什么。" })
                    //准备request
                    const customRequest2 = {
                        "messages": fullinput,
                        "max_tokens": 150,
                        "temperature": 0.6,
                    };
                    const request2 = createRequestBody(config, customRequest2);
                    //post request and get output
                    let response2 = await axios.post(url, request2);
                    let surround_doing_result = response2.data.choices[0].message.content
                    //组合两个结果并执行绘图
                    let doubleAI = outlook_result + '.' + surround_doing_result
                    if (config.use_oobmtg_auto_response == 'doubleAI') {
                        await executeNAI(session, config, doubleAI, sessionId);
                    }
                    //三次AI绘图
                    if (config.use_oobmtg_auto_response == 'tripleAI') {
                        //加载tag人设
                        let characterdata = sessionMap.get_builtin_Character('tag2');
                        let prompt1 = `You: Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ${outlook_result}`
                        characterdata.push({ "role": "user", "content": prompt1 })
                        const customRequest1 = {
                            "messages": characterdata,
                            "max_tokens": 150,
                            "temperature": 0.6,
                        };
                        const request1 = createRequestBody(config, customRequest1);
                        //post request and get output
                        let response1 = await axios.post(url, request1);
                        let tripleAI_response1 = response1.data.choices[0].message.content

                        characterdata.pop()
                        let prompt2 = `You: Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ${surround_doing_result}`
                        characterdata.push({ "role": "user", "content": prompt2 })
                        const customRequest2 = {
                            "messages": characterdata,
                            "max_tokens": 150,
                            "temperature": 0.6,
                        };
                        const request2 = createRequestBody(config, customRequest2);
                        //post request and get output
                        let response2 = await axios.post(url, request2);
                        let tripleAI_response2 = response2.data.choices[0].message.content
                        //组合两个结果并执行绘图
                        let tripleAI = tripleAI_response1 + ',' + tripleAI_response2
                        await executeNAI(session, config, tripleAI, sessionId);
                    }
                }
            }
        }
    }
}



//主逻辑
async function apply(ctx, config) {
    const oob = ctx.command("oob <message...>", "与AI模型进行对话")
        .userFields(['name'])
        .option('StartReply', '-s <string>')
        .action(async ({ session , options }, ...msg) => {
            if (msg.length === 0) {
                await session.send(`请至少输入一个字符`)
                await session.execute(`help oob`)
                return
            }
            let message = msg.join(' ');
            let channelId = '';
            let userId = '';
            let characterName = '';
            let speakerId = config.ttsspeakerID;
            let autocharactername = config.auto_use_character_name;
            //检查session是否存在
            let file = await CheckSessionFile(session, config)
            if (file) {
                //解析session名称
                let sessionData =await getSessionData(session,config);
                channelId = sessionData.channelId;
                userId = sessionData.userId;
                characterName = sessionData.characterName;
                speakerId = sessionData.speakerId;

            //自动人设，声音加载
            } else if (!file && config.auto_use_character) {
                await selectCharacter(session, config, autocharactername);
                characterName = autocharactername;
                speakerId = config.ttsspeakerID;
            } else if (!file) {
                return `没有找到匹配的历史记录文件。\n 请先使用oob.load选择人设。\n 所有人设可以使用oob.list查看 \n 当前id: ${session.channelId.toString().replace(/-/g, '')} , ${session.userId.toString()}`;
            }

            //创建sessionId
            let sessionId =await buildSessionId(session, config, characterName, speakerId);

            //加载历史记录
            let history = await sessionMap.getHistory(sessionId);
            // 加载人设文件
            let character = await sessionMap.getCharacter(characterName);

            // 更新历史记录
            if (history.length >= config.historyLimit) {
                history.shift();
            }    

            let usermessage = ''
            //区分真群聊模式
            if (config.groupmessage) {
                //判断是否私聊
                if (session.channelId.includes("private")) {
                    usermessage = { "role": "user", "content": message };
                    history.push(usermessage);
                } else {
                    //let usernameraw = await session.bot.getGuildMember(session.guildId, session.userId);
                    //昵称处理
                    let name
                    if (ctx.database) name = session.user.name
                    if (!name) name = session.author.nick
                    if (!name) name = session.author.username
                    usermessage = { "role": "user", "content": name + ':' + message };
                    history.push(usermessage);
                }
            } else {
                usermessage = { "role": "user", "content": message };
                history.push(usermessage);
            }

            //连接人设与历史记录与用户输入
            let fullinput = character.concat(history);

            // 准备request
            const customRequest = {
                "messages": fullinput,
            };

            //工具调用
            let Tool_Info = ``
            if (config.UseTool) {
                let Tool_reply = await WhichTool(config, message);
                Tool_Info = await UseTool(ctx, session, config, message, Tool_reply);
                if (Tool_Info !== 'None') {
                    // 修改system prompt
                    fullinput.forEach(entry => {
                        if (entry.role === 'system') {
                            entry.content = entry.content + Tool_Info;
                        }
                    });
                }
            }

            //判断StartReplyWith
            if (options.StartReply || config.FixStartReply !== '') {
                let StartReplyPrompt = { "role": "assistant", "content": config.FixStartReply };
                if (options.StartReply) {
                    StartReplyPrompt = { "role": "assistant", "content": options.StartReply };
                }
                customRequest.messages = fullinput.concat(StartReplyPrompt);
                customRequest.continue_ = true;
            }

            //准备request
            let request = createRequestBody(config, customRequest);

            //准备url
            const url = prepareURL(config)

            //post request
            let response = await axios.post(url, request);

            if (response.status == 200) {
                //先把用户输入存入历史记录防止位置错乱
                history = await sessionMap.getHistory(sessionId);
                history.push(usermessage)
                await sessionMap.saveHistory(sessionId, history);
                //AI识别绘图处理部分
                await AutoNai(session, config, response, message, characterName, url, fullinput, sessionId);

                //读取output
                let output = response.data.choices[0].message.content

                //是否隐藏StartReplyWith
                if ((config.FixStartReply !== '' || options.StartReply) && !config.DelFixStartReply) {
                    if (options.StartReply) {
                        output = response.data.choices[0].message.content.slice(options.StartReply.length)
                    }
                    if (config.FixStartReply !== '' && !options.StartReply) {
                        output = response.data.choices[0].message.content.slice(config.FixStartReply.length)
                    }
                }

                // 将历史记录保存到文件
                history = await sessionMap.getHistory(sessionId);
                history.push({ "role": "assistant", "content": response.data.choices[0].message.content })
                //录入工具消息
                if (config.UseTool && Tool_Info !== 'None') {
                    history.push({ "role": "assistant", "content": Tool_Info })
                }
                await sessionMap.saveHistory(sessionId, history);

                //构建回复文本
                let resultText = "";
                if (!session.channelId.includes("private")) {
                    resultText = String((0, koishi_1.h)("at", { id: session.userId })) + String(output);
                } else {
                    resultText = String(output);
                }

                //发送回复文本
                if (config.outputMode == 'text' || config.outputMode == 'both') {
                    await session.send(resultText);
                }
                if (config.outputMode == 'voice' || config.outputMode == 'both') {
                    await session.execute(`${config.ttscommand} ${output}`);
                }
                if (config.outputMode == 'extra') {
                    await session.send(resultText);
                    if (output.length > config.ttsmaxlength) {
                        return `文本过长，tts生成失败`;
                    } else {
                        let url = ``
                        if (config.bertorvits) {
                            url = `${config.ttsurl}/voice/bert-vits2?text=${encodeURIComponent(output)}&id=${speakerId}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}&emotion=${config.ttsemotion}`;
                        } else {
                            url = `${config.ttsurl}/voice/vits?text=${encodeURIComponent(output)}&id=${speakerId}&format=${config.ttsformat}&lang=${config.ttslanguage}&length=${config.ttsspeechlength}`;
                        }
                        const response = await axios.get(url, { responseType: 'arraybuffer' });
                        return koishi_1.h.audio(response.data, 'audio/mpeg');
                    }
                }

            } else {
                return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
            }
        });


//加载人设
    ctx.command('oob.load <character:text>', ':\n(别名：加载人设)\n加载人设并创建新的历史记录')
        .alias("加载人设")
        .action(async ({ session }, character) => {
            if (!character || character.trim() === "") {
                await session.send(`请至少输入一个人设名称`);
                await session.execute(`help oob.load`);
                return;
            }
            //移动人设文件
            if (config.Custom_character_dir.trim() !== '') {
                const customDir = config.Custom_character_dir;
                try {
                    await moveCharacters(session, customDir);
                } catch (err) {
                    console.error(err);
                }
            }
            //检查历史记录是否已经存在
            const existingSession = await CheckSessionFile(session, config);
            if (existingSession) {
                return `已存在一个历史记录，编号:${decodeURIComponent(existingSession)}。请不要重复创建。\n如需更换人设请先使用oob.del（别名：删除人设）指令。`;
            }

            if (!sessionMap.checkCharacter(character)) {
                return `未找到人设 ${character}。`;
            }
            //创建sessionId，创建文件
            const speakerId = config.ttsspeakerID;
            const sessionId = buildSessionId(session, config, character, speakerId);
            await sessionMap.create(sessionId);

            if (config.select_character_notice) {
                return `人设 ${character} 已加载，新的历史记录已创建${config.outputMode == 'extra' ? `，语音角色已绑定为${config.ttsspeakerID}` : ''}。`;
            }
        });

//删除历史记录
    ctx.command('oob.del', ":\n(别名：删除人设)\n删除当前人设")
        .alias("删除人设")
        .action(async ({ session }) => {
            const fileToDelete = await CheckSessionFile(session, config);
            if (!fileToDelete) {
                return `没有找到匹配的历史记录文件。`
            }
            // 删除
            fs.unlinkSync(`${__dirname}/sessionData/${fileToDelete}`);
            await session.send(`已删除历史记录文件：${decodeURIComponent(fileToDelete)}\n现在可以使用oob.load（别名：加载人设）来选择新的人设了。`);
        });

//检查人设文件是否存在
    ctx.command('oob.check', ":\n(别名：当前人设)\n检查历史记录文件是否存在")
        .alias("当前人设")
        .action(async ({ session }) => {
            const file = await CheckSessionFile(session, config);
            if (file) {
                return `文件存在：${decodeURIComponent(file)}`;
            } else {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '')} \n userId:${session.userId.toString()}`;
            }
        });

//重置人设
    ctx.command('oob.reset', ":\n(别名：重置人设)\n重置当前人设")
        .alias("重置人设")
        .action(async ({ session }) => {
            const file = await CheckSessionFile(session, config);
            if (file) {
                fs.writeFileSync(`${__dirname}/sessionData/${file}`, '[]');
                return `已重置历史记录文件：\n${decodeURIComponent(file)} \n如果需要选择新的人设请使用oob.load（别名：加载人设）指令`;
            } else {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '')} \n ${session.userId.toString()}`;
            }
        });

//撤回上一组对话
    ctx.command("oob.undo", ":\n(别名：撤回)\n撤回刚刚的发言，让Ai回到上一句发言之前")
        .alias("撤回")
        .action(async ({ session }) => {
            const file = await CheckSessionFile(session, config);
            if (file) {
                let safefile = decodeURIComponent(file.replace(/\.json$/, ''));
                let history = sessionMap.getHistory(safefile);
                if (history.length > 0) {
                    // 寻找最后一个role为user的位置
                    let lastUserIndex = history.map(item => item.role).lastIndexOf('user');
                    if (lastUserIndex !== -1) {
                        // 删除最后一个user以及之后的所有对话
                        history = history.slice(0, lastUserIndex);
                        sessionMap.saveHistory(safefile, history);
                        return `已撤回最后一组对话，可以继续聊天哦。`;
                    } else {
                        return `历史记录中没有找到用户的发言，无法撤回对话。\n会话ID:${decodeURIComponent(file)}`;
                    }
                } else {
                    return `历史记录文件为空，无法撤回最后一组对话。\n会话ID:${decodeURIComponent(file)}`;
                }
            } else {
                return `没有找到匹配的历史记录文件。\n 当前id:${session.channelId.toString().replace(/-/g, '')} \n ${session.userId.toString()}`;
            }
        });

//人设列表
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

//更换语音
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
            //检查历史记录文件
            let filename =await CheckSessionFile(session, config)
            if (filename) {
                //处理文件
                let safeId = filename.replace(/\.json$/, '');
                let newsafeId = safeId.split('-');
                newsafeId.pop();
                newsafeId.push(newspeakerid);
                let newsafeIdString = newsafeId.join('-');
                let safeIdPath = `${__dirname}/sessionData/${safeId}.json`;
                let newsafeIdPath = `${__dirname}/sessionData/${newsafeIdString}.json`;
                fs.renameSync(safeIdPath, newsafeIdPath);
                //发送提示
                let newfilename = decodeURIComponent(newsafeIdString)
                if (config.groupmessage) {
                    await session.send(`已更改群聊绑定语音角色：\n 会话ID：${newfilename}，语音角色：${newspeakerid}`);
                } else {
                    await session.send(`已更改绑定语音角色：\n 会话ID：${newfilename}，语音角色：${newspeakerid}`);
                }
            } else {
                return `历史记录文件为空，请先开始一个对话。`;
            }            
        });

//AI绘图
    ctx.command("oob.tag <tag...>", ":\n(别名：AI绘图)\n让AI来写tag并进行绘图")
        .alias("AI绘图")
        .action(async ({ session }, ...tag) => {
            //判断是否启动oob.tag指令
            if (config.oobtag_ON) {
                //输入不为空
                if (tag.length === 0) {
                    await session.send(`请至少输入一个关键词 \n如：白发猫娘；泳装少女等`)
                    await session.execute(`help oob.tag`)
                    return
                }
                let characterName = 'tag';
                if (sessionMap.check_buildin_Character(characterName)) {
                    let character = sessionMap.get_builtin_Character(characterName);
                    let input = `Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ${tag}`
                    character.push({ "role": "user", "content": input });
                    //准备request
                    const customRequest = {
                        "messages": character,
                        "temperature": 0.7,
                        "max_tokens": 500,
                    };
                    const request = createRequestBody(config, customRequest);

                    //准备url
                    const url = prepareURL(config)

                    //post request
                    let response = await axios.post(url, request);

                    if (response.status == 200) {
                        let fullresult = response.data.choices[0].message.content
                        await executeNAI(session, config, fullresult);
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
            } else if (config.setu_ON) {
                await session.send(`由于未开启oob.tag指令，自动为您寻找一张涩图作为替代。`)
                await session.execute(config.setuprefix)
                return
            } else {
                await session.send(`当前未开启oob.tag指令，请联系管理员启动。`)
                return
            }
        });

//AI翻译
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
                let character = sessionMap.get_builtin_Character(characterName);
                let input = `请对接下来给你的文本进行翻译，如果给你中文就翻译成英文，如果给你英文就翻译成中文。你现在要翻译的是：${text}`
                character.push({ "role": "user", "content": input })
                //准备request
                const customRequest = {
                    "messages": character,
                    "temperature": 0.7
                };
                const request = createRequestBody(config, customRequest);

                //准备url
                const url = prepareURL(config)

                //post request
                let response = await axios.post(url, request);

                if (response.status == 200) {
                    let fullresult = response.data.choices[0].message.content
                    return fullresult;
                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到translate文件。`;
            }
        });

//AI算命
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
                        let character = sessionMap.get_builtin_Character(characterName);
                        let input = `${suan_ming_output} \n您输入的关键词为：${text} \n接下来我将根据关键词对您今天的运势做解读：\n您今天`
                        character.push({ "role": "assistant", "content": input })
                        //准备request
                        const customRequest = {
                            "messages": character,
                            "continue_": true
                        };
                        const request = createRequestBody(config, customRequest);

                        //准备url
                        const url = prepareURL(config)

                        //post request
                        let response = await axios.post(url, request);

                        if (response.status == 200) {
                            let fullresult = response.data.choices[0].message.content
                            await session.send(fullresult)
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

//人设处理
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


//入群欢迎
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
        if ((config.if_at && session.parsed.appel) && !session.quote) {
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
        // 引用回复
        if (session.quote) {
            let msg = String(session.content);
            let reverse = session.bot.getMessage(session.channelId, session.quote.id);
            let quoteID = (await reverse).user.userId;
            if (session.selfId === quoteID) {
                await session.execute(`oob ${msg}`);
                return;
            }
        }
        await next();
    });
}

exports.apply = apply;