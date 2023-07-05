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
当前为正式版本1.6.0<br>
注意！插件更新会导致历史记录与默认人设重置，请自行保存相关文档！<br>
新增了自定义人设目录，可以将你自定义的人设都放在外置目录里，这样就不会因为插件更新导致人设消失了。<br>
默认人设位置：koishi-plugin-oobabooga-testbot\\lib\\characters<br>
历史记录位置：koishi-plugin-oobabooga-testbot\\lib\\sessionData<br>

使用前需要自行架设oobabooga-text-generation-webui<br>
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
chatglm-6b：https://huggingface.co/THUDM/chatglm-6b<br>
（注意：chatglm-6b模型需要额外安装icetk,pip install icetk）<br>
RWKV系列模型：https://huggingface.co/RWKV<br>
（注意：RWKV模型由于架构不同，加载模型会出现问题，具体查看手册：https://github.com/oobabooga/text-generation-webui/blob/main/docs/RWKV-model.md ）<br>
强烈推荐：vicuna-13B-1.1-Chinese：https://huggingface.co/jfiekdjdk/vicuna-13B-1.1-Chinese-GPTQ-4bit-128g<br>
vicuna-13b-1.1：https://huggingface.co/anon8231489123/vicuna-13b-GPTQ-4bit-128g<br>
stable-vicuna-13B：https://huggingface.co/TheBloke/stable-vicuna-13B-GPTQ<br>
Wizard-Vicuna-13B：https://huggingface.co/TheBloke/Wizard-Vicuna-13B-Uncensored-GPTQ<br>
等模型<br>

### 人设网址分享与处理：
（需要科学上网，直接下载人设png图片文件放入插件根目录下的PNGfile文件，使用oob.Metadata，就会自动生成基础人设文件）<br>
https://www.characterhub.org/<br>
https://booru.plus/+pygmalion<br>

### 新版本新增：
调整了用前须知。<br>
重新整理控制面板功能。<br>
新增自定义人设PNG图片目录，方便人设处理。<br>
将插件工作中使用的人设文本独立，方便区分。<br>
优化了oob.translate指令的逻辑，对模型智商要求大幅下降。<br>
新增了有关绘图的调整选项。<br>
新增了新功能：AI自动判断绘图模式选择<br>
详情可以去：https://forum.koishi.xyz/t/topic/2391 查看<br>
`;

exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        apiURL: koishi_1.Schema.string()
            .description('API服务器地址')
            .default('http://localhost:5000/api/v1/generate'),
        historyLimit: koishi_1.Schema.number()
            .description('历史记录上限(注意这里指的是句子数量，一组对话有两个句子。)')
            .default(10),
        outputMode: koishi_1.Schema.union([
            koishi_1.Schema.const('text').description('只返回文字'),
            koishi_1.Schema.const('voice').description('只返回语音'),
            koishi_1.Schema.const('both').description('同时返回语音与文字'),
            koishi_1.Schema.const('debug').description('调试模式，将返回未处理请求与返回文本'),
        ])
            .description('输出模式')
            .default('text'),
        auto_use_character: koishi_1.Schema.boolean()
            .description('在未创建人设的情况下被唤醒是否会自动选择人设。')
            .default(false),
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
            koishi_1.Schema.const('doubleAI').description('多次AI补充绘图（对算力要求较大，耗时长，但出图质量高）'),
        ])
            .description('AI自动判断绘图选项')
            .default('off'),
        trigger_keywords: koishi_1.Schema.array(koishi_1.Schema.string())
            .description('触发绘图的关键词')
            .default([]),
        resolution: koishi_1.Schema.string().description('设定图片尺寸')
            .default('512x512'),
        steps: koishi_1.Schema.number().description('设定迭代步数')
            .default(48),
        scale: koishi_1.Schema.number().description('设定对输入的服从度')
            .default(10),
        hires_fix: koishi_1.Schema.boolean().description('启用高分辨率修复')
            .default(false),
    }).description('绘图设置，涉及oob.tag指令与AI自动识别绘图模式'),
    koishi_1.Schema.object({
        Custom_character_dir: koishi_1.Schema.string().description('自定义人设目录，留空就不会启用')
            .default(''),
        Custom_PNG_dir: koishi_1.Schema.string().description('oob.Metadata指令的外置PNG图片人设目录，留空就不会启用，目录不存在的话会直接创建')
            .default(''),
        Custom_Sorted_dir: koishi_1.Schema.string().description('oob.Metadata指令处理后的文件存储目标目录，留空就不会启用，目录不存在的话会直接创建')
            .default(''),
    }).description('目录相关设置'),
    koishi_1.Schema.object({
        if_use_Custom_stopping: koishi_1.Schema.boolean()
            .description('是否开启自定义断句处理（不建议使用，如果开启必须填入断句分隔符，需要合适版本的人设文件）')
            .default(false),
        Custom_stopping: koishi_1.Schema.string().description('断句处理分隔符')
            .default('||'),
        max_new_tokens: koishi_1.Schema.number().description('max_new_tokens')
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
        stopping_strings: koishi_1.Schema.array().description('stopping_strings')
            .default([]),
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
    await session.execute(`oob.load "${autocharactername}"`);
    await session.send('未检测到对应历史记录文件，已自动选择人设。');
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
            let autocharactername = config.auto_use_character_name;
            for (let i = 0; i < files.length; i++) {
                let parts = files[i].split('-');
                if (parts.length === 3 && parts[0] == encodeURIComponent(session.channelId.toString()) && parts[1] == encodeURIComponent(session.userId.toString())) {
                    channelId = decodeURIComponent(parts[0]);
                    userId = decodeURIComponent(parts[1]);
                    characterName = decodeURIComponent(parts[2].replace('.json', ''));
                    break;
                }
            }
            if (!channelId && config.auto_use_character) {
                await selectCharacter(session, config, autocharactername);
                characterName = autocharactername;
            }
            else if (!channelId) {
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
            if (config.if_use_Custom_stopping) {
                history.push("You:" + `${config.Custom_stopping}` + message + `${config.Custom_stopping}`);
            } else {
                history.push("You:" + message + "\n");
            }

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

                if (config.use_oobmtg_auto_response == 'AI' || config.use_oobmtg_auto_response == 'doubleAI' || config.use_oobmtg_auto_response == 'keyword' || config.use_oobmtg_auto_response == 'keyword2') {
                    if (config.use_oobmtg_auto_response == 'keyword') {
                        let fullResult = response.data['results'][0]['text'];
                        let keywords = ["照片", "图片", "图像", "picture", "pic", "绘图", "paint", "自拍", "合影", "image", "photo", "snapshot", "selfie"];
                        if (keywords.some(keyword => message.includes(keyword))) {
                            if (config.hires_fix) {
                                session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n  ${fullResult}`);
                            } else {
                                session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n  ${fullResult}`);
                            }
                        }
                    }
                    if (config.use_oobmtg_auto_response == 'keyword2') {
                        let fullResult = response.data['results'][0]['text'];
                        let keywords = ["照片", "图片", "图像", "picture", "pic", "绘图", "paint", "自拍", "合影", "image", "photo", "snapshot", "selfie"];
                        if (keywords.some(keyword => message.includes(keyword))) {
                            session.execute(`oob.tag ${fullResult}`);
                        }
                    }
                    if (config.use_oobmtg_auto_response == 'AI' || config.use_oobmtg_auto_response == 'doubleAI') {
                        let fullResult = response.data['results'][0]['text'];
                        let checkcharacterName = 'check-if-pic';
                        let checkcharacterdata = sessionMap.get_builtin_Character(checkcharacterName);
                        let checkcharacter = checkcharacterdata.concat().join("\n");
                        let checkrequest_prompt = checkcharacter + "\n Answer only in 'Yes' or 'No'.Please determine if a picture needs to be generated for this conversation:" + "You:" + message + ';' + fullResult + '\n';
                        let checkrequest = {
                            'prompt': checkrequest_prompt,
                            'max_new_tokens': 30,
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
                        let checkrequest_result = await axios.post(config.apiURL, checkrequest)
                        let checkrequest_reply = checkrequest_result.data['results'][0]['text'];
                        if (checkrequest_reply.includes("Yes") || checkrequest_reply.includes("yes")) {
                            let describe_prompt = prompt + "Describe your appearance, your surroundings and what you are doing right now. \n"
                            let describe = {
                                'prompt': describe_prompt,
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
                            let describe_reply = await axios.post(config.apiURL, describe);
                            let describe_reply_result = describe_reply.data['results'][0]['text'];
                            if (config.use_oobmtg_auto_response == 'AI') {
                                if (config.hires_fix) {
                                    session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n  ${describe_reply_result}`);
                                } else {
                                    session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n  ${describe_reply_result}`);
                                }
                            }
                            if (config.use_oobmtg_auto_response == 'doubleAI') {
                                session.execute(`oob.tag ${describe_reply_result}`)
                            }
                        }
                    }
                }

                if (config.if_use_Custom_stopping) {
                    let fullResult = response.data['results'][0]['text'];
                    let Custom_stopping = config.Custom_stopping
                    let firstIndex = fullResult.indexOf(Custom_stopping) + 2;
                    let secondIndex = fullResult.indexOf(Custom_stopping, firstIndex);
                    if (secondIndex == -1) {
                        return "模型格式错误，请联系管理员矫正。\n 以下是完整回复:" + fullResult;
                    }
                    let result = fullResult.slice(firstIndex, secondIndex).trim();

                    if (history.length >= config.historyLimit) {
                        history.shift();
                    }
                    history.push(characterName + ":" + Custom_stopping + result + Custom_stopping);
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
                        await session.send(JSON.stringify(request));
                        await session.send(fullResult);
                    }
                } else {
                    let fullResult = response.data['results'][0]['text'];
                    let colonIndex = fullResult.indexOf(':');
                    if (colonIndex === -1) {
                        colonIndex = fullResult.indexOf('：');
                    }
                    if (colonIndex === -1) {
                        return "模型格式错误，请联系管理员矫正。\n 以下是完整回复:" + fullResult;
                    }
                    let result = fullResult.slice(colonIndex + 1).trim();
                    history.push(characterName + ":" + result);
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
                        await session.send(JSON.stringify(request));
                        await session.send(fullResult);
                    }
                }
            } else {
                return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
            }
        });


    ctx.command('oob.load <character>', "加载人设并创建新的历史记录")
        .action(async ({ session }, character) => {
            if (config.Custom_character_dir.trim() !== '') {
                const customDir = config.Custom_character_dir;
                try {
                    await moveCharacters(session, customDir);
                } catch (err) {
                    console.error(err);
                }
            }
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


    ctx.command("oob.tag <tag...>", "让AI来写tag并进行绘图")
        .action(async ({ session }, ...tag) => {
            let characterName = 'tag';
            if (sessionMap.check_buildin_Character(characterName)) {
                let character = sessionMap.get_builtin_Character(characterName);
                let prompt = character + '\n You:|| Use as many English labels as possible to describe a picture in detail. Use fragmented word labels instead of sentences to describe the picture. Try to use descriptive words as much as possible, separating each word with a comma. For example, when describing a white-haired cat girl, you should use :white hair,cat girl,cat ears,cute,girl,beautiful,lovely.Even though I provided you with Chinese vocabulary, please reply with English tags. What you are currently describing is: ' + tag + ' || \n';

                let request = {
                    'prompt': prompt,
                    'max_new_tokens': 250,
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
                        if (config.send_oobmtg_response) {
                            msg = "模型回复格式错误，但依然执行了绘图，可能存在缺陷。\n 以下是完整回复:" + fullResult;
                        }
                    } else {
                        result = fullResult.slice(firstIndex, secondIndex).trim();
                        if (config.send_oobmtg_response) {
                            msg = `${config.prefix} ${result}`;
                        }
                    }
                    if (config.hires_fix) {
                        await session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} -H \n  ${result}`);
                    } else {
                        await session.execute(`${config.prefix} -r ${config.resolution}  -t ${config.steps} -c ${config.scale} \n  ${result}`);
                    }

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


    ctx.command("oob.translate <text...>", "让AI来翻译，暂时只支持中英文互译")
        .action(async ({ session }, ...text) => {
            let characterName = 'translate';
            if (sessionMap.check_buildin_Character(characterName)) {
                let characterdata = sessionMap.get_builtin_Character(characterName);
                let character = characterdata.concat().join("\n");
                let prompt = character + '\n You: 请对接下来给你的文本进行翻译，如果给你中文就翻译成英文，如果给你英文就翻译成中文。你现在要翻译的是：' + text + '\n';

                let request = {
                    'prompt': prompt,
                    'max_new_tokens': 550,
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
                    let colonIndex = fullResult.indexOf(':');
                    if (colonIndex === -1) {
                        colonIndex = fullResult.indexOf('：');
                    }
                    if (colonIndex === -1) {
                        return "模型格式错误，请联系管理员矫正。\n 以下是完整回复:" + fullResult;
                    }
                    let result = fullResult.slice(colonIndex + 1).trim();
                    return result;
                } else {
                    return String((0, koishi_1.h)("at", { id: session.userId })) + "API请求失败，请检查服务器状态。";
                }
            } else {
                return `未找到translate文件。`;
            }
        });


    ctx.command('oob.Metadata', "PNG图片人设读取与处理。")
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
