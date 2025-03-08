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
        document.body.removeChild(loader);
    });
}

// 预加载图片
async function loadGalleryImages() {
    // 图片路径数组 - 从images/cl/目录加载
    const imagePaths = [
        '../images/cl/WechatIMG95.jpg',
        '../images/cl/image.png',
        '../images/cl/image1.png',
        '../images/cl/image2.png',
        '../images/cl/image3.png',
        '../images/cl/汉唐古筝1.jpeg',
        '../images/cl/汉唐古筝2.png'
    ];
    
    // 创建纹理加载器
    const textureLoader = new THREE.TextureLoader();
    
    // 加载所有图片
    const loadPromises = imagePaths.map(path => {
        return new Promise((resolve) => {
            textureLoader.load(path, (texture) => {
                galleryImages.push({
                    texture: texture,
                    path: path
                });
                resolve();
            }, undefined, (err) => {
                console.error(`加载图片失败: ${path}`, err);
                resolve(); // 即使失败也继续
            });
        });
    });
    
    // 等待所有图片加载完成
    await Promise.all(loadPromises);
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
        if (!isGalleryActive) {
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
        document.body.classList.add('gallery-active');
    });
    
    controls.addEventListener('unlock', () => {
        if (isGalleryActive) {
            document.body.classList.remove('gallery-active');
            isGalleryActive = false;
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
    const galleryLength = galleryImages.length * 4 + 10; // 长廊长度
    const galleryWidth = 6; // 长廊宽度
    const galleryHeight = 4; // 长廊高度
    
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
    
    // 创建左右墙壁上的画框
    galleryImages.forEach((image, index) => {
        // 左墙画框
        if (index % 2 === 0) {
            const frameGroup = createFrame(frameWidth, frameHeight, frameDepth, frameThickness, frameMaterial, frameGlowMaterial, image.texture);
            frameGroup.position.set(-width/2 + 0.01, height/2, startZ + spacing * (index + 1));
            frameGroup.rotation.y = Math.PI / 2;
            scene.add(frameGroup);
            frameObjects.push(frameGroup);
        } 
        // 右墙画框
        else {
            const frameGroup = createFrame(frameWidth, frameHeight, frameDepth, frameThickness, frameMaterial, frameGlowMaterial, image.texture);
            frameGroup.position.set(width/2 - 0.01, height/2, startZ + spacing * (index + 1));
            frameGroup.rotation.y = -Math.PI / 2;
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
        if (!isGalleryActive || isZoomedIn) return;
        
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

// 放大画作
function zoomIntoArtwork(frame) {
    isZoomedIn = true;
    
    // 获取画框中的画布（第二个子对象）
    const canvas = frame.children[1];
    
    // 添加错误处理和空值检查
    let imagePath = '';
    try {
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
    } catch (error) {
        console.error('获取画框纹理时出错:', error);
        imagePath = '../images/logo.png';
    }
    
    // 创建背景遮罩
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s';
    document.body.appendChild(overlay);
    currentOverlay = overlay;
    
    // 淡入遮罩
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 100);
    
    // 创建视频元素（如果是对应的图片）
    const fileName = imagePath.split('/').pop();
    if (fileName === 'WechatIMG95.jpg') {
        const video = document.createElement('video');
        video.src = '../audio/mmexport1736417003934.mp4';
        video.style.position = 'fixed';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.transform = 'translate(-50%, -50%)';
        video.style.maxWidth = '90vw';
        video.style.maxHeight = '90vh';
        video.style.zIndex = '1000';
        video.style.opacity = '0';
        video.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        video.style.borderRadius = '4px';
        video.controls = true;
        document.body.appendChild(video);
        currentVideo = video;
        
        // 淡入效果
        setTimeout(() => {
            video.style.transition = 'opacity 0.5s';
            video.style.opacity = '1';
            video.play();
        }, 300);
    } else {
        // 如果不是视频，则显示放大的图片
        const enlargedImage = document.createElement('img');
        enlargedImage.src = imagePath;
        enlargedImage.style.position = 'fixed';
        enlargedImage.style.top = '50%';
        enlargedImage.style.left = '50%';
        enlargedImage.style.transform = 'translate(-50%, -50%) scale(0.8)';
        enlargedImage.style.maxWidth = '90vw';
        enlargedImage.style.maxHeight = '90vh';
        enlargedImage.style.zIndex = '1000';
        enlargedImage.style.opacity = '0';
        enlargedImage.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
        enlargedImage.style.borderRadius = '4px';
        enlargedImage.style.transition = 'transform 0.5s, opacity 0.5s';
        document.body.appendChild(enlargedImage);
        currentVideo = enlargedImage; // 复用currentVideo变量存储图片元素
        
        // 淡入并放大效果
        setTimeout(() => {
            enlargedImage.style.opacity = '1';
            enlargedImage.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
    }
    
    // 禁用控制器
    controls.unlock();
}

// 退出放大模式
function exitZoomMode() {
    console.log('exitZoomMode被调用，当前isZoomedIn状态:', isZoomedIn);
    if (!isZoomedIn) return;
    
    console.log('开始退出放大模式');
    isZoomedIn = false;
    
    // 立即移除视频或图片，不使用淡出效果
    if (currentVideo) {
        console.log('移除视频或图片元素:', currentVideo.tagName);
        if (currentVideo.tagName === 'VIDEO') {
            currentVideo.pause();
        }
        // 直接移除元素，不使用过渡效果
        try {
            if (document.body.contains(currentVideo)) {
                document.body.removeChild(currentVideo);
                console.log('已立即从DOM中移除视频/图片元素');
            } else {
                console.log('视频/图片元素不在DOM中');
            }
        } catch (error) {
            console.error('移除视频/图片元素时出错:', error);
        }
        currentVideo = null;
    } else {
        console.log('没有找到currentVideo元素');
    }
    
    // 立即移除遮罩，不使用淡出效果
    if (currentOverlay) {
        console.log('移除遮罩元素');
        try {
            if (document.body.contains(currentOverlay)) {
                document.body.removeChild(currentOverlay);
                console.log('已立即从DOM中移除遮罩元素');
            } else {
                console.log('遮罩元素不在DOM中');
            }
        } catch (error) {
            console.error('移除遮罩元素时出错:', error);
        }
        currentOverlay = null;
    } else {
        console.log('没有找到currentOverlay元素');
    }
    
    // 重置3D画廊到初始状态
    console.log('重置3D画廊到初始状态');
    
    // 清除现有的场景对象
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    // 重置相机位置
    camera.position.set(0, 1.7, 5);
    camera.rotation.set(0, 0, 0);
    
    // 重新创建场景
    createScene();
    
    // 重新创建灯光
    createLights();
    
    // 重新创建展厅
    createGallery();
    
    // 重新添加控制器到场景
    scene.add(controls.getObject());
    
    // 立即重新启用控制器
    console.log('重新锁定控制器');
    try {
        // 确保画廊状态被激活
        isGalleryActive = true;
        document.body.classList.add('gallery-active');
        controls.lock();
    } catch (error) {
        console.error('重新锁定控制器时出错:', error);
    }
    currentIntersectedFrame = null;
    
    console.log('exitZoomMode函数执行完毕');
}

// ...