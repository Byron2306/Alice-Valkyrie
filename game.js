/*
 * Alice: Valkyrie Star - Full-featured Platformer
 * Commander Keen style multi-corridor level design
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Fullscreen setup
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ============ AUDIO SYSTEM ============
    let audioCtx = null;
    let musicGain = null;
    let sfxGain = null;
    
    function initAudio() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.25;
        musicGain.connect(audioCtx.destination);
        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.4;
        sfxGain.connect(audioCtx.destination);
    }
    
    function playNote(freq, duration, type = 'square', gain = 0.3, dest = sfxGain) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(gain, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(g);
        g.connect(dest);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }
    
    // Nordic Viking scale (D minor with added drama)
    const vikingScale = [146.83, 164.81, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66];
    
    // Improved Nordic Music
    let musicInterval = null;
    let musicBeat = 0;
    
    function playLevelMusic() {
        if (musicInterval) clearInterval(musicInterval);
        // Epic Nordic melody pattern
        const melody = [0, 0, 4, 4, 5, 4, 3, 2, 3, 3, 5, 5, 7, 5, 4, 3];
        const harmony = [0, 2, 4, 2, 0, 2, 4, 5, 3, 5, 7, 5, 3, 2, 0, 2];
        const bass = [0, 0, 0, 0, 3, 3, 3, 3, 5, 5, 5, 5, 3, 3, 0, 0];
        musicBeat = 0;
        
        musicInterval = setInterval(() => {
            if (!audioCtx) return;
            const beat = musicBeat % 16;
            
            // Lead melody
            playNote(vikingScale[melody[beat]], 0.25, 'sawtooth', 0.08, musicGain);
            
            // Harmony (offset)
            if (beat % 2 === 0) {
                playNote(vikingScale[harmony[beat]] * 0.5, 0.4, 'triangle', 0.06, musicGain);
            }
            
            // Bass drone
            if (beat % 4 === 0) {
                playNote(vikingScale[bass[beat]] * 0.25, 0.6, 'sawtooth', 0.1, musicGain);
            }
            
            // War drums
            if (beat % 4 === 0) {
                playNote(60, 0.15, 'triangle', 0.15, musicGain);
            }
            if (beat % 4 === 2) {
                playNote(80, 0.1, 'triangle', 0.08, musicGain);
            }
            
            // Occasional horn flourish
            if (beat === 0 && musicBeat > 0 && musicBeat % 32 === 0) {
                playNote(vikingScale[7], 0.5, 'sawtooth', 0.12, musicGain);
                setTimeout(() => playNote(vikingScale[5], 0.4, 'sawtooth', 0.1, musicGain), 200);
            }
            
            musicBeat++;
        }, 180);
    }
    
    function stopMusic() {
        if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    }
    
    // Sound effects
    function playJumpSFX() {
        playNote(300, 0.08, 'square', 0.15);
        setTimeout(() => playNote(450, 0.1, 'square', 0.1), 30);
    }
    
    function playAttackSFX() {
        playNote(120, 0.1, 'sawtooth', 0.25);
        playNote(180, 0.08, 'sawtooth', 0.2);
    }
    
    function playHurtSFX() {
        playNote(250, 0.15, 'sawtooth', 0.2);
        playNote(180, 0.2, 'sawtooth', 0.15);
    }
    
    function playDeathSFX() {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => playNote(350 - i * 50, 0.15, 'sawtooth', 0.15), i * 80);
        }
    }
    
    function playHealSFX() {
        playNote(523, 0.12, 'sine', 0.15);
        setTimeout(() => playNote(659, 0.12, 'sine', 0.15), 80);
        setTimeout(() => playNote(784, 0.15, 'sine', 0.2), 160);
    }
    
    function playCollectSFX() {
        playNote(880, 0.08, 'sine', 0.12);
        setTimeout(() => playNote(1100, 0.1, 'sine', 0.15), 60);
    }
    
    function playCheckpointSFX() {
        playNote(392, 0.15, 'triangle', 0.15);
        setTimeout(() => playNote(494, 0.15, 'triangle', 0.15), 120);
        setTimeout(() => playNote(587, 0.2, 'triangle', 0.2), 240);
    }
    
    function playExitSFX() {
        [392, 494, 587, 784, 988].forEach((n, i) => 
            setTimeout(() => playNote(n, 0.25, 'sine', 0.15), i * 120));
    }

    // ============ ASSET CONFIGURATION ============
    const ASSETS = {
        // Hero - all normalized to consistent size
        heroIdle:   { path: 'assets/hero_idle.png',   w: 97,  h: 200, frames: 1, frameW: 97 },
        heroRun:    { path: 'assets/hero_run.png',    w: 476, h: 200, frames: 4, frameW: 119 },
        heroJump:   { path: 'assets/hero_jump.png',   w: 280, h: 200, frames: 2, frameW: 140 },
        heroAttack: { path: 'assets/hero_attack.png', w: 848, h: 200, frames: 4, frameW: 212 },
        
        // Enemies - larger frames for visibility
        enemy1: { path: 'assets/enemy1_sheet.png', w: 544, h: 108, frames: 4, frameW: 136 },
        enemy2: { path: 'assets/enemy2_sheet.png', w: 396, h: 97,  frames: 4, frameW: 99 },
        enemy3: { path: 'assets/enemy3_sheet.png', w: 460, h: 107, frames: 4, frameW: 115 },
        enemy4: { path: 'assets/enemy4_sheet.png', w: 448, h: 143, frames: 4, frameW: 112 },
        
        // Level tiles
        insideBase: { path: 'assets/inside base.png', w: 73, h: 67 },
        insideWall: { path: 'assets/inside wall.png', w: 83, h: 72 },
        floor:      { path: 'assets/floor.png',       w: 210, h: 158 },
        floor1:     { path: 'assets/floor1.png',      w: 197, h: 170 },
        ledge:      { path: 'assets/ledge.png',       w: 201, h: 136 },
        step:       { path: 'assets/step.png',        w: 247, h: 149 },
        lavaFloor:  { path: 'assets/lava wide.png',   w: 240, h: 72 },
        lavaFloorAlt:{ path: 'assets/lava floor.png', w: 218, h: 193 },
        spikeFloor: { path: 'assets/spike floor.png', w: 212, h: 193 },
        
        // Platforms
        hFloat:    { path: 'assets/horizontal float.png', w: 212, h: 167 },
        floatAlt:  { path: 'assets/float.png', w: 245, h: 189 },
        liftPully: { path: 'assets/lift pully .png', w: 231, h: 350 },
        
        // Interactive
        exit:   { path: 'assets/exit.png',   w: 403, h: 232 },
        runes:  { path: 'assets/runes.png',  w: 231, h: 196 },
        jewel:  { path: 'assets/jewel.png',  w: 57,  h: 82 },
        star:   { path: 'assets/star.png',   w: 67,  h: 73 },
        
        // Props
        barrel:   { path: 'assets/barrel.png',   w: 101, h: 116 },
        torch:    { path: 'assets/torch.png',    w: 68,  h: 172 },
        rocks:    { path: 'assets/rocks.png',    w: 227, h: 172 },
        tree:     { path: 'assets/tree.png',     w: 175, h: 187 },
        house1:   { path: 'assets/house1.png',   w: 126, h: 177 },
        house2:   { path: 'assets/house2.png',   w: 131, h: 189 },
        treasure: { path: 'assets/treasure.png', w: 155, h: 137 },
        
        // Title
        title: { path: 'assets/52671.png', w: 1536, h: 1024 }
    };

    const images = {};

    // ============ GRAY REMOVAL ============
    function removeGray(img) {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
            const r = d.data[i], g = d.data[i+1], b = d.data[i+2];
            const isGray = Math.abs(r-g) < 25 && Math.abs(g-b) < 25;
            if ((isGray && r > 140 && r < 245) || (r > 248 && g > 248 && b > 248)) {
                d.data[i+3] = 0;
            }
        }
        cx.putImageData(d, 0, 0);
        return c;
    }

    // ============ CONSTANTS ============
    const TILE_SIZE = 64;
    const GRAVITY = 1600;
    const PLAYER_SPEED = 320;
    const JUMP_FORCE = 620;
    const MAX_HEALTH = 100;
    const LEVEL_WIDTH = 8000;
    
    // Hero draw size - consistent across all states
    const HERO_DRAW_W = 90;
    const HERO_DRAW_H = 110;
    
    // Enemy sizes (larger than before)
    const ENEMY_SIZES = {
        enemy1: { w: 100, h: 80 },
        enemy2: { w: 90, h: 75 },
        enemy3: { w: 100, h: 85 },
        enemy4: { w: 110, h: 100 }
    };

    const DECOR_STYLE = {
        torch: { scale: 0.45, groundOffset: 2 },
        barrel: { scale: 0.52, groundOffset: 4 },
        rocks: { scale: 0.44, groundOffset: 5 },
        tree: { scale: 0.52, groundOffset: 2 },
        house1: { scale: 0.55, groundOffset: 4 },
        house2: { scale: 0.55, groundOffset: 4 },
        treasure: { scale: 0.45, groundOffset: 3 },
        default: { scale: 0.4, groundOffset: 4 }
    };

    // ============ INPUT ============
    const keys = {};
    let attackPressed = false;
    window.addEventListener('keydown', e => { 
        keys[e.key] = true;
        if (e.key === 'x' || e.key === 'X') attackPressed = true;
        if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    const isMobileDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches || ('ontouchstart' in window);
    const forceControls = true;
    const portraitQuery = window.matchMedia('(orientation: portrait)');
    const touchInput = {
        left: false,
        right: false,
        jump: false
    };

    function clearTouchMovement() {
        touchInput.left = false;
        touchInput.right = false;
    }

    function updateMobileOrientationState() {
        if (!isMobileDevice) return;
        if (portraitQuery.matches) {
            clearTouchMovement();
            touchInput.jump = false;
            attackPressed = false;
        }
    }

    function bindHoldButton(button, onPress, onRelease) {
        if (!button) return;

        const press = e => {
            e.preventDefault();
            onPress();
        };
        const release = e => {
            e.preventDefault();
            onRelease();
        };

        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('pointerleave', release);
    }

    function initMobileControls() {
        if (!isMobileDevice && !forceControls) return;

        const joystickZone = document.getElementById('joystickZone');
        const jumpBtn = document.getElementById('jumpBtn');
        const attackBtn = document.getElementById('attackBtn');

        if (window.nipplejs && joystickZone) {
            const joystick = window.nipplejs.create({
                zone: joystickZone,
                mode: 'static',
                position: { left: '50%', top: '50%' },
                color: 'white',
                size: 130,
                restOpacity: 0.35
            });

            joystick.on('move', (_, data) => {
                const x = data && data.vector ? data.vector.x : 0;
                touchInput.left = x < -0.35;
                touchInput.right = x > 0.35;
            });

            joystick.on('end', () => {
                clearTouchMovement();
            });
        } else if (joystickZone) {
            // Fallback joystick for environments where nipplejs is unavailable.
            let pointerId = null;
            let centerX = 0;
            let centerY = 0;

            const recenter = () => {
                const rect = joystickZone.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
            };

            const updateFallbackAxis = clientX => {
                const dx = clientX - centerX;
                touchInput.left = dx < -20;
                touchInput.right = dx > 20;
            };

            joystickZone.addEventListener('pointerdown', e => {
                pointerId = e.pointerId;
                recenter();
                joystickZone.setPointerCapture(pointerId);
                updateFallbackAxis(e.clientX);
                e.preventDefault();
            });

            joystickZone.addEventListener('pointermove', e => {
                if (pointerId !== e.pointerId) return;
                updateFallbackAxis(e.clientX);
                e.preventDefault();
            });

            const releaseFallback = e => {
                if (pointerId !== e.pointerId) return;
                clearTouchMovement();
                pointerId = null;
                e.preventDefault();
            };

            joystickZone.addEventListener('pointerup', releaseFallback);
            joystickZone.addEventListener('pointercancel', releaseFallback);
            window.addEventListener('resize', recenter);
        }

        bindHoldButton(
            jumpBtn,
            () => {
                touchInput.jump = true;
                jumpBtn.classList.add('pressed');
            },
            () => {
                touchInput.jump = false;
                jumpBtn.classList.remove('pressed');
            }
        );

        bindHoldButton(
            attackBtn,
            () => {
                attackPressed = true;
                attackBtn.classList.add('pressed');
            },
            () => {
                attackBtn.classList.remove('pressed');
            }
        );

        if (typeof portraitQuery.addEventListener === 'function') {
            portraitQuery.addEventListener('change', updateMobileOrientationState);
        } else if (typeof portraitQuery.addListener === 'function') {
            portraitQuery.addListener(updateMobileOrientationState);
        }
        window.addEventListener('resize', updateMobileOrientationState);
        updateMobileOrientationState();
    }

    // ============ PLAYER ============
    const player = {
        x: 200, y: 400,
        vx: 0, vy: 0,
        width: 50, height: 100,
        onGround: false,
        facingRight: true,
        state: 'idle',
        frame: 0, frameTime: 0,
        health: MAX_HEALTH,
        lives: 3,
        attacking: false,
        attackTimer: 0,
        invulnerable: 0,
        jewels: 0,
        checkpointX: 200, checkpointY: 400
    };

    // ============ LEVEL DATA ============
    // Surface + underground routes inspired by Commander Keen 4:
    // readable outdoor ground, village/set-piece landmarks, and
    // branching cave puzzle paths below.
    const CORRIDORS = [
        { y: 200, name: 'upper' },    // Upper corridor
        { y: 380, name: 'middle' },   // Middle corridor  
        { y: 560, name: 'lower' },    // Main ground
        { y: 740, name: 'basement' }, // Below ground
        { y: 920, name: 'deep' }      // Deep underground
    ];
    
    let platforms = [];
    let movingPlatforms = [];
    let lifts = [];
    let jewels = [];
    let stars = [];
    let checkpoints = [];
    let exitPortal = null;
    let enemies = [];
    let hazards = [];
    let decorations = [];
    let roomWalls = [];
    let cornerBlocks = [];
    let sideBlocks = [];
    let roomCaps = [];
    let roomBackdrops = [];

    // ============ LEVEL GENERATOR ============
    function generateLevel() {
        platforms = [];
        movingPlatforms = [];
        lifts = [];
        jewels = [];
        stars = [];
        checkpoints = [];
        enemies = [];
        hazards = [];
        decorations = [];
        roomWalls = [];
        cornerBlocks = [];
        sideBlocks = [];
        roomCaps = [];
        roomBackdrops = [];

        const enemyTypes = ['enemy1', 'enemy2', 'enemy3', 'enemy4'];
        const addPlatform = (x, y, w, type = 'floor', options = {}) => {
            const platform = { x, y, w, type, corridor: options.corridor ?? -1 };
            if (options.surface) platform.surface = true;
            if (options.isCave || type === 'cave') platform.isCave = true;
            platforms.push(platform);

            if (options.caps !== false) {
                const sideKind = type === 'cave' ? 'wallSide' : 'ledgeSide';
                sideBlocks.push({ x: x - 42, y: y - 4, w: 46, h: 86, side: 'left', kind: sideKind });
                sideBlocks.push({ x: x + w - 4, y: y - 4, w: 46, h: 86, side: 'right', kind: sideKind });
            }
            return platform;
        };

        const addGround = (x, y, w, options = {}) => {
            addPlatform(x, y, w, options.type || 'floor', { ...options, surface: true, caps: options.caps ?? false });
            addPlatform(x, y + 64, w, 'cave', { isCave: true, caps: false });
        };

        const addBackdrop = (x, y, w, h, openTop = false) => {
            roomBackdrops.push({ x, y, w, h });
            if (!openTop) roomCaps.push({ x: x - 18, y: y - 22, w: w + 36 });
        };

        const addWall = (x, y, h, side = 'left') => roomWalls.push({ x, y, h, side });

        const addDecor = (type, x, floorY) => {
            decorations.push({ type, x: Math.round(x / TILE_SIZE) * TILE_SIZE, floorY });
        };

        const addInteriorCluster = (x, floorY, variant = 0) => {
            const clusters = [
                [['torch', -40], ['barrel', 70], ['rocks', 210], ['runes', 360]],
                [['rocks', -20], ['torch', 130], ['treasure', 270], ['barrel', 430]],
                [['barrel', -30], ['runes', 120], ['torch', 280], ['rocks', 430]]
            ];
            clusters[variant % clusters.length].forEach(([type, dx]) => addDecor(type, x + dx, floorY));
        };

        const addEnemy = (type, x, floorY, range = 120, attackPattern = 0) => {
            const size = ENEMY_SIZES[type];
            enemies.push({
                x,
                y: floorY - size.h,
                type,
                startX: x,
                startY: floorY - size.h,
                range,
                dir: x % 2 === 0 ? 1 : -1,
                frame: 0,
                frameTime: 0,
                health: 35 + attackPattern * 10,
                alive: true,
                attackPattern,
                attackCooldown: 0,
                projectiles: [],
                vx: 0,
                vy: 0
            });
        };

        const addJumpChain = (startX, startY, steps, cave = false) => {
            steps.forEach((step, idx) => {
                addPlatform(startX + step[0], startY + step[1], step[2], idx % 2 === 0 ? 'ledge' : 'step', {
                    isCave: cave,
                    caps: true
                });
            });
        };

        // Surface route: rolling ground, village landmarks, trees, and broken cliffs.
        [
            [0, 560, 720, 'floor'],
            [820, 560, 420, 'floor1'],
            [1340, 520, 620, 'floor'],
            [2080, 560, 520, 'floor1'],
            [2760, 540, 560, 'floor'],
            [3500, 560, 360, 'floor1'],
            [4160, 520, 520, 'floor'],
            [4900, 560, 520, 'floor1'],
            [5660, 540, 420, 'floor'],
            [6340, 560, 560, 'floor1'],
            [7240, 520, 620, 'floor']
        ].forEach(([x, y, w, type]) => addGround(x, y, w, { type, corridor: 2 }));

        // Surface scenery tells the player where they are, not just what to jump on.
        [
            ['tree', 210, 560], ['rocks', 430, 560], ['house1', 920, 560],
            ['barrel', 1110, 560], ['tree', 1470, 520], ['house2', 2260, 560],
            ['tree', 2860, 540], ['rocks', 3130, 540], ['barrel', 3660, 560],
            ['house1', 4320, 520], ['tree', 5070, 560], ['rocks', 5850, 540],
            ['house2', 6420, 560], ['tree', 7470, 520], ['treasure', 7700, 520]
        ].forEach(([type, x, y]) => addDecor(type, x, y));

        [
            ['tree', 40, 560], ['barrel', 640, 560], ['torch', 970, 560],
            ['rocks', 1680, 520], ['tree', 1880, 520], ['torch', 2360, 560],
            ['house1', 2910, 540], ['barrel', 3220, 540], ['tree', 4230, 520],
            ['torch', 4440, 520], ['rocks', 5160, 560], ['house2', 5820, 540],
            ['barrel', 6030, 540], ['torch', 6470, 560], ['rocks', 7270, 520]
        ].forEach(([type, x, y]) => addDecor(type, x, y));

        // Upper secret ledges and hard outdoor jump chains.
        addJumpChain(620, 430, [[0, 0, 130], [210, -70, 120], [410, -130, 115], [620, -70, 130]], false);
        addJumpChain(1960, 470, [[0, 0, 115], [180, -75, 105], [365, -145, 105], [555, -215, 120], [760, -150, 105]], false);
        addJumpChain(3860, 430, [[0, 0, 120], [190, -80, 110], [410, -135, 115], [640, -90, 100]], false);
        addJumpChain(6080, 460, [[0, 0, 105], [175, -70, 105], [350, -140, 105], [530, -210, 120]], false);
        addJumpChain(4960, 440, [[0, 0, 95], [155, -80, 90], [315, -160, 90], [500, -245, 100], [705, -170, 95]], false);

        // Main route hazards force vertical detours instead of a flat run.
        hazards.push({ x: 730, y: 525, type: 'spike', w: 90, hitH: 42, drawH: 52 });
        hazards.push({ x: 1240, y: 525, type: 'lava', w: 100, variant: 'wide', hitH: 30, drawH: 45 });
        hazards.push({ x: 1960, y: 485, type: 'spike', w: 120, hitH: 42, drawH: 52 });
        hazards.push({ x: 2620, y: 525, type: 'lava', w: 140, variant: 'alt', hitH: 34, drawH: 48 });
        hazards.push({ x: 3860, y: 525, type: 'spike', w: 180, hitH: 42, drawH: 52 });
        hazards.push({ x: 5220, y: 525, type: 'lava', w: 180, variant: 'wide', hitH: 34, drawH: 48 });
        hazards.push({ x: 6980, y: 525, type: 'spike', w: 190, hitH: 42, drawH: 52 });
        hazards.push({ x: 3400, y: 525, type: 'lava', w: 100, variant: 'alt', hitH: 34, drawH: 48 });
        hazards.push({ x: 6080, y: 505, type: 'spike', w: 130, hitH: 42, drawH: 52 });

        // Underground cave network: asymmetrical tunnels, shafts, and backtracking rewards.
        [
            [700, 740, 560], [1480, 740, 360], [2220, 720, 520],
            [3000, 760, 760], [4020, 720, 460], [4680, 780, 620],
            [5600, 740, 520], [6520, 760, 680], [7240, 700, 440]
        ].forEach(([x, y, w]) => addPlatform(x, y, w, 'cave', { isCave: true, corridor: 3 }));

        [
            [960, 920, 620], [1880, 940, 700], [2860, 920, 520],
            [3820, 980, 700], [4920, 940, 680], [6060, 960, 720]
        ].forEach(([x, y, w]) => addPlatform(x, y, w, 'cave', { isCave: true, corridor: 4 }));

        // Cave ceilings and side walls are visual only, leaving jumps readable.
        [
            [620, 650, 1220, 360], [2120, 635, 1220, 410], [3820, 620, 1360, 470],
            [5600, 650, 1420, 420]
        ].forEach(([x, y, w, h]) => addBackdrop(x, y, w, h));
        [[620, 650, 360], [1830, 650, 360], [2120, 635, 410], [3310, 635, 410],
         [3820, 620, 470], [5140, 620, 470], [5600, 650, 420], [6990, 650, 420]]
            .forEach(([x, y, h], idx) => addWall(x, y, h, idx % 2 === 0 ? 'left' : 'right'));

        // Branch connectors: ledges, lifts, and timed platforms between surface and caves.
        addJumpChain(760, 665, [[0, 0, 105], [180, -70, 105], [360, -130, 105]], true);
        addJumpChain(1410, 670, [[0, 0, 110], [170, 80, 120], [360, 155, 110], [550, 85, 120]], true);
        addJumpChain(2560, 650, [[0, 0, 105], [190, 72, 105], [380, 140, 105], [590, 70, 115]], true);
        addJumpChain(4360, 650, [[0, 0, 105], [190, 72, 100], [380, 142, 105], [575, 215, 110]], true);
        addJumpChain(5960, 675, [[0, 0, 110], [180, -80, 105], [370, -150, 105], [580, -90, 110]], true);
        addJumpChain(1760, 865, [[0, 0, 96], [170, -78, 92], [345, -150, 92], [520, -84, 98]], true);
        addJumpChain(5000, 875, [[0, 0, 92], [155, -82, 90], [320, -164, 90], [500, -246, 100]], true);

        lifts.push({ x: 1180, y: 880, topY: 500, bottomY: 880, speed: 88, dir: -1, chainLen: 0 });
        lifts.push({ x: 3440, y: 900, topY: 540, bottomY: 900, speed: 92, dir: -1, chainLen: 0 });
        lifts.push({ x: 7050, y: 880, topY: 520, bottomY: 880, speed: 86, dir: -1, chainLen: 0 });

        movingPlatforms.push({ x: 1280, y: 675, startX: 1280, range: 150, speed: 95, dir: 1, sprite: 'hFloat' });
        movingPlatforms.push({ x: 2680, y: 620, startX: 2680, range: 190, speed: 105, dir: -1, sprite: 'floatAlt' });
        movingPlatforms.push({ x: 5410, y: 700, startX: 5410, range: 180, speed: 110, dir: 1, sprite: 'hFloat' });
        movingPlatforms.push({ x: 6760, y: 625, startX: 6760, range: 160, speed: 100, dir: -1, sprite: 'floatAlt' });
        movingPlatforms.push({ x: 1900, y: 830, startX: 1900, range: 210, speed: 120, dir: 1, sprite: 'hFloat' });
        movingPlatforms.push({ x: 3980, y: 840, startX: 3980, range: 150, speed: 130, dir: -1, sprite: 'floatAlt' });
        movingPlatforms.push({ x: 6160, y: 815, startX: 6160, range: 210, speed: 118, dir: 1, sprite: 'hFloat' });

        // Rewards deliberately sit on alternate paths.
        jewels.push({ x: 830, y: 240, collected: false });
        jewels.push({ x: 2510, y: 510, collected: false });
        jewels.push({ x: 3060, y: 835, collected: false });
        jewels.push({ x: 4570, y: 880, collected: false });
        jewels.push({ x: 6330, y: 210, collected: false });
        jewels.push({ x: 7460, y: 420, collected: false });
        stars.push({ x: 1540, y: 850, collected: false });
        stars.push({ x: 4680, y: 305, collected: false });
        stars.push({ x: 6100, y: 875, collected: false });
        stars.push({ x: 5460, y: 180, collected: false });

        checkpoints.push({ x: 1010, y: 650, activated: false });
        checkpoints.push({ x: 3270, y: 670, activated: false });
        checkpoints.push({ x: 5730, y: 650, activated: false });

        // Enemies are placed by encounter shape rather than per-room quota.
        [
            ['enemy1', 520, 560, 130, 0], ['enemy2', 1520, 520, 150, 1],
            ['enemy3', 2320, 560, 120, 2], ['enemy1', 3020, 540, 130, 0],
            ['enemy4', 4380, 520, 95, 3], ['enemy2', 5740, 540, 120, 1],
            ['enemy3', 6560, 560, 150, 2], ['enemy1', 7440, 520, 100, 0],
            ['enemy2', 930, 740, 120, 1], ['enemy4', 2260, 720, 90, 3],
            ['enemy3', 3180, 760, 130, 2], ['enemy1', 4160, 720, 120, 0],
            ['enemy4', 5020, 780, 90, 3], ['enemy2', 6220, 960, 130, 1]
        ].forEach(([type, x, floorY, range, pattern]) => addEnemy(type, x, floorY, range, pattern));

        // Cave dressing and landmarks.
        [
            ['torch', 760, 740], ['barrel', 1060, 740], ['rocks', 1550, 740],
            ['torch', 2300, 720], ['treasure', 3020, 920], ['rocks', 3900, 980],
            ['torch', 4280, 720], ['barrel', 4840, 780], ['rocks', 5660, 740],
            ['torch', 6260, 960], ['treasure', 6840, 760], ['runes', 7240, 700]
        ].forEach(([type, x, y]) => addDecor(type, x, y));

        addInteriorCluster(860, 740, 0);
        addInteriorCluster(2250, 720, 1);
        addInteriorCluster(3050, 760, 2);
        addInteriorCluster(4020, 720, 0);
        addInteriorCluster(4950, 780, 1);
        addInteriorCluster(6060, 960, 2);
        addInteriorCluster(6600, 760, 0);

        [
            [1120, 706, 90], [1640, 706, 120], [2480, 686, 110], [3260, 726, 130],
            [4120, 686, 120], [4740, 746, 150], [5840, 706, 110], [6640, 726, 160],
            [1260, 886, 130], [2200, 906, 150], [3020, 886, 110], [4300, 946, 170],
            [5360, 906, 130], [6420, 926, 160]
        ].forEach(([x, y, w], idx) => hazards.push({
            x,
            y,
            type: idx % 3 === 0 ? 'lava' : 'spike',
            w,
            variant: idx % 3 === 0 ? 'wide' : null,
            hitH: idx % 3 === 0 ? 32 : 42,
            drawH: idx % 3 === 0 ? 46 : 52
        }));

        exitPortal = {
            x: LEVEL_WIDTH - 360,
            y: 390,
            open: false
        };
    }

    // ============ GAME STATE ============
    let gameState = 'title';
    let lastTime = 0;
    let cameraX = 0;
    let cameraY = 0;

    // ============ IMAGE LOADING ============
    function loadImages() {
        return Promise.all(Object.entries(ASSETS).map(([key, cfg]) => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => { try { images[key] = removeGray(img); } catch(e) { console.warn('removeGray failed, using original image:', e.message); images[key] = img; } resolve(); };
                img.onerror = () => { console.error('Failed:', cfg.path); resolve(); };
                img.src = cfg.path;
            });
        }));
    }

    // ============ COLLISION ============
    function rectIntersect(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && 
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function getPlayerBox() {
        return { 
            x: player.x + 15, 
            y: player.y + 10, 
            w: player.width - 30, 
            h: player.height - 15 
        };
    }

    function checkPlatformCollision() {
        const box = getPlayerBox();
        let onPlatform = null;
        
        // Check static platforms
        for (const p of platforms) {
            if (box.x + box.w > p.x && box.x < p.x + p.w) {
                const platformTop = p.y;
                const playerBottom = box.y + box.h;
                
                if (playerBottom >= platformTop && playerBottom < platformTop + 30 && player.vy >= 0) {
                    player.y = platformTop - player.height + 10;
                    player.vy = 0;
                    player.onGround = true;
                    onPlatform = p;
                    break;
                }
            }
        }
        
        // Check moving platforms
        if (!onPlatform) {
            for (const p of movingPlatforms) {
                if (box.x + box.w > p.x && box.x < p.x + 140) {
                    const platformTop = p.y;
                    const playerBottom = box.y + box.h;
                    
                    if (playerBottom >= platformTop && playerBottom < platformTop + 30 && player.vy >= 0) {
                        player.y = platformTop - player.height + 10;
                        player.vy = 0;
                        player.onGround = true;
                        onPlatform = { ...p, isMoving: true };
                        break;
                    }
                }
            }
        }
        
        // Check lifts
        if (!onPlatform) {
            for (const l of lifts) {
                if (box.x + box.w > l.x && box.x < l.x + 140) {
                    const platformTop = l.y;
                    const playerBottom = box.y + box.h;
                    
                    if (playerBottom >= platformTop && playerBottom < platformTop + 30 && player.vy >= 0) {
                        player.y = platformTop - player.height + 10;
                        player.vy = 0;
                        player.onGround = true;
                        onPlatform = { ...l, isLift: true };
                        break;
                    }
                }
            }
        }
        
        return onPlatform;
    }

    // ============ UPDATES ============
    function updatePlayer(dt) {
        const moveLeft = keys['ArrowLeft'] || keys['a'] || keys['A'] || touchInput.left;
        const moveRight = keys['ArrowRight'] || keys['d'] || keys['D'] || touchInput.right;
        const jumpKey = keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' '] || touchInput.jump;
        const attackKey = keys['x'] || keys['X'] || attackPressed;

        if (player.invulnerable > 0) player.invulnerable -= dt;

        // Attack
        if (attackKey && !player.attacking && player.onGround) {
            player.attacking = true;
            player.attackTimer = 0.4;
            player.frame = 0;
            attackPressed = false;
            playAttackSFX();
        }
        
        if (player.attacking) {
            player.attackTimer -= dt;
            if (player.attackTimer <= 0) player.attacking = false;
        }

        // Movement
        player.vx = 0;
        if (!player.attacking) {
            if (moveLeft) { player.vx = -PLAYER_SPEED; player.facingRight = false; }
            if (moveRight) { player.vx = PLAYER_SPEED; player.facingRight = true; }
        }

        // Jump
        if (jumpKey && player.onGround && !player.attacking) {
            player.vy = -JUMP_FORCE;
            player.onGround = false;
            touchInput.jump = false;
            playJumpSFX();
        }

        // Physics
        player.vy += GRAVITY * dt;
        if (player.vy > 1000) player.vy = 1000;
        
        player.x += player.vx * dt;
        
        // Bounds
        if (player.x < 0) player.x = 0;
        if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;

        // Apply vertical movement then check collision
        player.y += player.vy * dt;
        player.onGround = false;
        
        const platform = checkPlatformCollision();
        
        // Move with platform
        if (platform && platform.isMoving) {
            player.x += platform.dir * platform.speed * dt;
        }

        // Death by falling
        if (player.y > CORRIDORS[CORRIDORS.length - 1].y + 200) {
            playerDie();
        }

        // Animation state
        if (player.attacking) {
            player.state = 'attack';
        } else if (!player.onGround) {
            player.state = 'jump';
        } else if (Math.abs(player.vx) > 10) {
            player.state = 'run';
        } else {
            player.state = 'idle';
        }

        // Animate with consistent timing to prevent flicker
        player.frameTime += dt;
        let fps, maxFrames;
        switch (player.state) {
            case 'run': fps = 8; maxFrames = 4; break;
            case 'attack': fps = 10; maxFrames = 4; break;
            case 'jump': fps = 6; maxFrames = 2; break;
            default: fps = 4; maxFrames = 1; break;
        }
        
        if (player.frameTime > 1 / fps) {
            player.frameTime = 0;
            player.frame = (player.frame + 1) % maxFrames;
        }

        checkCollectibles();
        checkHazards();
        checkExit();
    }

    function playerDie() {
        player.lives--;
        playDeathSFX();
        if (player.lives <= 0) {
            gameState = 'gameover';
            stopMusic();
        } else {
            player.x = player.checkpointX;
            player.y = player.checkpointY;
            player.health = MAX_HEALTH;
            player.vy = 0;
            player.invulnerable = 2;
        }
    }

    function checkCollectibles() {
        const box = getPlayerBox();
        
        jewels.forEach(j => {
            if (!j.collected && rectIntersect(box, { x: j.x, y: j.y, w: 40, h: 60 })) {
                j.collected = true;
                player.jewels++;
                playCollectSFX();
                if (player.jewels >= 5 && exitPortal) exitPortal.open = true;
            }
        });
        
        stars.forEach(s => {
            if (!s.collected && rectIntersect(box, { x: s.x, y: s.y, w: 50, h: 50 })) {
                s.collected = true;
                player.lives++;
                player.health = MAX_HEALTH;
                playHealSFX();
            }
        });
        
        checkpoints.forEach(cp => {
            if (!cp.activated && rectIntersect(box, { x: cp.x, y: cp.y, w: 90, h: 90 })) {
                cp.activated = true;
                player.checkpointX = cp.x;
                player.checkpointY = cp.y - 20;
                playCheckpointSFX();
            }
        });
    }

    function checkHazards() {
        if (player.invulnerable > 0) return;
        const box = getPlayerBox();
        
        hazards.forEach(h => {
            if (rectIntersect(box, { x: h.x, y: h.y, w: h.w, h: h.hitH || 30 })) {
                player.health -= 25;
                player.invulnerable = 1.2;
                player.vy = -250;
                playHurtSFX();
                if (player.health <= 0) playerDie();
            }
        });
    }

    function checkExit() {
        if (exitPortal && exitPortal.open) {
            const box = getPlayerBox();
            if (rectIntersect(box, { x: exitPortal.x, y: exitPortal.y, w: 120, h: 120 })) {
                gameState = 'victory';
                stopMusic();
                playExitSFX();
            }
        }
    }

    function updateEnemies(dt) {
        const attackBox = player.attacking && player.attackTimer > 0.15 ? {
            x: player.facingRight ? player.x + player.width : player.x - 70,
            y: player.y + 20, w: 70, h: player.height - 30
        } : null;

        enemies.forEach(e => {
            if (!e.alive) return;
            
            const cfg = ASSETS[e.type];
            const size = ENEMY_SIZES[e.type];
            
            // Animate
            e.frameTime += dt;
            if (e.frameTime > 0.1) {
                e.frameTime = 0;
                e.frame = (e.frame + 1) % cfg.frames;
            }
            
            // Attack patterns
            e.attackCooldown -= dt;
            const distToPlayer = Math.abs(player.x - e.x);
            const playerNear = distToPlayer < 400;
            
            switch (e.attackPattern) {
                case 0: // Patrol - basic back and forth
                    e.x += e.dir * 60 * dt;
                    if (e.x > e.startX + e.range) e.dir = -1;
                    if (e.x < e.startX - e.range) e.dir = 1;
                    break;
                    
                case 1: // Chase - follows player when near
                    if (playerNear) {
                        e.dir = player.x > e.x ? 1 : -1;
                        e.x += e.dir * 100 * dt;
                    } else {
                        e.x += e.dir * 50 * dt;
                        if (e.x > e.startX + e.range) e.dir = -1;
                        if (e.x < e.startX - e.range) e.dir = 1;
                    }
                    break;
                    
                case 2: // Jumper - hops toward player
                    e.x += e.dir * 40 * dt;
                    if (e.x > e.startX + e.range) e.dir = -1;
                    if (e.x < e.startX - e.range) e.dir = 1;
                    
                    // Jump attack
                    if (playerNear && e.attackCooldown <= 0 && e.vy === 0) {
                        e.vy = -400;
                        e.attackCooldown = 2;
                        e.dir = player.x > e.x ? 1 : -1;
                    }
                    
                    // Gravity for jumper
                    if (e.vy !== undefined) {
                        e.vy += GRAVITY * 0.7 * dt;
                        e.y += e.vy * dt;
                        if (e.y > e.startY) {
                            e.y = e.startY;
                            e.vy = 0;
                        }
                    }
                    break;
                    
                case 3: // Shooter - fires projectiles
                    e.x += e.dir * 30 * dt;
                    if (e.x > e.startX + e.range * 0.5) e.dir = -1;
                    if (e.x < e.startX - e.range * 0.5) e.dir = 1;
                    
                    // Shoot
                    if (playerNear && e.attackCooldown <= 0) {
                        e.projectiles.push({
                            x: e.x + size.w / 2,
                            y: e.y + size.h / 2,
                            vx: player.x > e.x ? 300 : -300,
                            life: 3
                        });
                        e.attackCooldown = 1.5;
                    }
                    break;
            }
            
            // Update projectiles
            e.projectiles = e.projectiles.filter(p => {
                p.x += p.vx * dt;
                p.life -= dt;
                
                // Hit player
                if (player.invulnerable <= 0 && rectIntersect(
                    getPlayerBox(),
                    { x: p.x - 10, y: p.y - 10, w: 20, h: 20 }
                )) {
                    player.health -= 20;
                    player.invulnerable = 1;
                    playHurtSFX();
                    if (player.health <= 0) playerDie();
                    return false;
                }
                
                return p.life > 0;
            });
            
            // Player attack hit
            if (attackBox) {
                const eBox = { x: e.x, y: e.y, w: size.w, h: size.h };
                if (rectIntersect(attackBox, eBox)) {
                    e.health -= 20;
                    if (e.health <= 0) e.alive = false;
                }
            }
            
            // Enemy hits player
            if (player.invulnerable <= 0) {
                const eBox = { x: e.x + 10, y: e.y + 10, w: size.w - 20, h: size.h - 20 };
                if (rectIntersect(getPlayerBox(), eBox)) {
                    player.health -= 15;
                    player.invulnerable = 1.5;
                    player.vy = -200;
                    playHurtSFX();
                    if (player.health <= 0) playerDie();
                }
            }
        });
    }

    function updateMovingPlatforms(dt) {
        movingPlatforms.forEach(p => {
            p.x += p.dir * p.speed * dt;
            if (p.x > p.startX + p.range) p.dir = -1;
            if (p.x < p.startX - p.range) p.dir = 1;
        });
    }

    function updateLifts(dt) {
        lifts.forEach(l => {
            l.y += l.dir * l.speed * dt;
            if (l.y <= l.topY) { l.dir = 1; l.y = l.topY; }
            if (l.y >= l.bottomY) { l.dir = -1; l.y = l.bottomY; }
            l.chainLen = Math.max(0, l.y - l.topY);
        });
    }

    // ============ DRAWING ============
    function drawBackground() {
        const underground = Math.max(0, Math.min(1, (cameraY - 420) / 440));
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, underground > 0.55 ? '#080510' : '#153b64');
        gradient.addColorStop(0.35, underground > 0.55 ? '#130a20' : '#3d6f8e');
        gradient.addColorStop(0.7, underground > 0.55 ? '#1a0c28' : '#6f8b6b');
        gradient.addColorStop(1, underground > 0.55 ? '#08040d' : '#23351f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (underground < 0.85) {
            ctx.save();
            ctx.globalAlpha = 1 - underground;
            ctx.fillStyle = 'rgba(255, 224, 142, 0.65)';
            ctx.beginPath();
            ctx.arc(canvas.width * 0.78 - (cameraX * 0.03) % 220, 95 - cameraY * 0.03, 54, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(37, 51, 55, 0.5)';
            for (let i = 0; i < 9; i++) {
                const mx = i * 280 - (cameraX * 0.08) % 280;
                const mh = 90 + (i * 31) % 80;
                const baseY = canvas.height * 0.72 - cameraY * 0.08;
                ctx.beginPath();
                ctx.moveTo(mx - 40, baseY);
                ctx.lineTo(mx + 120, baseY - mh);
                ctx.lineTo(mx + 300, baseY);
                ctx.fill();
            }

            ctx.fillStyle = 'rgba(28, 73, 43, 0.55)';
            for (let i = 0; i < 18; i++) {
                const hx = i * 190 - (cameraX * 0.18) % 190;
                const baseY = canvas.height * 0.82 - cameraY * 0.14;
                ctx.beginPath();
                ctx.ellipse(hx, baseY, 170, 42 + (i % 3) * 12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (underground > 0.15) {
            ctx.save();
            ctx.globalAlpha = underground;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            for (let i = 0; i < 60; i++) {
                const sx = ((i * 173 - cameraX * 0.05) % (canvas.width + 260)) - 130;
                const sy = ((i * 97 - cameraY * 0.04) % (canvas.height + 220)) - 80;
                ctx.fillRect(sx, sy, 36 + (i % 4) * 18, 8 + (i % 3) * 6);
            }
            ctx.restore();
        }
    }

    function drawPlatforms() {
        platforms.forEach(p => {
            const drawX = Math.floor(p.x - cameraX);
            const drawY = Math.floor(p.y - cameraY);
            
            if (drawX > -400 && drawX < canvas.width + 100) {
                if (p.type === 'cave') {
                    // Interior floor uses base blocks plus a clearer walkable trim.
                    const baseImg = images.insideBase;
                    if (baseImg) {
                        for (let tx = 0; tx < p.w; tx += TILE_SIZE) {
                            const tw = Math.min(TILE_SIZE, p.w - tx);
                            ctx.drawImage(baseImg, 0, 0, ASSETS.insideBase.w, ASSETS.insideBase.h,
                                drawX + tx, drawY, tw + 1, TILE_SIZE);
                        }
                    }

                    const trimImg = images.floor1 || images.floor;
                    if (trimImg) {
                        for (let tx = 0; tx < p.w; tx += 96) {
                            const tw = Math.min(98, p.w - tx + 2);
                            ctx.drawImage(trimImg, drawX + tx, drawY - 12, tw, 28);
                        }
                    }
                } else if (p.type === 'ledge') {
                    const img = images.ledge;
                    if (img) ctx.drawImage(img, drawX, drawY, p.w, 50);
                } else if (p.type === 'step') {
                    const img = images.step || images.ledge;
                    if (img) ctx.drawImage(img, drawX, drawY - 6, p.w, 56);
                } else {
                    // Outside floor tiles - seamless with overlap
                    const img = images[p.type] || images.floor;
                    if (img) {
                        const tileStep = 60;
                        for (let tx = 0; tx < p.w; tx += tileStep) {
                            const tw = Math.min(tileStep + 16, p.w - tx + 16);
                            ctx.drawImage(img, drawX + tx, drawY, tw, 70);
                        }
                    }

                    if (p.surface) {
                        ctx.fillStyle = '#4f9a38';
                        ctx.fillRect(drawX, drawY - 8, p.w, 10);
                        ctx.fillStyle = '#8bcf4f';
                        for (let gx = 0; gx < p.w; gx += 18) {
                            const bladeX = drawX + gx + ((gx / 18) % 3) * 3;
                            ctx.beginPath();
                            ctx.moveTo(bladeX, drawY - 8);
                            ctx.lineTo(bladeX + 5, drawY - 18 - (gx % 4) * 2);
                            ctx.lineTo(bladeX + 10, drawY - 8);
                            ctx.fill();
                        }
                    }
                }
            }
        });
    }

    function drawRoomBackdrops() {
        const tileImg = images.insideWall || images.insideBase;
        if (!tileImg) return;

        roomBackdrops.forEach(room => {
            const drawX = Math.floor(room.x - cameraX);
            const drawY = Math.floor(room.y - cameraY);

            if (drawX > canvas.width + 120 || drawX + room.w < -120) return;

            ctx.save();
            ctx.globalAlpha = 0.38;
            ctx.beginPath();
            ctx.rect(drawX, drawY, room.w, room.h);
            ctx.clip();

            for (let tx = 0; tx < room.w; tx += TILE_SIZE) {
                for (let ty = 0; ty < room.h; ty += TILE_SIZE) {
                    const tileW = Math.min(TILE_SIZE, room.w - tx);
                    const tileH = Math.min(TILE_SIZE, room.h - ty);
                    ctx.drawImage(
                        tileImg,
                        0,
                        0,
                        ASSETS.insideWall.w,
                        ASSETS.insideWall.h,
                        drawX + tx,
                        drawY + ty,
                        tileW,
                        tileH
                    );
                }
            }

            ctx.restore();
        });
    }

    function drawRoomWallsAndCorners() {
        const wallImg = images.insideWall || images.insideBase;
        if (wallImg) {
            roomCaps.forEach(cap => {
                const drawX = Math.floor(cap.x - cameraX);
                const drawY = Math.floor(cap.y - cameraY);
                if (drawX < -200 || drawX > canvas.width + 200) return;

                for (let tx = 0; tx < cap.w; tx += 52) {
                    const tw = Math.min(52, cap.w - tx);
                    ctx.drawImage(wallImg, 0, 0, ASSETS.insideWall.w, ASSETS.insideWall.h, drawX + tx, drawY, tw, 30);
                }
            });

            roomWalls.forEach(wall => {
                const drawX = Math.floor(wall.x - cameraX);
                const drawY = Math.floor(wall.y - cameraY);

                if (drawX < -140 || drawX > canvas.width + 140) return;

                for (let ty = 0; ty < wall.h; ty += TILE_SIZE) {
                    const tileH = Math.min(TILE_SIZE, wall.h - ty);
                    ctx.drawImage(
                        wallImg,
                        0,
                        0,
                        ASSETS.insideWall.w,
                        ASSETS.insideWall.h,
                        drawX,
                        drawY + ty,
                        46,
                        tileH
                    );
                }
            });
        }

        if (images.floor || images.floor1 || images.insideBase || images.ledge) {
            cornerBlocks.forEach(block => {
                const drawX = Math.floor(block.x - cameraX);
                const drawY = Math.floor(block.y - cameraY);
                if (drawX < -90 || drawX > canvas.width + 90) return;

                if (block.kind === 'ledgeCap') {
                    const ledgeImg = images.ledge || images.floor1 || images.floor;
                    if (!ledgeImg) return;
                    ctx.drawImage(ledgeImg, drawX, drawY, block.w, block.h);
                    return;
                }

                const cornerImg = block.corridor >= 3
                    ? (images.insideBase || images.floor1)
                    : (images.floor1 || images.floor || images.insideBase);
                if (!cornerImg) return;

                ctx.drawImage(
                    cornerImg,
                    0,
                    0,
                    ASSETS.insideBase.w,
                    ASSETS.insideBase.h,
                    drawX,
                    drawY,
                    block.w,
                    block.h
                );
            });
        }
    }

    function drawSideBlocks() {
        sideBlocks.forEach(block => {
            const drawX = Math.floor(block.x - cameraX);
            const drawY = Math.floor(block.y - cameraY);
            if (drawX < -120 || drawX > canvas.width + 120) return;

            const img = block.kind === 'wallSide'
                ? (images.insideWall || images.insideBase || images.ledge)
                : (images.ledge || images.floor1 || images.floor);
            if (!img) return;

            ctx.save();
            const sideY = drawY + 12;
            if (block.side === 'right') {
                ctx.translate(drawX + block.w, sideY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, block.w, block.h);
            } else {
                ctx.drawImage(img, 0, 0, img.width, img.height, drawX, sideY, block.w, block.h);
            }
            ctx.restore();
        });
    }

    function drawMovingPlatforms() {
        movingPlatforms.forEach(p => {
            const img = images[p.sprite] || images.hFloat;
            if (!img) return;
            const drawX = Math.floor(p.x - cameraX);
            const drawY = Math.floor(p.y - cameraY);
            ctx.drawImage(img, drawX, drawY, 140, 50);
        });
    }

    function drawLifts() {
        lifts.forEach(l => {
            const drawX = Math.floor(l.x - cameraX);
            const drawY = Math.floor(l.y - cameraY);
            const topDrawY = Math.floor(l.topY - cameraY) - 20;
            
            // Chain
            ctx.fillStyle = '#5a3d1a';
            const chainX = drawX + 65;
            for (let cy = topDrawY; cy < drawY; cy += 12) {
                ctx.fillRect(chainX, cy, 8, 10);
                ctx.fillStyle = '#3a2510';
                ctx.fillRect(chainX + 2, cy + 4, 4, 10);
                ctx.fillStyle = '#5a3d1a';
            }
            
            // Pulley wheel
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(chainX + 4, topDrawY - 5, 12, 0, Math.PI * 2);
            ctx.fill();
            
            // Platform
            const liftImg = images.liftPully;
            if (liftImg) ctx.drawImage(liftImg, drawX, drawY, 140, 60);
        });
    }

    function drawCollectibles() {
        const bobTime = Date.now() / 300;
        
        jewels.filter(j => !j.collected).forEach(j => {
            const img = images.jewel;
            if (!img) return;
            const drawX = Math.floor(j.x - cameraX);
            const drawY = Math.floor(j.y - cameraY + Math.sin(bobTime) * 5);
            ctx.drawImage(img, drawX, drawY, 45, 65);
        });
        
        stars.filter(s => !s.collected).forEach(s => {
            const img = images.star;
            if (!img) return;
            const drawX = Math.floor(s.x - cameraX);
            const drawY = Math.floor(s.y - cameraY + Math.sin(bobTime * 1.3) * 5);
            ctx.save();
            ctx.translate(drawX + 25, drawY + 25);
            ctx.rotate(bobTime * 0.5);
            ctx.drawImage(img, -25, -25, 55, 55);
            ctx.restore();
        });
        
        checkpoints.forEach(cp => {
            const img = images.runes;
            if (!img) return;
            const drawX = Math.floor(cp.x - cameraX);
            const drawY = Math.floor(cp.y - cameraY);
            
            ctx.globalAlpha = cp.activated ? 1 : 0.5;
            ctx.drawImage(img, drawX, drawY, 90, 90);
            
            if (cp.activated) {
                ctx.shadowColor = '#0ff';
                ctx.shadowBlur = 15;
                ctx.drawImage(img, drawX, drawY, 90, 90);
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
        });
    }

    function drawExit() {
        if (!exitPortal) return;
        const img = images.exit;
        if (!img) return;
        
        const drawX = Math.floor(exitPortal.x - cameraX);
        const drawY = Math.floor(exitPortal.y - cameraY);
        
        ctx.globalAlpha = exitPortal.open ? 1 : 0.35;
        ctx.drawImage(img, drawX, drawY, 130, 130);
        
        if (exitPortal.open) {
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 25;
            ctx.drawImage(img, drawX, drawY, 130, 130);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    function drawEnemies() {
        enemies.filter(e => e.alive).forEach(e => {
            const cfg = ASSETS[e.type];
            const img = images[e.type];
            const size = ENEMY_SIZES[e.type];
            if (!img) return;
            
            const drawX = Math.floor(e.x - cameraX);
            const drawY = Math.floor(e.y - cameraY);
            if (drawX < -150 || drawX > canvas.width + 100) return;
            
            const frameW = cfg.frameW;
            const sx = e.frame * frameW;
            
            ctx.save();
            if (e.dir < 0) {
                ctx.translate(drawX + size.w, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, sx, 0, frameW, cfg.h, 0, 0, size.w, size.h);
            } else {
                ctx.drawImage(img, sx, 0, frameW, cfg.h, drawX, drawY, size.w, size.h);
            }
            ctx.restore();
            
            // Health bar
            const maxHealth = 30 + (e.attackPattern) * 10;
            const healthPct = e.health / maxHealth;
            ctx.fillStyle = '#300';
            ctx.fillRect(drawX, drawY - 8, size.w, 5);
            ctx.fillStyle = '#f44';
            ctx.fillRect(drawX, drawY - 8, size.w * healthPct, 5);
            
            // Draw projectiles
            ctx.fillStyle = '#f80';
            e.projectiles.forEach(p => {
                const px = Math.floor(p.x - cameraX);
                const py = Math.floor(p.y - cameraY);
                ctx.beginPath();
                ctx.arc(px, py, 8, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    function drawHazards() {
        hazards.forEach(h => {
            const drawX = Math.floor(h.x - cameraX);
            const drawY = Math.floor(h.y - cameraY);
            const img = h.type === 'lava'
                ? (h.variant === 'alt' ? (images.lavaFloorAlt || images.lavaFloor) : (images.lavaFloor || images.lavaFloorAlt))
                : images.spikeFloor;
            if (!img) return;

            ctx.drawImage(img, drawX, drawY, h.w, h.drawH || 45);

            // Spikes are intended as icy hazards: add a cool tint + glint pass.
            if (h.type === 'spike') {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'rgba(120, 220, 255, 0.35)';
                ctx.fillRect(drawX, drawY, h.w, 45);

                ctx.strokeStyle = 'rgba(210, 245, 255, 0.55)';
                ctx.lineWidth = 1.2;
                for (let ix = 0; ix < h.w; ix += 18) {
                    ctx.beginPath();
                    ctx.moveTo(drawX + ix + 3, drawY + 38);
                    ctx.lineTo(drawX + ix + 9, drawY + 8);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });
    }

    function drawDecorations() {
        decorations.forEach(d => {
            const img = images[d.type];
            if (!img) return;
            const cfg = ASSETS[d.type];
            if (!cfg) return;

            const style = DECOR_STYLE[d.type] || DECOR_STYLE.default;
            const drawW = cfg.w * style.scale;
            const drawH = cfg.h * style.scale;
            const drawX = Math.floor(d.x - cameraX);
            const floorY = typeof d.floorY === 'number' ? d.floorY : d.y;
            const drawY = Math.floor(floorY - drawH + style.groundOffset - cameraY);
            if (drawX < -200 || drawX > canvas.width + 100) return;

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
        });
    }

    function drawPlayer() {
        const stateMap = { idle: 'heroIdle', run: 'heroRun', jump: 'heroJump', attack: 'heroAttack' };
        const key = stateMap[player.state];
        const cfg = ASSETS[key];
        const img = images[key];
        if (!img || !cfg) return;
        
        const frameW = cfg.frameW;
        const sx = player.frame * frameW;
        const drawX = Math.floor(player.x - cameraX);
        const drawY = Math.floor(player.y - cameraY);
        
        // Use consistent draw size for all states to prevent distortion
        const drawW = HERO_DRAW_W;
        const drawH = HERO_DRAW_H;
        
        ctx.save();
        
        if (player.invulnerable > 0) {
            ctx.globalAlpha = 0.5 + Math.sin(player.invulnerable * 15) * 0.3;
        }
        
        if (!player.facingRight) {
            ctx.translate(drawX + drawW, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(img, sx, 0, frameW, cfg.h, 0, 0, drawW, drawH);
        } else {
            ctx.drawImage(img, sx, 0, frameW, cfg.h, drawX, drawY, drawW, drawH);
        }
        ctx.restore();
    }

    function drawUI() {
        // Health bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 210, 28);
        const healthPct = Math.max(0, player.health / MAX_HEALTH);
        const r = Math.floor(255 * (1 - healthPct));
        const g = Math.floor(180 * healthPct);
        ctx.fillStyle = `rgb(${r}, ${g}, 40)`;
        ctx.fillRect(15, 15, 200 * healthPct, 18);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(15, 15, 200, 18);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`HP: ${Math.floor(player.health)}`, 85, 29);
        
        // Lives & Jewels
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`Lives: ${player.lives}`, 10, 55);
        ctx.fillStyle = player.jewels >= 5 ? '#ff0' : '#fff';
        ctx.fillText(`Jewels: ${player.jewels}/5`, 10, 75);
        
        if (player.jewels >= 5) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('EXIT UNLOCKED!', 10, 95);
        }
        
        // Attack button
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(canvas.width - 75, canvas.height - 75, 55, 55);
        ctx.strokeStyle = player.attacking ? '#f00' : '#888';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - 73, canvas.height - 73, 51, 51);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('X', canvas.width - 55, canvas.height - 40);
        
        // Controls
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px monospace';
        const controlsHint = isMobileDevice
            ? 'Joystick: Move | Jump + Attack buttons'
            : 'Arrows/WASD: Move | Space: Jump | X: Attack';
        ctx.fillText(controlsHint, 10, canvas.height - 8);
    }

    function drawTitle() {
        const img = images.title;
        if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ALICE: VALKYRIE STAR', canvas.width / 2, canvas.height / 2 - 60);
        
        ctx.font = '22px sans-serif';
        ctx.fillText('Press ENTER or Click to Start', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Collect 5 Jewels to Open the Exit', canvas.width / 2, canvas.height / 2 + 35);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Explore multiple corridors - Commander Keen style!', canvas.width / 2, canvas.height / 2 + 70);
        ctx.textAlign = 'left';
    }

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '22px sans-serif';
        ctx.fillText('Press ENTER to Restart', canvas.width / 2, canvas.height / 2 + 45);
        ctx.textAlign = 'left';
    }

    function drawVictory() {
        ctx.fillStyle = 'rgba(0, 40, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '22px sans-serif';
        ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Press ENTER to Play Again', canvas.width / 2, canvas.height / 2 + 75);
        ctx.textAlign = 'left';
    }

    // ============ GAME LOOP ============
    function gameLoop(time) {
        const dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;

        if (gameState === 'title') {
            drawTitle();
            if (keys['Enter']) startGame();
        } else if (gameState === 'playing') {
            updatePlayer(dt);
            updateEnemies(dt);
            updateMovingPlatforms(dt);
            updateLifts(dt);

            // Camera follows player smoothly
            const targetX = player.x - canvas.width / 2 + player.width / 2;
            const targetY = player.y - canvas.height / 2 + player.height / 2;
            cameraX += (targetX - cameraX) * 0.08;
            cameraY += (targetY - cameraY) * 0.08;
            cameraX = Math.max(0, Math.min(cameraX, LEVEL_WIDTH - canvas.width));
            cameraY = Math.max(-100, Math.min(cameraY, 1200));

            drawBackground();
            drawRoomBackdrops();
            drawDecorations();
            drawRoomWallsAndCorners();
            drawPlatforms();
            drawSideBlocks();
            drawMovingPlatforms();
            drawLifts();
            drawHazards();
            drawCollectibles();
            drawExit();
            drawEnemies();
            drawPlayer();
            drawUI();
        } else if (gameState === 'gameover') {
            drawGameOver();
            if (keys['Enter']) { resetGame(); startGame(); }
        } else if (gameState === 'victory') {
            drawVictory();
            if (keys['Enter']) { resetGame(); startGame(); }
        }

        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        gameState = 'playing';
        generateLevel();
        initAudio();
        playLevelMusic();
    }

    function resetGame() {
        player.x = 200;
        player.y = 400;
        player.vx = 0;
        player.vy = 0;
        player.health = MAX_HEALTH;
        player.lives = 3;
        player.jewels = 0;
        player.checkpointX = 200;
        player.checkpointY = 400;
        player.invulnerable = 0;
        player.attacking = false;
    }

    // ============ INIT ============
    canvas.addEventListener('click', () => {
        if (gameState === 'title') startGame();
        attackPressed = true;
    });

    initMobileControls();

    loadImages().then(() => {
        console.log('Loaded', Object.keys(images).length, 'assets');
        requestAnimationFrame(gameLoop);
    });
})();
