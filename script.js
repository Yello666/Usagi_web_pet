// 状态枚举
const PetState = {
    IDLE: 'idle',
    MOVING: 'moving',
    FALLING: 'falling',
    DRAGGED: 'dragged',
    RESISTING: 'resisting',
    ESCAPING: 'escaping',
    SLEEPING: 'sleeping',
    PLAYING: 'playing',
    EATING: 'eating'
};

const PetBehavior = {
    WALK: 'walk',
    JUMP: 'jump',
    SLEEP: 'sleep',
    BUTTERFLY: 'butterfly',
    GREET: 'greet',
    EAT: 'eat',
    TIME: 'time'
};

// 主应用类
class UsagiWebPet {
    constructor() {
        this.state = PetState.IDLE;
        this.position = { x: 0, y: 0 };
        this.velocity = { dx: 1, dy: 1 };
        this.speed = 2;
        this.isDragging = false;
        this.dragStartTime = 0;
        this.dragTimeout = null;
        this.behaviorInterval = null;
        this.movementInterval = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupComponents();
        this.startFallingAnimation();
        this.startBehaviorScheduler();
        
        // 显示欢迎消息
        setTimeout(() => {
            this.bubbleSystem.show('乌拉！我是乌萨奇！', 3000);
        }, 3000);
    }

    setupElements() {
        this.pet = document.getElementById('usagi-pet');
        this.image = document.getElementById('usagi-image');
        this.bubble = document.getElementById('usagi-bubble');
        this.bubbleText = this.bubble.querySelector('.bubble-text');
        this.settingsCard = document.getElementById('settings-card');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.container = document.getElementById('usagi-container');
        this.backgroundLayer = document.getElementById('usagi-background');
        this.bgUpload = document.getElementById('bg-upload');
        this.bgReset = document.getElementById('bg-reset');
        this.bgList = document.getElementById('bg-list');
        this.bgPreview = document.getElementById('bg-preview');
        this.bgConfirm = document.getElementById('bg-confirm');
        if (this.image) {
            this.image.onerror = () => { this.image.src = 'images/stand_no_bg.png'; };
        }
        this.movementPausedUntil = 0;
        this.movementResumeTimeout = null;
        this.backgrounds = [];
        this.selectedBackground = null;
        this.activeBackground = null;
    }

    setupEventListeners() {
        // 宠物交互事件
        this.pet.addEventListener('click', (e) => this.handleClick(e));
        this.pet.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        this.pet.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // 拖拽事件
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // 设置面板事件
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        
        // 动作按钮事件
        const actionButtons = this.settingsCard.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.triggerAction(action);
            });
        });

        if (this.bgUpload) {
            this.bgUpload.addEventListener('change', (e) => this.handleUploadBackground(e));
        }
        if (this.bgReset) {
            this.bgReset.addEventListener('click', () => this.resetBackground());
        }
        if (this.bgConfirm) {
            this.bgConfirm.addEventListener('click', () => this.confirmBackground());
        }

        // 窗口大小改变事件
        window.addEventListener('resize', () => this.handleResize());
    }

    setupComponents() {
        this.bubbleSystem = new BubbleSystem(this.pet, this.bubble, this.bubbleText);
        this.boundaryDetector = new BoundaryDetector();
        this.interactionHandler = new InteractionHandler(this);
        this.loadBackgrounds();
        const saved = localStorage.getItem('usagi_active_background');
        if (saved) {
            this.activeBackground = saved;
            this.applyBackground(saved);
        }
    }

    // 掉落动画
    startFallingAnimation() {
        this.state = PetState.FALLING;
        const startY = -80;
        const endY = window.innerHeight - 160;
        const startX = Math.random() * (window.innerWidth - 80);
        
        this.position.x = startX;
        this.position.y = startY;
        this.pet.style.left = startX + 'px';
        this.pet.style.top = startY + 'px';
        
        const duration = 2000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentY = startY + (endY - startY) * easeOut;
            
            this.position.y = currentY;
            this.pet.style.top = currentY + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.state = PetState.IDLE;
                if (this.image) this.image.src = 'images/stand_no_bg.png';
                this.startRandomMovement();
            }
        };
        
        animate();
    }

    // 随机移动
    startRandomMovement() {
        if (this.movementInterval) {
            clearInterval(this.movementInterval);
        }
        
        this.movementInterval = setInterval(() => {
            if (this.state === PetState.IDLE && !this.isDragging) {
                this.moveRandomly();
            }
        }, 3000);
    }

    moveRandomly() {
        this.state = PetState.MOVING;
        
        // 随机方向和速度
        const angle = Math.random() * 2 * Math.PI;
        const distance = 50 + Math.random() * 100;
        const duration = 2000 + Math.random() * 2000;
        
        const targetX = this.position.x + Math.cos(angle) * distance;
        const targetY = this.position.y + Math.sin(angle) * distance;
        
        this.moveTo(targetX, targetY, duration, () => {
            this.state = PetState.IDLE;
        });
    }

    moveTo(targetX, targetY, duration, callback) {
        const startX = this.position.x;
        const startY = this.position.y;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 缓动函数
            const easeInOut = progress < 0.5 
                ? 2 * progress * progress 
                : -1 + (4 - 2 * progress) * progress;
            
            const currentX = startX + (targetX - startX) * easeInOut;
            const currentY = startY + (targetY - startY) * easeInOut;
            
            // 边界检测
            const boundary = this.boundaryDetector.checkBoundary(currentX, currentY, 80);
            
            if (boundary.hit) {
                // 反弹逻辑
                const newX = boundary.boundaries.left ? 30 : 
                           boundary.boundaries.right ? window.innerWidth - 110 : currentX;
                const newY = boundary.boundaries.top ? 30 : 
                           boundary.boundaries.bottom ? window.innerHeight - 110 : currentY;
                
                this.position.x = newX;
                this.position.y = newY;
                this.pet.style.left = newX + 'px';
                this.pet.style.top = newY + 'px';
                
                if (callback) callback();
                return;
            }
            
            this.position.x = currentX;
            this.position.y = currentY;
            this.pet.style.left = currentX + 'px';
            this.pet.style.top = currentY + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        
        animate();
    }

    // 交互处理
    handleClick(e) {
        if (this.isDragging) return;
        
        this.interactionHandler.handleClick(e);
    }

    handleDoubleClick(e) {
        this.interactionHandler.handleDoubleClick(e);
    }

    handleMouseDown(e) {
        if (this.state === PetState.SLEEPING) {
            this.wakeUp();
            this.bubbleSystem.show('哈？！', 2000);
            return;
        }
        
        this.isDragging = true;
        this.dragStartTime = Date.now();
        this.dragOrigin = { x: this.position.x, y: this.position.y };
        this.state = PetState.DRAGGED;
        
        // 显示反抗表情
        this.pet.classList.add('resisting');
        
        // 取消拖拽超时触发逃跑
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        const x = e.clientX - 40;
        const y = e.clientY - 40;
        const boundedX = Math.max(0, Math.min(window.innerWidth - 80, x));
        const boundedY = Math.max(0, Math.min(window.innerHeight - 80, y));
        this.position.x = boundedX;
        this.position.y = boundedY;
        this.pet.style.left = boundedX + 'px';
        this.pet.style.top = boundedY + 'px';
        const dragDuration = Date.now() - this.dragStartTime;
        if (dragDuration > 5000) {
            this.pet.style.transform = `rotate(${(dragDuration - 5000) / 100}deg)`;
        }
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        clearTimeout(this.dragTimeout);
        
        // 重置旋转
        this.pet.style.transform = '';
        this.pet.classList.remove('resisting');
        
        // 保持最终拖动位置为当前状态
        // 暂停自由走动5分钟
        this.pauseFreeMovement(5 * 60 * 1000);
        this.state = PetState.IDLE;
    }

    triggerEscape() {
        if (this.state === PetState.ESCAPING) return;
        
        this.state = PetState.ESCAPING;
        this.pet.classList.remove('resisting');
        
        // 随机逃跑位置
        const escapeX = Math.random() * (window.innerWidth - 80);
        const escapeY = Math.random() * (window.innerHeight - 80);
        
        this.bubbleSystem.show('不要抓我！', 2000);
        
        this.moveTo(escapeX, escapeY, 1000, () => {
            this.state = PetState.IDLE;
        });
    }

    // 行为系统
    triggerAction(action) {
        switch(action) {
            case 'sleep':
                this.sleep();
                break;
            case 'butterfly':
                this.catchButterfly();
                break;
            case 'walk':
                this.startWalking();
                break;
            case 'jump':
                this.jump();
                break;
            case 'greet':
                this.greet();
                break;
            case 'eat':
                this.eat();
                break;
            case 'time':
                this.announceTime();
                break;
            case 'reset':
                this.resetPosition();
                break;
        }
        
        this.toggleSettings();
    }

    sleep() {
        this.state = PetState.SLEEPING;
        if (this.image) this.image.src = 'images/sleep_no_bg.png';
        this.bubbleSystem.show('Zzz...', 3000);
    }

    wakeUp() {
        this.state = PetState.IDLE;
        if (this.image) this.image.src = 'images/stand_no_bg.png';
    }

    catchButterfly() {
        this.state = PetState.PLAYING;
        this.pet.style.animation = 'butterfly 2s ease-in-out';
        this.bubbleSystem.show('蝴蝶好漂亮～', 3000);
        
        setTimeout(() => {
            this.pet.style.animation = '';
            this.state = PetState.IDLE;
        }, 2000);
    }

    startWalking() {
        this.state = PetState.MOVING;
        this.pet.style.animation = 'walk 1s ease-in-out infinite';
        if (this.image) this.image.src = 'images/walk_no_bg.png';
        this.bubbleSystem.show('散步时间～', 2000);
        
        // 随机走动
        const walkDistance = 100 + Math.random() * 200;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const targetX = this.position.x + (walkDistance * direction);
        
        this.moveTo(targetX, this.position.y, 3000, () => {
            this.pet.style.animation = '';
            if (this.image) this.image.src = 'images/stand_no_bg.png';
            this.state = PetState.IDLE;
        });
    }

    jump() {
        this.state = PetState.PLAYING;
        this.pet.style.animation = 'jump 0.8s ease-in-out';
        if (this.image) this.image.src = 'images/stand_no_bg.png';
        this.bubbleSystem.show('跳高高！', 2000);
        
        setTimeout(() => {
            this.pet.style.animation = '';
            if (this.image) this.image.src = 'images/stand_no_bg.png';
            this.state = PetState.IDLE;
        }, 800);
    }

    greet() {
        this.state = PetState.PLAYING;
        if (this.image) this.image.src = 'images/greet_01_no_bg.png';
        this.bubbleSystem.show('你好呀～', 3000);

        setTimeout(() => {
            if (this.image) this.image.src = 'images/greet_02_no_bg.png';
        }, 500);

        setTimeout(() => {
            if (this.image) this.image.src = 'images/stand_no_bg.png';
            this.state = PetState.IDLE;
        }, 1000);
    }

    eat() {
        this.state = PetState.EATING;
        this.bubbleSystem.show('好吃好吃～', 3000);
        if (this.image) this.image.src = 'images/eat_no_bg.png';
        
        // 模拟吃东西动画
        let eatCount = 0;
        const eatAnimation = setInterval(() => {
            this.pet.style.transform = eatCount % 2 === 0 ? 'scale(1.1)' : 'scale(1)';
            eatCount++;
            
            if (eatCount > 6) {
                clearInterval(eatAnimation);
                this.pet.style.transform = '';
                if (this.image) this.image.src = 'images/stand_no_bg.png';
                this.state = PetState.IDLE;
            }
        }, 300);
    }

    announceTime() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        this.bubbleSystem.show(`现在是${hours}点${minutes}分～`, 4000);
    }

    resetPosition() {
        const centerX = (window.innerWidth - 80) / 2;
        const centerY = (window.innerHeight - 80) / 2;
        
        this.moveTo(centerX, centerY, 1000, () => {
            this.bubbleSystem.show('回到中心啦～', 2000);
        });
    }

    // 设置面板
    toggleSettings() {
        const isVisible = this.settingsCard.classList.contains('show');
        
        if (isVisible) {
            this.settingsCard.classList.remove('show');
        } else {
            this.settingsCard.classList.add('show');
            this.bubbleSystem.show('我是设置', 3000);
        }
    }

    loadBackgrounds() {
        const uploadedRaw = localStorage.getItem('usagi_uploaded_backgrounds');
        const uploaded = uploadedRaw ? JSON.parse(uploadedRaw) : [];
        this.backgrounds = [];
        fetch('images/background/index.json').then(r => r.ok ? r.json() : []).then(list => {
            const builtin = Array.isArray(list) ? list : [];
            const builtinItems = builtin.map(src => ({ type: 'builtin', src }));
            this.backgrounds = builtinItems.concat(uploaded);
            this.renderBackgroundList();
        }).catch(() => {
            this.backgrounds = uploaded;
            this.renderBackgroundList();
        });
    }

    renderBackgroundList() {
        if (!this.bgList) return;
        this.bgList.innerHTML = '';
        this.backgrounds.forEach((bg, idx) => {
            const item = document.createElement('div');
            item.className = 'bg-thumb';
            const img = document.createElement('img');
            img.src = bg.src;
            item.appendChild(img);
            item.addEventListener('click', () => {
                this.selectBackground(bg, item);
            });
            this.bgList.appendChild(item);
        });
    }

    selectBackground(bg, el) {
        this.selectedBackground = bg.src;
        if (this.bgPreview) {
            this.bgPreview.src = bg.src;
        }
        const items = this.bgList ? this.bgList.querySelectorAll('.bg-thumb') : [];
        items.forEach(x => x.classList.remove('selected'));
        if (el) el.classList.add('selected');
        this.applyBackground(bg.src);
    }

    applyBackground(src) {
        if (!this.backgroundLayer) return;
        if (src) {
            this.backgroundLayer.style.backgroundImage = `url(${src})`;
        } else {
            this.backgroundLayer.style.backgroundImage = '';
        }
    }

    confirmBackground() {
        if (this.selectedBackground) {
            this.activeBackground = this.selectedBackground;
            localStorage.setItem('usagi_active_background', this.selectedBackground);
            this.applyBackground(this.selectedBackground);
            if (this.settingsCard) {
                this.settingsCard.classList.remove('show');
            }
        }
    }

    resetBackground() {
        this.selectedBackground = null;
        this.activeBackground = null;
        localStorage.removeItem('usagi_active_background');
        this.applyBackground('');
        if (this.bgPreview) this.bgPreview.src = '';
        const items = this.bgList ? this.bgList.querySelectorAll('.bg-thumb') : [];
        items.forEach(x => x.classList.remove('selected'));
    }

    handleUploadBackground(e) {
        const files = e.target.files;
        if (!files || !files[0]) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const src = reader.result;
            const item = { type: 'uploaded', src };
            const uploadedRaw = localStorage.getItem('usagi_uploaded_backgrounds');
            const uploaded = uploadedRaw ? JSON.parse(uploadedRaw) : [];
            uploaded.push(item);
            localStorage.setItem('usagi_uploaded_backgrounds', JSON.stringify(uploaded));
            this.backgrounds.push(item);
            this.renderBackgroundList();
            this.bgUpload.value = '';
        };
        reader.readAsDataURL(file);
    }

    // 行为调度器
    startBehaviorScheduler() {
        if (this.behaviorInterval) {
            clearInterval(this.behaviorInterval);
        }
        
        // 每30秒触发随机行为
        this.behaviorInterval = setInterval(() => {
            if (this.state === PetState.IDLE) {
                this.triggerRandomBehavior();
            }
        }, 30000);
        
        // 每分钟检查时间相关行为
        setInterval(() => {
            this.checkTimeBasedBehaviors();
        }, 60000);
        
        // 立即检查一次时间行为
        this.checkTimeBasedBehaviors();
    }

    triggerRandomBehavior() {
        if (this.movementPausedUntil && Date.now() < this.movementPausedUntil) return;
        const behaviors = ['walk', 'jump', 'greet'];
        const randomBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        
        this.triggerAction(randomBehavior);
    }

    checkTimeBasedBehaviors() {
        const hour = new Date().getHours();
        
        if (hour >= 22 || hour < 6) {
            // 夜晚睡觉
            if (this.state === PetState.IDLE) {
                this.sleep();
            }
        } else if (hour === 8) {
            // 早上8点吃早餐
            if (this.state === PetState.IDLE) {
                this.eat();
            }
        } else if (hour === 12) {
            // 中午12点吃午餐
            if (this.state === PetState.IDLE) {
                this.eat();
            }
        } else if (hour === 18) {
            // 晚上6点吃晚餐
            if (this.state === PetState.IDLE) {
                this.eat();
            }
        } else if (hour === 0) {
            // 午夜报时
            if (this.state === PetState.IDLE) {
                this.announceTime();
            }
        }
    }

    // 工具方法
    handleResize() {
        // 确保宠物不会超出新的窗口边界
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 80;
        
        if (this.position.x > maxX) {
            this.position.x = maxX;
            this.pet.style.left = maxX + 'px';
        }
        
        if (this.position.y > maxY) {
            this.position.y = maxY;
            this.pet.style.top = maxY + 'px';
        }
    }

    pauseFreeMovement(durationMs) {
        if (this.movementInterval) {
            clearInterval(this.movementInterval);
            this.movementInterval = null;
        }
        if (this.movementResumeTimeout) {
            clearTimeout(this.movementResumeTimeout);
        }
        this.movementPausedUntil = Date.now() + durationMs;
        this.movementResumeTimeout = setTimeout(() => {
            this.movementResumeTimeout = null;
            this.movementPausedUntil = 0;
            this.startRandomMovement();
        }, durationMs);
    }
}

// 气泡系统
class BubbleSystem {
    constructor(petElement, bubbleElement, bubbleTextElement) {
        this.pet = petElement;
        this.bubble = bubbleElement;
        this.bubbleText = bubbleTextElement;
        this.activeTimeout = null;
    }

    show(text, duration = 3000) {
        // 清除之前的超时
        if (this.activeTimeout) {
            clearTimeout(this.activeTimeout);
        }
        
        // 设置文本
        this.bubbleText.textContent = text;
        
        // 定位气泡在宠物上方
        this.positionBubble();
        
        // 显示气泡
        this.bubble.classList.add('show');
        
        // 自动隐藏
        this.activeTimeout = setTimeout(() => {
            this.hide();
        }, duration);
    }

    positionBubble() {
        const petRect = this.pet.getBoundingClientRect();
        
        this.bubble.style.left = (petRect.left + petRect.width / 2 - 75) + 'px';
        this.bubble.style.top = (petRect.top - 60) + 'px';
    }

    hide() {
        this.bubble.classList.remove('show');
    }
}

// 边界检测器
class BoundaryDetector {
    constructor() {
        this.margin = 30;
        this.updateDimensions();
        
        window.addEventListener('resize', () => this.updateDimensions());
    }

    updateDimensions() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    }

    checkBoundary(x, y, petSize) {
        const boundaries = {
            left: x <= this.margin,
            right: x >= this.screenWidth - petSize - this.margin,
            top: y <= this.margin,
            bottom: y >= this.screenHeight - petSize - this.margin
        };

        return {
            hit: Object.values(boundaries).some(b => b),
            boundaries,
            bounceDirection: this.calculateBounce(boundaries)
        };
    }

    calculateBounce(boundaries) {
        let dx = 1, dy = 1;
        if (boundaries.left || boundaries.right) dx = -dx;
        if (boundaries.top || boundaries.bottom) dy = -dy;
        return { dx, dy };
    }
}

// 交互处理器
class InteractionHandler {
    constructor(pet) {
        this.pet = pet;
        this.clickCount = 0;
        this.lastClickTime = 0;
    }

    handleClick(e) {
        const currentTime = Date.now();
        
        if (currentTime - this.lastClickTime < 300) {
            return; // 双击不处理单击
        }
        
        this.lastClickTime = currentTime;
        this.clickCount++;
        
        if (this.pet.image) this.pet.image.src = 'images/click_no_bg.png';
        // 显示开心表情
        this.showHappyExpression();
        
        // 显示对话
        this.pet.bubbleSystem.show('乌拉～', 2000);
        
        // 触发小跳跃
        this.pet.pet.style.animation = 'happyBounce 0.6s ease-in-out';
        setTimeout(() => {
            this.pet.pet.style.animation = '';
            if (this.pet.image) this.pet.image.src = 'images/stand_no_bg.png';
        }, 600);
    }

    handleDoubleClick(e) {
        this.pet.triggerAction('jump');
    }

    showHappyExpression() {
        this.pet.pet.classList.add('happy');
        setTimeout(() => {
            this.pet.pet.classList.remove('happy');
        }, 600);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new UsagiWebPet();
});
