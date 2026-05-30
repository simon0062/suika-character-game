// js/physics.js — Matter.js 物理引擎配置

const Physics = {
    engine: null,
    world: null,
    walls: [],
    gameWidth: 400,
    gameHeight: 700,
    wallThickness: 40,

    pendingMerges: [],
    mergeCooldown: {},

    init() {
        this.engine = Matter.Engine.create({
            gravity: { x: 0, y: 2.0 },
        });
        this.world = this.engine.world;

        const wallOptions = {
            isStatic: true,
            friction: 0.5,
            restitution: 0.1,
            render: { visible: false },
        };

        const hw = this.wallThickness;

        // 左墙
        this.walls.push(Matter.Bodies.rectangle(
            -hw / 2, this.gameHeight / 2, hw, this.gameHeight, wallOptions
        ));
        // 右墙
        this.walls.push(Matter.Bodies.rectangle(
            this.gameWidth + hw / 2, this.gameHeight / 2, hw, this.gameHeight, wallOptions
        ));
        // 底墙
        this.walls.push(Matter.Bodies.rectangle(
            this.gameWidth / 2, this.gameHeight + hw / 2, this.gameWidth + hw * 2, hw, wallOptions
        ));
        // 顶墙（防止挤出）
        this.walls.push(Matter.Bodies.rectangle(
            this.gameWidth / 2, -hw / 2 - 30, this.gameWidth + hw * 2, hw, wallOptions
        ));

        Matter.Composite.add(this.world, [...this.walls]);

        // 监听碰撞
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            this.handleCollisions(event);
        });
    },

    handleCollisions(event) {
        for (const pair of event.pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            if (!bodyA.label || !bodyB.label) continue;
            if (!bodyA.label.startsWith('fruit-') || !bodyB.label.startsWith('fruit-')) continue;
            if (bodyA.isRemoved || bodyB.isRemoved) continue;

            const levelA = bodyA.fruitLevel;
            const levelB = bodyB.fruitLevel;

            if (levelA == null || levelB == null) continue;
            if (levelA !== levelB) continue;

            const idA = bodyA.id;
            const idB = bodyB.id;
            const pairKey = Math.min(idA, idB) + '_' + Math.max(idA, idB);

            if (this.mergeCooldown[pairKey]) continue;
            this.mergeCooldown[pairKey] = true;

            this.pendingMerges.push({
                bodyA: bodyA,
                bodyB: bodyB,
                level: levelA,
            });
        }
    },

    drainPendingMerges() {
        const merges = this.pendingMerges;
        this.pendingMerges = [];
        return merges;
    },

    resize(w, h) {
        this.gameWidth = w;
        this.gameHeight = h;
        const hw = this.wallThickness;
        if (this.walls.length >= 4) {
            Matter.Body.setPosition(this.walls[0], { x: -hw / 2, y: h / 2 });
            Matter.Body.setPosition(this.walls[1], { x: w + hw / 2, y: h / 2 });
            Matter.Body.setPosition(this.walls[2], { x: w / 2, y: h + hw / 2 });
            Matter.Body.setPosition(this.walls[3], { x: w / 2, y: -hw / 2 - 30 });
        }
    },

    /**
     * 夹紧所有水果位置，防止挤出边界
     */
    clampFruits() {
        const fruits = this.getFruits();
        for (const body of fruits) {
            const level = body.fruitLevel;
            const r = level != null ? FRUITS[level].radius : 20;
            let clamped = false;

            if (body.position.x < r) {
                Matter.Body.setPosition(body, { x: r, y: body.position.y });
                Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
                clamped = true;
            }
            if (body.position.x > this.gameWidth - r) {
                Matter.Body.setPosition(body, { x: this.gameWidth - r, y: body.position.y });
                Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
                clamped = true;
            }
            if (body.position.y > this.gameHeight - r) {
                Matter.Body.setPosition(body, { x: body.position.x, y: this.gameHeight - r });
                Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
                clamped = true;
            }
            // 防止从顶部挤出
            if (body.position.y < r - 30) {
                Matter.Body.setPosition(body, { x: body.position.x, y: r - 30 });
                clamped = true;
            }
        }
    },

    createFruitBody(x, y, level) {
        const fruit = FRUITS[level];
        // 确保创建位置在边界内
        const cx = Math.max(fruit.radius, Math.min(this.gameWidth - fruit.radius, x));
        const cy = Math.max(fruit.radius, y);
        const body = Matter.Bodies.circle(cx, cy, fruit.radius, {
            restitution: 0.25,
            friction: 0.6,
            frictionAir: 0.015,
            density: 0.0015,
            label: 'fruit-' + level,
            fruitLevel: level,
        });
        return body;
    },

    getFruits() {
        return Matter.Composite.allBodies(this.world).filter(
            b => b.label && b.label.startsWith('fruit-') && !b.isStatic && !b.isRemoved
        );
    },

    update(delta) {
        Matter.Engine.update(this.engine, delta);
        this.clampFruits();
    },

    reset() {
        const fruits = this.getFruits();
        Matter.Composite.remove(this.world, fruits);
        this.pendingMerges = [];
        this.mergeCooldown = {};
    },
};
