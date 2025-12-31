// --- 配置参数 ---
const CONFIG = {
    // 容器相关
    targetContainer: '#scrollbar', 
    checkboxSelector: 'input[name="photoCheck"]',
    
    // 按钮选择器 (我们会结合文字判断，不用担心重名)
    deleteBtnSelector: '.active.delete',      
    confirmBtnSelector: '.yunAlertBut .confirm', 
    
    // --- 时间配置 ---
    checkInterval: 50,     // 勾选间隔
    confirmDelay: 1500,    // 弹出确认框后的等待时间
    pressDelay: 100,       // 鼠标按下的时长
    batchWaitTime: 5000,   // 每轮删除后的冷却时间
    scrollDuration: 1000,  
    
    maxRetries: 5 
};

// --- 全局状态 ---
let isRunning = false;
let emptyRoundCounter = 0;

// --- 1. UI 界面 ---
function createControlPanel() {
    const existing = document.getElementById('text-match-panel');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'text-match-panel';
    div.innerHTML = `
        <div id="panel-header" style="cursor: move; padding: 10px; background: #009688; color: white; border-radius: 8px 8px 0 0; font-weight: bold; font-size: 14px; user-select: none;">
            🔍 一加云相册删除助手
        </div>
        <div style="padding: 15px;">
            <div id="helper-status" style="margin-bottom:15px; color:#333; font-size:12px; line-height:1.5;">
                准备就绪 - 模拟真人模式
            </div>
            <button id="btn-start" class="helper-btn start">开始任务</button>
            <button id="btn-stop" class="helper-btn stop" style="display:none;">停止</button>
        </div>
    `;
    document.body.appendChild(div);

    const overlay = document.createElement('div');
    overlay.id = 'status-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 20px 40px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 2147483647;
        display: none;
        pointer-events: none;
        text-align: center;
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-start').onclick = startCycle;
    document.getElementById('btn-stop').onclick = stopCycle;

    makeDraggable(div);
}

// 拖拽逻辑
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById("panel-header");
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = 'auto'; 
        element.style.right = 'auto';
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function updateStatus(text) {
    const el = document.getElementById('helper-status');
    if (el) el.innerHTML = text;
}

function showOverlay(text) {
    const el = document.getElementById('status-overlay');
    if (el) {
        if(text) {
            el.innerHTML = text;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
}

function stopCycle() {
    isRunning = false;
    document.getElementById('btn-start').style.display = 'block';
    document.getElementById('btn-stop').style.display = 'none';
    showOverlay(false);
    updateStatus("已手动停止。");
}

// --- 2. 核心循环逻辑 ---
async function startCycle() {
    isRunning = true;
    emptyRoundCounter = 0;
    
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-stop').style.display = 'block';
    
    const container = document.querySelector(CONFIG.targetContainer);
    if (!container) {
        alert("错误：未找到图片列表容器。");
        stopCycle();
        return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    while (isRunning) {
        showOverlay("👀 扫描勾选...");
        const selectedCount = await selectVisibleItems();
        
        if (selectedCount > 0) {
            emptyRoundCounter = 0;
            
            // 执行物理点击删除
            const success = await performHumanDelete();
            
            if (success) {
                // 如果成功找到了按钮并点击，进入冷却
                let waitTime = CONFIG.batchWaitTime / 1000;
                for(let i=waitTime; i>0; i--) {
                    if(!isRunning) break;
                    showOverlay(`⏳ 冷却防封... ${i}s`);
                    await sleep(1000);
                }
            } else {
                // 如果没找到按钮，可能是弹窗还没出来，稍作等待重试
                showOverlay("⚠️ 未定位到确认按钮，重试...");
                await sleep(2000);
            }
            
        } else {
            emptyRoundCounter++;
            showOverlay(`⬇️ 滚动寻找... (${emptyRoundCounter})`);
            await scrollDown(container, centerX, centerY);
            await sleep(1200);

            if (emptyRoundCounter >= CONFIG.maxRetries) {
                showOverlay(false);
                alert("任务完成！");
                stopCycle();
                break;
            }
        }
    }
}

// --- 3. 核心功能函数 ---

// 勾选当前可见
async function selectVisibleItems() {
    const inputs = document.querySelectorAll(CONFIG.checkboxSelector);
    let count = 0;
    for (let input of inputs) {
        if (!isRunning) break;
        if (!input.checked) {
            input.click(); 
            await sleep(CONFIG.checkInterval); 
        }
    }
    const checked = document.querySelectorAll(`${CONFIG.checkboxSelector}:checked`);
    return checked.length;
}

/**
 * 核心：模拟真实人类鼠标点击
 */
async function simulateHumanClick(element) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    // 随机偏移，避免只点正中心
    const randX = Math.random() * (rect.width - 10) + 5;
    const randY = Math.random() * (rect.height - 10) + 5;
    const clientX = rect.left + randX;
    const clientY = rect.top + randY;

    const commonOptions = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: clientX,
        clientY: clientY,
        button: 0 
    };

    element.dispatchEvent(new MouseEvent('mousemove', commonOptions));
    await sleep(30);
    element.dispatchEvent(new MouseEvent('mousedown', commonOptions));
    await sleep(CONFIG.pressDelay + Math.random() * 50);
    element.dispatchEvent(new MouseEvent('mouseup', commonOptions));
    element.dispatchEvent(new MouseEvent('click', commonOptions));
}

// 执行删除流程 (精准定位修复版)
async function performHumanDelete() {
    if (!isRunning) return false;

    // 1. 点击顶部的删除图标
    const deleteBtn = document.querySelector(CONFIG.deleteBtnSelector);
    if (deleteBtn) {
        await simulateHumanClick(deleteBtn);
        showOverlay("等待弹窗...");
    } else {
        return false;
    }

    // 等待弹窗完全渲染
    await sleep(CONFIG.confirmDelay); 

    // 2. 寻找确认按钮（修复核心：遍历查找含“确认删除”文字且可见的按钮）
    const allConfirmBtns = document.querySelectorAll(CONFIG.confirmBtnSelector);
    let targetBtn = null;

    for (let btn of allConfirmBtns) {
        // 条件1: 按钮内包含 "确认删除" 文字
        const textMatch = btn.innerText.includes("确认删除");
        
        // 条件2: 按钮必须是可见的 (offsetParent 不为 null 代表元素在页面上可见)
        // 注意：display:none 的元素 offsetParent 为 null
        const isVisible = btn.offsetParent !== null;

        if (textMatch && isVisible) {
            targetBtn = btn;
            break; // 找到了，就是它
        }
    }

    if (targetBtn) {
        console.log("找到确认删除按钮:", targetBtn);
        // 使用物理模拟点击
        await simulateHumanClick(targetBtn);
        showOverlay("已点击确认...");
        return true;
    } else {
        console.warn("未找到包含'确认删除'的可见按钮。可能找到了:", allConfirmBtns.length, "个同名按钮，但都不符合条件。");
        return false;
    }
}

// 模拟滚轮
async function scrollDown(element, x, y) {
    const startTime = Date.now();
    while (isRunning && (Date.now() - startTime < CONFIG.scrollDuration)) {
        const event = new WheelEvent('wheel', {
            deltaY: 100,
            deltaMode: 0,
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
        const inner = document.querySelector('.scrollbar_container');
        if(inner) inner.dispatchEvent(event);
        await sleep(30);
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- 4. 样式 ---
const style = document.createElement('style');
style.textContent = `
    #text-match-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 220px;
        background: white;
        border: 1px solid #ccc;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2147483646;
        border-radius: 8px;
        font-family: sans-serif;
    }
    .helper-btn {
        width: 100%;
        padding: 10px;
        margin-top: 5px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        color: white;
        font-size: 14px;
    }
    .helper-btn.start { background-color: #009688; } 
    .helper-btn.stop { background-color: #f44336; }
`;
document.head.appendChild(style);

createControlPanel();