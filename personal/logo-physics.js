(function() {
    'use strict';

    // State management
    let hasActivated = false;
    let engine, render, runner;
    let circleBody, squareBody, triangleBody;
    let ground, leftWall, rightWall;

    // DOM references
    const logoBox = document.querySelector('.logo-box');
    const circle = document.querySelector('.circle');
    const square = document.querySelector('.square');
    const triangle = document.querySelector('.triangle');

    /**
     * Capture current viewport positions of CSS shapes
     */
    function captureShapePositions() {
        const circleRect = circle.getBoundingClientRect();
        const squareRect = square.getBoundingClientRect();
        const triangleRect = triangle.getBoundingClientRect();

        return {
            circle: {
                x: circleRect.left + circleRect.width / 2,
                y: circleRect.top + circleRect.height / 2
            },
            square: {
                x: squareRect.left + squareRect.width / 2,
                y: squareRect.top + squareRect.height / 2
            },
            triangle: {
                x: triangleRect.left + triangleRect.width / 2,
                y: triangleRect.top + triangleRect.height / 2
            }
        };
    }

    /**
     * Initialize Matter.js physics simulation
     */
    function initPhysics(positions) {
        // Create Matter.js aliases
        const Engine = Matter.Engine;
        const Render = Matter.Render;
        const Runner = Matter.Runner;
        const Bodies = Matter.Bodies;
        const Composite = Matter.Composite;
        const Mouse = Matter.Mouse;
        const MouseConstraint = Matter.MouseConstraint;
        const Body = Matter.Body;
        const Vertices = Matter.Vertices;

        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = 'physics-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '-1'; // Behind content so page remains clickable
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);

        // Create engine
        engine = Engine.create();
        engine.world.gravity.y = 1;

        // Create renderer
        render = Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent'
            }
        });

        // Create physics bodies

        // Circle (Red)
        circleBody = Bodies.circle(positions.circle.x, positions.circle.y, 12.5, {
            render: {
                fillStyle: '#D00000'
            },
            restitution: 0.6,
            friction: 0.01,
            density: 0.001
        });

        // Square (Yellow/Gold)
        squareBody = Bodies.rectangle(positions.square.x, positions.square.y, 25, 25, {
            render: {
                fillStyle: '#F7B802'
            },
            restitution: 0.6,
            friction: 0.01,
            density: 0.001
        });

        // Triangle (Blue) - Right triangle using custom vertices
        // CSS creates a right triangle with border-bottom (solid) and border-right (transparent)
        // This creates a right angle at bottom-left
        const triangleSize = 25;
        const triangleVertices = [
            { x: -triangleSize/2, y: triangleSize/2 },   // Bottom-left (right angle)
            { x: -triangleSize/2, y: -triangleSize/2 },  // Top-left
            { x: triangleSize/2, y: triangleSize/2 }     // Bottom-right
        ];

        triangleBody = Bodies.fromVertices(
            positions.triangle.x,
            positions.triangle.y,
            triangleVertices,
            {
                render: {
                    fillStyle: '#4EA5FF'
                },
                restitution: 0.6,
                friction: 0.01,
                density: 0.001
            }
        );

        // Create boundaries (invisible static bodies)
        // Position ground near bottom but still visible (leave space for shapes)
        ground = Bodies.rectangle(
            window.innerWidth / 2,
            window.innerHeight - 50,  // 50px from bottom instead of below viewport
            window.innerWidth,
            50,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent'
                }
            }
        );

        leftWall = Bodies.rectangle(
            -25,
            window.innerHeight / 2,
            50,
            window.innerHeight,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent'
                }
            }
        );

        rightWall = Bodies.rectangle(
            window.innerWidth + 25,
            window.innerHeight / 2,
            50,
            window.innerHeight,
            {
                isStatic: true,
                render: {
                    fillStyle: 'transparent'
                }
            }
        );

        // Add all bodies to world
        Composite.add(engine.world, [circleBody, squareBody, triangleBody, ground, leftWall, rightWall]);

        // Create interactive overlays for each shape
        const shapeOverlays = createShapeOverlays();

        // Update overlay positions on each engine update
        Matter.Events.on(engine, 'afterUpdate', function() {
            updateShapeOverlays(shapeOverlays);
        });

        // Start engine and renderer
        runner = Runner.create();
        Runner.run(runner, engine);
        Render.run(render);

        // Hide CSS shapes
        logoBox.classList.add('physics-active');

        // Handle window resize
        window.addEventListener('resize', handleResize);
    }

    /**
     * Create invisible interactive overlays for each shape
     */
    function createShapeOverlays() {
        const overlays = {
            circle: createOverlay('circle', 25, 25),
            square: createOverlay('square', 25, 25),
            triangle: createOverlay('triangle', 25, 25)
        };

        return overlays;
    }

    /**
     * Create a single overlay element
     */
    function createOverlay(id, width, height) {
        const overlay = document.createElement('div');
        overlay.id = `physics-overlay-${id}`;
        overlay.style.position = 'fixed';
        overlay.style.width = `${width}px`;
        overlay.style.height = `${height}px`;
        overlay.style.cursor = 'grab';
        overlay.style.zIndex = '1001';
        overlay.style.pointerEvents = 'auto';
        // Debug: uncomment to see overlays
        // overlay.style.background = 'rgba(255, 0, 0, 0.2)';
        // overlay.style.border = '1px solid red';
        document.body.appendChild(overlay);

        // Track dragging state - store on overlay element
        overlay.isDragging = false;

        overlay.addEventListener('mousedown', (e) => startDrag(e, id, overlay));
        overlay.addEventListener('touchstart', (e) => startDrag(e, id, overlay), { passive: false });

        function startDrag(e, shapeId, element) {
            e.preventDefault();
            e.stopPropagation();

            element.isDragging = true;
            element.style.cursor = 'grabbing';
            element.style.zIndex = '1002'; // Bring to front while dragging

            // Get the body for this shape
            const dragBody = shapeId === 'circle' ? circleBody : shapeId === 'square' ? squareBody : triangleBody;

            // Make body static while dragging to prevent gravity
            Matter.Body.setStatic(dragBody, true);

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            const mouseOffset = {
                x: clientX - dragBody.position.x,
                y: clientY - dragBody.position.y
            };

            // Track velocity for throwing with a simple moving average
            let velocityHistory = [];
            let lastPosition = { x: clientX, y: clientY };
            let lastTime = performance.now();

            function handleDrag(e) {
                if (!element.isDragging) return;
                e.preventDefault();

                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

                // Calculate instantaneous velocity
                const now = performance.now();
                const dt = now - lastTime;

                if (dt > 0) {
                    const vx = (clientX - lastPosition.x) / dt * 1000; // pixels per second
                    const vy = (clientY - lastPosition.y) / dt * 1000;

                    // Store in history (keep last 5 samples)
                    velocityHistory.push({ x: vx, y: vy, time: now });
                    if (velocityHistory.length > 5) {
                        velocityHistory.shift();
                    }
                }

                lastPosition = { x: clientX, y: clientY };
                lastTime = now;

                // Update body position
                Matter.Body.setPosition(dragBody, {
                    x: clientX - mouseOffset.x,
                    y: clientY - mouseOffset.y
                });
            }

            function endDrag() {
                element.isDragging = false;
                element.style.cursor = 'grab';
                element.style.zIndex = '1001';

                // Make body dynamic again so gravity applies
                Matter.Body.setStatic(dragBody, false);

                // Calculate average velocity from recent history
                let avgVelocity = { x: 0, y: 0 };

                if (velocityHistory.length > 0) {
                    // Use only recent samples (within last 100ms)
                    const now = performance.now();
                    const recentSamples = velocityHistory.filter(v => now - v.time < 100);

                    if (recentSamples.length > 0) {
                        recentSamples.forEach(v => {
                            avgVelocity.x += v.x;
                            avgVelocity.y += v.y;
                        });
                        avgVelocity.x /= recentSamples.length;
                        avgVelocity.y /= recentSamples.length;
                    }
                }

                // Scale velocity to Matter.js units (pixels per frame at 60fps)
                const throwVelocity = {
                    x: avgVelocity.x / 60,
                    y: avgVelocity.y / 60
                };

                // Cap maximum speed for realistic feel
                const maxSpeed = 40;
                const speed = Math.sqrt(throwVelocity.x * throwVelocity.x + throwVelocity.y * throwVelocity.y);

                if (speed > maxSpeed) {
                    const scale = maxSpeed / speed;
                    throwVelocity.x *= scale;
                    throwVelocity.y *= scale;
                }

                // Debug: log the velocity
                console.log('Throw velocity:', throwVelocity, 'Speed:', speed);

                // Apply the velocity
                Matter.Body.setVelocity(dragBody, throwVelocity);

                // Add angular velocity based on horizontal movement for spin
                const angularVelocity = throwVelocity.x * 0.015;
                Matter.Body.setAngularVelocity(dragBody, angularVelocity);

                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', endDrag);
                document.removeEventListener('touchmove', handleDrag);
                document.removeEventListener('touchend', endDrag);
            }

            // Add global listeners
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchmove', handleDrag, { passive: false });
            document.addEventListener('touchend', endDrag);
        }

        return overlay;
    }

    /**
     * Update overlay positions to match physics bodies
     */
    function updateShapeOverlays(overlays) {
        // Circle overlay
        overlays.circle.style.left = `${circleBody.position.x - 12.5}px`;
        overlays.circle.style.top = `${circleBody.position.y - 12.5}px`;
        overlays.circle.style.transform = `rotate(${circleBody.angle}rad)`;

        // Square overlay
        overlays.square.style.left = `${squareBody.position.x - 12.5}px`;
        overlays.square.style.top = `${squareBody.position.y - 12.5}px`;
        overlays.square.style.transform = `rotate(${squareBody.angle}rad)`;

        // Triangle overlay
        overlays.triangle.style.left = `${triangleBody.position.x - 12.5}px`;
        overlays.triangle.style.top = `${triangleBody.position.y - 12.5}px`;
        overlays.triangle.style.transform = `rotate(${triangleBody.angle}rad)`;
    }

    /**
     * Handle window resize - update canvas and boundaries
     */
    function handleResize() {
        if (!render) return;

        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
        render.options.width = window.innerWidth;
        render.options.height = window.innerHeight;

        // Update boundary positions
        Matter.Body.setPosition(ground, {
            x: window.innerWidth / 2,
            y: window.innerHeight + 25
        });

        Matter.Body.setPosition(leftWall, {
            x: -25,
            y: window.innerHeight / 2
        });

        Matter.Body.setPosition(rightWall, {
            x: window.innerWidth + 25,
            y: window.innerHeight / 2
        });

        // Update wall dimensions
        Matter.Body.scale(ground, window.innerWidth / ground.bounds.max.x, 1);
        Matter.Body.scale(leftWall, 1, window.innerHeight / leftWall.bounds.max.y);
        Matter.Body.scale(rightWall, 1, window.innerHeight / rightWall.bounds.max.y);
    }


    /**
     * Handle first interaction with logo shapes
     */
    function handleFirstInteraction(event) {
        if (hasActivated) return;

        // Prevent default to avoid unwanted behaviors
        event.preventDefault();

        hasActivated = true;

        // Capture positions and initialize physics
        const positions = captureShapePositions();
        initPhysics(positions);

        // Remove activation listeners
        removeActivationListeners();
    }

    /**
     * Attach event listeners to logo shapes for activation
     */
    function attachActivationListeners() {
        [circle, square, triangle].forEach(shape => {
            if (shape) {
                shape.addEventListener('mousedown', handleFirstInteraction);
                shape.addEventListener('touchstart', handleFirstInteraction, { passive: false });
                shape.style.cursor = 'pointer';
            }
        });
    }

    /**
     * Remove activation listeners after physics is activated
     */
    function removeActivationListeners() {
        [circle, square, triangle].forEach(shape => {
            if (shape) {
                shape.removeEventListener('mousedown', handleFirstInteraction);
                shape.removeEventListener('touchstart', handleFirstInteraction);
            }
        });
    }

    /**
     * Initialize on DOM ready
     */
    function init() {
        // Check if Matter.js is loaded
        if (typeof Matter === 'undefined') {
            console.error('Matter.js not loaded. Please include the Matter.js library.');
            return;
        }

        // Check if logo elements exist
        if (!logoBox || !circle || !square || !triangle) {
            console.error('Logo elements not found.');
            return;
        }

        // Attach activation listeners
        attachActivationListeners();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
