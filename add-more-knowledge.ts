import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      "postgresql://postgres.npylkrsppckumxbnoyez:EZjttGC2v9RviU0m@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
  }),
});

const NEW_KNOWLEDGE = [
  // ===== 销售理论与模型（10条）=====
  {
    title: "MEDDIC销售资格框架",
    category: "SALES",
    content:
      "MEDDIC框架：Metrics(量化指标)、Economic Buyer(经济决策者)、Decision Criteria(决策标准)、Decision Process(决策流程)、Identify Pain(痛点识别)、Champion(内部支持者)。高客单价B2B销售的经典框架，教育咨询中用于判断复杂家庭决策的关键人和决策逻辑。",
    sourceType: "official",
    tags: ["销售理论", "MEDDIC", "客户资格"],
  },
  {
    title: "挑战者销售模型：The Challenger Sale",
    category: "SALES",
    content:
      "挑战者销售理论将销售分为五类：勤奋工作者、孤独狼、关系建立者、问题解决者、挑战者。研究发现表现最好的是挑战者：他们能提供独特视角、擅长对话掌控、懂得客户业务、敢于推动客户。教育顾问不能只做关系型销售，要做能给客户带来新认知的专业挑战者。",
    sourceType: "official",
    tags: ["销售理论", "挑战者销售"],
  },
  {
    title: "价值销售三角：产品-需求-价值",
    category: "SALES",
    content:
      "价值销售的核心逻辑：客户买的不是产品本身，而是产品带来的价值。三角关系：1.产品特性(我们有什么) 2.客户需求(客户要什么) 3.转化价值(能带来什么结果)。介绍产品时不要只讲功能，要讲这个功能如何解决客户的具体问题、带来什么具体好处。",
    sourceType: "official",
    tags: ["销售理论", "价值销售"],
  },
  {
    title: "GROW教练模型在销售沟通中的应用",
    category: "SALES",
    content:
      "GROW模型：Goal(目标)、Reality(现状)、Options(选项)、Will(行动意愿)。原本是教练技术，用在销售沟通中：先帮客户理清目标，再分析现状差距，再给出可选方案，最后确认行动。教育咨询本质是顾问+教练，不是硬推产品。",
    sourceType: "official",
    tags: ["销售理论", "GROW模型", "教练式销售"],
  },
  {
    title: "认知失调理论与客户说服",
    category: "SALES",
    content:
      "费斯廷格认知失调理论：当人的行为和认知不一致时会产生不适感，并有动力调整认知来匹配行为。销售应用：1.让客户先做出小承诺(如预约咨询)，后续更容易保持一致 2.指出客户「想上好学校」和「还没开始规划」之间的失调，推动行动。",
    sourceType: "official",
    tags: ["销售理论", "心理学", "认知失调"],
  },
  {
    title: "互惠原理：先给予再获取",
    category: "SALES",
    content:
      "西奥迪尼六大原理之一：人受到恩惠后会有回报的心理倾向。销售中先提供免费价值：免费评估、资料包、公开课、干货文章，客户会产生亏欠感，后续更愿意听你的建议。注意：给予要真诚，不能带着强烈的功利心，客户能感受到。",
    sourceType: "official",
    tags: ["销售理论", "影响力", "互惠原理"],
  },
  {
    title: "承诺和一致原理",
    category: "SALES",
    content:
      "人一旦做出承诺，就会倾向于保持行为和承诺一致，尤其是书面或公开承诺。销售应用：让客户逐步做出小承诺——预约时间、填写信息、参加评估，每一步小承诺都会让客户更投入，最终成交概率更高。不要一上来就要求大承诺，从小处开始。",
    sourceType: "official",
    tags: ["销售理论", "影响力", "承诺一致"],
  },
  {
    title: "喜好原理：人们愿意答应自己喜欢的人",
    category: "SALES",
    content:
      "客户更容易从喜欢的人那里买东西。提升好感的因素：外表吸引力、相似性(找到共同点)、赞美、熟悉感、积极关联。销售中：真诚赞美客户、找到共同话题、保持专业亲和的形象、多接触建立熟悉感。但真诚是基础，不能虚伪讨好。",
    sourceType: "official",
    tags: ["销售理论", "影响力", "喜好原理"],
  },
  {
    title: "权威原理：专业感的建立",
    category: "SALES",
    content:
      "人会本能服从权威。专业权威的三个信号：1.头衔和身份(资深顾问、行业经验) 2.外在标识(专业着装、正式资料) 3.专业言行(数据、案例、专业术语准确使用)。教育顾问要建立专业权威，但不能装腔作势，真正的专业是把复杂问题讲清楚。",
    sourceType: "official",
    tags: ["销售理论", "影响力", "权威原理"],
  },
  {
    title: "客户旅程地图：从认知到忠诚",
    category: "SALES",
    content:
      "客户旅程分为：认知阶段(知道有问题)、考虑阶段(寻找解决方案)、决策阶段(选择供应商)、服务阶段(使用产品)、忠诚阶段(复购和转介绍)。每个阶段客户的需求和心态不同，对应不同的沟通策略和内容，不能用一套话术应对所有阶段。",
    sourceType: "official",
    tags: ["销售理论", "客户旅程"],
  },

  // ===== 话术与实战技巧（10条）=====
  {
    title: "价格异议处理：价值重构法",
    category: "SALES",
    content:
      "客户说贵的时候，不要直接降价，先重构价值：1.拆分价格(总费用拆分到每个月/每课时，显得可承受) 2.对比价值(对比gap一年的时间成本、试错成本) 3.强调结果(拿到offer的长期回报)。例：「看起来是一笔投入，但和晚一年申请的时间成本比，其实是更划算的选择。」",
    sourceType: "official",
    tags: ["话术", "价格异议", "异议处理"],
  },
  {
    title: "「我再考虑考虑」的应对话术",
    category: "SALES",
    content:
      "客户说考虑考虑，通常是有顾虑没说出来。应对：「完全理解，这么重要的决定确实要慎重。方便问一下，您主要是哪方面还在犹豫呢？是时间安排、费用，还是还有其他担心？」——把模糊的「考虑」拆解成具体问题，能解答就解答，不能解答也知道卡在哪。",
    sourceType: "official",
    tags: ["话术", "异议处理", "成交"],
  },
  {
    title: "FABE产品介绍法",
    category: "SALES",
    content:
      "FABE话术框架：Feature(特性)、Advantage(优势)、Benefit(利益)、Evidence(证据)。介绍任何产品/服务都按这个逻辑：我们有什么(特性)→和别人比好在哪(优势)→对您有什么用(利益)→有什么证明(案例/数据)。不要只讲特性，重点是客户能得到的利益和证据。",
    sourceType: "official",
    tags: ["话术", "FABE", "产品介绍"],
  },
  {
    title: "电话/语音首通的30秒开场法则",
    category: "SALES",
    content:
      "首次通话前30秒决定客户会不会继续听。结构：1.自我介绍(我是谁) 2.来意说明(为什么联系您) 3.价值点(对您有什么用) 4.时间确认(现在方便吗)。例：「您好，我是Mandy，您之前在我们公众号留了资料想了解留学规划，我这边有几个和您情况类似的案例，想跟您简单同步一下，大概5分钟，现在方便吗？」",
    sourceType: "official",
    tags: ["话术", "电话沟通", "开场"],
  },
  {
    title: "倾听的三个层次：听内容、听情绪、听需求",
    category: "SALES",
    content:
      "初级销售只会说，顶级销售更会听。三层倾听：1.听内容(客户在说什么事实) 2.听情绪(客户的感受和担忧) 3.听潜台词(真正的需求是什么)。客户说「我再和孩子商量」，内容是商量，情绪可能是不确定，潜台词可能是还没被说服。",
    sourceType: "official",
    tags: ["话术", "倾听", "沟通技巧"],
  },
  {
    title: "成交假设法：假设客户已经决定",
    category: "SALES",
    content:
      "当客户发出明确成交信号时，可以用假设成交法，直接讨论后续细节：「那我先帮您把名额占上，您这边是微信还是支付宝方便？我把合同和资料发您。」不要问「您要不要报名」，而是问「您选哪个时间/哪个方式」，前提是客户已经有明显意向，不能乱用。",
    sourceType: "official",
    tags: ["话术", "成交技巧"],
  },
  {
    title: "二选一成交法",
    category: "SALES",
    content:
      "给客户两个肯定的选择，而不是问要不要。例：不要问「您要不要预约」，要问「您看周六上午还是周日下午方便？」两个选项都是你想要的结果，客户更容易做出决定。注意选项不要太多，两个最佳，太多反而选择困难。",
    sourceType: "official",
    tags: ["话术", "成交技巧"],
  },
  {
    title: "沉默成交法：学会留白",
    category: "SALES",
    content:
      "抛出关键问题或报价后，学会保持沉默。很多销售怕冷场，客户还没说话就自己先降价或者补充一堆，反而被动。规则：谁先开口谁让步。问完「您看这样可以吗」之后，安静等客户回应，哪怕沉默有点尴尬，也要等。",
    sourceType: "official",
    tags: ["话术", "成交技巧", "谈判"],
  },
  {
    title: "客户抱怨的处理：先处理情绪再处理事情",
    category: "SALES",
    content:
      "客户有情绪抱怨时，先不要讲道理和解释。步骤：1.倾听不打断 2.共情道歉(「让您有不好的体验，真的很抱歉」) 3.确认问题(「我跟您确认一下情况是...对吗」) 4.给出方案 5.跟进确认。情绪没处理好的时候，道理讲得再对也听不进去。",
    sourceType: "official",
    tags: ["话术", "客户投诉", "情绪处理"],
  },
  {
    title: "总结确认话术：确保沟通没有偏差",
    category: "SALES",
    content:
      "每次重要沟通结束前，做总结确认：「我跟您确认一下今天聊的内容：第一...第二...第三...，您看有没有遗漏或者理解不对的地方？」好处：1.避免信息偏差 2.让客户觉得你认真专业 3.再次强化共识 4.自然引出下一步行动。",
    sourceType: "official",
    tags: ["话术", "沟通技巧"],
  },

  // ===== 风格与个人品牌（5条）=====
  {
    title: "专业顾问的语言风格：简洁、具体、有温度",
    category: "STYLE",
    content:
      "好的顾问语言三个特点：1.简洁(不说废话，重点突出) 2.具体(不说空话，用数据和案例) 3.有温度(不是冷冰冰的机器，有同理心)。避免：过多专业术语让客户听不懂、长篇大论没有重点、过于官方没有人情味。",
    sourceType: "official",
    tags: ["风格", "语言风格"],
  },
  {
    title: "文字沟通的标点与排版规范",
    category: "STYLE",
    content:
      "微信文字沟通排版影响专业感：1.分段，每段不超过3行，不要一大块文字 2.适当用序号1.2.3.，清晰明了 3.感叹号不要太多，显得不稳重 4.少用夸张表情，专业场合克制 5.重要信息可以加粗，但不要满屏加粗。",
    sourceType: "official",
    tags: ["风格", "排版", "微信沟通"],
  },
  {
    title: "不同代际客户的沟通风格调整",
    category: "STYLE",
    content:
      "70后家长：尊重权威、看重经验和资历、沟通偏正式，多讲案例和数据。80后家长：理性务实、看重专业和效率、喜欢有逻辑的沟通，不要太多套路。90后客户：更平等直接、看重真诚和共鸣、接受度高，不要端着，像朋友一样沟通。",
    sourceType: "official",
    tags: ["风格", "客户类型", "沟通风格"],
  },
  {
    title: "专业自信的语气养成：不卑不亢",
    category: "STYLE",
    content:
      "顾问的语气要自信但不傲慢，亲和但不卑微。避免：过度讨好(「求求您考虑一下」)、含糊不确定(「大概可能也许是」)、强势压迫(「你必须现在定」)。正确姿态：我是帮你解决问题的专业顾问，我们是平等的，我提供专业建议，决定权在你。",
    sourceType: "official",
    tags: ["风格", "语气", "专业感"],
  },
  {
    title: "个人品牌的一致性原则",
    category: "STYLE",
    content:
      "个人品牌的核心是一致性：线上线下一致、朋友圈和私聊一致、说的和做的一致。客户接触你的每个触点——头像、昵称、朋友圈、沟通语气、专业度——都要传递统一的形象。今天一个风格明天一个风格，客户无法建立信任。",
    sourceType: "official",
    tags: ["风格", "个人品牌"],
  },
];

async function main() {
  let success = 0;
  let failed = 0;

  for (const item of NEW_KNOWLEDGE) {
    try {
      await prisma.knowledgeDocument.create({
        data: {
          title: item.title,
          category: item.category,
          content: item.content,
          sourceType: item.sourceType,
          tags: item.tags,
          reviewStatus: "APPROVED",
        },
      });
      success++;
      console.log(`✅ ${item.title}`);
    } catch (e) {
      failed++;
      console.log(`❌ ${item.title}: ${(e as Error).message}`);
    }
  }

  console.log(`\n新增完成：成功 ${success} 条，失败 ${failed} 条`);

  // 统计总数
  const total = await prisma.knowledgeDocument.count();
  console.log(`知识库总数：${total} 条`);

  // 销售+风格统计
  const salesCount = await prisma.knowledgeDocument.count({
    where: { category: { in: ["SALES", "STYLE"] } },
  });
  console.log(`销售理论+话术风格：${salesCount} 条`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
