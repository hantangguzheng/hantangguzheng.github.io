// 3D虚拟美术馆脚本

// 场景变量
let scene, camera, renderer, controls;
let isGalleryActive = false;
let galleryImages = [];
let frameObjects = [];
let floorMesh, wallsMesh;
let backgroundMode = 'dark'; // 默认为暗色背景

// 新增变量 - 用于图片放大和视频播放功能
let raycaster;
let currentIntersectedFrame = null;
let isZoomedIn = false;
let currentVideo = null;
let currentOverlay = null;
let currentEscHint = null; // 添加ESC提示元素的引用

// 添加配置变量
let galleryConfig = null;

// 初始化函数
function init() {
    // 创建加载指示器
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = `
        <div class="spinner"></div>
        <p>正在加载作品长廊...</p>
    `;
    document.body.appendChild(loader);
    
    // 初始化射线检测器
    raycaster = new THREE.Raycaster();
    
    // 检查配置目录
    checkConfigDirectory();
    
    // 先加载配置文件，然后再加载图片
    loadGalleryConfig().then(() => {
        // 预加载图片
        loadGalleryImages().then(() => {
            // 创建场景
            createScene();
            
            // 创建相机
            createCamera();
            
            // 创建渲染器
            createRenderer();
            
            // 创建控制器
            createControls();
            
            // 创建灯光
            createLights();
            
            // 创建展厅
            createGallery();
            
            // 添加事件监听器
            addEventListeners();
            
            // 开始动画循环
            animate();
            
            // 移除加载指示器
            if (document.body.contains(loader)) {
                document.body.removeChild(loader);
            }
        });
    }).catch(error => {
        console.error('初始化过程中出错:', error);
        // 移除加载指示器
        if (document.body.contains(loader)) {
            document.body.removeChild(loader);
        }
        // 显示错误信息
        alert('加载画廊时出错，请检查控制台以获取详细信息。');
    });
}

// 加载画廊配置文件
async function loadGalleryConfig() {
    try {
        console.log('开始加载画廊配置...');
        const response = await fetch('../config/gallery.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();
        console.log('成功加载画廊配置:', config);
        
        // 验证配置有效性
        if (!config || !config.images || !Array.isArray(config.images) || config.images.length === 0) {
            throw new Error('配置格式无效或图片列表为空');
        }
        
        galleryConfig = config;
        return config;
    } catch (error) {
        console.error('加载画廊配置失败:', error.message);
        console.warn('使用默认配置...');
        
        // 使用默认配置，增加网页类型
        galleryConfig = {
            images: [
                {
                    path: '../images/cl/WechatIMG95.jpg',
                    type: 'image',
                    videoUrl: '../audio/100228-video-720.mp4',
                    title: '作品1',
                    description: '作品描述1'
                },
                {
                    path: '../images/cl/image.png',
                    type: 'webpage',
                    webpageUrl: 'https://www.baidu.com', // 示例网页URL
                    title: '百度首页',
                    description: '百度搜索网站'
                },
                {
                    path: '../images/cl/image1.png',
                    type: 'image',
                    title: '作品3',
                    description: '作品描述3'
                },
                {
                    path: '../images/cl/image2.png',
                    type: 'image',
                    title: '作品4',
                    description: '作品描述4'
                },
                {
                    path: '../images/cl/image3.png',
                    type: 'webpage',
                    webpageUrl: 'https://www.bilibili.com', // 示例网页URL
                    title: 'B站首页',
                    description: 'B站视频网站'
                },
                {
                    path: '../images/cl/汉唐古筝1.jpeg',
                    type: 'image',
                    title: '汉唐古筝',
                    description: '古筝作品展示'
                },
                {
                    path: '../images/cl/汉唐古筝2.png',
                    type: 'image',
                    title: '汉唐古筝细节',
                    description: '古筝细节展示'
                }
            ],
            settings: {
                width: 6,
                height: 4
            }
        };
        
        return galleryConfig;
    }
}

// 修改预加载图片函数
async function loadGalleryImages() {
    if (!galleryConfig || !galleryConfig.images) {
        console.error('无法加载图片：配置未找到');
        return;
    }
    
    console.log('开始加载图片，图片数量:', galleryConfig.images.length);
    
    // 清空之前的图片数组
    galleryImages = [];
    
    // 创建纹理加载器
    const textureLoader = new THREE.TextureLoader();
    
    // 加载所有图片
    const loadPromises = galleryConfig.images.map((imageConfig, index) => {
        console.log(`加载第${index+1}张图片:`, imageConfig.path, '类型:', imageConfig.type);
        
        return new Promise((resolve) => {
            textureLoader.load(imageConfig.path, 
                // 成功回调
                (texture) => {
                    console.log(`图片加载成功: ${imageConfig.path}`);
                    galleryImages.push({
                        texture: texture,
                        path: imageConfig.path,
                        config: imageConfig // 保存完整的配置，包括类型信息
                    });
                    resolve();
                }, 
                // 进度回调
                undefined, 
                // 错误回调
                (err) => {
                    console.error(`加载图片失败: ${imageConfig.path}`, err);
                    resolve(); // 即使失败也继续
                }
            );
        });
    });
    
    // 等待所有图片加载完成
    await Promise.all(loadPromises);
    console.log('所有图片加载完成，成功加载数量:', galleryImages.length);
    
    // 调试：打印所有加载的图片配置
    galleryImages.forEach((img, index) => {
        console.log(`图片 ${index+1}:`, img.path, '类型:', img.config.type, '完整配置:', img.config);
    });
}

// 创建场景
function createScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // 黑色背景
    scene.fog = new THREE.FogExp2(0x000000, 0.02); // 添加雾效果增强深度感
}

// 创建相机
function createCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 1.7, 5); // 设置初始位置，1.7是一个人的平均眼睛高度
}

// 创建渲染器
function createRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // 添加到DOM
    const container = document.getElementById('gallery-container');
    container.appendChild(renderer.domElement);
}

// 创建控制器
function createControls() {
    // 检查浏览器是否支持Pointer Lock API
    const havePointerLock = 'pointerLockElement' in document || 
                           'mozPointerLockElement' in document || 
                           'webkitPointerLockElement' in document;
    
    if (!havePointerLock) {
        // 如果浏览器不支持，显示提示信息
        const warning = document.createElement('div');
        warning.style.position = 'absolute';
        warning.style.top = '10px';
        warning.style.width = '100%';
        warning.style.textAlign = 'center';
        warning.style.color = '#ff0000';
        warning.style.backgroundColor = 'rgba(0,0,0,0.7)';
        warning.style.padding = '10px';
        warning.style.zIndex = '999';
        warning.innerHTML = '您的浏览器不支持指针锁定API，3D控制可能受限。请尝试使用Chrome、Firefox或Edge浏览器。';
        document.body.appendChild(warning);
        
        // 创建降级版本的控制器
        controls = new THREE.PointerLockControls(camera, renderer.domElement);
    } else {
        // 浏览器支持，创建标准控制器
        controls = new THREE.PointerLockControls(camera, renderer.domElement);
    }
    
    // 点击画面开始体验
    renderer.domElement.addEventListener('click', () => {
        if (!isGalleryActive && !isZoomedIn) {
            // 激活画廊
            document.body.classList.add('gallery-active');
            isGalleryActive = true;
            
            // 锁定鼠标指针
            try {
                controls.lock();
            } catch (error) {
                console.error('指针锁定失败:', error);
                // 重置状态
                document.body.classList.remove('gallery-active');
                isGalleryActive = false;
            }
        }
    });
    
    // 当控制器锁定/解锁时的事件
    controls.addEventListener('lock', () => {
        if (!isZoomedIn) { // 只有在非放大模式下才更新画廊状态
            document.body.classList.add('gallery-active');
        }
    });
    
    controls.addEventListener('unlock', () => {
        // 修改：只有在非放大模式下才更新画廊状态
        // 这样当从放大模式退出时，不会错误地将isGalleryActive设为false
        if (isGalleryActive && !isZoomedIn) {
            console.log('控制器解锁，且不在放大模式，退出画廊');
            document.body.classList.remove('gallery-active');
            isGalleryActive = false;
        } else {
            console.log('控制器解锁，但在放大模式或画廊未激活，保持当前状态');
        }
    });
    
    // 监听指针锁定错误事件
    controls.addEventListener('error', (event) => {
        console.warn('指针锁定API错误:', event.message);
        // 显示友好的错误提示
        const errorMsg = document.createElement('div');
        errorMsg.style.position = 'absolute';
        errorMsg.style.top = '50%';
        errorMsg.style.left = '50%';
        errorMsg.style.transform = 'translate(-50%, -50%)';
        errorMsg.style.backgroundColor = 'rgba(0,0,0,0.8)';
        errorMsg.style.color = '#ff5555';
        errorMsg.style.padding = '20px';
        errorMsg.style.borderRadius = '10px';
        errorMsg.style.zIndex = '1000';
        errorMsg.style.maxWidth = '80%';
        errorMsg.style.textAlign = 'center';
        errorMsg.innerHTML = `
            <h3>3D控制功能受限</h3>
            <p>您的浏览器拒绝了指针锁定请求或不完全支持此功能。</p>
            <p>可能的原因：</p>
            <ul style="text-align: left;">
                <li>您拒绝了浏览器的权限请求</li>
                <li>您的浏览器不完全支持Pointer Lock API</li>
                <li>您的设备不支持此功能</li>
            </ul>
            <p>建议：使用最新版Chrome、Firefox或Edge浏览器，并允许指针锁定权限。</p>
            <button id="dismiss-error" style="padding: 8px 16px; margin-top: 10px; background: #444; border: none; color: white; cursor: pointer; border-radius: 4px;">关闭提示</button>
        `;
        document.body.appendChild(errorMsg);
        
        // 添加关闭按钮功能
        document.getElementById('dismiss-error').addEventListener('click', () => {
            document.body.removeChild(errorMsg);
            // 重置状态
            document.body.classList.remove('gallery-active');
            isGalleryActive = false;
        });
    });
    
    scene.add(controls.getObject());
}

// 创建灯光
function createLights() {
    // 环境光 - 提供基础照明
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);
    
    // 创建顶部的细微白色光源
    const galleryLength = galleryImages.length * 4 + 10; // 长廊长度
    
    // 沿长廊顶部添加多个点光源
    for (let i = -galleryLength/2; i <= galleryLength/2; i += 4) {
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 10);
        pointLight.position.set(0, 3.8, i);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;
        scene.add(pointLight);
        
        // 添加光源辅助显示器（调试用，可以注释掉）
        // const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2);
        // scene.add(pointLightHelper);
        
        // 添加光源的可视化效果 - 小光球
        const lightSphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const lightSphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
        lightSphere.position.copy(pointLight.position);
        scene.add(lightSphere);
    }
}

// 创建展厅
function createGallery() {
    // 确保galleryConfig已加载
    if (!galleryConfig || !galleryImages.length) {
        console.error('画廊配置或图片未正确加载');
        return;
    }
    
    // 使用配置中的设置或默认值
    const gallerySettings = galleryConfig.settings || {};
    const galleryLength = galleryImages.length * 4 + 10; // 长廊长度
    const galleryWidth = gallerySettings.width || 6; // 长廊宽度
    const galleryHeight = gallerySettings.height || 4; // 长廊高度
    
    console.log('创建画廊，长度:', galleryLength, '宽度:', galleryWidth, '高度:', galleryHeight);
    console.log('当前加载的图片数量:', galleryImages.length);
    
    // 创建地板
    createFloor(galleryWidth, galleryLength);
    
    // 创建墙壁
    createWalls(galleryWidth, galleryLength, galleryHeight);
    
    // 创建画框和画作
    createArtworks(galleryWidth, galleryLength, galleryHeight);
}

// 创建地板
function createFloor(width, length) {
    const floorGeometry = new THREE.PlaneGeometry(width, length);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    
    floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    
    // 添加地面上的光点效果
    const floorLightGeometry = new THREE.PlaneGeometry(width, length);
    const floorLightMaterial = new THREE.MeshBasicMaterial({
        map: createLightDotsTexture(),
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    const floorLightMesh = new THREE.Mesh(floorLightGeometry, floorLightMaterial);
    floorLightMesh.rotation.x = Math.PI / 2;
    floorLightMesh.position.y = 0.01; // 稍微高于地板
    scene.add(floorLightMesh);
}

// 创建光点纹理
function createLightDotsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // 填充黑色背景
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制随机光点
    context.fillStyle = 'white';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5 + 0.5;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    
    return texture;
}

// 创建墙壁
function createWalls(width, length, height) {
    // 创建墙壁材质
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // 创建墙壁组
    const wallsGroup = new THREE.Group();
    
    // 左墙
    const leftWallGeometry = new THREE.PlaneGeometry(length, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(0, height/2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -width/2;
    leftWall.receiveShadow = true;
    wallsGroup.add(leftWall);
    
    // 右墙
    const rightWallGeometry = new THREE.PlaneGeometry(length, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(0, height/2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = width/2;
    rightWall.receiveShadow = true;
    wallsGroup.add(rightWall);
    
    // 天花板
    const ceilingGeometry = new THREE.PlaneGeometry(width, length);
    const ceiling = new THREE.Mesh(ceilingGeometry, wallMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    wallsGroup.add(ceiling);
    
    // 前墙
    const frontWallGeometry = new THREE.PlaneGeometry(width, height);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, height/2, -length/2);
    frontWall.receiveShadow = true;
    wallsGroup.add(frontWall);
    
    // 后墙
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height/2, length/2);
    backWall.rotation.y = Math.PI;
    backWall.receiveShadow = true;
    wallsGroup.add(backWall);
    
    scene.add(wallsGroup);
    wallsMesh = wallsGroup;
}

// 创建画框和画作
function createArtworks(width, length, height) {
    // 清除之前的画框
    frameObjects.forEach(frame => scene.remove(frame));
    frameObjects = [];
    
    // 画框尺寸
    const frameWidth = 1.6;
    const frameHeight = 1.2;
    const frameDepth = 0.05;
    const frameThickness = 0.08;
    
    // 画框材质
    const frameMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        roughness: 0.5,
        metalness: 0.8
    });
    
    // 画框发光材质
    const frameGlowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffcc, 
        transparent: true,
        opacity: 0.3
    });
    
    // 左右墙壁的Z轴范围
    const startZ = -length/2 + 3;
    const endZ = length/2 - 3;
    const spacing = (endZ - startZ) / (galleryImages.length + 1);
    
    console.log('创建画框，总数:', galleryImages.length);
    
    // 创建左右墙壁上的画框
    galleryImages.forEach((image, index) => {
        console.log(`创建第${index+1}个画框:`, image.path, '类型:', image.config.type);
        
        // 创建画框，并添加额外属性来标识索引
        let frameGroup;
        
        // 左墙画框
        if (index % 2 === 0) {
            frameGroup = createFrame(frameWidth, frameHeight, frameDepth, frameThickness, frameMaterial, frameGlowMaterial, image.texture);
            frameGroup.position.set(-width/2 + 0.01, height/2, startZ + spacing * (index + 1));
            frameGroup.rotation.y = Math.PI / 2;
            frameGroup.userData = { imageIndex: index, imagePath: image.path, imageType: image.config.type };
            scene.add(frameGroup);
            frameObjects.push(frameGroup);
        } 
        // 右墙画框
        else {
            frameGroup = createFrame(frameWidth, frameHeight, frameDepth, frameThickness, frameMaterial, frameGlowMaterial, image.texture);
            frameGroup.position.set(width/2 - 0.01, height/2, startZ + spacing * (index + 1));
            frameGroup.rotation.y = -Math.PI / 2;
            frameGroup.userData = { imageIndex: index, imagePath: image.path, imageType: image.config.type };
            scene.add(frameGroup);
            frameObjects.push(frameGroup);
        }
    });
}

// 创建单个画框
function createFrame(width, height, depth, thickness, frameMaterial, glowMaterial, texture) {
    const frameGroup = new THREE.Group();
    
    // 创建画框外框
    const outerGeometry = new THREE.BoxGeometry(width + thickness*2, height + thickness*2, depth);
    const outerFrame = new THREE.Mesh(outerGeometry, frameMaterial);
    frameGroup.add(outerFrame);
    
    // 创建画框内部（画布）
    const innerGeometry = new THREE.PlaneGeometry(width, height);
    const canvasMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    const canvas = new THREE.Mesh(innerGeometry, canvasMaterial);
    canvas.position.z = depth/2 + 0.001; // 稍微突出于画框
    frameGroup.add(canvas);
    
    // 创建画框发光效果
    const glowGeometry = new THREE.BoxGeometry(width + thickness*3, height + thickness*3, depth*0.5);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = -0.02;
    frameGroup.add(glow);
    
    return frameGroup;
}

// 添加事件监听器
function addEventListeners() {
    // 窗口大小调整事件
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // 键盘控制
    const moveSpeed = 0.15;
    const keysPressed = {};
    
    document.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        
        // 空格键和ESC键的处理
        if (event.code === 'Escape') {
            console.log('ESC键被按下，当前isZoomedIn状态:', isZoomedIn);
            if (isZoomedIn) {
                console.log('调用exitZoomMode函数');
                exitZoomMode();
                event.preventDefault(); // 阻止默认行为
                event.stopPropagation(); // 阻止事件冒泡
                return false; // 确保事件被完全处理
            }
        }
        
        if (isGalleryActive) {
            if (event.code === 'Space') {
                event.preventDefault();
                handleSpaceKey();
                console.log('空格键被按下，尝试放大画作');
            }
        }
    }, true); // 使用捕获阶段处理事件
    
    document.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
    
    // 添加点击事件监听，用于测试放大功能
    document.addEventListener('click', (event) => {
        if (isGalleryActive && !isZoomedIn) {
            // 检查是否点击了画框
            checkFrameIntersection();
        }
    });    
    // 移动更新函数
    window.moveUpdate = () => {
        if (!isGalleryActive || isZoomedIn) return; // 在放大模式下禁用移动
        
        // 前后左右移动
        if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
            controls.moveForward(moveSpeed);
        }
        if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
            controls.moveForward(-moveSpeed);
        }
        if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) {
            controls.moveRight(-moveSpeed);
        }
        if (keysPressed['KeyD'] || keysPressed['ArrowRight']) {
            controls.moveRight(moveSpeed);
        }
        
        // 限制移动范围
        const galleryLength = galleryImages.length * 4 + 10;
        const galleryWidth = 6;
        const galleryHeight = 4;
        
        const position = controls.getObject().position;
        position.x = Math.max(-galleryWidth/2 + 0.5, Math.min(galleryWidth/2 - 0.5, position.x));
        position.y = Math.max(0.5, Math.min(galleryHeight - 0.5, position.y));
        position.z = Math.max(-galleryLength/2 + 0.5, Math.min(galleryLength/2 - 0.5, position.z));
    };
    
    // 背景切换按钮
    document.getElementById('dark-bg').addEventListener('click', () => {
        setBackgroundMode('dark');
    });
    
    document.getElementById('instrument-bg').addEventListener('click', () => {
        setBackgroundMode('instrument');
    });
}

// 设置背景模式
function setBackgroundMode(mode) {
    backgroundMode = mode;
    
    // 更新按钮状态
    document.getElementById('dark-bg').classList.toggle('active', mode === 'dark');
    document.getElementById('instrument-bg').classList.toggle('active', mode === 'instrument');
    
    // 更新场景背景
    if (mode === 'dark') {
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.FogExp2(0x000000, 0.02);
        
        // 更新墙壁材质
        if (wallsMesh) {
            wallsMesh.children.forEach(wall => {
                wall.material.color.set(0x0a0a0a);
            });
        }
    } else if (mode === 'instrument') {
        // 加载古筝背景纹理
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('../images/bg.png', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(5, 5);
            
            scene.background = texture;
            scene.fog = new THREE.FogExp2(0x111111, 0.01);
            
            // 更新墙壁材质
            if (wallsMesh) {
                wallsMesh.children.forEach(wall => {
                    wall.material.color.set(0x222222);
                });
            }
        });
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新移动
    if (window.moveUpdate) window.moveUpdate();
    
    // 画框轻微浮动效果
    const time = Date.now() * 0.001;
    frameObjects.forEach((frame, index) => {
        frame.position.y = Math.sin(time + index * 0.5) * 0.03 + 1.7;
        
        // 画框发光效果呼吸动画
        const glow = frame.children[2];
        glow.material.opacity = 0.2 + Math.sin(time * 0.5 + index) * 0.1;
    });
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 页面加载完成后初始化
window.addEventListener('load', init);

// 检查画框交互
function checkFrameIntersection() {
    // 获取相机方向
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // 设置射线
    raycaster.set(camera.position, cameraDirection);
    
    // 检测与画框的交叉
    const intersects = raycaster.intersectObjects(frameObjects, true);
    
    if (intersects.length > 0) {
        console.log('检测到画框交互');
        const intersectedObject = intersects[0].object;
        // 找到父级画框对象
        let frameParent = intersectedObject;
        while(frameParent && !frameObjects.includes(frameParent)) {
            frameParent = frameParent.parent;
        }
        
        if (frameParent) {
            currentIntersectedFrame = frameParent;
            zoomIntoArtwork(frameParent);
        }
    }
}

// 处理空格键事件
function handleSpaceKey() {
    if (isZoomedIn) return;
    
    console.log('处理空格键事件');
    console.log('当前画框对象数量:', frameObjects.length);
    
    // 获取相机方向
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    
    // 设置射线
    raycaster.set(camera.position, cameraDirection);
    
    // 直接检测与frameObjects数组中对象的交叉，而不是scene.children
    const intersects = raycaster.intersectObjects(frameObjects, true);
    console.log('检测到的交叉对象数量:', intersects.length);
    
    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        console.log('交叉对象:', intersectedObject);
        
        // 查找父级画框对象
        let frameParent = intersectedObject;
        while (frameParent && !frameObjects.includes(frameParent)) {
            frameParent = frameParent.parent;
        }
        
        if (frameParent) {
            console.log('找到画框对象，准备放大');
            currentIntersectedFrame = frameParent;
            zoomIntoArtwork(frameParent);
            return;
        }
    }
    
    console.log('未找到可交互的画框');
}

// 修改放大画作函数，改进查找图片配置的逻辑
function zoomIntoArtwork(frame) {
    isZoomedIn = true;
    
    // 解锁指针控制，允许用户自由移动鼠标
    if (controls.isLocked) {
        controls.unlock();
    }
    
    // 获取画框中的画布（第二个子对象）
    const canvas = frame.children[1];
    
    // 添加错误处理和空值检查
    let imagePath = '';
    let imageConfig = null;
    let frameIndex = frameObjects.indexOf(frame);
    
    try {
        // 首先尝试通过frameObjects数组索引找到对应的图片配置
        if (frameIndex !== -1 && frameIndex < galleryImages.length) {
            console.log(`找到画框索引: ${frameIndex}`);
            imageConfig = galleryImages[frameIndex].config;
            imagePath = galleryImages[frameIndex].path;
            console.log('通过索引找到图片配置:', imageConfig);
        } else {
            // 如果索引方法失败，尝试通过纹理路径查找
            const texture = canvas?.material?.map;
            if (texture && texture.source && texture.source.data) {
                imagePath = texture.source.data.src;
            } else if (texture && texture.image) {
                // 兼容不同版本的Three.js
                imagePath = texture.image.src;
            } else {
                // 如果无法获取图片路径，使用默认图片
                console.warn('无法获取画框纹理路径，使用默认图片');
                imagePath = '../images/logo.png';
            }
            
            // 从galleryImages中找到对应的配置
            const foundImage = galleryImages.find(img => 
                img.path === imagePath || 
                imagePath.includes(img.path.replace(/\\/g, '/').replace(/\//g, '/'))
            );
            
            if (foundImage) {
                imageConfig = foundImage.config;
                console.log('通过路径找到图片配置:', imageConfig);
            } else {
                console.warn('无法找到图片配置:', imagePath);
            }
        }
    } catch (error) {
        console.error('获取画框纹理时出错:', error);
        imagePath = '../images/logo.png';
    }
    
    console.log('最终确定的图片配置:', imageConfig, '路径:', imagePath);
    
    // 创建背景遮罩 - 修改为半透明，保留3D场景可见
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s';
    overlay.style.pointerEvents = 'none'; // 修改为none，允许点击事件穿透到3D场景
    document.getElementById('gallery-container').appendChild(overlay);
    currentOverlay = overlay;
    
    // 淡入遮罩
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 100);
    
    // 添加ESC键提示
    const escHint = document.createElement('div');
    escHint.style.position = 'fixed';
    escHint.style.bottom = '20px';
    escHint.style.left = '50%';
    escHint.style.transform = 'translateX(-50%)';
    escHint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    escHint.style.color = 'white';
    escHint.style.padding = '10px 20px';
    escHint.style.borderRadius = '5px';
    escHint.style.zIndex = '1001';
    escHint.style.fontSize = '14px';
    escHint.innerHTML = '<i class="fas fa-keyboard"></i> 按ESC键退出查看';
    document.getElementById('gallery-container').appendChild(escHint);
    currentEscHint = escHint; // 保存引用以便后续移除
    
    // 根据配置类型创建不同的内容元素
    console.log('准备根据类型展示内容:', imageConfig?.type);
    
    if (imageConfig && imageConfig.type === 'webpage' && imageConfig.webpageUrl) {
        console.log('创建iframe展示网页:', imageConfig.webpageUrl);
        
        // 创建iframe展示网页
        const iframe = document.createElement('iframe');
        iframe.src = imageConfig.webpageUrl;
        iframe.style.position = 'fixed';
        iframe.style.top = '50%';
        iframe.style.left = '50%';
        iframe.style.transform = 'translate(-50%, -50%)';
        iframe.style.width = '65%';
        iframe.style.height = '85vh';
        iframe.style.border = 'none';
        iframe.style.zIndex = '1000';
        iframe.style.opacity = '0';
        iframe.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.3)';
        iframe.style.borderRadius = '8px';
        iframe.style.backgroundColor = 'white'; // 设置背景色以便加载时显示
        iframe.style.pointerEvents = 'auto'; // 确保iframe可以接收鼠标事件
        
        // 允许全屏
        iframe.setAttribute('allowfullscreen', 'true');
        // 允许支付API等敏感功能
        iframe.setAttribute('allow', 'fullscreen; payment');
        
        document.getElementById('gallery-container').appendChild(iframe);
        currentVideo = iframe; // 复用currentVideo变量存储iframe元素
        
        // 淡入效果
        setTimeout(() => {
            iframe.style.transition = 'opacity 0.5s';
            iframe.style.opacity = '1';
        }, 300);
        
        // 加载状态指示
        const loadingIndicator = document.createElement('div');
        loadingIndicator.style.position = 'fixed';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.zIndex = '999';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.fontWeight = 'bold';
        loadingIndicator.textContent = '网页加载中...';
        document.getElementById('gallery-container').appendChild(loadingIndicator);
        
        // 当iframe加载完成后移除加载指示器
        iframe.onload = () => {
            if (document.getElementById('gallery-container').contains(loadingIndicator)) {
                document.getElementById('gallery-container').removeChild(loadingIndicator);
            }
        };
        
        // 设置超时，如果10秒后仍未加载完成，也移除加载指示器
        setTimeout(() => {
            if (document.getElementById('gallery-container').contains(loadingIndicator)) {
                document.getElementById('gallery-container').removeChild(loadingIndicator);
            }
        }, 10000);
        
    } else if (imageConfig && imageConfig.videoUrl) {
        console.log('创建视频播放器:', imageConfig.videoUrl);
        // 创建视频播放器
        const video = document.createElement('video');
        video.src = imageConfig.videoUrl;
        video.style.position = 'fixed';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.transform = 'translate(-50%, -50%)';
        video.style.width = '65%';
        video.style.height = 'auto';
        video.style.maxHeight = '80vh';
        video.style.zIndex = '1000';
        video.style.opacity = '0';
        video.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        video.style.borderRadius = '4px';
        video.style.pointerEvents = 'auto'; // 确保视频控件可以点击
        
        // 添加以下属性来确保声音正常工作
        video.controls = true;            // 显示控制栏
        video.muted = false;              // 确保未静音
        video.volume = 1.0;               // 设置音量最大
        video.playsInline = true;         // 支持内联播放
        video.preload = 'auto';           // 预加载视频
        video.crossOrigin = 'anonymous';  // 允许跨域资源
        
        // 给视频添加声音调试信息
        video.addEventListener('volumechange', () => {
            console.log('音量变化:', video.volume, '是否静音:', video.muted);
        });
        
        video.addEventListener('canplay', () => {
            console.log('视频可以播放，音轨数量:', video.audioTracks ? video.audioTracks.length : '不支持audioTracks属性');
            console.log('视频音量:', video.volume, '是否静音:', video.muted);
        });
        
        video.addEventListener('error', (e) => {
            console.error('视频加载错误:', e);
        });
        
        document.getElementById('gallery-container').appendChild(video);
        currentVideo = video;
        
        // 淡入效果
        setTimeout(() => {
            video.style.transition = 'opacity 0.5s';
            video.style.opacity = '1';
            
            // 在用户交互后尝试播放
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('视频开始播放，音量:', video.volume, '是否静音:', video.muted);
                }).catch(error => {
                    console.error('自动播放失败:', error);
                    // 创建播放提示
                    const playHint = document.createElement('div');
                    playHint.style.position = 'fixed';
                    playHint.style.top = '40%';
                    playHint.style.left = '50%';
                    playHint.style.transform = 'translate(-50%, -50%)';
                    playHint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    playHint.style.color = 'white';
                    playHint.style.padding = '15px 20px';
                    playHint.style.borderRadius = '8px';
                    playHint.style.zIndex = '1002';
                    playHint.style.cursor = 'pointer';
                    playHint.innerHTML = '<i class="fas fa-play"></i> 点击播放视频和声音';
                    document.getElementById('gallery-container').appendChild(playHint);
                    
                    // 点击提示播放视频
                    playHint.addEventListener('click', () => {
                        video.muted = false;
                        video.volume = 1.0;
                        video.play();
                        document.getElementById('gallery-container').removeChild(playHint);
                    });
                });
            }
        }, 300);
    } else {
        console.log('显示普通图片:', imagePath);
        // 如果不是视频或网页，则显示放大的图片
        const enlargedImage = document.createElement('img');
        enlargedImage.src = imagePath;
        enlargedImage.style.position = 'fixed';
        enlargedImage.style.top = '50%';
        enlargedImage.style.left = '50%';
        enlargedImage.style.transform = 'translate(-50%, -50%) scale(0.8)';
        enlargedImage.style.width = 'auto';
        enlargedImage.style.height = 'auto';
        enlargedImage.style.maxWidth = '80%'; // 最大宽度为视口宽度的80%
        enlargedImage.style.maxHeight = '80vh'; // 最大高度为视口高度的80%
        enlargedImage.style.zIndex = '1000';
        enlargedImage.style.opacity = '0';
        enlargedImage.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        enlargedImage.style.borderRadius = '4px';
        enlargedImage.style.transition = 'transform 0.5s, opacity 0.5s';
        enlargedImage.style.pointerEvents = 'none'; // 图片不需要交互
        document.getElementById('gallery-container').appendChild(enlargedImage);
        currentVideo = enlargedImage; // 复用currentVideo变量存储图片元素
        
        // 淡入并放大效果
        setTimeout(() => {
            enlargedImage.style.opacity = '1';
            enlargedImage.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
    }
}

// 退出放大模式
function exitZoomMode() {
    console.log('exitZoomMode被调用，当前isZoomedIn状态:', isZoomedIn);
    if (!isZoomedIn) return;
    
    console.log('开始退出放大模式');
    
    // 添加一个临时标记，表示正在从放大模式退出
    // 这将防止controls.unlock事件处理器错误地将isGalleryActive设为false
    const wasInZoomMode = isZoomedIn;
    isZoomedIn = false;
    
    // 移除视频或图片
    if (currentVideo) {
        console.log('移除视频或图片元素:', currentVideo.tagName);
        if (currentVideo.tagName === 'VIDEO') {
            try {
                // 确保视频停止播放并释放资源
                currentVideo.pause();
                currentVideo.removeAttribute('src');
                currentVideo.load();
                console.log('已停止视频播放并释放资源');
            } catch(e) {
                console.error('停止视频时出错:', e);
            }
        }
        // 使用淡出效果
        currentVideo.style.opacity = '0';
        setTimeout(() => {
            try {
                if (document.getElementById('gallery-container').contains(currentVideo)) {
                    document.getElementById('gallery-container').removeChild(currentVideo);
                    console.log('已从DOM中移除视频/图片元素');
                } else {
                    console.log('视频/图片元素不在DOM中');
                }
            } catch (error) {
                console.error('移除视频/图片元素时出错:', error);
            }
            currentVideo = null;
        }, 500); // 等待淡出动画完成
    } else {
        console.log('没有找到currentVideo元素');
    }
    
    // 移除ESC提示
    if (currentEscHint) {
        try {
            if (document.getElementById('gallery-container').contains(currentEscHint)) {
                document.getElementById('gallery-container').removeChild(currentEscHint);
                console.log('已从DOM中移除ESC提示元素');
            }
        } catch (error) {
            console.error('移除ESC提示元素时出错:', error);
        }
        currentEscHint = null;
    }
    
    // 移除遮罩
    if (currentOverlay) {
        console.log('移除遮罩元素');
        currentOverlay.style.opacity = '0';
        setTimeout(() => {
            try {
                if (document.getElementById('gallery-container').contains(currentOverlay)) {
                    document.getElementById('gallery-container').removeChild(currentOverlay);
                    console.log('已从DOM中移除遮罩元素');
                } else {
                    console.log('遮罩元素不在DOM中');
                }
            } catch (error) {
                console.error('移除遮罩元素时出错:', error);
            }
            currentOverlay = null;
            
            // 移动到这里，确保在遮罩完全移除后再尝试锁定控制器
            // 这样可以避免与unlock事件的冲突
            if (wasInZoomMode && isGalleryActive) {
                try {
                    console.log('尝试重新锁定控制器，保持画廊模式');
                    // 添加延迟，确保DOM操作完成后再锁定
                    setTimeout(() => {
                        if (isGalleryActive && !controls.isLocked) {
                            controls.lock();
                            console.log('控制器已重新锁定');
                        }
                    }, 100);
                } catch (error) {
                    console.error('重新锁定控制器失败:', error);
                }
            }
        }, 500); // 等待淡出动画完成
    } else {
        console.log('没有找到currentOverlay元素');
        // 如果没有遮罩，也要尝试锁定控制器
        if (wasInZoomMode && isGalleryActive) {
            try {
                console.log('尝试重新锁定控制器，保持画廊模式');
                setTimeout(() => {
                    if (isGalleryActive && !controls.isLocked) {
                        controls.lock();
                        console.log('控制器已重新锁定');
                    }
                }, 100);
            } catch (error) {
                console.error('重新锁定控制器失败:', error);
            }
        }
    }
    
    currentIntersectedFrame = null;
    
    console.log('exitZoomMode函数执行完毕');
}

// 检查config目录是否存在函数
function checkConfigDirectory() {
    // 由于浏览器安全限制，不能直接检查文件系统
    // 但可以尝试加载一个已知的文件来检查配置目录是否可访问
    fetch('../config/test.txt')
        .then(response => {
            if (response.ok) {
                console.log('配置目录可访问');
            } else {
                console.warn('配置目录似乎不存在或无法访问');
            }
        })
        .catch(error => {
            console.warn('访问配置目录时出错，可能需要创建该目录:', error);
            // 显示提示
            showConfigDirectoryWarning();
        });
}

// 显示配置目录警告
function showConfigDirectoryWarning() {
    const warning = document.createElement('div');
    warning.style.position = 'fixed';
    warning.style.top = '10px';
    warning.style.left = '10px';
    warning.style.backgroundColor = 'rgba(255,0,0,0.7)';
    warning.style.color = 'white';
    warning.style.padding = '10px';
    warning.style.borderRadius = '5px';
    warning.style.zIndex = '9999';
    warning.innerHTML = '警告：无法访问配置目录。请在项目根目录创建 "config" 文件夹并添加 gallery.json 文件。';
    document.body.appendChild(warning);
    
    // 5秒后自动移除警告
    setTimeout(() => {
        document.body.removeChild(warning);
    }, 8000);
}

// ...