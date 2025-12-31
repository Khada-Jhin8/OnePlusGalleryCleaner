#### 简介 / Introduction 这是一个专为一加云服务（H2OS Cloud）相册设计的 Chrome 扩展程序，旨在解决官方网页端不支持“一键清空所有照片”以及“虚拟滚动列表难以批量操作”的痛点。本脚本通过模拟人工操作，实现了稳定、无人值守的批量删除功能。

##### 核心痛点解决方案 / Key Solutions

✅ 解决虚拟滚动漏选 (Fix Virtual Scrolling)

问题：网页采用 Virtual List 技术，DOM 中只存在当前视口的照片，传统全选脚本无效。

方案：采用“分批循环（Batch Cycle）”策略，删除当前可见图片后自动等待列表上浮，直至清空。

✅ 解决高频操作掉线 (Fix Session Timeout/Logout)

问题：快速大批量提交删除请求会触发 WAF 风控，导致 Token 失效跳转登录页。

方案：引入“冷却机制”，删除一批后强制休眠 5 秒；且在确认删除前增加 1.5 秒“思考时间”。

✅ 解决幽灵按钮冲突 (Fix Ghost Button Conflict)

问题：确认弹窗层下隐藏着一个同 class 的“重新登录”按钮，普通脚本容易误点。

方案：使用 innerText 文本精准匹配 + offsetParent 可见性检测，精准锁定真正的“确认删除”按钮。

✅ 绕过脚本检测 (Anti-Bot)

方案：使用 mousedown -> mouseup -> click 完整事件链，并引入坐标随机偏移，模拟真实人类点击行为。

功能特性 / Features

可视UI：可拖拽的控制面板 + 屏幕中央实时状态遮罩。

安全保护：连续 5 次空转自动停止，防止脚本死循环。

精准定位：自动计算容器靶心坐标，确保滚动事件生效。

安装说明 / Installation

下载本项目代码。

打开 Chrome 浏览器 chrome://extensions/，开启“开发者模式”。

点击“加载已解压的扩展程序”，选择本目录。

访问 cloud.h2os.com 即可使用。
