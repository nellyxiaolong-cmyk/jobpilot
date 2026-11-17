// JobPilot server.
// Local mode (default): model credentials stay in this machine's .jobpilot-api-config.json;
// user data is sent to the configured provider only when the user requests an AI analysis.
// Public mode (PUBLIC_MODE=1): the server stores NO model credentials. Each visitor's browser
// keeps its own API config and sends it with each request; the server forwards it to the
// provider transiently and never persists or logs it. /api/config writes are disabled.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const execFileAsync = promisify(execFile);

const root = __dirname;
const publicMode = process.env.PUBLIC_MODE === '1';
const port = Number(process.env.PORT || 4174);
const host = publicMode ? '0.0.0.0' : '127.0.0.1';
const configFile = path.join(root, '.jobpilot-api-config.json');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function loadConfig(){if(publicMode)return null;try{return JSON.parse(fs.readFileSync(configFile,'utf8'))}catch{return null}}
let modelConfig=loadConfig();
function readJson(req,maxBytes=2_000_000){return new Promise((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>maxBytes){reject(new Error('请求内容过大'));req.destroy()}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'))}catch{reject(new Error('请求格式错误'))}});req.on('error',reject)})}
function normalizeEndpoint(baseUrl){const url=new URL(baseUrl);const local=['localhost','127.0.0.1','::1'].includes(url.hostname);if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))throw new Error('API 地址必须使用 HTTPS（本机服务可使用 HTTP）');url.hash='';url.search='';let value=url.toString().replace(/\/$/,'');if(!/\/chat\/completions$/.test(value))value+='/chat/completions';return value}
// Per-request config from the visitor's browser; falls back to the local config file only
// outside public mode. Credentials from requests are used in memory and never written to disk.
function requestConfig(value){
  if(!value||typeof value!=='object')return null;
  const baseUrl=String(value.baseUrl||'').trim(),model=String(value.model||'').trim(),apiKey=String(value.apiKey||'').trim();
  if(!baseUrl||!model||!apiKey)return null;
  normalizeEndpoint(baseUrl);
  return {baseUrl,model,apiKey};
}
function resolveConfig(value){
  const fromRequest=requestConfig(value);
  if(fromRequest)return fromRequest;
  modelConfig=loadConfig()||modelConfig;
  if(modelConfig?.apiKey&&modelConfig?.model&&modelConfig?.baseUrl)return modelConfig;
  throw Object.assign(new Error('尚未配置大模型 API'),{status:400,needsConfig:true});
}
// Simple per-IP rate limiting for public mode, to reduce proxy abuse.
const rateBuckets=new Map();
function rateLimited(req,res){
  if(!publicMode)return false;
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
  const ip=forwarded||req.socket.remoteAddress||'unknown';
  const now=Date.now(),windowMs=10*60*1000,limit=40;
  const hits=(rateBuckets.get(ip)||[]).filter(t=>now-t<windowMs);
  if(hits.length>=limit){send(res,429,{error:'请求过于频繁，请稍后再试'});return true}
  hits.push(now);rateBuckets.set(ip,hits);
  if(rateBuckets.size>10000)rateBuckets.clear();
  return false;
}
async function callModel(config,messages){const endpoint=normalizeEndpoint(config.baseUrl);let response;try{const payload={model:config.model,messages,temperature:0.3};if(/m3\.1/i.test(config.model)){payload.reasoning_effort='low';payload.max_tokens=4096}response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)})}catch(e){throw Object.assign(new Error(e.name==='TimeoutError'?'模型响应超时，请稍后重试':'无法连接模型服务，请检查 API 地址和网络'),{status:502})}const raw=await response.text();if(!response.ok)throw Object.assign(new Error(`模型服务返回 HTTP ${response.status}，请检查 API Key、模型名称和账户额度`),{status:502});let data;try{data=JSON.parse(raw)}catch{throw Object.assign(new Error('模型服务返回内容无法识别'),{status:502})}const content=data?.choices?.[0]?.message?.content;if(typeof content!=='string'||!content.trim())throw Object.assign(new Error('模型没有返回可展示的文本'),{status:502});return content.trim()}
async function recognizeJDWithModel(config,images){
  const results=[];
  for(let start=0;start<images.length;start+=8){
    const batch=images.slice(start,start+8),content=[{type:'text',text:'请按图片顺序逐张识别岗位招聘截图中的可见文字，尽量保留原有段落和换行。严禁总结、改写、补全或猜测；图片没有可读文字时对应返回空字符串。只返回合法 JSON 数组，数组中每张图片对应一个字符串，顺序与图片一致，不要代码围栏或额外说明。'}];
    for(const image of batch){
      const type=String(image.type||'image/png'),data=String(image.data||'');
      if(!['image/png','image/jpeg','image/webp','image/gif'].includes(type))throw new Error(`模型图片识别暂不支持 ${type} 格式，请改用 PNG、JPG 或 WebP`);
      const dataUrl=data.startsWith('data:')?data:`data:${type};base64,${data}`;
      content.push({type:'image_url',image_url:{url:dataUrl,detail:'high'}});
    }
    const answer=await callModel(config,[{role:'user',content}]);
    let parsed;
    try{parsed=JSON.parse(answer.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{throw new Error('模型没有按要求返回可用的逐图文字结果')}
    if(!Array.isArray(parsed)||parsed.length!==batch.length||parsed.some(text=>typeof text!=='string'))throw new Error('模型返回的图片识别结果格式不正确');
    results.push(...parsed.map(text=>({text:text.trim()})));
  }
  return results;
}
function shortError(error){return String(error?.message||'未知错误').split('\n')[0].replace(/^Command failed:.*$/,'本机 OCR 执行失败').slice(0,220)}
function messagesFor(task,context){
const system='你是 JobPilot 的求职面试助手。只依据本次提供的材料分析；不得根据公司名称猜公司业务、补造简历事实、JD要求或面试结果。区分材料明确写出的证据与合理推断；材料不足时写“资料不足”，指出需要补充什么。用简体中文、具体克制、清晰可读地回答。不要编造百分比、匹配分数或录用概率。';
const careerPrompt=`请为候选人生成一份完整、简洁、逐家公司分析的求职匹配报告。仅依据本次提供的简历、JD、阶段和反馈，不得猜测公司事实；区分明确证据与推断，缺资料就写“资料不足”。不要编造百分比或录用概率。控制在约2000个中文字符内，不要逐条抄写或穷举JD；每家公司只提炼最相关的3项要求、最关键的匹配证据和最多3项差距。确保输出完整并包含最后的分析范围章节。报告使用以下 Markdown 结构，第一行严格写“总体匹配：高/中/低/证据不足”之一：
# 求职匹配分析
## 总体结论
## 简历证据画像
用最多5条简洁要点概括核心优势与证据。
## 逐家公司匹配
每家公司用 ### 公司名｜岗位名 分节，分为匹配判断、简历证据、JD对照、主要差距/风险、面试反馈证据、需要核实的问题；每项用简短句，问题最多2个。无JD或反馈时说明资料不足/暂无反馈。
## 跨公司共性
## 下一步建议
最多4条具体建议。
## 分析范围与信息缺口
说明结论仅基于已提供材料，未核实外部公司事实。`;
const prompt=task==='career'?careerPrompt:task==='resume-profile'?'请从简历原文提取个人基本信息。每个非空字段必须能在原文中找到直接证据；禁止猜测、补全或从文件名推断。规则：name只取明确姓名或简历顶部明确作为姓名展示的文字；phone、email必须逐字来自原文；city只取现居地/所在地，不把籍贯或意向城市当现居地；education取已完成的最高学历，区分在读、已毕业和岗位要求；experience只取原文明确写出的工作年限，不自行计算任职时间；major只取教育经历中的所学专业，不把岗位职能当专业；skills只列原文明确出现的技能词。缺失或无法确认的字段返回空字符串。只返回JSON对象，不要代码围栏，字段为name、phone、email、city、education、experience、major、skills；skills用简短字符串。':`请根据本轮真实面试记录，生成复盘建议：总结面试重点、反馈中的优势与风险、待补充的信息，以及下一步准备动作。上下文：${JSON.stringify(context)}`;
return [{role:'system',content:system},{role:'user',content:`${prompt}\n\n用户数据：${JSON.stringify(context)}`}];
}
const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin||'';
  if(/^http:\/\/127\.0\.0\.1:(4174|4175)$/.test(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    res.setHeader('Vary','Origin');
  }
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const url=new URL(req.url,`http://${req.headers.host||'127.0.0.1'}`);
  if(req.method==='GET'&&url.pathname==='/api/config')return send(res,200,publicMode?{configured:false,mode:'public'}:{configured:!!(modelConfig?.apiKey&&modelConfig?.model&&modelConfig?.baseUrl),baseUrl:modelConfig?.baseUrl||'',model:modelConfig?.model||''});
  if(req.method==='POST'&&url.pathname==='/api/ocr'){
    if(rateLimited(req,res))return;
    let tempDir;
    try{
      const data=await readJson(req,16_000_000);
      if(!Array.isArray(data.images)||!data.images.length||data.images.length>10)return send(res,400,{error:'请选择 1 到 10 张岗位 JD 截图'});
      let config=null;
      try{config=resolveConfig(data.config)}catch(e){config=null}
      tempDir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'jobpilot-ocr-'));
      const files=[];
      for(let i=0;i<data.images.length;i++){
        const image=data.images[i],type=String(image.type||'');
        if(!type.startsWith('image/'))return send(res,400,{error:'仅支持识别图片格式的岗位 JD'});
        const extension=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/heic':'heic' })[type]||'img';
        const encoded=String(image.data||'').replace(/^data:[^,]*,/, '');
        if(!encoded||encoded.length>10_000_000)return send(res,400,{error:'图片为空或文件过大，请选择较小的截图'});
        const file=path.join(tempDir,`${i}.${extension}`);
        await fs.promises.writeFile(file,Buffer.from(encoded,'base64'));
        files.push(file);
      }
      let localError;
      if(!publicMode){
        const versionedSdk='/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk';
        const swiftArgs=[...(fs.existsSync(versionedSdk)?['-sdk',versionedSdk]:[]),'-module-cache-path',path.join(os.tmpdir(),'jobpilot-swift-cache'),path.join(root,'ocr.swift'),...files];
        try{
          const {stdout}=await execFileAsync('/usr/bin/swift',swiftArgs,{timeout:90000,maxBuffer:2_000_000});
          const results=JSON.parse(stdout);
          if(results.some(item=>item.text?.trim()))return send(res,200,{results,mode:'local'});
          localError=new Error(results.find(item=>item.error)?.error||'本机 OCR 未识别到文字');
        }catch(error){localError=error}
      }else{
        localError=new Error('线上环境未启用本机 OCR');
      }
      if(!config)throw Object.assign(new Error('本机 OCR 暂不可用，请先配置支持图片理解的大模型 API'),{status:400,needsConfig:true});
      try{return send(res,200,{results:await recognizeJDWithModel(config,data.images),mode:'model'})}
      catch(error){return send(res,error.status||502,{error:`本机 OCR 暂不可用（${shortError(localError)}）；模型图片识别也未成功：${shortError(error)}`})}
    }catch(e){return send(res,e.status||500,{error:e.killed?'截图文字识别超时，请尝试减少截图数量或尺寸':`截图文字识别失败：${shortError(e)}`,needsConfig:!!e.needsConfig})}
    finally{if(tempDir)await fs.promises.rm(tempDir,{recursive:true,force:true}).catch(()=>{})}
  }
  if(req.method==='POST'&&url.pathname==='/api/resume/parse'){
    let tempDir;
    try{
      const data=await readJson(req,24_000_000),name=path.basename(String(data.name||'resume.txt')),extension=path.extname(name).toLowerCase();
      if(!['.pdf','.doc','.docx','.txt'].includes(extension))return send(res,400,{error:'仅支持 PDF、Word 或 TXT 简历'});
      const encoded=String(data.data||'').replace(/^data:[^,]*,/,'');
      if(!encoded||encoded.length>20_000_000)return send(res,400,{error:'简历文件为空或过大'});
      tempDir=await fs.promises.mkdtemp(path.join(os.tmpdir(),'jobpilot-resume-'));
      const file=path.join(tempDir,`resume${extension}`);await fs.promises.writeFile(file,Buffer.from(encoded,'base64'));
      let text='';
      if(extension==='.txt')text=await fs.promises.readFile(file,'utf8');
      else if(extension==='.pdf'){
        const sdk='/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk';
        const args=[...(fs.existsSync(sdk)?['-sdk',sdk]:[]),'-module-cache-path',path.join(os.tmpdir(),'jobpilot-swift-cache'),path.join(root,'resume.swift'),file];
        const result=await execFileAsync('/usr/bin/swift',args,{timeout:90000,maxBuffer:4_000_000});text=JSON.parse(result.stdout).text||'';
      }else{
        const result=await execFileAsync('/usr/bin/textutil',['-convert','txt','-stdout',file],{timeout:30000,maxBuffer:4_000_000});text=result.stdout;
      }
      if(!text.trim())return send(res,422,{error:'未能从简历中提取文字，请检查文件是否可读取'});
      return send(res,200,{text});
    }catch(e){return send(res,500,{error:`简历文字提取失败：${e.message||'未知错误'}`})}
    finally{if(tempDir)await fs.promises.rm(tempDir,{recursive:true,force:true}).catch(()=>{})}
  }
  if(req.method==='POST'&&url.pathname==='/api/config'){
    if(publicMode)return send(res,403,{error:'线上演示版不保存服务端配置，请在页面中配置你自己的模型 API（仅保存在你的浏览器中）'});
    try{const data=await readJson(req,20000);const baseUrl=String(data.baseUrl||'').trim(),model=String(data.model||'').trim(),apiKey=String(data.apiKey||'').trim()||modelConfig?.apiKey;if(!baseUrl||!model||!apiKey)return send(res,400,{error:'请填写 API 地址、模型名称和 API Key'});normalizeEndpoint(baseUrl);modelConfig={baseUrl,model,apiKey};fs.writeFileSync(configFile,JSON.stringify(modelConfig,null,2),{mode:0o600});try{fs.chmodSync(configFile,0o600)}catch{}return send(res,200,{configured:true,baseUrl,model})}catch(e){return send(res,400,{error:e.message||'配置保存失败'})}
  }
  if(req.method==='POST'&&url.pathname==='/api/test-model'){
    if(rateLimited(req,res))return;
    try{const data=await readJson(req,20000);const config=resolveConfig(data.config);await callModel(config,[{role:'user',content:'请只回复：连接成功'}]);return send(res,200,{ok:true,message:'模型 API 连接成功'})}catch(e){return send(res,e.status||400,{error:e.message,needsConfig:!!e.needsConfig})}
  }
  if(req.method==='POST'&&url.pathname==='/api/ai'){
    if(rateLimited(req,res))return;
    try{const data=await readJson(req);if(!['career','review','resume-profile'].includes(data.task))return send(res,400,{error:'未知的分析类型'});const config=resolveConfig(data.config);const content=await callModel(config,messagesFor(data.task,data.context||{}));return send(res,200,{content,mode:'live-model'})}catch(e){return send(res,e.status||400,{error:e.message,needsConfig:!!e.needsConfig})}
  }
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'API 路径不存在'});
  const requested=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);const file=path.resolve(root,`.${requested}`);if(file===configFile){res.writeHead(404);return res.end('Not found')}if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found')}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
server.listen(port,host,()=>console.log(`JobPilot running at http://${host}:${port}${publicMode?' (public mode)':''}`));
