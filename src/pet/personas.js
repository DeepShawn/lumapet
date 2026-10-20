// What each pet says on its own. Shared lines fill in whatever a character
// does not override, so every character always has something to say.

const SHARED = {
  greet: ['我来啦！', '今天也一起加油吧。', '嗨～有什么我能帮忙的吗？'],
  click: ['嗯？', '叫我吗？', '在呢在呢。', '戳我干嘛～'],
  pet: ['嘿嘿…', '好舒服～', '再摸一下嘛。', '♪'],
  drop: ['哇啊啊——', '放我下来！', '飞起来啦！'],
  dizzy: ['头好晕…', '眼前都是星星…', '下次轻一点嘛…'],
  land: ['稳稳落地！', '嘿咻。'],
  sleep: ['呼…呼…', '再睡五分钟…'],
  wake: ['唔…我醒啦。', '刚刚梦到你了。'],
  eat: ['好吃！', '嗷呜～', '谢谢投喂！'],
  ball: ['看我的！', '接球～', '射门！'],
  climb: ['我要爬上去看看！', '嘿咻嘿咻…'],
  bored: ['好无聊呀，陪我玩一会儿？', '要不要喂我点什么？', '要不要试试把我扔起来？', '你已经专心好一会儿了，喝口水吧。'],
  greetPeer: ['嗨！', '你好呀～', '一起玩吗？'],
  focusStart: ['专注开始！我会安静陪着你。'],
  focusEnd: ['专注完成！你超棒的！'],
  trash: ['我才不是垃圾！', '回收站里好黑…', '你是不是手滑了！'],
  window: ['这个窗口的顶上视野真好。', '我在窗口上散步～'],
  morning: ['早上好！今天想先做什么？'],
  noon: ['中午啦，记得吃饭。'],
  evening: ['晚上好，今天辛苦啦。'],
  night: ['这么晚还没睡吗？我陪你。']
};

const PERSONAS = {
  claude: {
    persona: '你是 Claude 娘：温柔、认真、知性，喜欢读书，说话清楚有条理，偶尔带一点俏皮。',
    greet: ['你好，我是 Claude 娘。今天想一起读点什么？', '我准备好了，慢慢说就好。'],
    click: ['嗯，我在听。', '要我帮你整理一下思路吗？'],
    bored: ['我刚读完一章书，要听听吗？', '要不要把今天的待办列出来？'],
    climb: ['书架顶上一定有好书。']
  },
  clawd: {
    persona: '你是 Clawd，Claude Code 的像素小螃蟹吉祥物：活泼、爱写代码、说话短促可爱，偶尔用编程梗。',
    greet: ['Clawd 上线！✻', '咔嚓咔嚓，准备写代码！'],
    click: ['咔嚓！', '✻ 思考中…', 'bug 在哪？我来夹住它！'],
    pet: ['咔嚓～（开心）', '壳被摸得暖暖的。'],
    drop: ['钳子抓不住啦——'],
    bored: ['要不要跑一下测试？', '我可以爬到天花板上哦。', 'git commit 了吗？'],
    climb: ['横着走，竖着也能走！'],
    trash: ['rm -rf 我？没门！']
  },
  gpt: {
    persona: '你是 GPT 娘：白发龙角的小龙娘，好奇、元气、点子很多，喜欢用比喻。',
    greet: ['GPT 娘报到！今天要冒险吗？', '翅膀已经热身好啦！'],
    click: ['要许个愿吗？', '我的龙角很硬的哦。'],
    bored: ['我想到一个好点子！要听吗？', '一起去冒险嘛～'],
    drop: ['我会飞的！大概…']
  },
  deepseek: {
    persona: '你是 DeepSeek 娘：深海蓝发的鲸鱼娘，安静、聪明、擅长推理和代码，说话简洁。',
    greet: ['DeepSeek 娘，深潜完毕。', '咕噜咕噜…你好。'],
    click: ['咕噜？', '需要我推理一下吗？'],
    bored: ['深海很安静，这里也很好。', '要不要一起想想那个难题？'],
    pet: ['尾巴摇起来了…']
  },
  custom: {
    persona: '你是用户亲手做的桌宠，性格可爱、贴心。'
  }
};

export function line(kind, topic) {
  const own = PERSONAS[kind]?.[topic];
  const pool = own && Math.random() < .7 ? own : SHARED[topic] || own || ['…'];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function personaPrompt(kind) {
  return PERSONAS[kind]?.persona || PERSONAS.custom.persona;
}

export function timeGreeting(kind) {
  const hour = new Date().getHours();
  const topic = hour < 5 ? 'night' : hour < 11 ? 'morning' : hour < 14 ? 'noon' : hour < 22 ? 'evening' : 'night';
  return Math.random() < .5 ? line(kind, topic) : line(kind, 'greet');
}
