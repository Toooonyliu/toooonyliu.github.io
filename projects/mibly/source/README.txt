MIBLY · Pittsburgh interactive demo + two HTML presentations
食物、朋友，以及值得留下的日常。

New presentation entry points
Product story: http://127.0.0.1:4173/slides/product.html (7 slides, 3:30 rehearsal target)
AI design process: http://127.0.0.1:4173/slides/process.html (6 slides, 2:30 rehearsal target)
Click the cover to start counting. Use arrow keys or the footer to advance.
N opens speaker notes with timings and sources. F enters full screen.
Pause/resume, Finish and Reset control the elapsed timer; slides never auto-advance.
The embedded phones are interactive and use temporary state, separate from the main app.
The decks are recording aids, not exported video files. No video has been recorded or submitted.

New name and real photos
The current working name is Mibly. Existing storage keys are kept for compatibility.
All 11 designer-supplied photos have web copies in public/assets/meals, with provenance in credits.json.
Featured meals show Kura Sushi, The Speckled Egg, Meat & Potatoes and home cooking.
Exact Korean BBQ and nasi lemak locations are deliberately unset. Restaurant branches are demo scenarios.
Original photos remain unchanged in ../Photo References. Existing user uploads are preserved.
Avatars, the illustrated map and older restaurant-catalog images remain illustrative.

本地预览
http://127.0.0.1:4173/?iteration=5

已实现
• Chat仅保留底部主入口。首页右上方改为好友中心：搜索、发现、申请、我的好友。
• 支持发送/撤回申请、接受/拒绝示例申请；待接受不会解锁好友专属内容。可接受Priya的示例申请完成演示。
• 首页“我的朋友”下拉可切换“朋友的朋友”，地图和动态共享范围。后者仅显示有共同好友、主动开放的已知餐厅动态；不显示住家、外卖或私人记录。
• Feed支持今天/本周/全部、单人历史、每次加载更多6条；支持隐藏某人的动态及在好友中心恢复。
• 发布餐厅动态时，可独立选择向朋友的朋友开放，默认关闭。
• 餐厅详情直接打开Google Maps/路线、复制地址、分享餐厅和导出TXT。系统分享不可用时复制餐厅文字与地图链接；复制被拒绝则显示可手动复制的文字。取消分享不会另做操作。
• 首页默认是全屏插画地图：朋友头像＋食物照片＋用餐地点＋时间。支持拖动、双指/滚轮/按钮缩放、回到中心、今天/昨天切换。
• 五个主入口：Home、Chat、中央Capture、Memories、Profile；Home内可切换照片动态。
• 只填食物名称和感受即可发布；照片上传/压缩、餐厅/自炊/外卖、朋友/仅自己可见为可选项。
• Chat聚合具体餐食的本地回复；餐食详情支持持久化表情回应、收藏与给指定朋友的本地模拟推荐。
• Profile下“Help me pick a place”保留餐厅选择器：朋友经历/自己的记录、菜品预算、区域筛选与备选。
• Memories独立入口：Moments照片网格、Calendar多餐日历、Recaps月度手动幻灯片。无照片记录也会保留。
• Profile：个人照片、今日餐食、记录统计、收藏地点和选餐厅入口。
• 收藏地点、自定义名单、名单成员整理。
• 不需登录的公开名单快照、Google Maps外链、导出名单PNG。
• English/中文切换，iPhone/Pixel 10预览，本地浏览器持久保存，重置演示。

本轮建议演示路径（约3分钟）
1. 首页右上角添加朋友 → 搜索Chloe → 加好友/撤回；再搜索Priya → 接受，回地图查看新好友。
2. 首页“我的朋友” → “朋友的朋友” → 在Map/Feed之间切换，查看“Through Maya”等共同好友提示。
3. 回到“我的朋友” → 点Maya地图标记 → See all Maya’s posts；清除人名筛选 → Load more查看历史。
4. 打开Kura Revolving Sushi Bar餐厅 → Copy address、Share restaurant、Export address；Open Google Maps与Directions为真实外链。
5. Capture → Restaurant → 选餐厅，查看默认关闭的朋友的朋友可见选项；改成在家/仅自己可见后该选项消失。

保留的演示路径
1. 首页地图拖动、缩放；点Eric看“在家”，点Maya看Kura，点Jordan看Meat & Potatoes。
2. 打开Maya餐食详情，回应并问一个具体问题；到Chat查看刚才的回复。
3. 中央Capture → 试用示例照片 → 食物名称、体验、地点 → 发布；地图选中新餐食，刷新后仍在。
4. 发布另一条“仅自己可见”的餐食：进入Memories，确认不会出现在公开地图。
5. Memories → Calendar → 上一个月 → 2026年9月25日，查看当天三餐；Recaps查看月度幻灯片。
6. Profile → Saved places或Help me pick a place，查看保留的收藏/选餐厅功能。
7. Profile右上角设置：切换中文，查看模拟数据说明；右上方设备切换器可预览Pixel。

实现边界
这是前端课堂演示。人物、用餐经历与朋友关系为虚构示例，不向真实用户发消息。动态照片由设计者提供，不代表照片中人物的身份。
原有餐厅身份与地址来自product/pittsburgh-demo-venues.json所列来源；新餐厅来源见public/assets/meals/credits.json。旧餐厅目录图片仍为AI示意，不是餐厅官方照片。
价格是观察到的菜单单品示例，非整餐费用、实时价格或营业保证。
Today使用透明规则；区域筛选已实现，精确距离/路线和训练个性化模型未接入。
发布、好友申请、回复、名单与定向推荐仅保存在当前浏览器。更换浏览器不会自动同步个人数据。加好友没有真实服务端，也不会自动模拟对方接受。
人物搜索仅覆盖演示目录；未接入通讯录、真实用户名搜索、邀请或账号注册。
朋友的朋友权限为前端演示筛选，不是服务端安全措施；正式版本须在服务端强制验证关系与受众。
直接分享餐厅生成的是Google Maps外链，可脱离本地演示使用；不包含作者、私人餐食或住家地址。
公开分享URL包含所选地点ID、公开标题与留言快照，不含私人对话。它不支持实时更新或撤销。
本机localhost链接可在本机新浏览器打开；给其他人远程访问需要之后部署到网站。

地图与Google Maps
Friends Map为无需Key即可使用的演示地图，显示今天/昨天主动发布的餐食地点，不是实时位置。
插画地形和标记坐标均为演示构图，并非准确地理位置。餐厅名称对应真实餐厅，在家标记不显示住址。
其他地点使用动态中提供的名称；未填写地点不生成空间标记，仍可从朋友栏打开记录。外卖不会自动推断成在家。
餐厅列表仍可跳转Google Maps查看真实地址和路线。
相机按钮打开照片上传/示例图表单，不是原生双摄拍摄。头像叠图是作者信息，不是同时拍摄的自拍。
Chat/回应仅为本地状态；Recaps是可前后翻页的记录回顾，不是生成视频。

开发与文件
src/Prototype.tsx：页面与交互；src/prototype.css：应用视觉。
src/data.ts：数据与双语标签；src/FriendsMap.tsx和src/map.css：交互式插画地图。
src/SocialViews.tsx和src/social.css：Chat、Memories、Profile与五入口视觉。
src/socialGraph.ts：关系状态与可见性；src/People.tsx：好友中心；src/VenueActions.tsx：餐厅分享/地址；src/community.css：本轮视觉。
public/assets/food/：图片素材与部分生成提示词。
保留了模板的设备外壳、键盘、安全区域和滚动物理。
安装依赖：npm ci；开发：npm run dev -- --host 127.0.0.1 --port 4173；构建：npm run build。
构建输出dist/client为可托管静态HTML/CSS/JS目录，需HTTP服务器提供访问，而非双击file://。

验证
scripts/verify-social-map.mjs：13组地图、导航、回应与截图检查。
scripts/verify-social-flows.mjs：9组发布持久化、隐私、回复、日历、回顾、触屏、设备和语言检查。
scripts/test-social-graph.mjs：17条关系/权限断言（先将socialGraph.ts和data.ts编译至临时CommonJS目录，再将该目录作为参数）。
scripts/verify-community.mjs：10组好友、扩圈、历史、餐厅地址与降级行为检查。
scripts/verify-discovery-consent.mjs：6组发布受众、空地图和访客餐厅检查。
qa/iteration5-*.png：本轮截图；iteration5-regression-*为保留功能回归。真实手机系统分享需另做真机测试。
../product/food-reals-iteration-5.html：流程分析、边界清单、前后截图和实现说明。
