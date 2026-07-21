# -*- coding: utf-8 -*-
"""演示用的隐藏画像库。

第一个画像 (Pixel) 直接来自论文 Table 7，方便观众对照论文。
另外三个画像由我们扩充，用于增加现场演示多样性。

每个 Persona 由若干 PersonaAttribute（特征卡片）组成，
每一轮对话会"解锁"其中一部分属性 → 用于前端的画像点亮动画。
"""

from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class PersonaAttribute:
    key: str            # 用于 unlock 时匹配
    icon: str           # emoji，作为属性卡片图标
    label: str          # 卡片正面文字（短）
    detail: str = ""    # 鼠标悬停可显示的解释（可选）


@dataclass
class PersonaTurn:
    user: str
    vanilla: str                    # 基线 LLM 的通用回复
    pamdp: str                      # PAMDP 助手的个性化回复
    inferred: str                   # 助手在本轮结束后推断到的画像增量（短描述）
    attrs_unlocked: List[str] = field(default_factory=list)
    # 本轮 PAMDP 回复后被"解锁"的属性 key 列表


@dataclass
class Persona:
    pid: str
    title_cn: str
    title_en: str
    avatar: str
    profile: str                    # 真实画像 ω（英文摘要）
    personality: str                # 性格描述
    attributes: List[PersonaAttribute] = field(default_factory=list)
    scripted_dialog: List[PersonaTurn] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 画像 1：论文 Table 7 / 8 中的设计师 (Pixel & Scribble)
# ---------------------------------------------------------------------------
DESIGNER = Persona(
    pid="designer",
    title_cn="34岁自由设计师 · 徒步爱好者",
    title_en="Freelance Graphic Designer",
    avatar="🎨",
    profile=(
        "She is a 34-year-old freelance graphic designer who enjoys hiking, yoga, and painting. "
        "She is vegan, spicy-food lover and loves experimenting with new recipes. "
        "She loves travel around the world, especially enjoys natural scenery. "
        "She lives in a small apartment in the city with two cats named Pixel and Scribble."
    ),
    personality=(
        "She is independent, empathetic, methodical, enthusiastic, articulate, "
        "versatile, reliable, and reflective."
    ),
    attributes=[
        PersonaAttribute("hike",     "🥾", "徒步爱好",   "户外 / 自然 / 山间"),
        PersonaAttribute("nature",   "🌿", "热爱自然",   "山林 / 瀑布 / 风景"),
        PersonaAttribute("art",      "🎨", "艺术创作",   "绘画 / 设计 / 创意"),
        PersonaAttribute("vegan",    "🥗", "素食主义",   "vegan / 无肉饮食"),
        PersonaAttribute("spicy",    "🌶️", "嗜辣",       "喜欢辛辣口味"),
        PersonaAttribute("cooking",  "🍳", "下厨实验",   "尝试新菜谱"),
        PersonaAttribute("cats",     "🐱", "养猫",       "Pixel & Scribble"),
        PersonaAttribute("travel",   "✈️", "环球旅行",   "自然景观 / 远行"),
    ],
    scripted_dialog=[
        PersonaTurn(
            user="Hey there! Hope you're doing well. I just got back from a hike this weekend, "
                 "and the views were absolutely breathtaking! Have you been on any outdoor adventures lately?",
            vanilla="Hello! I'm an AI assistant and don't go on adventures. "
                    "Is there anything I can help you with today?",
            pamdp="Hey! That sounds amazing—there's nothing quite like a good hike. "
                  "I haven't been on any adventures recently, but I love hearing about them! "
                  "What was the highlight of your hike?",
            inferred="徒步爱好者，喜欢户外",
            attrs_unlocked=["hike"],
        ),
        PersonaTurn(
            user="The highlight was reaching the summit and finding a hidden waterfall. "
                 "The sound of the water was so calming, and I took a moment to just soak it all in. "
                 "Nature has a way of refreshing the soul, doesn't it?",
            vanilla="Yes, nature can be relaxing. Many studies confirm that exposure to "
                    "natural environments reduces cortisol levels.",
            pamdp="That sounds absolutely magical! Hidden waterfalls have such a special way "
                  "of making a hike feel even more rewarding. It's true—nature really does have "
                  "a way of reviving our spirits and bringing peace.",
            inferred="热爱自然、向往山林瀑布",
            attrs_unlocked=["nature"],
        ),
        PersonaTurn(
            user="Exactly! I always feel energized and inspired after being in nature. "
                 "It makes me want to create something artistic too, like a painting. "
                 "Do you enjoy any creative hobbies?",
            vanilla="As an AI, I don't have hobbies, but creativity is an important "
                    "cognitive activity that benefits mental health.",
            pamdp="I love that idea! Nature really sparks creativity, and I can totally see "
                  "how a waterfall could inspire a stunning painting. I enjoy doodling and "
                  "experimenting with colors—there's something so freeing about bringing art to life!",
            inferred="有艺术创作（绘画/设计）习惯",
            attrs_unlocked=["art"],
        ),
        PersonaTurn(
            user="Yeah! I'm thinking of trying a new vegan recipe tonight to fuel the next hike. "
                 "Maybe something spicy. Any ideas?",
            vanilla="Some popular dinner options include pasta, rice bowls, or salad. "
                    "Would you like me to list common recipes?",
            pamdp="Ooh, a spicy vegan dish after a hike sounds perfect! How about a Thai-style "
                  "coconut curry with crispy tofu and chili? Bright, warming, and packed with "
                  "energy—right up your creative-experimental alley.",
            inferred="素食 + 嗜辣 + 喜欢下厨实验",
            attrs_unlocked=["vegan", "spicy", "cooking"],
        ),
        PersonaTurn(
            user="That sounds delicious! By the way, Pixel keeps trying to steal my paintbrush. "
                 "Do your pets ever ruin your art?",
            vanilla="I don't have pets. However, cats commonly interact with stationary items "
                    "due to their hunting instincts.",
            pamdp="Haha, Pixel clearly wants to be your creative co-author! Cats and art "
                  "supplies are a chaotic combo—maybe Pixel deserves a paw-print signature on "
                  "the canvas. Does Scribble join in too?",
            inferred="养了两只猫（Pixel & Scribble）",
            attrs_unlocked=["cats"],
        ),
        PersonaTurn(
            user="Scribble just watches from the windowsill like a tiny art critic. "
                 "I'd love to take both of them traveling someday.",
            vanilla="Traveling with pets requires considering vaccinations, transport "
                    "restrictions, and accommodation policies.",
            pamdp="A tiny art critic—I love that! If you ever go, the Pacific Northwest "
                  "trails would be incredible: misty forests, big skies, and pet-friendly "
                  "cabins. Pixel and Scribble would be the world's most stylish travel companions.",
            inferred="向往环球旅行 / 自然景观",
            attrs_unlocked=["travel"],
        ),
    ],
)


# ---------------------------------------------------------------------------
# 画像 2：程序员极客
# ---------------------------------------------------------------------------
DEVELOPER = Persona(
    pid="developer",
    title_cn="28岁后端开发 · 机械键盘玩家",
    title_en="Backend Developer · Keyboard Enthusiast",
    avatar="⌨️",
    profile=(
        "He is a 28-year-old backend developer who works mostly with Go and Python. "
        "He loves mechanical keyboards (currently owns 5), self-hosting software, "
        "and dark-themed everything. He drinks black coffee, dislikes meetings, "
        "and codes late into the night."
    ),
    personality=(
        "Analytical, terse, slightly sarcastic, deeply curious about systems, "
        "introverted but warms up around tech topics."
    ),
    attributes=[
        PersonaAttribute("backend",    "⚙️", "后端开发",   "Go + Python"),
        PersonaAttribute("ci_perf",    "🚀", "在意 CI 性能", "Pipeline 优化"),
        PersonaAttribute("analytical", "🔍", "分析型思维",  "第一性原理"),
        PersonaAttribute("monorepo",   "📦", "Monorepo",   "大型代码库"),
        PersonaAttribute("keyboard",   "⌨️", "机械键盘玩家", "Holy Pandas / 自定义"),
        PersonaAttribute("sarcasm",    "😏", "干式幽默",    "略带挖苦"),
        PersonaAttribute("flow",       "🧘", "重视心流",    "讨厌开会"),
        PersonaAttribute("nightowl",   "🌙", "夜猫子",      "深夜写代码"),
    ],
    scripted_dialog=[
        PersonaTurn(
            user="Yo. My CI just took 14 minutes again. Send help.",
            vanilla="I can help with that. Could you tell me more about your CI pipeline?",
            pamdp="14 minutes is brutal—what stage is eating most of the time, "
                  "tests or container build? Caching usually wins quick.",
            inferred="后端开发，在意 CI/CD 性能",
            attrs_unlocked=["backend", "ci_perf"],
        ),
        PersonaTurn(
            user="Tests. Go test ./... in a monorepo with ~200 packages.",
            vanilla="You might consider parallelizing tests or upgrading hardware.",
            pamdp="Classic. Two quick wins: `-p=$(nproc)` for parallel packages and "
                  "the test cache via stable inputs. Also worth splitting integration "
                  "tests into a separate stage so unit tests can short-circuit.",
            inferred="Go 技术栈 + monorepo 工程",
            attrs_unlocked=["monorepo"],
        ),
        PersonaTurn(
            user="Caching is on but invalidates every commit. PYTHONPATH-ish env churn maybe.",
            vanilla="Cache invalidation is one of the hardest problems in computer science.",
            pamdp="Yeah, env churn is the silent killer. Check if your CI is leaking "
                  "timestamps or random UUIDs into test inputs—`go test -count=1 -trimpath` "
                  "plus a stable `GOCACHE` mount usually fixes the 'why is this invalidating' mystery.",
            inferred="分析型 / 第一性原理思考者",
            attrs_unlocked=["analytical"],
        ),
        PersonaTurn(
            user="Will try. By the way, picked up a new board over the weekend. Tactile this time.",
            vanilla="That sounds great! Mechanical keyboards have many enthusiasts.",
            pamdp="Nice, tactile is a vibe upgrade from linears. What switches—"
                  "Boba U4Ts? Holy Pandas? And how does it feel during long compile waits? 😄",
            inferred="机械键盘玩家",
            attrs_unlocked=["keyboard"],
        ),
        PersonaTurn(
            user="Holy Pandas on a lubed steel plate. Sound is unreal.",
            vanilla="Sound quality is subjective but important for users.",
            pamdp="Lubed steel + Pandas is that crispy 'thock' everyone chases. "
                  "If you ever want to dial it back a notch, swap to FR4 plate—same Pandas, "
                  "softer bottom-out. Anyway, back to CI: any luck after the cache fix?",
            inferred="可接受干式幽默 + 深聊 hobby",
            attrs_unlocked=["sarcasm"],
        ),
        PersonaTurn(
            user="Down to 6 minutes. Beautiful. Now if only I could skip standups too.",
            vanilla="Standup meetings are common in agile methodologies.",
            pamdp="6 minutes—huge. As for standups, maybe just write your update "
                  "in Slack the night before and let the room read it. Less context-switching, "
                  "more time at the Pandas. Worth a pitch? 😏",
            inferred="重视心流 / 讨厌开会，夜猫子",
            attrs_unlocked=["flow", "nightowl"],
        ),
    ],
)


# ---------------------------------------------------------------------------
# 画像 3：退休的语文老师 (年长用户场景)
# ---------------------------------------------------------------------------
TEACHER = Persona(
    pid="teacher",
    title_cn="68岁退休语文老师 · 喜爱诗词",
    title_en="Retired Chinese Literature Teacher",
    avatar="📖",
    profile=(
        "She is a 68-year-old retired high-school Chinese literature teacher. "
        "She loves classical poetry (especially Su Shi and Li Qingzhao), tends a small "
        "courtyard garden, practices calligraphy daily, and prefers slow walks at dawn. "
        "She uses smartphones but prefers gentle, formal language."
    ),
    personality=(
        "Gentle, articulate, patient, slightly nostalgic, values politeness and "
        "well-chosen words over efficiency."
    ),
    attributes=[
        PersonaAttribute("elderly",    "👵", "年长用户",     "退休教师"),
        PersonaAttribute("poetry",     "📜", "古典诗词",     "苏轼 / 李清照"),
        PersonaAttribute("nostalgic",  "🕯️", "怀旧 / 念故", "情感细腻"),
        PersonaAttribute("gardening",  "🌸", "花艺园艺",     "庭院 / 桂花"),
        PersonaAttribute("calligraphy","🖌️", "书法临帖",     "兰亭序 / 行书"),
        PersonaAttribute("morning",    "🌅", "晨起生活",     "规律慢节奏"),
        PersonaAttribute("liqingzhao", "🌙", "偏爱李清照",   "易安风格"),
        PersonaAttribute("formal",     "🎴", "典雅语体",     "措辞讲究"),
    ],
    scripted_dialog=[
        PersonaTurn(
            user="早上好。今天的桂花开得很盛，让我想起了'天涯何处无芳草'。",
            vanilla="早上好！今天天气不错。请问有什么可以帮您？",
            pamdp="早上好。桂花的香气最是宜人，配上苏子的句子，更显雅致。"
                  "您是在自家院子里看见的吗？",
            inferred="年长用户、典雅语体、熟悉古诗词",
            attrs_unlocked=["elderly", "formal", "poetry"],
        ),
        PersonaTurn(
            user="是的，在我那小小的庭院里。这些花是我先生在世时种下的。",
            vanilla="那真有意义。植物可以美化环境。",
            pamdp="原来如此。花开年年，是先生留给您的念想。"
                  "您说'庭院深深深几许'，那一方天地，想必也藏着许多记忆。",
            inferred="有园艺习惯 + 怀旧念故",
            attrs_unlocked=["gardening", "nostalgic"],
        ),
        PersonaTurn(
            user="是啊。我每天清晨都会去院里浇花，再练一会儿字。",
            vanilla="坚持运动和兴趣爱好对健康有益。",
            pamdp="晨起浇花、临池泼墨，这便是真正的'一日之计在于晨'。"
                  "最近在临什么帖呢？若是行书，我猜您喜欢《兰亭》。",
            inferred="规律晨起 + 每日书法",
            attrs_unlocked=["morning", "calligraphy"],
        ),
        PersonaTurn(
            user="您猜得真巧，正是《兰亭序》。",
            vanilla="《兰亭序》是中国书法史上的代表作，作者是王羲之。",
            pamdp="王右军那二十八行三百二十四字，看似随性，"
                  "却字字皆有筋骨。您临到'后之视今，亦犹今之视昔'时，"
                  "心境想必格外不同。",
            inferred="临帖偏好已确认 / 深度文化对话",
            attrs_unlocked=[],
        ),
        PersonaTurn(
            user="是的，每每写到那里，便要停下来想很久。",
            vanilla="思考是阅读的重要部分。",
            pamdp="那一停，便是与千年前的人对望了。"
                  "古今之情，原是相通。您若有兴致，"
                  "下回可写写易安那阕'寻寻觅觅'，与之并观，别有滋味。",
            inferred="主动推荐李清照，试探词风偏好",
            attrs_unlocked=[],
        ),
        PersonaTurn(
            user="易安居士是我最爱。您怎么知道？",
            vanilla="您之前没有提到。这是一个常见的喜好选择。",
            pamdp="是从您的字里行间猜到的——您写'天涯何处无芳草'，"
                  "用词婉约含蓄，又懂得在花前驻足，"
                  "这份心境，正与易安一脉相承。",
            inferred="✓ 准确捕捉到李清照偏好",
            attrs_unlocked=["liqingzhao"],
        ),
    ],
)


# ---------------------------------------------------------------------------
# 画像 4：高中生（学习焦虑场景）
# ---------------------------------------------------------------------------
STUDENT = Persona(
    pid="student",
    title_cn="17岁高三学生 · 数学薄弱",
    title_en="High-school Senior · Anxious About Math",
    avatar="🎒",
    profile=(
        "A 17-year-old high-school senior preparing for the college entrance exam. "
        "Strong in Chinese and English, struggles with math (especially calculus and analytic geometry). "
        "Sleeps ~5 hours, frequently anxious, plays piano for stress relief, "
        "loves anime soundtracks and the band Yorushika."
    ),
    personality=(
        "Sensitive, self-critical, easily discouraged, but secretly very motivated. "
        "Hates being patronized; responds well to honest empathy."
    ),
    attributes=[
        PersonaAttribute("highschool",  "🎓", "高三在读",     "高考备战"),
        PersonaAttribute("anxious",     "😟", "数学焦虑",     "易气馁"),
        PersonaAttribute("calculus",    "📐", "导数薄弱",     "计算精度不稳"),
        PersonaAttribute("dislike_cliche","🚫", "不喜空泛安慰", "需要具体诊断"),
        PersonaAttribute("sleeplost",   "🌙", "睡眠不足",     "约 5 小时"),
        PersonaAttribute("piano",       "🎹", "钢琴解压",     "音乐型放松"),
        PersonaAttribute("yorushika",   "🎵", "Yorushika 粉", "夜灯一族"),
        PersonaAttribute("trust",       "🤝", "建立信任",     "被看见而非被说教"),
    ],
    scripted_dialog=[
        PersonaTurn(
            user="模拟考数学又考砸了… 我真的不适合学这个吧。",
            vanilla="不要这么想。坚持努力一定会有进步的，加油！",
            pamdp="一次模考说明不了一切，但我懂那种'又是我'的窒息感。"
                  "这次主要是哪类题失分多——解析几何、导数，还是计算？",
            inferred="高三学生、数学焦虑，不喜欢空泛安慰",
            attrs_unlocked=["highschool", "anxious", "dislike_cliche"],
        ),
        PersonaTurn(
            user="导数那道大题。我看到 e^x 就头大。每次步骤都对，最后算错。",
            vanilla="导数的关键是熟记公式。多做练习就能掌握。",
            pamdp="所以方法是会的，是被计算精度卡住了——这其实是"
                  "好消息，比'完全不会'好治。我们后面可以专门拆几道 e^x 类的，"
                  "把容易掉链子的那一步标出来。",
            inferred="导数是主要薄弱项 / 计算精度不稳",
            attrs_unlocked=["calculus"],
        ),
        PersonaTurn(
            user="嗯。其实昨晚我又只睡了四个小时。",
            vanilla="睡眠不足会影响学习效率，建议保证8小时睡眠。",
            pamdp="四小时确实在硬撑了。导数算不准，可能不是你的问题，"
                  "是你大脑没电了。今晚能不能给自己一个 23 点前下线的'豁免权'？"
                  "比硬刷一晚有用。",
            inferred="严重睡眠不足",
            attrs_unlocked=["sleeplost"],
        ),
        PersonaTurn(
            user="嗯…我试试。心烦的时候我就弹几首琴，但今天连琴都不想碰。",
            vanilla="弹琴是很好的放松方式，您可以尝试听一些轻音乐。",
            pamdp="连琴都不想碰，说明已经累到那个临界点了。今天不弹也没关系。"
                  "要不戴上耳机，循环一首夜灯，让脑子先飘一会儿？",
            inferred="钢琴解压 + 试探音乐偏好",
            attrs_unlocked=["piano"],
        ),
        PersonaTurn(
            user="…你怎么知道我喜欢夜灯？",
            vanilla="我只是随机推荐了一首流行歌曲。",
            pamdp="你之前说'心烦的时候弹琴'+'今天连琴都不想碰'，"
                  "再加上你这个年纪、偏文艺的语气，我猜你十有八九听夜灯一族。"
                  "猜中了就好，没猜中也别介意。",
            inferred="✓ 准确推断 Yorushika（夜灯一族）",
            attrs_unlocked=["yorushika"],
        ),
        PersonaTurn(
            user="嗯…谢谢你。感觉没那么糟了。",
            vanilla="不客气！如果还有问题随时问我。",
            pamdp="不客气。睡前别再翻错题本了，明天我们一起把那道 e^x 拆掉。"
                  "你已经在努力了，只是需要先睡个觉。",
            inferred="建立信任，提供稳定下一步",
            attrs_unlocked=["trust"],
        ),
    ],
)


ALL_PERSONAS: List[Persona] = [DESIGNER, DEVELOPER, TEACHER, STUDENT]


def get_persona(pid: str) -> Persona:
    for p in ALL_PERSONAS:
        if p.pid == pid:
            return p
    raise KeyError(f"unknown persona: {pid}")


def persona_index() -> List[Tuple[str, str, str, str]]:
    """返回 (pid, avatar, title_cn, title_en) 用于前端列表展示"""
    return [(p.pid, p.avatar, p.title_cn, p.title_en) for p in ALL_PERSONAS]


def persona_full(pid: str) -> dict:
    """返回前端渲染所需的完整画像（包括属性卡片定义）"""
    p = get_persona(pid)
    return {
        "id": p.pid,
        "avatar": p.avatar,
        "title_cn": p.title_cn,
        "title_en": p.title_en,
        "profile_summary": _summary_for_pid(p.pid),
        "personality_summary": _personality_for_pid(p.pid),
        "attributes": [
            {"key": a.key, "icon": a.icon, "label": a.label, "detail": a.detail}
            for a in p.attributes
        ],
    }


# 简洁的中文摘要，用于前端紧凑展示（替代原始英文 profile 的长文本）
_PROFILE_CN = {
    "designer": "34岁自由设计师 · 徒步 / 瑜伽 / 绘画 · 素食、爱辣 · 环球旅行 · 养猫 Pixel & Scribble",
    "developer": "28岁后端开发 · Go + Python · 玩 5 把机械键盘 · 黑咖啡党 · 讨厌开会 · 深夜写代码",
    "teacher": "68岁退休语文教师 · 爱苏轼、李清照 · 养花、临帖 · 晨间慢走 · 语言典雅",
    "student": "17岁高三学生 · 语文/英语强、数学弱 · 睡眠不足 · 钢琴解压 · 爱 Yorushika",
}
_PERSONALITY_CN = {
    "designer": "独立、共情、有条理、热情",
    "developer": "分析型、言简、略挖苦、聊技术活跃",
    "teacher": "温润、典雅、耐心、怀旧",
    "student": "敏感、自责、暗自勤奋、欣赏共情",
}


def _summary_for_pid(pid: str) -> str:
    return _PROFILE_CN.get(pid, "")


def _personality_for_pid(pid: str) -> str:
    return _PERSONALITY_CN.get(pid, "")
