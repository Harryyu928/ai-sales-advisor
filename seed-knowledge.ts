// 批量知识录入脚本
// 销售理论 + 话术风格 + 考试知识 + 升学申请
const KNOWLEDGE = [
  // ===== 一、销售心理学与理论模型（15条）=====
  { title: "SPIN销售法：提问式销售模型", category: "SALES", content: "SPIN销售法由尼尔·雷克汉姆提出：Situation(现状问题)、Problem(问题问题)、Implication(暗示问题)、Need-Payoff(需求-回报问题)。通过层层提问引导客户自己发现需求，而非直接推销。高端教育咨询特别适用。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "SPIN", "提问技巧"] },
  { title: "AIDA销售模型", category: "SALES", content: "AIDA模型：Attention(注意力)→Interest(兴趣)→Desire(欲望)→Action(行动)。第一步用共鸣话题抓住注意力，第二步用具体案例引发兴趣，第三步用成功案例激发向往，第四步明确下一步行动。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "AIDA"] },
  { title: "客户购买决策五阶段", category: "SALES", content: "客户购买决策五阶段：1.需求确认 2.信息搜集 3.方案评估 4.购买决策 5.购后评价。顾问需判断客户处于哪个阶段，对应不同沟通策略：早期给信息，中期给对比，后期促成交。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "客户心理"] },
  { title: "信任建立的四个层次", category: "SALES", content: "信任建立四层：1.专业信任(你懂行) 2.可靠信任(你说到做到) 3.私人信任(你真心为我好) 4.情感信任(我喜欢你)。教育咨询从专业信任切入，逐步建立私人和情感信任。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "信任"] },
  { title: "损失厌恶心理在销售中的应用", category: "SALES", content: "行为经济学研究表明：人对损失的痛苦感受是同等收益快乐的2.5倍。销售中可适度强调「错过申请截止时间的损失」「早规划vs晚规划的差距」，但不能制造焦虑，要用事实说话。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "心理学"] },
  { title: "社会认同原理", category: "SALES", content: "西奥迪尼《影响力》六大原理之一：人会参照他人的行为做决策。教育销售中：用往届录取案例、同校学长申请结果、在读学员反馈等社会证据，比单纯说课程好更有说服力。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "影响力", "社会认同"] },
  { title: "稀缺性原理的正确用法", category: "SALES", content: "稀缺性原理：人对稀缺的东西会更渴望。教育销售中可合理使用：1.名额有限(真实班额限制) 2.时间有限(申请截止) 3.优惠限时(早鸟价)。注意：必须真实，不能虚假稀缺，否则信任崩塌。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "影响力", "稀缺性"] },
  { title: "锚定效应在报价中的应用", category: "SALES", content: "锚定效应：先提出的信息会成为客户判断的锚点。教育咨询中：先介绍高端全程班，再介绍标准班，标准班显得更合理；先提总费用，再拆分到每课时，客户感受不同。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "报价", "心理学"] },
  { title: "BANT客户资格判断法", category: "SALES", content: "BANT：Budget(预算)、Authority(决策权)、Need(需求)、Timeline(时间)。快速判断客户是否值得重点跟进：有预算、有决策权、需求明确、时间紧迫=A类客户，优先跟进。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "客户分级", "BANT"] },
  { title: "顾问式销售 vs 交易型销售", category: "SALES", content: "顾问式销售：以客户需求为中心，深度诊断问题，提供解决方案，建立长期关系。交易型销售：以产品为中心，强调价格和促销。高客单价教育产品必须用顾问式销售，不能像卖菜一样推销。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "顾问式销售"] },
  { title: "客户异议的本质：未被满足的需求", category: "SALES", content: "客户提出异议不是拒绝，而是信息不足或有顾虑。异议处理三步：1.倾听不打断 2.共情确认 3.解答并补充信息。常见异议：价格贵=价值感知不足，再考虑=怕做错决定。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "异议处理"] },
  { title: "成交信号识别", category: "SALES", content: "客户出现以下信号说明接近成交：1.问具体上课时间 2.问退费政策 3.问同班同学背景 4.问付款方式 5.提到「我回去和家人商量」。出现成交信号时，不要再讲新内容，直接引导下一步行动。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "成交信号"] },
  { title: "跟进节奏：7次触达法则", category: "SALES", content: "销售研究显示：平均需要7次有效触达才能完成成交。但大部分销售在第2次后就放弃了。跟进不是催单，而是每次提供新价值：新政策、新案例、新活动，让客户感到你在帮他，不是在卖他。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "跟进"] },
  { title: "峰终定律在客户体验中的应用", category: "SALES", content: "诺贝尔奖得主卡尼曼提出：人对体验的记忆由两个时刻决定——高峰时刻和结束时刻。教育咨询中：要打造一个「惊喜时刻」(如独家院校信息)和一个「温暖结尾」(如贴心提醒)，客户会记住整体好体验。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售理论", "客户体验"] },
  { title: "个人风格与销售效果的关系", category: "STYLE", content: "销售风格没有标准答案，适合客户的就是最好的。理性客户喜欢数据和逻辑，感性客户喜欢故事和共鸣。好的销售顾问能根据客户类型调整沟通风格：对A型家长专业严谨，对B型家长亲切温暖。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "销售风格"] },

  // ===== 二、销售话术与沟通技巧（20条）=====
  { title: "初次破冰话术模板", category: "SALES", content: "初次咨询破冰三句话：1.感谢信任+共情(「感谢您来咨询，很多家长刚开始都有同样的困惑」) 2.自我介绍+定位(「我是负责XX方向的顾问，每年帮XX位学生拿到offer」) 3.开启提问(「您目前最关心的是哪方面？」)。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "破冰"] },
  { title: "开放式提问 vs 封闭式提问", category: "SALES", content: "开放式提问：「您孩子目前的英语基础大概是什么水平？」——引导客户多说，收集信息。封闭式提问：「您是想申请秋季入学对吗？」——确认信息，引导方向。多用开放式提问收集信息，适时用封闭式提问确认共识。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "提问技巧"] },
  { title: "倾听的三个层次", category: "SALES", content: "第一层：听内容(客户说了什么)。第二层：听情绪(客户语气里的焦虑/期待/犹豫)。第三层：听需求(客户没说出口的真实顾虑)。好的顾问70%时间在听，30%时间在问和说。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "倾听"] },
  { title: "价格异议处理话术", category: "SALES", content: "客户说「太贵了」：1.不降价先共情(「我理解您的感受，这个投入确实需要慎重考虑」) 2.换算成价值(「平均下来每课时XX元，相当于请一位资深老师1对1」) 3.对比损失(「如果因为准备不足耽误一年，时间成本是多少？」)。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "价格异议"] },
  { title: "「我再考虑考虑」应对话术", category: "SALES", content: "客户说「再考虑考虑」：1.认可不施压(「应该的，这么重要的决定确实要好好想想」) 2.挖真实顾虑(「方便问一下，您主要还在纠结哪方面吗？是课程内容、时间安排还是费用？」) 3.给一个思考框架(「我给您整理一份对比清单，您和家人商量时可以参考」)。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "异议处理"] },
  { title: "「我回去和家人商量」应对话术", category: "SALES", content: "客户说「和家人商量」：1.理解+支持(「没问题，这么大的事确实要一起商量」) 2.提供弹药(「我整理一份简明介绍，您给家人看，有任何问题随时问我」) 3.约定下次(「您看什么时候方便，我再和您/家人通个电话解答疑问？」)。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "异议处理"] },
  { title: "成功案例分享的正确姿势", category: "SALES", content: "讲成功案例要具体：1.背景(和客户相似的学生) 2.挑战(同样的困难) 3.方案(我们怎么帮的) 4.结果(具体录取结果) 5.启发(您可以参考的点)。不要只说「我们有很多学生进了名校」，太模糊没有说服力。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "案例分享"] },
  { title: "微信跟进话术：每次都要有新价值", category: "SALES", content: "微信跟进大忌：「考虑得怎么样了？」——每次跟进都要带新价值：1.新政策/新信息 2.相关成功案例 3.活动/讲座邀请 4.节日/天气问候。让客户觉得你在提供信息，不是在催单。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "微信跟进"] },
  { title: "语音沟通 vs 文字沟通的选择", category: "SALES", content: "初次咨询：用文字，让客户有安全感，不被打扰。深度沟通：用语音/电话，效率更高，能感受到语气。重要信息：文字+语音双重确认。不要一上来就发长语音，客户可能不方便听。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "沟通方式"] },
  { title: "情绪价值的提供方式", category: "SALES", content: "教育咨询中，客户(家长)的焦虑是核心情绪。提供情绪价值：1.共情(「我理解您的焦虑，很多家长都这样」) 2.赋能(「其实按这个规划走，完全来得及」) 3.安心(「交给我，我会一步步帮您盯着」)。客户信任你，是因为你让他安心。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "情绪价值"] },
  { title: "制造紧迫感的正确方式", category: "SALES", content: "紧迫感必须基于真实信息：1.申请截止日期临近 2.班额快满了(真实数据) 3.优惠即将截止。不要编造虚假的紧迫感，客户一旦发现，信任全毁。可以说：「这个班目前还剩3个名额，您如果确定的话我帮您预留」。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "紧迫感"] },
  { title: "确认下一步行动的话术", category: "SALES", content: "每次沟通结束前，必须明确下一步：「那我们定在这周六上午10点，我给您做一个详细的规划方案，您看可以吗？」——不要说「那您考虑一下」，要给具体的时间和行动。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "行动"] },
  { title: "转介绍请求话术", category: "SALES", content: "服务做好后，适时请求转介绍：「您对我们的服务还满意的话，如果身边有朋友也有同样的需求，欢迎推荐给我，我一定像对您一样用心。」——时机：客户明确表示满意的时候，比如拿到offer、上完第一阶段课。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "转介绍"] },
  { title: "拒绝的话术：如何优雅地说不", category: "SALES", content: "不是所有客户都要接：1.需求不匹配(客户要的我们确实做不到) 2.期望不合理(承诺了做不到的) 3.沟通成本过高。优雅拒绝：「我理解您的需求，但根据您的情况，我觉得XX机构/方向可能更适合您，不一定非要选我们。」——真诚反而赢得信任。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "拒绝"] },
  { title: "客户分层跟进策略", category: "SALES", content: "A类客户(2-3天跟进)：有明确需求+预算+时间紧。B类客户(5-7天跟进)：有需求但还在对比。C类客户(2-3周跟进)：刚了解，还在早期。不同分层用不同频率和内容，不要对所有人都一样跟进。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售策略", "客户分层"] },
  { title: "开场自我介绍的黄金公式", category: "SALES", content: "自我介绍公式：姓名+定位+价值+一句记忆点。例：「您好，我是Mandy，负责国际艺术留学申请规划，每年帮30+学生拿到英美顶尖艺术院校offer。您可以叫我Mandy，有任何申请问题随时找我。」", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "自我介绍"] },
  { title: "提问的艺术：为什么好问题比好答案重要", category: "SALES", content: "好的销售不是答得好，而是问得好。提问的三个作用：1.收集信息(你真正的需求是什么？) 2.引导思考(您有没有考虑过如果晚一年申请会怎样？) 3.建立专业感(问出专业问题，客户会觉得你懂行)。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "提问"] },
  { title: "异议处理的LAER模型", category: "SALES", content: "LAER模型：Listen(倾听)、Acknowledge(认可)、Explore(探究)、Respond(回应)。先听完，再认可情绪，再探究真实原因，最后才回应。不要一听到异议就马上反驳，客户会觉得你不理解他。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "异议处理"] },
  { title: "微信朋友圈的运营策略", category: "SALES", content: "朋友圈是个人品牌的窗口：1.专业内容(录取喜报、申请干货) 2.生活内容(工作日常、学习心得) 3.客户见证(好评截图、学生反馈)。比例：专业50%，生活30%，客户见证20%。不要全是广告，会被屏蔽。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["销售策略", "朋友圈"] },
  { title: "沟通中的「同理心」表达公式", category: "SALES", content: "同理心表达公式：「我理解您的感受」+「很多客户也有同样的经历」+「我们一起看看怎么解决」。例：「我理解您现在很焦虑，很多家长刚来找我的时候也是这样，没关系，我们一步步来，先把基础情况理清楚。」", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["话术", "同理心"] },

  // ===== 三、雅思考试全维度知识（15条）=====
  { title: "雅思考试类型：学术类 vs 培训类", category: "IELTS", content: "雅思分A类(学术类)和G类(培训类)。A类用于留学申请，G类用于移民和工作。听力和口语两部分相同，阅读和写作不同：A类阅读更学术，G类阅读更生活化。留学申请必须考A类。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "考试类型"] },
  { title: "雅思机考 vs 纸笔考试区别", category: "IELTS", content: "雅思机考：出分快(3-5天)，场次多，当天可考口语。纸笔：出分慢(13天)，场次少，口语通常提前/推后一天。两者难度完全相同，成绩认可度一样。打字快的选机考，写字习惯的选纸笔。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "机考", "纸笔"] },
  { title: "雅思听力考试题型详解", category: "IELTS", content: "雅思听力4个section，40题，30分钟+10分钟誊写答案。Section 1-2是生存场景(租房、旅游、购物)，Section 3-4是学术场景(讨论、讲座)。题型包括：填空、选择、地图、匹配。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "听力"] },
  { title: "雅思阅读考试题型详解", category: "IELTS", content: "雅思阅读3篇文章，40题，60分钟。文章长度约800-1000词，题材广泛：科普、社会、历史、文化等。题型包括：判断正误(True/False/Not Given)、填空、选择、标题匹配、信息包含题。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "阅读"] },
  { title: "雅思写作Task 1题型", category: "IELTS", content: "学术类Task 1：图表描述题，20分钟，至少150词。常见图表：线图、柱状图、饼图、表格、流程图、地图。要求：描述主要趋势，对比数据，不要加入自己的观点。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "写作"] },
  { title: "雅思写作Task 2题型", category: "IELTS", content: "学术类Task 2：议论文，40分钟，至少250词。题目类型：观点类、讨论类、利弊类、问题解决类。要求：有明确观点，结构清晰(开头-主体-结尾)，论据充分。Task 2占写作总分的2/3。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "写作"] },
  { title: "雅思口语三部分详解", category: "IELTS", content: "雅思口语11-14分钟，面对面。Part 1：自我介绍+日常话题(4-5分钟)。Part 2：个人陈述，1分钟准备，2分钟陈述。Part 3：深入讨论，4-5分钟。三部分评分标准相同：流利度、词汇、语法、发音。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "口语"] },
  { title: "雅思评分标准：四个单项如何打分", category: "IELTS", content: "雅思四个单项各按0.25分一档评分。听力和阅读：正确题数对应分数(如39-40题=9分)。写作和口语：按四个维度评分(流利度/词汇/语法/发音或任务完成度/连贯/词汇/语法)。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "评分标准"] },
  { title: "雅思总分计算方式", category: "IELTS", content: "雅思总分=四个单项平均分，四舍五入到最近0.5分。例：L7.5 R6.5 W6.0 S6.5 = 平均6.625 → 总分6.5。如果小数部分是.25则进半分，.75则进整分。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "评分"] },
  { title: "雅思成绩有效期", category: "IELTS", content: "雅思成绩自考试日期起有效期为2年。大部分院校和移民机构只接受2年内的成绩。建议在申请前1-2年考出可用成绩，不要太早考，避免过期。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "有效期"] },
  { title: "雅思备考时间规划建议", category: "IELTS", content: "从5.5到6.5分：约需200-300小时有效学习时间。从6.5到7.5分：约需300-500小时。建议：先做一套模考摸底，找出最弱单项，针对性强化。听力阅读可以短期突破，写作口语需要长期积累。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "备考规划"] },
  { title: "雅思复议：什么情况值得申请", category: "IELTS", content: "雅思成绩不满意可以申请复议(EMR)，费用约1000元，4-6周出结果。适合情况：1.单项分明显低于预期(如口语平时7分考了5.5) 2.觉得阅卷不公平。如果分数差距在0.5以内，复议成功率不高。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "复议"] },
  { title: "雅思多次考试送分规则", category: "IELTS", content: "申请院校时，可以提交多次雅思成绩，大部分学校会看最高分。但有些学校要求单次成绩达到要求，不拼分。申请前要查清楚目标院校的具体要求。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "送分"] },
  { title: "雅思考试报名流程", category: "IELTS", content: "雅思报名步骤：1.注册教育部考试中心(NEEA)账号 2.选择考试城市和日期 3.缴纳报名费(约2170元) 4.预定考场座位 5.考前一周打印准考证。建议提前1-2个月报名，热门城市考位紧张。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "报名"] },
  { title: "雅思免费备考资源推荐", category: "IELTS", content: "官方免费资源：1.雅思官网样题 2.BBC Learning English 3.剑桥雅思真题4-18(最权威)。推荐：剑雅真题必须做，听力阅读可以反复刷，写作口语用真题练习。", sourceType: "official", sourceUrl: "https://www.ielts.org/", tags: ["雅思", "备考资源"] },

  // ===== 四、托福/PTE/多邻国知识（10条）=====
  { title: "托福iBT考试结构", category: "TOEFL", content: "托福iBT全程机考，约2小时。阅读：3-4篇文章，33-52题。听力：2-3个对话+3-4个讲座，28-39题。口语：4道题(1独立+3综合)。写作：2道题(1综合+1独立)。总分120分，各部分30分。", sourceType: "official", sourceUrl: "https://www.ets.org/", tags: ["托福", "考试结构"] },
  { title: "托福 vs 雅思：哪个更适合你", category: "TOEFL", content: "美式英语口音选托福，英式选雅思。听力阅读词汇量大选托福。口语需要人机对话选托福，面对面选雅思。申请美国院校优先托福，英联邦优先雅思。现在大部分学校两者都接受。", sourceType: "official", sourceUrl: "https://www.ets.org/", tags: ["托福", "雅思对比"] },
  { title: "PTE Academic评分机制", category: "PTE", content: "PTE全程机考，AI评分。总分10-90分，四个交际技能分：口语、写作、阅读、听力。机器评分，没有人工主观因素。成绩通常1-5个工作日出分。适合不擅长面对面口语考试的学生。", sourceType: "official", sourceUrl: "https://www.pearsonpte.com/", tags: ["PTE", "评分"] },
  { title: "多邻国DET考试特点", category: "DET", content: "多邻国英语测试(DET)：在线家庭考试，约1小时。题型自适应：难度根据答题情况调整。分数10-160分。48小时出分。费用约$60。被越来越多院校接受，特别是美国大学。", sourceType: "official", sourceUrl: "https://englishtest.duolingo.com/", tags: ["多邻国", "DET"] },
  { title: "不同考试的分数换算参考", category: "EXAM", content: "常见分数换算：雅思6.5 = 托福79-93 = PTE 58-63 = 多邻国110-115。雅思7.0 = 托福94-101 = PTE 64-71 = 多邻国120-125。具体以院校官方换算表为准。", sourceType: "official", sourceUrl: "https://www.ets.org/", tags: ["分数换算"] },
  { title: "托福考试报名与费用", category: "TOEFL", content: "托福iBT报名费约$210，通过ETS官网报名。考点：全国各大城市均有考场。出分时间：4-8天。成绩有效期2年。建议提前1-2个月报名。", sourceType: "official", sourceUrl: "https://www.ets.org/", tags: ["托福", "报名"] },
  { title: "PTE考试报名与费用", category: "PTE", content: "PTE Academic报名费约$275，通过Pearson官网报名。考点：全国主要城市均有考场。出分时间：1-5个工作日。成绩有效期2年。", sourceType: "official", sourceUrl: "https://www.pearsonpte.com/", tags: ["PTE", "报名"] },
  { title: "语言班(双录取)是什么", category: "EXAM", content: "语言班(Pre-sessional English)：如果语言成绩不够直录，可以先读语言班，通过后升入正课。英国和澳洲很多学校提供语言班，长度从4周到12周不等。语言班不是预科，是给已经拿到conditional offer的学生的。", sourceType: "official", sourceUrl: "https://www.britishcouncil.org/", tags: ["语言班", "双录取"] },
  { title: "语言成绩不够直录怎么办", category: "EXAM", content: "语言成绩不够的三个解决方案：1.再考一次(如果时间够) 2.申请语言班(双录取) 3.换要求更低的学校/专业。建议：先确认目标院校的最低要求，再决定是继续刷分还是走语言班。", sourceType: "official", sourceUrl: "https://www.britishcouncil.org/", tags: ["语言成绩", "解决方案"] },
  { title: "GRE/GMAT是否必须考", category: "EXAM", content: "GRE：美国研究生入学考试，大部分理工科和文科需要。GMAT：商科研究生入学考试。现在很多院校GRE/GMAT可选(test-optional)。申请前查清楚目标项目的具体要求，不是所有专业都需要。", sourceType: "official", sourceUrl: "https://www.ets.org/", tags: ["GRE", "GMAT"] },

  // ===== 五、升学申请常识（10条）=====
  { title: "英国本科申请流程(UCAS)", category: "APPLY", content: "英国本科通过UCAS系统申请：1.选校选专业(最多5个志愿) 2.提交个人陈述(PS) 3.提交推荐信 4.等待offer 5.确认firm和insurance choice。截止日期：牛津剑桥/医学10月15日，其他1月25日。", sourceType: "official", sourceUrl: "https://www.ucas.com/", tags: ["申请", "英国本科", "UCAS"] },
  { title: "美国本科申请系统(Common App)", category: "APPLY", content: "美国本科通过Common App系统申请：1.选校(不限数量) 2.填写基本信息 3.提交文书(主文书+补充文书) 4.提交推荐信(2-3封) 5.提交成绩单。截止日期：ED/EA 11月1日，RD 1月1日。", sourceType: "official", sourceUrl: "https://www.commonapp.org/", tags: ["申请", "美国本科", "CommonApp"] },
  { title: "个人陈述(PS)写作要点", category: "APPLY", content: "个人陈述(PS)核心：讲好一个故事。1.为什么选这个专业(真实兴趣) 2.你做了什么(相关经历) 3.你为什么适合(能力匹配) 4.未来规划(为什么这个学校能帮你)。不要写成简历，要讲成长和思考。", sourceType: "official", sourceUrl: "https://www.ucas.com/", tags: ["申请", "PS", "文书"] },
  { title: "推荐信的作用与准备", category: "APPLY", content: "推荐信：2-3封，来自老师/上司。作用：从第三方视角证明你的能力和潜力。选择推荐人：1.了解你的老师 2.能写出具体事例 3.职位有分量。提前和老师沟通好，给老师足够时间准备。", sourceType: "official", sourceUrl: "https://www.commonapp.org/", tags: ["申请", "推荐信"] },
  { title: "conditional offer vs unconditional offer", category: "APPLY", content: "Conditional offer(有条件录取)：还没满足全部条件(如语言成绩、最终成绩)，达到条件后换unconditional。Unconditional offer(无条件录取)：已经满足全部条件，可以直接入学。拿到conditional不要慌，这是正常流程。", sourceType: "official", sourceUrl: "https://www.ucas.com/", tags: ["申请", "offer"] },
  { title: "签证申请基本流程", category: "APPLY", content: "学生签证基本流程：1.拿到unconditional offer 2.缴纳学费押金 3.拿到CAS/COE等录取确认 4.准备签证材料(资金证明、成绩单、护照) 5.在线申请+递交材料 6.面试(如需) 7.出签。", sourceType: "official", sourceUrl: "https://www.ucas.com/", tags: ["申请", "签证"] },
  { title: "留学费用构成", category: "APPLY", content: "留学费用主要包括：1.学费(本科/硕士每年约15-40万人民币) 2.生活费(每年约10-20万) 3.申请费/考试费 4.签证费 5.机票和前期费用。总预算：英国本科3年约80-150万，美国本科4年约150-250万。", sourceType: "official", sourceUrl: "https://www.britishcouncil.org/", tags: ["留学费用"] },
  { title: "选校定位的梯度策略", category: "APPLY", content: "选校梯度：冲刺校(2-3所)：比当前背景稍高。匹配校(3-4所)：和背景匹配。保底校(1-2所)：肯定能上的。不要全申冲刺校，也不要全申保底校，要有梯度。", sourceType: "official", sourceUrl: "https://www.commonapp.org/", tags: ["申请", "选校"] },
  { title: "背景提升：什么活动最有价值", category: "APPLY", content: "背景提升不是越多越好，要和申请方向相关。有价值的活动：1.相关科研/项目 2.实习/工作经历 3.竞赛获奖 4.志愿者/社会服务 5.个人作品(艺术/设计类)。质量>数量，深度>广度。", sourceType: "official", sourceUrl: "https://www.commonapp.org/", tags: ["申请", "背景提升"] },
  { title: "面试准备：常见问题与技巧", category: "APPLY", content: "学校面试常见问题：1.为什么选我们学校 2.为什么选这个专业 3.介绍一个你最自豪的项目 4.你的优缺点是什么。技巧：1.提前准备但不要背稿 2.用STAR法则讲经历 3.真诚自信 4.准备反问问题。", sourceType: "official", sourceUrl: "https://www.ox.ac.uk/", tags: ["申请", "面试"] },

  // ===== 六、销售沟通风格与个人IP（10条）=====
  { title: "专业顾问的形象建设", category: "STYLE", content: "专业顾问形象三要素：1.专业感(头像、朋友圈、介绍要专业) 2.可靠感(说到做到，及时回复) 3.亲和力(亲切但不随便)。客户通过你的朋友圈判断你的专业度，用心经营朋友圈就是经营生意。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "个人品牌"] },
  { title: "回复速度与专业感", category: "STYLE", content: "微信回复速度：工作时间内尽量15分钟内回复，即使暂时无法详细回答，也要先回一句「收到，我稍后给您详细解答」。让客户知道你重视他，比秒回但答非所问更重要。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "沟通效率"] },
  { title: "文字沟通的语气把握", category: "STYLE", content: "文字沟通语气：专业但不生硬，亲切但不随便。多用「您」，少用「啊」「哦」等语气词。重要信息用分段，不要一大段文字。适当用表情符号但不要过多，保持专业感。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "文字沟通"] },
  { title: "不同类型客户的沟通风格调整", category: "STYLE", content: "D型客户(老板型)：直接、高效、讲结果。I型客户(社交型)：热情、有趣、讲故事。S型客户(稳健型)：耐心、详细、给安全感。C型客户(分析型)：数据、逻辑、讲细节。不同人说不同话。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "客户类型"] },
  { title: "销售中的「多问少说」原则", category: "STYLE", content: "好的销售：70%时间在听，30%时间在说。说的部分里，提问比陈述多。多问：您现在的情况是？您最关心的是什么？您期望达到什么效果？问对了，客户自己就会说服自己。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "沟通技巧"] },
  { title: "建立长期客户关系的秘诀", category: "STYLE", content: "长期客户关系秘诀：1.真心为客户好(不是为了成交) 2.持续提供价值(即使不买也帮忙) 3.记住客户的细节(孩子名字、目标) 4.定期关心(不是只在要成交时才联系)。把客户当朋友，不是当猎物。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "客户关系"] },
  { title: "销售日记：每天复盘的重要性", category: "STYLE", content: "每天花10分钟写销售日记：1.今天见了哪些客户 2.哪些沟通做得好 3.哪些地方可以改进 4.明天重点跟进谁。坚持一个月，你的销售能力会有明显提升。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "复盘"] },
  { title: "如何应对难缠客户", category: "STYLE", content: "难缠客户类型：1.多疑型：多给证据和案例 2.挑剔型：耐心细致，不抱怨 3.拖延型：给明确的时间节点和提醒 4.砍价型：讲价值不讲价格。原则：不卑不亢，保持专业，情绪稳定。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "难缠客户"] },
  { title: "知识储备：销售要懂多少专业知识", category: "STYLE", content: "教育销售顾问需要懂：1.考试知识(雅思/托福等) 2.申请流程 3.院校信息 4.课程产品 5.行业动态。不需要像老师一样专业，但客户问的问题要能答上来，答不上来要查清楚再回复，不要瞎编。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "专业知识"] },
  { title: "Mandy的个人风格定位建议", category: "STYLE", content: "Mandy风格定位：亲切专业型。既不是高冷的专家，也不是热情的销售。像一个靠谱的姐姐/朋友：懂行、真诚、为你着想。说话温和但有力量，用事实和案例说话，不夸张不推销。", sourceType: "official", sourceUrl: "https://www.gartner.com/", tags: ["风格", "Mandy"] },
];

async function main() {
  const { PrismaClient } = require("./src/generated/prisma");
  const prisma = new PrismaClient();

  let success = 0;
  let failed = 0;

  for (const item of KNOWLEDGE) {
    try {
      await prisma.knowledgeDocument.create({
        data: {
          title: item.title,
          category: item.category,
          content: item.content,
          sourceType: item.sourceType,
          sourceUrl: item.sourceUrl,
          tags: item.tags,
          reviewStatus: "APPROVED",
        },
      });
      success++;
      console.log(`✅ ${item.title}`);
    } catch (e) {
      failed++;
      console.log(`❌ ${item.title}: ${e.message}`);
    }
  }

  console.log(`\n完成：成功 ${success} 条，失败 ${failed} 条，共 ${KNOWLEDGE.length} 条`);
  await prisma.$disconnect();
}

main();
