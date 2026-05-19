/**
 * Mapa Pereira — Leaflet.
 *
 * Puntos: conjunto | porteria | ronda; opcional "color"; localStorage opcional.
 * Rutas supervisión: data/rutas-supervision.json + editor (localStorage cootravir_mapa_rutas_supervision_v1).
 * Cada ruta puede incluir "paradas": [{ "lat", "lng", "nombre?" }, …] o [[lat,lng], …].
 */
(function () {
    "use strict";

    var MAP_CTX = (typeof window !== "undefined" && window.__COOTRAVIR_MAP_CTX__) || {};
    var PROPOSAL_SCOPE = MAP_CTX.proposalId ? String(MAP_CTX.proposalId) : "legacy-global";
    function scopedStorageKey(base) {
        return base + "::" + PROPOSAL_SCOPE;
    }

    var LS_KEY = scopedStorageKey("cootravir_mapa_puntos_v1");
    var LS_KEY_RUTAS = scopedStorageKey("cootravir_mapa_rutas_supervision_v1");

    var persistMapTimer = null;
    function scheduleMapPersist() {
        if (!MAP_CTX.proposalId || MAP_CTX.persist === false) return;
        if (persistMapTimer) clearTimeout(persistMapTimer);
        persistMapTimer = setTimeout(function () {
            persistMapTimer = null;
            if (typeof window.__cootravirExportMapConfig !== "function") return;
            try {
                window.parent.postMessage(
                    {
                        type: "cootravir-map-changed",
                        proposalId: MAP_CTX.proposalId,
                        mapConfig: window.__cootravirExportMapConfig()
                    },
                    "*"
                );
            } catch (err) {
                console.warn("map persist notify:", err);
            }
        }, 1500);
    }


    const LEGACY_MARKER = {
        sede: "#d4af37",
        cliente: "#94a3b8",
        camara: "#f97316",
        referencia: "#94a3b8",
        default: "#94a3b8"
    };

    const DEFAULT_ESTILOS = {
        marcaConjunto: "#dc2626",
        marcaAzul: "#2563eb",
        perimetro: { color: "#b91c1c", weight: 3, opacity: 0.92, dashArray: null },
        enlaceAzulRojo: { color: "#3b82f6", weight: 2, opacity: 0.88, dashArray: "8 6" },
        clusterAzul: {
            fillColor: "#93c5fd",
            fillOpacity: 0.28,
            strokeColor: "#2563eb",
            strokeWeight: 2,
            strokeOpacity: 0.75
        }
    };

    function mergeEstilos(cfg) {
        var e = (cfg && cfg.estilos) || {};
        var p = e.perimetro || {};
        var en = e.enlaceAzulRojo || {};
        var cl = e.clusterAzul || {};
        return {
            marcaConjunto: e.marcaConjunto || DEFAULT_ESTILOS.marcaConjunto,
            marcaAzul: e.marcaAzul || DEFAULT_ESTILOS.marcaAzul,
            perimetro: {
                color: p.color || DEFAULT_ESTILOS.perimetro.color,
                weight: p.weight != null ? Number(p.weight) : DEFAULT_ESTILOS.perimetro.weight,
                opacity: p.opacity != null ? Number(p.opacity) : DEFAULT_ESTILOS.perimetro.opacity,
                dashArray: p.dashArray === undefined ? DEFAULT_ESTILOS.perimetro.dashArray : p.dashArray
            },
            enlaceAzulRojo: {
                color: en.color || DEFAULT_ESTILOS.enlaceAzulRojo.color,
                weight: en.weight != null ? Number(en.weight) : DEFAULT_ESTILOS.enlaceAzulRojo.weight,
                opacity: en.opacity != null ? Number(en.opacity) : DEFAULT_ESTILOS.enlaceAzulRojo.opacity,
                dashArray:
                    en.dashArray === undefined
                        ? DEFAULT_ESTILOS.enlaceAzulRojo.dashArray
                        : en.dashArray
            },
            clusterAzul: {
                fillColor: cl.fillColor || DEFAULT_ESTILOS.clusterAzul.fillColor,
                fillOpacity:
                    cl.fillOpacity != null ? Number(cl.fillOpacity) : DEFAULT_ESTILOS.clusterAzul.fillOpacity,
                strokeColor: cl.strokeColor || DEFAULT_ESTILOS.clusterAzul.strokeColor,
                strokeWeight:
                    cl.strokeWeight != null ? Number(cl.strokeWeight) : DEFAULT_ESTILOS.clusterAzul.strokeWeight,
                strokeOpacity:
                    cl.strokeOpacity != null
                        ? Number(cl.strokeOpacity)
                        : DEFAULT_ESTILOS.clusterAzul.strokeOpacity
            },
            supervision: mergeSupervisionCfg(cfg)
        };
    }

    const DEFAULT_SUP = {
        cicloSegundos: 85,
        colorRuta: "#c4a035",
        rutaOpacity: 0.96,
        rutaWeight: 5,
        rutaDashArray: "8 10",
        iconoTamano: 64,
        iconoBorde: "#0a1628"
    };

    function mergeSupervisionCfg(cfg) {
        var s = (cfg && cfg.supervision) || {};
        return {
            cicloSegundos: s.cicloSegundos != null ? Number(s.cicloSegundos) : DEFAULT_SUP.cicloSegundos,
            colorRuta: s.colorRuta || DEFAULT_SUP.colorRuta,
            rutaOpacity: s.rutaOpacity != null ? Number(s.rutaOpacity) : DEFAULT_SUP.rutaOpacity,
            rutaWeight: s.rutaWeight != null ? Number(s.rutaWeight) : DEFAULT_SUP.rutaWeight,
            rutaDashArray: s.rutaDashArray === undefined ? DEFAULT_SUP.rutaDashArray : s.rutaDashArray,
            iconoTamano: s.iconoTamano != null ? Number(s.iconoTamano) : DEFAULT_SUP.iconoTamano,
            iconoBorde: s.iconoBorde || DEFAULT_SUP.iconoBorde
        };
    }


    function normalizeMapConfig(cfg) {
        if (!cfg || typeof cfg !== "object") return null;
        var puntosRaw = cfg.puntos;
        var lista = null;
        if (Array.isArray(puntosRaw)) lista = puntosRaw;
        else if (puntosRaw && Array.isArray(puntosRaw.puntos)) lista = puntosRaw.puntos;
        var rutasRaw = cfg.rutas;
        var rutas = null;
        if (Array.isArray(rutasRaw)) rutas = rutasRaw;
        else if (rutasRaw && Array.isArray(rutasRaw.rutas)) rutas = rutasRaw.rutas;
        var config = {};
        if (cfg.estilos) config.estilos = cfg.estilos;
        else if (cfg.marcaConjunto || cfg.perimetro) config = cfg;
        return {
            archivo: { puntos: lista || [] },
            config: config,
            rutasArchivoDoc: { rutas: rutas || [] }
        };
    }

    function loadMapDataSources() {
        var fromServer = normalizeMapConfig(MAP_CTX.mapConfig);
        if (fromServer) {
            return Promise.resolve([fromServer.archivo, fromServer.config, fromServer.rutasArchivoDoc]);
        }
        /* En propuestas de la app: no usar JSON globales compartidos (/legacy/data). */
        if (MAP_CTX.proposalId) {
            return Promise.resolve([{ puntos: [] }, {}, { rutas: [] }]);
        }
        return Promise.all([
            loadJson("/legacy/data/puntos-pereira.json").catch(function () {
                return { puntos: [] };
            }),
            loadJson("/legacy/data/config-mapa.json").catch(function () {
                return {};
            }),
            loadJson("/legacy/data/rutas-supervision.json").catch(function () {
                return { rutas: [] };
            })
        ]);
    }

    function useServerMapOnly() {
        return !!(MAP_CTX.proposalId && MAP_CTX.mapConfigIsSet);
    }

    function loadJson(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error(url + " " + r.status);
            return r.json();
        });
    }

    function tipoNorm(p) {
        return String((p && p.tipo) || "").toLowerCase();
    }

    function hasCoords(p) {
        return typeof p.lat === "number" && typeof p.lng === "number";
    }

    function parseColorHex(v) {
        if (v == null || v === "") return null;
        var s = String(v).trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
        if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
            return (
                "#" +
                s[1] +
                s[1] +
                s[2] +
                s[2] +
                s[3] +
                s[3]
            ).toLowerCase();
        }
        if (/^[0-9A-Fa-f]{6}$/.test(s)) return ("#" + s).toLowerCase();
        if (/^[0-9A-Fa-f]{3}$/.test(s)) return parseColorHex("#" + s);
        return null;
    }

    function partitionPuntos(list) {
        var conjuntos = [];
        var satelites = [];
        (list || []).forEach(function (p, i) {
            var t = tipoNorm(p);
            if (t === "conjunto") {
                conjuntos.push(Object.assign({ _i: i }, p));
            } else if (t === "porteria" || t === "ronda") {
                satelites.push(Object.assign({ _i: i }, p));
            }
        });
        conjuntos.sort(function (a, b) {
            var oa = a.orden != null && a.orden !== "" ? Number(a.orden) : NaN;
            var ob = b.orden != null && b.orden !== "" ? Number(b.orden) : NaN;
            if (!isNaN(oa) && !isNaN(ob)) return oa - ob;
            if (!isNaN(oa)) return -1;
            if (!isNaN(ob)) return 1;
            return a._i - b._i;
        });
        conjuntos.forEach(function (p) {
            delete p._i;
        });
        satelites.forEach(function (p) {
            delete p._i;
        });
        return { conjuntos: conjuntos, satelites: satelites };
    }

    function indexConjuntosPorId(conjuntos) {
        var byId = {};
        conjuntos.forEach(function (c) {
            if (c.id == null || c.id === "") return;
            byId[String(c.id)] = c;
        });
        return byId;
    }

    function suggestNextConjuntoId(conjuntos) {
        var max = 0;
        var found = false;
        conjuntos.forEach(function (c) {
            var id = String(c.id || "");
            var m = id.match(/^c(\d+)$/i);
            if (m) {
                found = true;
                max = Math.max(max, parseInt(m[1], 10));
            }
        });
        if (found) return "c" + (max + 1);
        if (conjuntos.length === 0) return "c1";
        return "c" + (conjuntos.length + 1);
    }

    function nextOrdenConjunto(conjuntos) {
        var n = 1;
        conjuntos.forEach(function (c) {
            if (c.orden != null && !isNaN(Number(c.orden))) {
                n = Math.max(n, Number(c.orden) + 1);
            }
        });
        return n;
    }

    function markerColor(p, est) {
        var custom = parseColorHex(p.color);
        if (custom) return custom;
        var t = tipoNorm(p);
        if (t === "conjunto") return est.marcaConjunto;
        if (t === "porteria" || t === "ronda") return est.marcaAzul;
        return LEGACY_MARKER[t] || LEGACY_MARKER.default;
    }

    function escHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function etiquetaVisible(p) {
        var t = tipoNorm(p);
        var n = p.nombre != null ? String(p.nombre).trim() : "";
        if (n) return n;
        if (t === "conjunto" && p.id != null && String(p.id).trim()) return "Conjunto " + String(p.id);
        if (t === "porteria") return "Portería";
        if (t === "ronda") return "Ronda";
        if (t) return t.charAt(0).toUpperCase() + t.slice(1);
        return "Punto";
    }

    function normalizeRouteLatLngs(route) {
        var raw = route.coords || route.puntos || route.ruta;
        if (!Array.isArray(raw)) return [];
        var out = [];
        raw.forEach(function (x) {
            if (Array.isArray(x) && x.length >= 2 && typeof x[0] === "number" && typeof x[1] === "number") {
                out.push(L.latLng(x[0], x[1]));
            } else if (x && typeof x.lat === "number" && typeof x.lng === "number") {
                out.push(L.latLng(x.lat, x.lng));
            }
        });
        return out;
    }

    /** Puntos de parada asociados a una ruta de supervisión (opcional). */
    function normalizeRouteParadas(route) {
        var raw = route && route.paradas;
        if (!Array.isArray(raw)) return [];
        var out = [];
        raw.forEach(function (x, idx) {
            if (Array.isArray(x) && x.length >= 2 && typeof x[0] === "number" && typeof x[1] === "number") {
                out.push({
                    lat: x[0],
                    lng: x[1],
                    nombre: x[2] != null && String(x[2]).trim() ? String(x[2]).trim() : null
                });
            } else if (x && typeof x.lat === "number" && typeof x.lng === "number") {
                out.push({
                    lat: x.lat,
                    lng: x.lng,
                    nombre: x.nombre != null && String(x.nombre).trim() ? String(x.nombre).trim() : null
                });
            }
        });
        out.forEach(function (p, i) {
            if (!p.nombre) p.nombre = "Parada " + (i + 1);
        });
        return out;
    }

    function buildCumulativeDistances(latlngs) {
        var cum = [0];
        var total = 0;
        for (var i = 0; i < latlngs.length - 1; i++) {
            total += latlngs[i].distanceTo(latlngs[i + 1]);
            cum.push(total);
        }
        return { cum: cum, total: total };
    }

    function svgMotoIcon(fillColor, svgPx) {
        var f = fillColor || "#d4af37";
        var dim = svgPx != null && !isNaN(Number(svgPx)) ? Math.max(20, Number(svgPx)) : 26;
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="' +
            dim +
            '" height="' +
            dim +
            '" viewBox="0 0 28 28" aria-hidden="true">' +
            '<circle cx="8" cy="20" r="3.5" fill="#0f172a" stroke="' +
            f +
            '" stroke-width="1.2"/>' +
            '<circle cx="20" cy="20" r="3.5" fill="#0f172a" stroke="' +
            f +
            '" stroke-width="1.2"/>' +
            '<path fill="' +
            f +
            '" d="M5 15 L9 9 L17 9 L23 15 L20 17 L7 17 Z"/>' +
            "</svg>"
        );
    }

    function createMotoDivIcon(size, fillColor) {
        var s = Math.max(36, Math.min(96, size || 64));
        var svgDim = Math.round(s * 0.92);
        return L.divIcon({
            className: "mapa-moto-pin",
            html:
                '<div class="mapa-moto-inner" style="width:' +
                s +
                "px;height:" +
                s +
                "px;display:flex;align-items:center;justify-content:center;transform:rotate(0deg);filter:drop-shadow(0 3px 10px rgba(0,0,0,.75)) drop-shadow(0 0 2px rgba(255,255,255,.35));\">" +
                svgMotoIcon(fillColor, svgDim) +
                "</div>",
            iconSize: [s, s],
            iconAnchor: [s / 2, s / 2]
        });
    }

    function superviseStopAll(animators) {
        while (animators.length) {
            var a = animators.pop();
            if (a && typeof a.stop === "function") a.stop();
        }
    }

    function startSupervisionRoute(layerGroup, route, supSt, animators) {
        var latlngs = normalizeRouteLatLngs(route);
        if (latlngs.length < 2) return;

        var cd = buildCumulativeDistances(latlngs);
        if (cd.total < 8) return;

        var durSec =
            route.cicloSegundos != null && !isNaN(Number(route.cicloSegundos))
                ? Number(route.cicloSegundos)
                : supSt.cicloSegundos;
        var durationMs = Math.max(15, durSec) * 1000;

        var lineColor = parseColorHex(route.color) || supSt.colorRuta;
        var dash = route.dashArray !== undefined ? route.dashArray : supSt.rutaDashArray;
        var w = route.pesoRuta != null ? Number(route.pesoRuta) : supSt.rutaWeight;
        if (isNaN(w) || w < 1) w = supSt.rutaWeight;
        var op = route.opacidadRuta != null ? Number(route.opacidadRuta) : supSt.rutaOpacity;
        if (isNaN(op)) op = supSt.rutaOpacity;
        var haloW = w + 6;
        var lineOpts = {
            dashArray: dash || null,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
            pane: "mapaSupervisionPane"
        };

        /* Contorno oscuro para que la ruta se lea sobre polígonos azules y satélite */
        L.polyline(
            latlngs,
            Object.assign({}, lineOpts, {
                color: "#030712",
                weight: haloW,
                opacity: 0.88
            })
        ).addTo(layerGroup);
        L.polyline(
            latlngs,
            Object.assign({}, lineOpts, {
                color: lineColor,
                weight: w,
                opacity: op
            })
        ).addTo(layerGroup);

        var paradas = normalizeRouteParadas(route);
        paradas.forEach(function (p) {
            var cm = L.circleMarker([p.lat, p.lng], {
                radius: 7,
                color: "#f8fafc",
                weight: 2,
                fillColor: lineColor,
                fillOpacity: 0.95,
                interactive: true,
                pane: "mapaSupervisionPane"
            });
            cm.bindPopup(
                "<strong>" + escHtml(p.nombre) + "</strong><br/><small>Parada de supervisión</small>"
            );
            cm.bindTooltip(escHtml(p.nombre), {
                direction: "top",
                offset: [0, -10],
                className: "mapa-etiqueta mapa-etiqueta--otro",
                sticky: true,
                interactive: false
            });
            cm.addTo(layerGroup);
        });

        var m = L.marker(latlngs[0], {
            icon: createMotoDivIcon(supSt.iconoTamano, lineColor),
            interactive: true
        }).addTo(layerGroup);
        if (route.nombre) {
            var motoHalf = Math.round((supSt.iconoTamano || 64) / 2) + 16;
            m.bindTooltip(escHtml(String(route.nombre)), {
                direction: "top",
                offset: [0, -motoHalf],
                className: "mapa-etiqueta mapa-etiqueta--otro",
                sticky: true,
                interactive: false
            });
        }

        var phase = route.faseInicial != null ? Number(route.faseInicial) % 1 : 0;
        if (isNaN(phase)) phase = 0;

        var rafId = null;
        function tick() {
            var rawT = Date.now() / durationMs + phase;
            var t = rawT - Math.floor(rawT);
            var dist = t * cd.total;
            if (dist >= cd.total) dist = cd.total - 1e-6;
            if (dist < 0) dist = 0;

            var i = 0;
            for (var k = 0; k < cd.cum.length - 1; k++) {
                if (dist >= cd.cum[k] && dist <= cd.cum[k + 1] + 1e-9) {
                    i = k;
                    break;
                }
            }
            i = Math.min(Math.max(0, i), latlngs.length - 2);
            var segStart = cd.cum[i];
            var segEnd = cd.cum[i + 1];
            var segLen = Math.max(1e-6, segEnd - segStart);
            var u = (dist - segStart) / segLen;
            if (u > 1) u = 1;
            var a = latlngs[i];
            var b = latlngs[i + 1];
            var lat = a.lat + (b.lat - a.lat) * u;
            var lng = a.lng + (b.lng - a.lng) * u;
            var bearing = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
            m.setLatLng([lat, lng]);
            var el = m.getElement();
            if (el) {
                var inner = el.querySelector(".mapa-moto-inner");
                if (inner) inner.style.transform = "rotate(" + bearing + "deg)";
            }
            rafId = requestAnimationFrame(tick);
        }

        function stop() {
            if (rafId != null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        rafId = requestAnimationFrame(tick);
        animators.push({ stop: stop });
    }

    function setupSupervisionAnimadas(layerGroup, rutasDoc, supSt, animators) {
        superviseStopAll(animators);
        layerGroup.clearLayers();
        var rutas = (rutasDoc && rutasDoc.rutas) || [];
        rutas.forEach(function (r) {
            startSupervisionRoute(layerGroup, r, supSt, animators);
        });
    }

    function extendBoundsWithRutas(bounds, rutasDoc) {
        if (!bounds || !rutasDoc || !rutasDoc.rutas) return;
        rutasDoc.rutas.forEach(function (route) {
            normalizeRouteLatLngs(route).forEach(function (latlng) {
                bounds.extend(latlng);
            });
            normalizeRouteParadas(route).forEach(function (p) {
                bounds.extend(L.latLng(p.lat, p.lng));
            });
        });
    }

    function boundsFromRutasOnly(rutasDoc) {
        var ll = [];
        ((rutasDoc && rutasDoc.rutas) || []).forEach(function (route) {
            normalizeRouteLatLngs(route).forEach(function (x) {
                ll.push(x);
            });
            normalizeRouteParadas(route).forEach(function (p) {
                ll.push(L.latLng(p.lat, p.lng));
            });
        });
        if (ll.length === 0) return null;
        return L.latLngBounds(ll);
    }

    function addMarkers(layerGroup, puntos, est) {
        (puntos || []).forEach(function (p) {
            if (!hasCoords(p)) return;
            var color = markerColor(p, est);
            var t = tipoNorm(p);
            var lbl = etiquetaVisible(p);
            var safeLbl = escHtml(lbl);
            var sinEtiquetaRonda = t === "ronda";
            var etiquetaHtml = "";
            if (!sinEtiquetaRonda) {
                var lblCls =
                    t === "conjunto"
                        ? "mapa-pin-lbl mapa-pin-lbl--rojo"
                        : t === "porteria"
                          ? "mapa-pin-lbl mapa-pin-lbl--azul"
                          : "mapa-pin-lbl mapa-pin-lbl--otro";
                etiquetaHtml =
                    '<div class="' +
                    lblCls +
                    '" title="' +
                    safeLbl +
                    '">' +
                    safeLbl +
                    "</div>";
            }
            var dot = 14;
            var wrapW = sinEtiquetaRonda ? 22 : 108;
            var anchorX = wrapW / 2;
            var anchorY = dot / 2;
            var iconH = sinEtiquetaRonda ? dot + 4 : 36;
            var icon = L.divIcon({
                className: "mapa-pin",
                html:
                    '<div class="mapa-pin-wrap" style="width:' +
                    wrapW +
                    'px;text-align:center">' +
                    '<div style="width:' +
                    dot +
                    "px;height:" +
                    dot +
                    "px;margin:0 auto 2px;border-radius:50%;background:" +
                    color +
                    ";border:2px solid #0a1628;box-shadow:0 2px 8px rgba(0,0,0,.4);\"></div>" +
                    etiquetaHtml +
                    "</div>",
                iconSize: [wrapW, iconH],
                iconAnchor: [anchorX, anchorY]
            });
            var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(layerGroup);
            var body =
                "<strong>" +
                escHtml(p.nombre || etiquetaVisible(p)) +
                "</strong>" +
                (t ? "<br/>Tipo: " + escHtml(t) : "") +
                (parseColorHex(p.color) ? "<br/><small>Color: " + escHtml(parseColorHex(p.color)) + "</small>" : "") +
                (p.id != null && p.id !== "" ? "<br/><small>id: " + escHtml(String(p.id)) + "</small>" : "") +
                (p.conjuntoId != null && p.conjuntoId !== ""
                    ? "<br/><small>conjuntoId: " + escHtml(String(p.conjuntoId)) + "</small>"
                    : "") +
                (p.descripcion ? "<br/><small>" + escHtml(String(p.descripcion)) + "</small>" : "");
            m.bindPopup(body);
        });
    }

    function sortSatelitesByAngleFromConjunto(sats, c) {
        return sats.slice().sort(function (a, b) {
            var aa = Math.atan2(a.lng - c.lng, a.lat - c.lat);
            var ab = Math.atan2(b.lng - c.lng, b.lat - c.lat);
            return aa - ab;
        });
    }

    function drawLineas(layerGroup, conjuntos, satelites, est) {
        layerGroup.clearLayers();
        var byId = indexConjuntosPorId(conjuntos);
        var sinPadre = 0;
        var sty = est.clusterAzul;
        var en = est.enlaceAzulRojo;

        conjuntos.forEach(function (c) {
            if (!hasCoords(c) || c.id == null || c.id === "") return;
            var id = String(c.id);
            var blues = satelites.filter(function (s) {
                return hasCoords(s) && String(s.conjuntoId || "") === id;
            });

            if (blues.length >= 3) {
                var ordered = sortSatelitesByAngleFromConjunto(blues, c);
                var ring = ordered.map(function (p) {
                    return [p.lat, p.lng];
                });
                L.polygon(ring, {
                    fillColor: sty.fillColor,
                    fillOpacity: sty.fillOpacity,
                    color: sty.strokeColor,
                    weight: sty.strokeWeight,
                    opacity: sty.strokeOpacity
                }).addTo(layerGroup);
            } else if (blues.length === 2) {
                L.polyline(
                    [
                        [blues[0].lat, blues[0].lng],
                        [blues[1].lat, blues[1].lng]
                    ],
                    {
                        color: sty.strokeColor,
                        weight: sty.strokeWeight,
                        opacity: sty.strokeOpacity,
                        dashArray: en.dashArray || null
                    }
                ).addTo(layerGroup);
            } else if (blues.length === 1) {
                L.polyline(
                    [
                        [blues[0].lat, blues[0].lng],
                        [c.lat, c.lng]
                    ],
                    {
                        color: en.color,
                        weight: en.weight,
                        opacity: en.opacity,
                        dashArray: en.dashArray || null
                    }
                ).addTo(layerGroup);
            }
        });

        satelites.forEach(function (s) {
            if (!hasCoords(s)) return;
            var pid = s.conjuntoId != null ? String(s.conjuntoId) : "";
            var parent = byId[pid];
            if (!parent || !hasCoords(parent)) {
                sinPadre += 1;
            }
        });

        var ring = conjuntos.filter(hasCoords).map(function (c) {
            return [c.lat, c.lng];
        });

        if (ring.length >= 2) {
            var closed = ring.slice();
            closed.push(ring[0]);
            L.polyline(closed, {
                color: est.perimetro.color,
                weight: est.perimetro.weight,
                opacity: est.perimetro.opacity,
                dashArray: est.perimetro.dashArray || null
            }).addTo(layerGroup);
        }

        return { enlacesSinPadre: sinPadre };
    }

    function readListaFromLocalStorage() {
        try {
            var raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            var o = JSON.parse(raw);
            if (o && Array.isArray(o.puntos)) return o.puntos;
        } catch (e) {
            console.warn("localStorage puntos:", e);
        }
        return null;
    }

    function writeListaToLocalStorage(lista) {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({ puntos: lista }));
            scheduleMapPersist();
        } catch (e) {
            console.warn("No se pudo guardar en localStorage", e);
        }
    }

    function readRutasFromLocalStorage() {
        try {
            var raw = localStorage.getItem(LS_KEY_RUTAS);
            if (!raw) return null;
            var o = JSON.parse(raw);
            if (o && Array.isArray(o.rutas)) return o.rutas;
        } catch (e) {
            console.warn("localStorage rutas:", e);
        }
        return null;
    }

    function writeRutasToLocalStorage(rutasArr) {
        try {
            localStorage.setItem(LS_KEY_RUTAS, JSON.stringify({ rutas: rutasArr }));
            scheduleMapPersist();
        } catch (e) {
            console.warn("No se pudo guardar rutas en localStorage", e);
        }
    }

    function cloneRutasDoc(doc) {
        return {
            rutas: ((doc && doc.rutas) || []).map(function (r) {
                var coords = r.coords || r.puntos || r.ruta || [];
                var cc = Array.isArray(coords)
                    ? coords.map(function (x) {
                          if (Array.isArray(x) && x.length >= 2) return [x[0], x[1]];
                          if (x && typeof x.lat === "number") return [x.lat, x.lng];
                          return null;
                      })
                    : [];
                var paradas = normalizeRouteParadas(r);
                var o = {
                    id: r.id,
                    nombre: r.nombre,
                    color: r.color,
                    cicloSegundos: r.cicloSegundos,
                    faseInicial: r.faseInicial,
                    coords: cc.filter(Boolean)
                };
                if (paradas.length) {
                    o.paradas = paradas.map(function (p) {
                        return { lat: p.lat, lng: p.lng, nombre: p.nombre };
                    });
                }
                return o;
            })
        };
    }

    var SESSION_PANEL_KEY = "cootravir_mapa_presentacion_oculto";

    function initPresentacionFab(map, onHidePanel) {
        var panel = document.querySelector(".mapa-panel");
        var btn = document.getElementById("mapa-btn-presentacion");
        if (!panel || !btn) return;

        function apply(hidden) {
            panel.classList.toggle("mapa-panel--hidden", hidden);
            btn.setAttribute("aria-pressed", hidden ? "true" : "false");
            btn.textContent = hidden ? "Herramientas" : "Presentación";
            btn.title = hidden
                ? "Mostrar panel de capas y editor"
                : "Ocultar panel — solo mapa para clientes (tecla P)";
            try {
                if (hidden) sessionStorage.setItem(SESSION_PANEL_KEY, "1");
                else sessionStorage.removeItem(SESSION_PANEL_KEY);
            } catch (e0) {
                /* */
            }
            var modoBtn = document.getElementById("ed-btn-modo-clic");
            if (hidden && modoBtn && modoBtn.classList.contains("mapa-ed-btn--active")) {
                modoBtn.click();
            }
            if (hidden && typeof onHidePanel === "function") {
                try {
                    onHidePanel();
                } catch (ePanelHide) {
                    /* */
                }
            }
            setTimeout(function () {
                map.invalidateSize();
            }, 160);
        }

        var urlForzar = false;
        try {
            var sp = new URLSearchParams(window.location.search);
            urlForzar =
                sp.get("presentacion") === "1" ||
                sp.get("soloMapa") === "1" ||
                sp.get("modo") === "presentacion";
        } catch (e1) {
            /* */
        }
        var desdeSesion = false;
        try {
            desdeSesion = sessionStorage.getItem(SESSION_PANEL_KEY) === "1";
        } catch (e2) {
            /* */
        }
        apply(urlForzar || desdeSesion);

        btn.addEventListener("click", function () {
            apply(!panel.classList.contains("mapa-panel--hidden"));
        });

        document.addEventListener("keydown", function (ev) {
            var tag = ev.target && ev.target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
            if (ev.key === "p" || ev.key === "P") {
                ev.preventDefault();
                apply(!panel.classList.contains("mapa-panel--hidden"));
            }
        });
    }

    function defaultColorForTipo(tipo, est) {
        if (tipo === "conjunto") return est.marcaConjunto;
        if (tipo === "porteria" || tipo === "ronda") return est.marcaAzul;
        return est.marcaAzul;
    }

    var mapaLeafletInstance = null;

    function scheduleMapResize(map) {
        if (!map) return;
        [0, 120, 400, 900, 1600].forEach(function (ms) {
            setTimeout(function () {
                try {
                    map.invalidateSize({ animate: false, pan: false });
                } catch (e0) {
                    /* */
                }
            }, ms);
        });
        var wrap = document.getElementById("map-wrap");
        if (wrap && typeof ResizeObserver !== "undefined") {
            var roTimer = null;
            new ResizeObserver(function () {
                clearTimeout(roTimer);
                roTimer = setTimeout(function () {
                    try {
                        map.invalidateSize({ animate: false, pan: false });
                    } catch (e1) {
                        /* */
                    }
                }, 100);
            }).observe(wrap);
        }
    }

    function bootMap() {
        if (mapaLeafletInstance) {
            scheduleMapResize(mapaLeafletInstance);
            return;
        }
        var mapEl = document.getElementById("map");
        if (!mapEl || typeof L === "undefined") {
            setTimeout(bootMap, 60);
            return;
        }
        if (mapEl.clientHeight < 120 || mapEl.clientWidth < 120) {
            setTimeout(bootMap, 60);
            return;
        }
        initMap();
    }

    function initMap() {
        var mapEl = document.getElementById("map");
        if (!mapEl || typeof L === "undefined" || mapaLeafletInstance) return;

        var map = L.map("map", {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([4.8133, -75.6961], 13);

        mapaLeafletInstance = map;
        scheduleMapResize(map);

        window.addEventListener("resize", function () {
            map.invalidateSize({ animate: false, pan: false });
        });

        /* Base satelital (fotografía aérea) + etiquetas; alternativa calles OSM */
        var capaEsriImg = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                attribution:
                    '&copy; <a href="https://www.esri.com/">Esri</a> · Maxar · Earthstar Geographics',
                maxZoom: 19
            }
        );
        var capaEsriEtiquetas = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            {
                attribution: "",
                maxZoom: 19,
                pane: "overlayPane"
            }
        );
        var capaCalles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
            maxZoom: 19
        });
        var capaSatelite = L.layerGroup([capaEsriImg, capaEsriEtiquetas]);
        capaSatelite.addTo(map);

        L.control
            .layers(
                {
                    Satélite: capaSatelite,
                    Calles: capaCalles
                },
                null,
                { position: "bottomleft", collapsed: false }
            )
            .addTo(map);

        if (!map.getPane("mapaSupervisionPane")) {
            var supPane = map.createPane("mapaSupervisionPane");
            supPane.style.zIndex = 480;
            supPane.style.pointerEvents = "auto";
        }

        var layers = {
            puntos: L.layerGroup().addTo(map),
            lineas: L.layerGroup().addTo(map),
            supervision: L.layerGroup().addTo(map)
        };

        loadMapDataSources()
            .then(function (results) {
                var archivo = results[0] || { puntos: [] };
                var config = results[1] || {};
                var rutasArchivoDoc = cloneRutasDoc(results[2] || { rutas: [] });
                var rutasLs = useServerMapOnly() ? null : readRutasFromLocalStorage();
                var fuenteRutasNavegador = rutasLs !== null;
                var rutasSupervisionDoc = {
                    rutas: fuenteRutasNavegador ? rutasLs.slice() : rutasArchivoDoc.rutas.slice()
                };
                var est = mergeEstilos(config);

                var lsArr = useServerMapOnly() ? null : readListaFromLocalStorage();
                var fuenteNavegador = lsArr !== null;
                var lista = fuenteNavegador ? lsArr.slice() : (archivo.puntos || []).slice();
                var supervisionAnimators = [];

                window.__cootravirExportMapConfig = function () {
                    return {
                        puntos: { puntos: lista.slice() },
                        rutas: { rutas: (rutasSupervisionDoc.rutas || []).slice() },
                        estilos: config.estilos || config,
                        supervision: config.supervision
                    };
                };

                function renderAll(fitBounds) {
                    var part = partitionPuntos(lista);
                    layers.puntos.clearLayers();
                    addMarkers(layers.puntos, lista, est);
                    var lineStats = drawLineas(layers.lineas, part.conjuntos, part.satelites, est);

                    if (fitBounds !== false) {
                        var all = lista.filter(hasCoords);
                        var br = null;
                        try {
                            if (all.length >= 1) {
                                br = L.latLngBounds(
                                    all.map(function (p) {
                                        return [p.lat, p.lng];
                                    })
                                );
                                extendBoundsWithRutas(br, rutasSupervisionDoc);
                            } else {
                                br = boundsFromRutasOnly(rutasSupervisionDoc);
                            }
                            if (br && br.isValid()) {
                                map.fitBounds(br, { padding: [48, 48], maxZoom: 15 });
                            } else {
                                map.setView([4.8133, -75.6961], 12);
                            }
                        } catch (e1) {
                            map.setView([4.8133, -75.6961], 12);
                        }
                    }

                    var st = document.getElementById("map-status");
                    if (st) {
                        var msg =
                            "Conjuntos: " +
                            part.conjuntos.length +
                            " · Portería/ronda: " +
                            part.satelites.length +
                            " · Rutas supervisión: " +
                            (rutasSupervisionDoc.rutas || []).length +
                            ". " +
                            (fuenteNavegador
                                ? "Puntos: copia en <strong>navegador</strong>. "
                                : "Puntos: <strong>archivo</strong>. ") +
                            (fuenteRutasNavegador
                                ? "Rutas: <strong>navegador</strong>."
                                : "Rutas: <strong>archivo</strong>.");
                        if (lineStats.enlacesSinPadre) {
                            msg +=
                                " (" +
                                lineStats.enlacesSinPadre +
                                " azul(es) sin padre válido.)";
                        }
                        st.innerHTML = msg;
                    }

                    refreshEditorList(lista);
                    syncConjuntoFieldsFromLista(lista, est);
                }

                function syncConjuntoFieldsFromLista(listaActual, estilos) {
                    var part = partitionPuntos(listaActual);
                    var elId = document.getElementById("ed-id");
                    var elOrden = document.getElementById("ed-orden");
                    var elPadre = document.getElementById("ed-conjunto-id");
                    if (elId && !elId.dataset.userEdited) {
                        elId.value = suggestNextConjuntoId(part.conjuntos);
                    }
                    if (elOrden && !elOrden.dataset.userEdited) {
                        elOrden.value = String(nextOrdenConjunto(part.conjuntos));
                    }
                    if (elPadre && part.conjuntos.length && !elPadre.dataset.userEdited) {
                        var first = part.conjuntos[0];
                        if (first && first.id) elPadre.value = String(first.id);
                    }
                    var tipoEl = document.getElementById("ed-tipo");
                    if (tipoEl) {
                        applyDefaultColorPicker(tipoEl.value || "conjunto", estilos);
                    }
                }

                function applyDefaultColorPicker(tipo, estilos) {
                    var c = defaultColorForTipo(String(tipo).toLowerCase(), estilos);
                    var pc = document.getElementById("ed-color");
                    var tx = document.getElementById("ed-color-hex");
                    if (pc) pc.value = c;
                    if (tx) tx.value = c;
                }

                function refreshEditorList(listaActual) {
                    var ul = document.getElementById("ed-lista");
                    var cnt = document.getElementById("ed-count");
                    if (cnt) cnt.textContent = String(listaActual.length);
                    if (!ul) return;
                    ul.innerHTML = "";
                    listaActual.forEach(function (p, idx) {
                        var li = document.createElement("li");
                        li.className = "mapa-ed-li";
                        var dot = document.createElement("span");
                        dot.className = "mapa-ed-swatch";
                        dot.style.background = markerColor(p, est);
                        var span = document.createElement("span");
                        span.className = "mapa-ed-li-text";
                        span.textContent =
                            (p.nombre && String(p.nombre).trim()) ||
                            etiquetaVisible(p) + " · " + tipoNorm(p);
                        var btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "mapa-ed-del";
                        btn.textContent = "Quitar";
                        btn.setAttribute("data-idx", String(idx));
                        btn.addEventListener("click", function () {
                            var i = parseInt(btn.getAttribute("data-idx"), 10);
                            if (!isNaN(i)) {
                                lista.splice(i, 1);
                                writeListaToLocalStorage(lista);
                                fuenteNavegador = true;
                                renderAll(false);
                            }
                        });
                        li.appendChild(dot);
                        li.appendChild(span);
                        li.appendChild(btn);
                        ul.appendChild(li);
                    });
                    if (listaActual.length === 0) {
                        var empty = document.createElement("li");
                        empty.className = "mapa-ed-empty";
                        empty.textContent = "Ningún punto. Añada con el formulario y el mapa.";
                        ul.appendChild(empty);
                    }
                }

                function collectFormPoint(lat, lng) {
                    var nombre = (document.getElementById("ed-nombre") && document.getElementById("ed-nombre").value) || "";
                    var tipo = (
                        document.getElementById("ed-tipo") && document.getElementById("ed-tipo").value
                    )
                        ? String(document.getElementById("ed-tipo").value).toLowerCase()
                        : "conjunto";
                    var hex =
                        (document.getElementById("ed-color-hex") && document.getElementById("ed-color-hex").value) ||
                        (document.getElementById("ed-color") && document.getElementById("ed-color").value);
                    var colorOk = parseColorHex(hex);
                    var o = {
                        lat: Number(lat),
                        lng: Number(lng),
                        nombre: nombre.trim(),
                        tipo: tipo
                    };
                    if (colorOk) o.color = colorOk;

                    if (tipo === "conjunto") {
                        var idIn = document.getElementById("ed-id") && document.getElementById("ed-id").value.trim();
                        var ordIn =
                            document.getElementById("ed-orden") && document.getElementById("ed-orden").value.trim();
                        var part = partitionPuntos(lista);
                        o.id = idIn || suggestNextConjuntoId(part.conjuntos);
                        o.orden =
                            ordIn !== "" && !isNaN(Number(ordIn))
                                ? Number(ordIn)
                                : nextOrdenConjunto(part.conjuntos);
                    } else {
                        var pad =
                            document.getElementById("ed-conjunto-id") &&
                            document.getElementById("ed-conjunto-id").value.trim();
                        o.conjuntoId = pad || "c1";
                    }
                    return o;
                }

                function bumpConjuntoFormAfterAdd(added) {
                    if (tipoNorm(added) !== "conjunto") return;
                    var elId = document.getElementById("ed-id");
                    var elOrden = document.getElementById("ed-orden");
                    if (elId) {
                        var m = String(added.id || "").match(/^c(\d+)$/i);
                        if (m) elId.value = "c" + (parseInt(m[1], 10) + 1);
                        else elId.value = suggestNextConjuntoId(partitionPuntos(lista).conjuntos);
                        delete elId.dataset.userEdited;
                    }
                    if (elOrden && added.orden != null) {
                        elOrden.value = String(Number(added.orden) + 1);
                        delete elOrden.dataset.userEdited;
                    }
                }

                var modoClic = false;
                var modoRutaVertice = false;
                var modoRutaParada = false;
                var trazoRutaCoords = [];
                var trazoParadasCoords = [];
                var previewRutaLine = null;
                var previewParadasGroup = null;

                function updateMapWrapCursor() {
                    var wrap = document.getElementById("map-wrap");
                    if (!wrap) return;
                    wrap.style.cursor =
                        modoClic || modoRutaVertice || modoRutaParada ? "crosshair" : "";
                }

                function resetModoRutaParadaBtn() {
                    modoRutaParada = false;
                    var bp = document.getElementById("ed-btn-ruta-parada");
                    if (bp) {
                        bp.textContent = "Añadir puntos de parada (clics en el mapa)";
                        bp.classList.remove("mapa-ed-btn--active");
                    }
                    updateMapWrapCursor();
                }

                function updateRutaVerticesCountUI() {
                    var s = document.getElementById("ed-ruta-vertices-count");
                    if (s) s.textContent = String(trazoRutaCoords.length);
                }

                function currentRutaPreviewColor() {
                    var h = document.getElementById("ed-ruta-color-hex");
                    var c = document.getElementById("ed-ruta-color");
                    return (
                        parseColorHex((h && h.value) || "") ||
                        parseColorHex((c && c.value) || "") ||
                        est.supervision.colorRuta
                    );
                }

                function syncTrazoPreview() {
                    if (trazoRutaCoords.length < 2) {
                        if (previewRutaLine) {
                            map.removeLayer(previewRutaLine);
                            previewRutaLine = null;
                        }
                        syncTrazoPreviewParadas();
                        return;
                    }
                    var col = currentRutaPreviewColor();
                    if (!previewRutaLine) {
                        previewRutaLine = L.polyline(trazoRutaCoords, {
                            color: col,
                            weight: 6,
                            dashArray: "8 10",
                            opacity: 0.95,
                            lineCap: "round",
                            lineJoin: "round",
                            interactive: false
                        }).addTo(map);
                    } else {
                        previewRutaLine.setLatLngs(trazoRutaCoords);
                        previewRutaLine.setStyle({
                            color: col,
                            weight: 6,
                            opacity: 0.95,
                            lineCap: "round",
                            lineJoin: "round"
                        });
                    }
                    syncTrazoPreviewParadas();
                }

                function updateRutaParadasCountUI() {
                    var s = document.getElementById("ed-ruta-paradas-count");
                    if (s) s.textContent = String(trazoParadasCoords.length);
                }

                function syncTrazoPreviewParadas() {
                    if (!previewParadasGroup) {
                        previewParadasGroup = L.layerGroup().addTo(map);
                    }
                    previewParadasGroup.clearLayers();
                    if (trazoParadasCoords.length === 0) return;
                    var col = currentRutaPreviewColor();
                    trazoParadasCoords.forEach(function (xy, i) {
                        L.circleMarker(xy, {
                            radius: 7,
                            color: "#f8fafc",
                            weight: 2,
                            fillColor: col,
                            fillOpacity: 0.95,
                            interactive: false
                        }).addTo(previewParadasGroup);
                    });
                }

                function rebuildSupervisionIfCapaOn() {
                    var chkS = document.getElementById("capa-supervision");
                    if (!chkS || !chkS.checked) return;
                    if (!map.hasLayer(layers.supervision)) {
                        map.addLayer(layers.supervision);
                    }
                    setupSupervisionAnimadas(
                        layers.supervision,
                        rutasSupervisionDoc,
                        est.supervision,
                        supervisionAnimators
                    );
                }

                function refreshRutasLista() {
                    var ul = document.getElementById("ed-rutas-lista");
                    var cnt = document.getElementById("ed-ruta-count");
                    var arr = rutasSupervisionDoc.rutas || [];
                    if (cnt) cnt.textContent = String(arr.length);
                    if (!ul) return;
                    ul.innerHTML = "";
                    arr.forEach(function (r, idx) {
                        var li = document.createElement("li");
                        li.className = "mapa-ed-li";
                        var dot = document.createElement("span");
                        dot.className = "mapa-ed-swatch";
                        dot.style.background = parseColorHex(r.color) || est.supervision.colorRuta;
                        var span = document.createElement("span");
                        span.className = "mapa-ed-li-text";
                        var nPar = normalizeRouteParadas(r).length;
                        span.textContent =
                            ((r.nombre && String(r.nombre).trim()) || "Ruta " + (idx + 1)) +
                            (nPar ? " · " + nPar + " parada" + (nPar === 1 ? "" : "s") : "");
                        var btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "mapa-ed-del";
                        btn.textContent = "Quitar";
                        btn.setAttribute("data-r-idx", String(idx));
                        btn.addEventListener("click", function () {
                            var i = parseInt(btn.getAttribute("data-r-idx"), 10);
                            if (!isNaN(i)) {
                                arr.splice(i, 1);
                                writeRutasToLocalStorage(arr);
                                fuenteRutasNavegador = true;
                                refreshRutasLista();
                                rebuildSupervisionIfCapaOn();
                                renderAll(false);
                            }
                        });
                        li.appendChild(dot);
                        li.appendChild(span);
                        li.appendChild(btn);
                        ul.appendChild(li);
                    });
                    if (arr.length === 0) {
                        var empty = document.createElement("li");
                        empty.className = "mapa-ed-empty";
                        empty.textContent = "Ninguna ruta en la lista.";
                        ul.appendChild(empty);
                    }
                }

                function limpiarTrazoRuta() {
                    trazoRutaCoords = [];
                    trazoParadasCoords = [];
                    if (previewRutaLine) {
                        map.removeLayer(previewRutaLine);
                        previewRutaLine = null;
                    }
                    if (previewParadasGroup) {
                        previewParadasGroup.clearLayers();
                    }
                    updateRutaVerticesCountUI();
                    updateRutaParadasCountUI();
                }

                function setModoRutaVertice(on) {
                    modoRutaVertice = on;
                    if (on) {
                        resetModoRutaParadaBtn();
                        modoClic = false;
                        var b0 = document.getElementById("ed-btn-modo-clic");
                        if (b0) {
                            b0.textContent = "Añadir en el siguiente clic en el mapa";
                            b0.classList.remove("mapa-ed-btn--active");
                        }
                    }
                    var btn = document.getElementById("ed-btn-ruta-clic");
                    if (btn) {
                        btn.textContent = on
                            ? "Clic en el mapa: añadir vértice (pulse de nuevo para salir)"
                            : "Añadir vértices en el mapa (varios clics)";
                        btn.classList.toggle("mapa-ed-btn--active", on);
                    }
                    updateMapWrapCursor();
                }

                function setModoRutaParada(on) {
                    modoRutaParada = on;
                    if (on) {
                        modoRutaVertice = false;
                        modoClic = false;
                        var br = document.getElementById("ed-btn-ruta-clic");
                        if (br) {
                            br.textContent = "Añadir vértices en el mapa (varios clics)";
                            br.classList.remove("mapa-ed-btn--active");
                        }
                        var b0 = document.getElementById("ed-btn-modo-clic");
                        if (b0) {
                            b0.textContent = "Añadir en el siguiente clic en el mapa";
                            b0.classList.remove("mapa-ed-btn--active");
                        }
                    }
                    var btn = document.getElementById("ed-btn-ruta-parada");
                    if (btn) {
                        btn.textContent = on
                            ? "Clic en el mapa: añadir parada (pulse de nuevo para salir)"
                            : "Añadir puntos de parada (clics en el mapa)";
                        btn.classList.toggle("mapa-ed-btn--active", on);
                    }
                    updateMapWrapCursor();
                }

                function setModoClic(on) {
                    if (on) {
                        modoRutaVertice = false;
                        resetModoRutaParadaBtn();
                        var br = document.getElementById("ed-btn-ruta-clic");
                        if (br) {
                            br.textContent = "Añadir vértices en el mapa (varios clics)";
                            br.classList.remove("mapa-ed-btn--active");
                        }
                    }
                    modoClic = on;
                    var btn = document.getElementById("ed-btn-modo-clic");
                    if (btn) {
                        btn.textContent = on
                            ? "Haga clic en el mapa… (cancelar)"
                            : "Añadir en el siguiente clic en el mapa";
                        btn.classList.toggle("mapa-ed-btn--active", on);
                    }
                    updateMapWrapCursor();
                }

                function guardarRutaDesdeForm() {
                    var nombreEl = document.getElementById("ed-ruta-nombre");
                    var nombre = nombreEl && nombreEl.value ? String(nombreEl.value).trim() : "";
                    if (!nombre) {
                        alert("Escriba un nombre para la ruta.");
                        return;
                    }
                    if (trazoRutaCoords.length < 2) {
                        alert("Marque al menos 2 vértices en el mapa (botón «Añadir vértices…»).");
                        return;
                    }
                    var hex =
                        (document.getElementById("ed-ruta-color-hex") &&
                            document.getElementById("ed-ruta-color-hex").value) ||
                        (document.getElementById("ed-ruta-color") && document.getElementById("ed-ruta-color").value);
                    var color = parseColorHex(hex) || est.supervision.colorRuta;
                    var cicIn =
                        document.getElementById("ed-ruta-ciclo") && document.getElementById("ed-ruta-ciclo").value;
                    var ciclo =
                        cicIn !== "" && cicIn != null && !isNaN(Number(cicIn))
                            ? Number(cicIn)
                            : est.supervision.cicloSegundos;
                    ciclo = Math.max(15, ciclo);
                    var nueva = {
                        id: "r-local-" + Date.now(),
                        nombre: nombre,
                        color: color,
                        cicloSegundos: ciclo,
                        coords: trazoRutaCoords.map(function (xy) {
                            return [xy[0], xy[1]];
                        })
                    };
                    if (trazoParadasCoords.length > 0) {
                        nueva.paradas = trazoParadasCoords.map(function (xy, i) {
                            return { lat: xy[0], lng: xy[1], nombre: "Parada " + (i + 1) };
                        });
                    }
                    rutasSupervisionDoc.rutas.push(nueva);
                    writeRutasToLocalStorage(rutasSupervisionDoc.rutas);
                    fuenteRutasNavegador = true;
                    limpiarTrazoRuta();
                    setModoRutaVertice(false);
                    resetModoRutaParadaBtn();
                    refreshRutasLista();
                    rebuildSupervisionIfCapaOn();
                    renderAll(false);
                }

                function cancelarTrazoRutaEdicion() {
                    limpiarTrazoRuta();
                    setModoRutaVertice(false);
                    resetModoRutaParadaBtn();
                }

                map.on("click", function (e) {
                    if (modoRutaVertice) {
                        trazoRutaCoords.push([e.latlng.lat, e.latlng.lng]);
                        syncTrazoPreview();
                        updateRutaVerticesCountUI();
                        return;
                    }
                    if (modoRutaParada) {
                        trazoParadasCoords.push([e.latlng.lat, e.latlng.lng]);
                        syncTrazoPreviewParadas();
                        updateRutaParadasCountUI();
                        return;
                    }
                    if (!modoClic) return;
                    var p = collectFormPoint(e.latlng.lat, e.latlng.lng);
                    lista.push(p);
                    writeListaToLocalStorage(lista);
                    fuenteNavegador = true;
                    bumpConjuntoFormAfterAdd(p);
                    setModoClic(false);
                    renderAll(false);
                });

                function wireEditor() {
                    var edTipo = document.getElementById("ed-tipo");
                    var wrapC = document.getElementById("ed-wrap-conjunto");
                    var wrapS = document.getElementById("ed-wrap-satelite");
                    function toggTipo() {
                        var t = edTipo ? String(edTipo.value).toLowerCase() : "conjunto";
                        if (wrapC) wrapC.style.display = t === "conjunto" ? "block" : "none";
                        if (wrapS) wrapS.style.display = t === "conjunto" ? "none" : "block";
                        applyDefaultColorPicker(t, est);
                    }
                    if (edTipo) {
                        edTipo.addEventListener("change", toggTipo);
                        toggTipo();
                    }

                    var pc = document.getElementById("ed-color");
                    var tx = document.getElementById("ed-color-hex");
                    if (pc && tx) {
                        pc.addEventListener("input", function () {
                            tx.value = pc.value;
                        });
                        tx.addEventListener("input", function () {
                            var v = parseColorHex(tx.value);
                            if (v) pc.value = v;
                        });
                    }

                    document.querySelectorAll(".ed-preset").forEach(function (b) {
                        b.addEventListener("click", function () {
                            var c = b.getAttribute("data-c");
                            if (!c || !pc || !tx) return;
                            pc.value = c;
                            tx.value = c;
                        });
                    });

                    ["ed-id", "ed-orden", "ed-conjunto-id"].forEach(function (id) {
                        var el = document.getElementById(id);
                        if (el) {
                            el.addEventListener("input", function () {
                                el.dataset.userEdited = "1";
                            });
                        }
                    });

                    var btnClic = document.getElementById("ed-btn-modo-clic");
                    if (btnClic) {
                        btnClic.addEventListener("click", function () {
                            setModoClic(!modoClic);
                        });
                    }

                    var btnLs = document.getElementById("ed-guardar-ls");
                    if (btnLs) {
                        btnLs.addEventListener("click", function () {
                            writeListaToLocalStorage(lista);
                            alert("Guardado en este navegador.");
                        });
                    }

                    var btnDown = document.getElementById("ed-descargar");
                    if (btnDown) {
                        btnDown.addEventListener("click", function () {
                            var blob = new Blob([JSON.stringify({ puntos: lista }, null, 2)], {
                                type: "application/json;charset=utf-8"
                            });
                            var a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = "puntos-pereira.json";
                            a.click();
                            URL.revokeObjectURL(a.href);
                        });
                    }

                    var inpFile = document.getElementById("ed-importar");
                    if (inpFile) {
                        inpFile.addEventListener("change", function () {
                            var f = inpFile.files && inpFile.files[0];
                            if (!f) return;
                            var reader = new FileReader();
                            reader.onload = function () {
                                try {
                                    var data = JSON.parse(reader.result);
                                    if (data && Array.isArray(data.puntos)) {
                                        lista.length = 0;
                                        data.puntos.forEach(function (p) {
                                            lista.push(p);
                                        });
                                        writeListaToLocalStorage(lista);
                                        fuenteNavegador = true;
                                        renderAll(true);
                                    } else {
                                        alert("El JSON debe tener un array \"puntos\".");
                                    }
                                } catch (err) {
                                    alert("JSON inválido.");
                                }
                                inpFile.value = "";
                            };
                            reader.readAsText(f, "UTF-8");
                        });
                    }

                    var btnReset = document.getElementById("ed-reset-servidor");
                    if (btnReset) {
                        btnReset.addEventListener("click", function () {
                            if (
                                !confirm(
                                    useServerMapOnly()
                                        ? "Se borrará la copia local del navegador y se recargará la configuración guardada de esta propuesta. ¿Continuar?"
                                        : "Se borrará la copia del navegador y se volverán a cargar los puntos del archivo del servidor. ¿Continuar?"
                                )
                            ) {
                                return;
                            }
                            try {
                                localStorage.removeItem(LS_KEY);
                            } catch (e2) {
                                /* */
                            }
                            location.reload();
                        });
                    }

                    var cR = document.getElementById("ed-ruta-color");
                    var xR = document.getElementById("ed-ruta-color-hex");
                    if (cR && xR) {
                        cR.addEventListener("input", function () {
                            xR.value = cR.value;
                            syncTrazoPreview();
                        });
                        xR.addEventListener("input", function () {
                            var v = parseColorHex(xR.value);
                            if (v) cR.value = v;
                            syncTrazoPreview();
                        });
                    }
                    document.querySelectorAll(".ed-preset-ruta").forEach(function (b) {
                        b.addEventListener("click", function () {
                            var c = b.getAttribute("data-c");
                            if (!c || !cR || !xR) return;
                            cR.value = c;
                            xR.value = c;
                            syncTrazoPreview();
                        });
                    });
                    var brC = document.getElementById("ed-btn-ruta-clic");
                    if (brC) {
                        brC.addEventListener("click", function () {
                            setModoRutaVertice(!modoRutaVertice);
                        });
                    }
                    var brP = document.getElementById("ed-btn-ruta-parada");
                    if (brP) {
                        brP.addEventListener("click", function () {
                            setModoRutaParada(!modoRutaParada);
                        });
                    }
                    var brDP = document.getElementById("ed-ruta-deshacer-parada");
                    if (brDP) {
                        brDP.addEventListener("click", function () {
                            trazoParadasCoords.pop();
                            syncTrazoPreviewParadas();
                            updateRutaParadasCountUI();
                        });
                    }
                    var brG = document.getElementById("ed-ruta-guardar");
                    if (brG) brG.addEventListener("click", guardarRutaDesdeForm);
                    var brD = document.getElementById("ed-ruta-deshacer");
                    if (brD) {
                        brD.addEventListener("click", function () {
                            trazoRutaCoords.pop();
                            syncTrazoPreview();
                            updateRutaVerticesCountUI();
                        });
                    }
                    var brX = document.getElementById("ed-ruta-cancelar");
                    if (brX) brX.addEventListener("click", cancelarTrazoRutaEdicion);
                    var downR = document.getElementById("ed-descargar-rutas");
                    if (downR) {
                        downR.addEventListener("click", function () {
                            var blob = new Blob([JSON.stringify({ rutas: rutasSupervisionDoc.rutas }, null, 2)], {
                                type: "application/json;charset=utf-8"
                            });
                            var a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = "rutas-supervision.json";
                            a.click();
                            URL.revokeObjectURL(a.href);
                        });
                    }
                    var impR = document.getElementById("ed-importar-rutas");
                    if (impR) {
                        impR.addEventListener("change", function () {
                            var f = impR.files && impR.files[0];
                            if (!f) return;
                            var reader = new FileReader();
                            reader.onload = function () {
                                try {
                                    var data = JSON.parse(reader.result);
                                    if (data && Array.isArray(data.rutas)) {
                                        rutasSupervisionDoc.rutas = cloneRutasDoc({ rutas: data.rutas }).rutas;
                                        writeRutasToLocalStorage(rutasSupervisionDoc.rutas);
                                        fuenteRutasNavegador = true;
                                        refreshRutasLista();
                                        rebuildSupervisionIfCapaOn();
                                        renderAll(true);
                                    } else {
                                        alert('El JSON debe tener un array "rutas".');
                                    }
                                } catch (er) {
                                    alert("JSON inválido.");
                                }
                                impR.value = "";
                            };
                            reader.readAsText(f, "UTF-8");
                        });
                    }
                    var resR = document.getElementById("ed-reset-rutas-servidor");
                    if (resR) {
                        resR.addEventListener("click", function () {
                            if (
                                !confirm(
                                    "Se cargarán de nuevo las rutas del archivo del servidor y se borrará la copia local de rutas en este navegador. ¿Continuar?"
                                )
                            ) {
                                return;
                            }
                            try {
                                localStorage.removeItem(LS_KEY_RUTAS);
                            } catch (eR) {
                                /* */
                            }
                            rutasSupervisionDoc.rutas = cloneRutasDoc(rutasArchivoDoc).rutas.slice();
                            fuenteRutasNavegador = false;
                            cancelarTrazoRutaEdicion();
                            refreshRutasLista();
                            rebuildSupervisionIfCapaOn();
                            renderAll(true);
                        });
                    }

                    var chkPun = document.getElementById("capa-puntos");
                    var chkLin = document.getElementById("capa-ruta");
                    if (chkPun) {
                        chkPun.addEventListener("change", function () {
                            if (chkPun.checked) map.addLayer(layers.puntos);
                            else map.removeLayer(layers.puntos);
                        });
                    }
                    if (chkLin) {
                        chkLin.addEventListener("change", function () {
                            if (chkLin.checked) map.addLayer(layers.lineas);
                            else map.removeLayer(layers.lineas);
                        });
                    }
                    var chkSup = document.getElementById("capa-supervision");
                    if (chkSup) {
                        chkSup.addEventListener("change", function () {
                            if (chkSup.checked) {
                                map.addLayer(layers.supervision);
                                setupSupervisionAnimadas(
                                    layers.supervision,
                                    rutasSupervisionDoc,
                                    est.supervision,
                                    supervisionAnimators
                                );
                            } else {
                                superviseStopAll(supervisionAnimators);
                                map.removeLayer(layers.supervision);
                            }
                        });
                    }
                }

                wireEditor();
                var rc0 = document.getElementById("ed-ruta-color");
                var rx0 = document.getElementById("ed-ruta-color-hex");
                var defCol = est.supervision.colorRuta;
                if (rc0 && rx0) {
                    rc0.value = defCol;
                    rx0.value = defCol;
                }
                var cicEl0 = document.getElementById("ed-ruta-ciclo");
                if (cicEl0) cicEl0.placeholder = String(est.supervision.cicloSegundos);
                refreshRutasLista();
                renderAll(true);
                initPresentacionFab(map, function () {
                    cancelarTrazoRutaEdicion();
                });
                if (document.getElementById("capa-supervision") && document.getElementById("capa-supervision").checked) {
                    setupSupervisionAnimadas(
                        layers.supervision,
                        rutasSupervisionDoc,
                        est.supervision,
                        supervisionAnimators
                    );
                }
            })
            .catch(function (err) {
                console.error(err);
                var el = document.getElementById("map-status");
                if (el) {
                    el.textContent =
                        "Error cargando datos. Revise la consola y los archivos en /data/.";
                }
            });

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootMap);
    } else {
        bootMap();
    }

    window.addEventListener("load", bootMap);
})();
