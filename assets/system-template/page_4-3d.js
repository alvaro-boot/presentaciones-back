/**
 * Escenas WebGL (Three.js r128) para tarjetas de líneas de cobro en page_4.html.
 */
(function () {
    if (typeof THREE === "undefined") return;

    var reduceMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function addLights(scene) {
        var amb = new THREE.AmbientLight(0x5a7ab8, 0.38);
        var key = new THREE.DirectionalLight(0xffffff, 0.95);
        key.position.set(2.8, 4.2, 3.2);
        var fill = new THREE.DirectionalLight(0x22d3ee, 0.22);
        fill.position.set(-3, 1.5, -2);
        scene.add(amb, key, fill);
    }

    function scenePorteria() {
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a1428, 2.8, 9);
        addLights(scene);

        var root = new THREE.Group();
        var floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.92, metalness: 0.08 })
        );
        floor.rotation.x = -Math.PI / 2;
        root.add(floor);

        var wall = new THREE.MeshStandardMaterial({
            color: 0x1a3b78,
            metalness: 0.28,
            roughness: 0.48
        });
        var gold = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.45,
            roughness: 0.32,
            emissive: 0x4a3200,
            emissiveIntensity: 0.12
        });
        var glass = new THREE.MeshStandardMaterial({
            color: 0x22d3ee,
            metalness: 0.15,
            roughness: 0.2,
            emissive: 0x004455,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.55
        });

        var booth = new THREE.Group();
        var t = 0.07;
        var h = 0.88;
        var d = 0.62;
        var w = 0.72;
        var back = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wall);
        back.position.set(0, h / 2, -d / 2);
        var left = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), wall);
        left.position.set(-w / 2, h / 2, 0);
        var right = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), wall);
        right.position.set(w / 2, h / 2, 0);
        var door = new THREE.Mesh(new THREE.BoxGeometry(0.22, h * 0.72, t * 1.1), wall);
        door.position.set(0, h * 0.38, d / 2);
        var win = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), glass);
        win.position.set(-w * 0.28, h * 0.62, d / 2 + 0.01);
        var roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, 0.07, d * 1.15), gold);
        roof.position.set(0, h + 0.04, 0);
        booth.add(back, left, right, door, win, roof);
        root.add(booth);

        var beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 20, 20),
            new THREE.MeshStandardMaterial({
                color: 0xfde68a,
                emissive: 0xfbbf24,
                emissiveIntensity: 0.9,
                metalness: 0.2,
                roughness: 0.25
            })
        );
        beacon.position.set(0, h + 0.18, 0);
        root.add(beacon);

        scene.add(root);

        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
        camera.position.set(1.85, 1.05, 2.15);
        camera.lookAt(0, 0.42, 0);

        function update(time) {
            if (reduceMotion) {
                root.rotation.y = 0.35;
                beacon.material.emissiveIntensity = 0.75;
                return;
            }
            root.rotation.y = time * 0.38 + Math.sin(time * 0.7) * 0.08;
            booth.rotation.y = Math.sin(time * 0.5) * 0.04;
            beacon.material.emissiveIntensity = 0.45 + Math.sin(time * 4.2) * 0.4;
        }

        return { scene, camera, update };
    }

    function sceneRonda() {
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a1428, 2.5, 10);
        addLights(scene);

        var root = new THREE.Group();
        var floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            new THREE.MeshStandardMaterial({ color: 0x050a14, roughness: 0.9, metalness: 0.1 })
        );
        floor.rotation.x = -Math.PI / 2;
        root.add(floor);

        var path = new THREE.Mesh(
            new THREE.TorusGeometry(0.95, 0.018, 8, 64),
            new THREE.MeshBasicMaterial({ color: 0x4a6fa5, transparent: true, opacity: 0.55 })
        );
        path.rotation.x = Math.PI / 2;
        path.position.y = 0.01;
        root.add(path);

        var guard = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x0e2455,
            metalness: 0.35,
            roughness: 0.42
        });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 18), bodyMat);
        head.position.y = 0.62;
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.38, 12), bodyMat);
        body.position.y = 0.32;
        var walkie = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.12, 0.04),
            new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.5, roughness: 0.35 })
        );
        walkie.position.set(0.22, 0.38, 0.12);
        guard.add(head, body, walkie);

        var beam = new THREE.Mesh(
            new THREE.ConeGeometry(0.55, 1.1, 24, 1, true),
            new THREE.MeshBasicMaterial({
                color: 0x22d3ee,
                transparent: true,
                opacity: 0.22,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        beam.rotation.x = Math.PI;
        beam.position.set(0.15, 0.55, 0.35);
        beam.rotation.z = -0.35;
        guard.add(beam);

        guard.position.set(0, 0, 0);
        root.add(guard);

        scene.add(root);

        var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.set(1.6, 1.15, 2.0);
        camera.lookAt(0, 0.35, 0);

        function update(time) {
            if (reduceMotion) {
                guard.rotation.y = 0.5;
                path.rotation.z = 0;
                return;
            }
            guard.rotation.y = time * 0.55;
            path.rotation.z = time * 0.25;
            beam.material.opacity = 0.14 + Math.sin(time * 5) * 0.1;
        }

        return { scene, camera, update };
    }

    function sceneCoordinador() {
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a1428, 2.6, 9.5);
        addLights(scene);

        var root = new THREE.Group();
        var desk = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.12, 0.55),
            new THREE.MeshStandardMaterial({ color: 0x152a50, metalness: 0.25, roughness: 0.55 })
        );
        desk.position.y = 0.2;
        root.add(desk);

        function monitor(x, z, tilt) {
            var g = new THREE.Group();
            var bezel = new THREE.Mesh(
                new THREE.BoxGeometry(0.38, 0.28, 0.04),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.4, roughness: 0.35 })
            );
            var scr = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.2),
                new THREE.MeshStandardMaterial({
                    color: 0x0ea5e9,
                    emissive: 0x0284c7,
                    emissiveIntensity: 0.85,
                    metalness: 0.1,
                    roughness: 0.3
                })
            );
            scr.position.z = 0.021;
            g.add(bezel, scr);
            g.position.set(x, 0.52, z);
            g.rotation.x = tilt;
            g.userData.screen = scr;
            return g;
        }

        var m1 = monitor(-0.35, 0.02, -0.12);
        var m2 = monitor(0.28, -0.05, -0.08);
        root.add(m1, m2);

        var pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.03, 0.35, 8),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.35 })
        );
        pole.position.set(0.55, 0.42, -0.15);
        var led = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 12, 12),
            new THREE.MeshStandardMaterial({
                color: 0xf87171,
                emissive: 0xf87171,
                emissiveIntensity: 1.2
            })
        );
        led.position.set(0.55, 0.62, -0.15);
        root.add(pole, led);

        scene.add(root);

        var camera = new THREE.PerspectiveCamera(39, 1, 0.1, 50);
        camera.position.set(1.25, 0.95, 1.85);
        camera.lookAt(0, 0.38, 0);

        function update(time) {
            if (reduceMotion) {
                root.rotation.y = -0.25;
                return;
            }
            root.rotation.y = -0.25 + Math.sin(time * 0.4) * 0.12;
            m1.rotation.y = Math.sin(time * 0.8) * 0.06;
            m2.rotation.y = Math.sin(time * 0.6 + 1) * 0.05;
            var pulse = 0.55 + Math.sin(time * 6) * 0.35;
            m1.userData.screen.material.emissiveIntensity = pulse;
            m2.userData.screen.material.emissiveIntensity = 0.65 + Math.sin(time * 5.2 + 2) * 0.28;
            led.material.emissiveIntensity = 0.85 + Math.sin(time * 8) * 0.45;
        }

        return { scene, camera, update };
    }

    function sceneAjuste() {
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a1428, 2.4, 9);
        addLights(scene);

        var root = new THREE.Group();
        var coins = new THREE.Group();
        var coinMat = new THREE.MeshStandardMaterial({
            color: 0xfde68a,
            metalness: 0.55,
            roughness: 0.28,
            emissive: 0xb45309,
            emissiveIntensity: 0.08
        });
        for (var i = 0; i < 3; i++) {
            var c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 28), coinMat);
            c.rotation.x = Math.PI / 2;
            c.position.set(0, 0.08 + i * 0.07, 0);
            c.rotation.z = (i - 1) * 0.12;
            coins.add(c);
        }
        root.add(coins);

        var ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.42, 0.03, 10, 48),
            new THREE.MeshStandardMaterial({
                color: 0x34d399,
                metalness: 0.35,
                roughness: 0.35,
                emissive: 0x065f46,
                emissiveIntensity: 0.25
            })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        root.add(ring);

        var tag = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.04),
            new THREE.MeshStandardMaterial({
                color: 0x064e3b,
                metalness: 0.2,
                roughness: 0.45,
                emissive: 0x10b981,
                emissiveIntensity: 0.15
            })
        );
        tag.position.set(0.55, 0.35, 0.15);
        tag.rotation.y = -0.45;
        root.add(tag);

        scene.add(root);

        var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
        camera.position.set(1.5, 0.95, 1.75);
        camera.lookAt(0.1, 0.2, 0);

        function update(time) {
            if (reduceMotion) {
                coins.rotation.y = 0.4;
                return;
            }
            coins.rotation.y = time * 0.65;
            coins.position.y = Math.sin(time * 2.2) * 0.04;
            ring.rotation.z = time * 0.9;
            tag.rotation.z = Math.sin(time * 1.5) * 0.08;
        }

        return { scene, camera, update };
    }

    function sceneSeguro() {
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0a1428, 2.8, 10);
        addLights(scene);

        var root = new THREE.Group();

        var shield = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.38, 0.08, 6, 1),
            new THREE.MeshStandardMaterial({
                color: 0x4a6fa5,
                metalness: 0.45,
                roughness: 0.28,
                emissive: 0x0e2455,
                emissiveIntensity: 0.2
            })
        );
        shield.rotation.x = Math.PI / 2;
        shield.rotation.z = Math.PI / 6;
        shield.scale.set(1, 1, 1.25);

        var rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.42, 0.035, 10, 32),
            new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                metalness: 0.55,
                roughness: 0.25,
                emissive: 0x5c4a10,
                emissiveIntensity: 0.18
            })
        );
        rim.rotation.x = Math.PI / 2;

        var heart = new THREE.Group();
        var hm = new THREE.MeshStandardMaterial({
            color: 0xf4e5b8,
            metalness: 0.25,
            roughness: 0.35,
            emissive: 0xd4af37,
            emissiveIntensity: 0.35
        });
        var s1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), hm);
        s1.position.set(-0.07, 0.05, 0.06);
        var s2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), hm);
        s2.position.set(0.07, 0.05, 0.06);
        var bot = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 12), hm);
        bot.rotation.x = Math.PI;
        bot.position.set(0, -0.08, 0.06);
        heart.add(s1, s2, bot);
        heart.position.set(0, 0.02, 0.12);

        root.add(shield, rim, heart);
        scene.add(root);

        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
        camera.position.set(0.1, 0.85, 2.1);
        camera.lookAt(0, 0, 0);

        function update(time) {
            if (reduceMotion) {
                root.rotation.y = 0.2;
                return;
            }
            root.rotation.y = time * 0.28 + Math.sin(time * 0.9) * 0.06;
            heart.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
            rim.rotation.z = time * 0.4;
        }

        return { scene, camera, update };
    }

    var BUILDERS = {
        porteria: scenePorteria,
        ronda: sceneRonda,
        coordinador: sceneCoordinador,
        ajuste: sceneAjuste,
        seguro: sceneSeguro
    };

    function initWrap(wrap) {
        var kind = wrap.getAttribute("data-p4-scene");
        var build = BUILDERS[kind];
        if (!build) return null;

        var w = Math.max(78, wrap.clientWidth || 78);
        var h = Math.max(78, wrap.clientHeight || 78);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);

        var renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "low-power"
        });
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        renderer.setClearColor(0x0a1428, 1);
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.pointerEvents = "none";
        wrap.appendChild(renderer.domElement);

        var built = build();
        var scene = built.scene;
        var camera = built.camera;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        return {
            wrap: wrap,
            renderer: renderer,
            scene: scene,
            camera: camera,
            update: built.update,
            visible: true
        };
    }

    var entries = [];
    var raf = 0;

    function tick(now) {
        raf = requestAnimationFrame(tick);
        var t = now * 0.001;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (!e.visible) continue;
            e.update(t);
            e.renderer.render(e.scene, e.camera);
        }
    }

    function resizeEntry(e) {
        var wrap = e.wrap;
        var w = Math.max(78, wrap.clientWidth || 78);
        var h = Math.max(78, wrap.clientHeight || 78);
        e.camera.aspect = w / h;
        e.camera.updateProjectionMatrix();
        e.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        e.renderer.setSize(w, h, false);
    }

    function start() {
        function runInit() {
        var wraps = document.querySelectorAll("[data-p4-scene]");
        if (!wraps.length) return;

        wraps.forEach(function (wrap) {
            var e = initWrap(wrap);
            if (e) {
                entries.push(e);
                if (typeof ResizeObserver !== "undefined") {
                    var ro = new ResizeObserver(function () {
                        resizeEntry(e);
                    });
                    ro.observe(wrap);
                }
                if ("IntersectionObserver" in window) {
                    var io = new IntersectionObserver(
                        function (recs) {
                            recs.forEach(function (r) {
                                if (r.target === wrap) {
                                    e.visible = r.isIntersecting && r.intersectionRatio > 0.02;
                                }
                            });
                        },
                        { threshold: [0, 0.05, 0.15] }
                    );
                    io.observe(wrap);
                }
            }
        });

        if (entries.length) {
            raf = requestAnimationFrame(tick);
        }

        window.addEventListener(
            "beforeunload",
            function () {
                cancelAnimationFrame(raf);
                entries.forEach(function (e) {
                    e.renderer.dispose();
                });
            },
            { once: true }
        );
        }

        requestAnimationFrame(function () {
            requestAnimationFrame(runInit);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
