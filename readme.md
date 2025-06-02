# koishi-plugin-oobabooga-testbot

[![npm](https://img.shields.io/npm/v/koishi-plugin-oobabooga-testbot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-oobabooga-testbot)

大语言模型(本地/在线)聊天机器人。支持AI视觉伪多模态，AI工具调用，Emb长期记忆，vits语音回复，AI自动判断调用绘图，更多娱乐功能请看插件简介。

有任何改进想法或者遇到使用问题的可以加qq群：719518427

### 用前需知
### QQ讨论群：719518427
### 当前为正式版本5.6.0
注意！插件更新会导致历史记录与默认人设重置，请自行保存相关文档！<br>
兼容语言模型服务后端包括：<br>
Text-Generation-Webui(推荐)，gemini接口，Deepseek接口，标准Openai接口，标准Openai接口+任意额外参数<br>

### 目录设置：
插件目录一般位于：C:\\Users\\用户名\\AppData\\Roaming\\Koishi\\Desktop\\data\\instances\\default\\node_modules\\koishi-plugin-oobabooga-testbot<br>
人设位置：koishi-plugin-oobabooga-testbot\\lib\\characters<br>
人设背景库位置：koishi-plugin-oobabooga-testbot\\lib\\background<br>
历史记录位置：koishi-plugin-oobabooga-testbot\\lib\\sessionData<br>
表情包文件夹位置：koishi-plugin-oobabooga-testbot\\lib\\Emoji<br>

### Text-Generation-Webui本地部署
github上有一键安装包，包含Windows，Linux，Mac。<br>
也可以直接使用我制作的一键懒人包：https://www.bilibili.com/video/BV1dVCzYUE7G<br>
github地址:https://github.com/oobabooga/text-generation-webui<br>
架设完成需要打开api服务才行，默认API端口号为：http://127.0.0.1:5000/<br>

### 语音回复
支持使用Vits语音输出回复，需要加载任意tts插件比如open-vits插件，或者直接使用内置接口。<br>
可以通过编辑设置中的指令开头，来调整使用的插件格式。比如openvits插件就可以直接用：say<br>
open-vits插件：https://github.com/initialencounter/koishi-plugin-open-vits#readme<br>
自建vits后端：https://github.com/Artrajz/vits-simple-api<br>

### 绘图模块
支持使用语言模型补充tag，并调用AI绘图插件进行绘图。<br>
NovelAI插件：https://bot.novelai.dev/<br>
自建stable-diffusion：秋叶一键包：https://www.bilibili.com/video/BV1iM4y1y7oA/?<br>

### 视觉模块
支持接入视觉模块<br>
项目名：https://github.com/GralchemOz/llm_toolkit_api<br>
教程：https://forum.koishi.xyz/t/topic/2391/54<br>
视频：https://www.bilibili.com/video/BV1yG4heJEE4/?<br>

### emb向量库
支持接入emb向量库获得超长期记忆<br>
教程：https://forum.koishi.xyz/t/topic/2391/55<br>
视频：https://www.bilibili.com/video/BV1yG4heJEE4/?<br>

### memorytable记忆表格
支持接入记忆表格插件<br>
插件地址：https://www.npmjs.com/package/koishi-plugin-memorytable<br>

### 人设背景库
教程：https://forum.koishi.xyz/t/topic/2391/56<br>

### QQ讨论群：719518427
有疑问，出现bug，有改进想法都可以加qq群讨论<br>

### 人设网址分享与处理：
（以下网址，需要科学上网，直接下载人设png图片文件放入插件根目录下的PNGfile文件，使用oob.Metadata，就会自动生成基础人设文件）<br>
https://www.characterhub.org/<br>
https://booru.plus/+pygmalion<br>
