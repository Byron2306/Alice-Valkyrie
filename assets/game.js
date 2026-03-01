/*
 * Simple platformer game engine for "Alice: Valkyrie Star".
 *
 * The game contains a title screen and a single playable level.
 * All artwork is loaded from the assets folder. Tilemaps are
 * hand‑crafted arrays and basic physics (gravity, collisions) are
 * implemented without any external libraries. The goal is to
 * demonstrate a playable prototype rather than a fully featured
 * engine. Controls: left/right arrow or A/D to move, space or
 * up arrow to jump. Attack animation can be triggered with X but
 * has no effect in this demo.
 */

(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Canvas scaling factor. The original sprite sheets use 128×128
    // pixel frames. We scale everything down by 0.5 to fit more
    // tiles on screen and to better suit typical display sizes.
    const SCALE = 0.5;
    const TILE_ORIG_SIZE = 128;
    const TILE_SIZE = TILE_ORIG_SIZE * SCALE; // 64

    // Level dimensions (number of tiles).
    const LEVEL_COLS = 16;
    const LEVEL_ROWS = 10;

    // Hard coded tile map for Level 1. Each number corresponds
    // to a tile index in tileset.png. A value of ‑1 represents
    // empty space. See assets/tileset.png for tile arrangement.
    const level1 = [
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1,-1,10,-1,-1,10,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1,10,-1,-1,-1,-1,-1,-1,-1,10,-1,-1,-1],
        [-1,3,-1,2,2,2,2,2,2,-1,-1,4,-1,-1,7,-1],
        [-1,2,2,2,2,2,2,2,2,2,2,2,-1,-1,2,-1],
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    // Define which tile indices are solid for collision. Players can
    // stand on or collide with these tiles. These values are chosen
    // based on the tileset design. Feel free to tweak to taste.
    const SOLID_TILES = new Set([0,1,2,3,4,10,11,12,13,14,15]);

    // Asset names mapped to file paths. Additional sprite sheets
    // can be added here and referenced later in the animations.
    const assetList = {
        tileset: 'assets/tileset.png',
        idle: 'assets/angel_idle.png',
        run: 'assets/angel_run.png',
        jump: 'assets/angel_jump.png',
        attack: 'assets/angel_attack_spear.png',
        hurt: 'assets/angel_hurt_death.png',
        fx: 'assets/angel_fx.png'
    };

    // Loaded images will be stored here after preloading.
    const images = {};

    // Track keyboard state. Key codes are stored when pressed
    // and removed when released.
    const keys = {};
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    // Player object with physical and animation properties.
    const player = {
        x: TILE_SIZE * 2,
        y: TILE_SIZE * 3,
        vx: 0,
        vy: 0,
        width: TILE_SIZE,
        height: TILE_SIZE,
        onGround: false,
        state: 'idle',
        frame: 0,
        frameTime: 0,
    };

    // Animation definitions. Each state points to an image key,
    // a frame count, a frame duration (seconds per frame) and
    // whether to hold on the last frame. The frame width will
    // be computed after image load. The jump animation defaults
    // to holding the last frame while in the air.
    const animations = {
        // Each animation entry defines the sprite sheet key,
        // number of frames (only counting the non‑blank frames),
        // the frames per second and whether it should hold on
        // the final frame until the state changes. Frame counts
        // are set explicitly instead of derived from image width
        // because the generator pads out extra blank columns.
        idle: { key: 'idle', frames: 4, fps: 4, hold: false },
        run: { key: 'run', frames: 8, fps: 12, hold: false },
        jump: { key: 'jump', frames: 5, fps: 8, hold: true },
        attack: { key: 'attack', frames: 6, fps: 10, hold: true },
        hurt: { key: 'hurt', frames: 7, fps: 8, hold: true }
    };

    // Load all images asynchronously. Returns a promise that
    // resolves once all assets are loaded.
    function loadImages() {
        const promises = [];
        for (const key in assetList) {
            const img = new Image();
            img.src = assetList[key];
            images[key] = img;
            promises.push(new Promise((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            }));
        }
        return Promise.all(promises);
    }

    // Helper: check if a given tile index is considered solid.
    function isSolid(tileIndex) {
        return SOLID_TILES.has(tileIndex);
    }

    // Convert pixel coordinates to tile coordinates. Returns an
    // object containing row and column indices. Values are floored.
    function pixelToTile(x, y) {
        return {
            col: Math.floor(x / TILE_SIZE),
            row: Math.floor(y / TILE_SIZE)
        };
    }

    // Retrieve the tile index at a given row/column. Returns -1
    // if outside bounds. Used for collision detection and drawing.
    function getTile(row, col) {
        if (row < 0 || col < 0 || row >= LEVEL_ROWS || col >= LEVEL_COLS) {
            return -1;
        }
        return level1[row][col];
    }

    // Determine if a rectangle intersects a solid tile. The
    // rectangle is defined by its top left (x, y) and bottom right
    // coordinates. Checks four corners for solid tiles.
    function collideRectWithTiles(x, y, width, height) {
        // Calculate corner positions
        const corners = [
            { x: x, y: y }, // top left
            { x: x + width - 1, y: y }, // top right
            { x: x, y: y + height - 1 }, // bottom left
            { x: x + width - 1, y: y + height - 1 } // bottom right
        ];
        for (const c of corners) {
            const { col, row } = pixelToTile(c.x, c.y);
            const tileIndex = getTile(row, col);
            if (tileIndex >= 0 && isSolid(tileIndex)) {
                return { collided: true, row, col };
            }
        }
        return { collided: false };
    }

    // Process player input, physics and collisions. dt is in
    // seconds. Adjust velocity and position accordingly. Also
    // updates the player's animation state based on input.
    function updatePlayer(dt) {
        const moveLeft = keys['ArrowLeft'] || keys['a'];
        const moveRight = keys['ArrowRight'] || keys['d'];
        const jumpKey = keys['ArrowUp'] || keys['w'] || keys[' '];
        const attackKey = keys['x'] || keys['X'];

        // Horizontal movement
        player.vx = 0;
        if (moveLeft) player.vx = -320;
        if (moveRight) player.vx = 320;

        // Determine facing direction based on vx (optional if you
        // want to flip the sprite; for now we assume facing right).

        // Jump initiation
        if (jumpKey && player.onGround) {
            player.vy = -650;
            player.onGround = false;
        }

        // Apply gravity
        const gravity = 1800;
        player.vy += gravity * dt;
        if (player.vy > gravity) {
            player.vy = gravity; // clamp fall speed
        }

        // Desired new position
        let newX = player.x + player.vx * dt;
        let newY = player.y + player.vy * dt;

        // Horizontal collision
        if (player.vx !== 0) {
            // Check horizontally by moving to newX but keeping
            // current y. We use small vertical offsets to avoid
            // detecting collisions on the opposite axis.
            const testX = newX;
            const testY = player.y;
            const width = player.width;
            const height = player.height;
            // Sample relevant corners depending on direction
            if (player.vx > 0) {
                // Moving right: test top‑right and bottom‑right
                const corners = [
                    { x: testX + width - 1, y: testY + 1 },
                    { x: testX + width - 1, y: testY + height - 2 }
                ];
                for (const c of corners) {
                    const { col, row } = pixelToTile(c.x, c.y);
                    const tileIndex = getTile(row, col);
                    if (tileIndex >= 0 && isSolid(tileIndex)) {
                        // Align the player next to the left side of this tile
                        newX = col * TILE_SIZE - width;
                        player.vx = 0;
                        break;
                    }
                }
            } else {
                // Moving left: test top‑left and bottom‑left
                const corners = [
                    { x: testX, y: testY + 1 },
                    { x: testX, y: testY + height - 2 }
                ];
                for (const c of corners) {
                    const { col, row } = pixelToTile(c.x, c.y);
                    const tileIndex = getTile(row, col);
                    if (tileIndex >= 0 && isSolid(tileIndex)) {
                        newX = (col + 1) * TILE_SIZE;
                        player.vx = 0;
                        break;
                    }
                }
            }
        }

        // Vertical collision
        player.onGround = false;
        if (player.vy !== 0) {
            const testX = newX;
            const testY = newY;
            const width = player.width;
            const height = player.height;
            if (player.vy > 0) {
                // Falling: test bottom left and bottom right
                const corners = [
                    { x: testX + 1, y: testY + height - 1 },
                    { x: testX + width - 2, y: testY + height - 1 }
                ];
                for (const c of corners) {
                    const { col, row } = pixelToTile(c.x, c.y);
                    const tileIndex = getTile(row, col);
                    if (tileIndex >= 0 && isSolid(tileIndex)) {
                        newY = row * TILE_SIZE - height;
                        player.vy = 0;
                        player.onGround = true;
                        break;
                    }
                }
            } else {
                // Rising: test top left and top right
                const corners = [
                    { x: testX + 1, y: testY },
                    { x: testX + width - 2, y: testY }
                ];
                for (const c of corners) {
                    const { col, row } = pixelToTile(c.x, c.y);
                    const tileIndex = getTile(row, col);
                    if (tileIndex >= 0 && isSolid(tileIndex)) {
                        newY = (row + 1) * TILE_SIZE;
                        player.vy = 0;
                        break;
                    }
                }
            }
        }

        // Apply new position
        player.x = newX;
        player.y = newY;

        // Update animation state
        if (!player.onGround) {
            player.state = 'jump';
        } else if (attackKey) {
            player.state = 'attack';
        } else if (player.vx !== 0) {
            player.state = 'run';
        } else {
            player.state = 'idle';
        }
    }

    // Calculate and draw the current frame of the player based on
    // their animation state. Animations loop unless configured
    // otherwise. Frame timing is driven by the fps property.
    function drawPlayer(dt, camX, camY) {
        const anim = animations[player.state];
        const sheet = images[anim.key];
        const frameCount = anim.frames;
        // Retrieve this state's frame size
        const fs = FRAME_SIZES[player.state];
        const frameWidth  = fs.w;
        const frameHeight = fs.h;

        // Update frame timer
        player.frameTime += dt;
        const secondsPerFrame = 1 / anim.fps;
        if (player.frameTime > secondsPerFrame) {
            player.frameTime -= secondsPerFrame;
            if (player.state === 'jump' && anim.hold) {
                // Hold on last frame while in air
                if (!player.onGround) {
                    if (player.frame < frameCount - 1) {
                        player.frame += 1;
                    }
                } else {
                    player.frame = 0;
                }
            } else if (player.state === 'attack' && anim.hold) {
                // attack plays once then returns to idle/run
                if (player.frame < frameCount - 1) {
                    player.frame += 1;
                } else {
                    player.state = player.onGround ? (player.vx !== 0 ? 'run' : 'idle') : 'jump';
                    player.frame = 0;
                }
            } else {
                player.frame = (player.frame + 1) % frameCount;
            }
        }
        // Source coordinates within the sprite sheet
        const sx = player.frame * frameWidth;
        const sy = 0; // all frames are on the first row

        // Calculate destination size using hero scale. We base the
        // scale on the original frame height to get consistent
        // proportions. The width uses the same scale factor.
        const drawW = frameWidth  * HERO_SCALE;
        const drawH = frameHeight * HERO_SCALE;
        // Destination position: align the bottom centre of the sprite
        // with the player's collision box. player.x/y represent the
        // top‑left of the collision rectangle, so we offset by the
        // collision width/height to find its bottom centre.
        const px   = (player.x - camX) * SCALE;
        const pyBottom = (player.y + player.height - camY) * SCALE;
        const dx = Math.floor(px + (player.width * SCALE) / 2 - drawW / 2);
        const dy = Math.floor(pyBottom - drawH);

        ctx.drawImage(
            sheet,
            sx, sy, frameWidth, frameHeight,
            dx, dy,
            drawW,
            drawH
        );
    }

    // Draw the level tiles. Uses the camera offset to determine
    // which portion of the map to display. Only draws visible
    // tiles for performance.
    function drawLevel(camX, camY) {
        const tileset = images.tileset;
        const tilesPerRow = 4; // tileset grid is 4×4
        for (let row = 0; row < LEVEL_ROWS; row++) {
            for (let col = 0; col < LEVEL_COLS; col++) {
                const tileIndex = getTile(row, col);
                if (tileIndex < 0) continue;
                // Compute screen position (scaled)
                const sx = (tileIndex % tilesPerRow) * TILE_ORIG_SIZE;
                const sy = Math.floor(tileIndex / tilesPerRow) * TILE_ORIG_SIZE;
                const dx = Math.floor(col * TILE_SIZE - camX * SCALE);
                const dy = Math.floor(row * TILE_SIZE - camY * SCALE);
                // Only draw if on screen
                if (dx + TILE_SIZE > -TILE_SIZE && dx < canvas.width && dy + TILE_SIZE > -TILE_SIZE && dy < canvas.height) {
                    ctx.drawImage(
                        tileset,
                        sx, sy, TILE_ORIG_SIZE, TILE_ORIG_SIZE,
                        dx, dy,
                        TILE_ORIG_SIZE * SCALE,
                        TILE_ORIG_SIZE * SCALE
                    );
                }
            }
        }
    }

    // Global variables for game loop
    let lastTime = 0;
    let cameraX = 0;
    let cameraY = 0;
    let gameStarted = false;

    // Expose a global function that can be called from the
    // title screen button. This toggles the title overlay off
    // and begins the game loop. It simply sets the flag and
    // records the start time so the first update has a proper
    // delta.
    window.startGame = function() {
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.style.display = 'none';
        }
        gameStarted = true;
        lastTime = performance.now();
    };

    function gameLoop(time) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;
        if (gameStarted) {
            // Debug: draw a background so we know the loop is running
            // This color will be visible even if nothing else draws
            ctx.fillStyle = '#203070';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update player physics and state
            updatePlayer(dt);
            // Update camera: follow player horizontally
            const levelPixelWidth = LEVEL_COLS * TILE_SIZE;
            const halfCanvas = canvas.width / 2;
            cameraX = player.x + player.width / 2 - (halfCanvas / SCALE);
            cameraX = Math.max(0, Math.min(cameraX, levelPixelWidth - canvas.width / SCALE));
            cameraY = 0;

            // Draw level and player
            drawLevel(cameraX, cameraY);
            drawPlayer(dt, cameraX, cameraY);
            // Draw debug information on top left
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px sans-serif';
            const debug = `pos:${player.x.toFixed(1)},${player.y.toFixed(1)} state:${player.state} onGround:${player.onGround}`;
            ctx.fillText(debug, 10, 20);
        }
        requestAnimationFrame(gameLoop);
    }

    // Initialize the game: load images, set up event listeners.
    function init() {
        loadImages().then(() => {
            // Set vertical offsets for animations. Our generator
            // produces sheets where the character frames occupy
            // the topmost row. Therefore the Y offset is zero.
            for (const state in animations) {
                animations[state].offsetY = 0;
            }

            // Handle the title screen start button
            const titleScreen = document.getElementById('title-screen');
            const startButton = document.getElementById('start-button');
            startButton.addEventListener('click', () => {
                titleScreen.style.display = 'none';
                gameStarted = true;
                lastTime = performance.now();
            });

            // We deliberately avoid dynamically resizing the canvas
            // because the level and tiles are designed around a
            // fixed resolution of 1024×640 pixels (16×10 tiles at
            // 64 pixels each). Keeping a fixed size prevents
            // accidental stretching which can distort pixel art.

            // Start the game loop
            requestAnimationFrame((t) => {
                lastTime = t;
                gameLoop(t);
            });
        });
    }

    // Begin initialization after the DOM is ready
    window.addEventListener('load', init);
})();