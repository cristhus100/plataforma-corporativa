/**
 * Graphics Probe — indicador de diagnostico.
 *
 * Dibuja ocho variantes de forma rellena, una encima de otra, cada una con su
 * etiqueta de texto al lado. Las etiquetas usan objetos Text, que ya sabemos que
 * esta build renderiza, asi que siempre se ven las ocho: lo que hay que mirar es
 * junto a cuales aparece una barra de color.
 *
 * Sirve para saber que construccion de la API `graphics` dibuja realmente en esta
 * version de Tradovate, en vez de ir probando a ciegas en el indicador grande.
 *
 * Uso: guardar como indicador nuevo, anadirlo a cualquier grafico y mirar que
 * barras aparecen a la izquierda de la ultima vela.
 */

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const { op, px, du } = require("./tools/graphics");

const VARIANTS = [
    { key: "A", label: "A rect size px", color: "#FF5252" },
    { key: "B", label: "B rect size du", color: "#FFB74D" },
    { key: "C", label: "C polygon du", color: "#FFEE58" },
    { key: "D", label: "D polygon opacity 0.45", color: "#66BB6A" },
    { key: "E", label: "E polygon sin opacity", color: "#26C6DA" },
    { key: "F", label: "F polygon sin global", color: "#42A5F5" },
    { key: "G", label: "G contour polygon", color: "#AB47BC" },
    { key: "H", label: "H instancing", color: "#EC407A" }
];

class GraphicsProbe {
    init() {
        this.count = 0;
    }

    map(d, i) {
        this.count = i;

        const isLast = typeof d.isLast === "function" && d.isLast();
        if (!isLast) {
            return {};
        }

        const x = typeof d.index === "function" ? d.index() : i;
        const price = typeof d.close === "function" ? d.close() : d.value();
        if (!isFinite(price) || !isFinite(x)) {
            return {};
        }

        const width = Math.max(5, Math.round(this.props.widthBars));
        const x1 = x - width - 5;
        const x2 = x - 5;
        const xMid = (x1 + x2) / 2;

        // Banda vertical de cada variante, en unidades de precio.
        const band = price * 0.004;
        const half = band * 0.3;
        const centerOf = (index) => price + (VARIANTS.length / 2 - index) * band;

        const items = [];

        for (let v = 0; v < VARIANTS.length; v += 1) {
            const variant = VARIANTS[v];
            const center = centerOf(v);
            const top = center + half;
            const bottom = center - half;

            const polygon = {
                tag: "Polygon",
                points: [
                    { x: du(x1), y: du(top) },
                    { x: du(x2), y: du(top) },
                    { x: du(x2), y: du(bottom) },
                    { x: du(x1), y: du(bottom) }
                ]
            };

            if (variant.key === "A") {
                items.push({
                    tag: "Shapes",
                    key: "probe-a",
                    global: true,
                    primitives: [
                        {
                            tag: "Rectangle",
                            position: { x: du(xMid), y: du(center) },
                            size: { width: px(150), height: px(18) }
                        }
                    ],
                    fillStyle: { color: variant.color, opacity: 1 }
                });
            } else if (variant.key === "B") {
                items.push({
                    tag: "Shapes",
                    key: "probe-b",
                    global: true,
                    primitives: [
                        {
                            tag: "Rectangle",
                            position: { x: du(xMid), y: du(center) },
                            size: { width: du(x2 - x1), height: du(half * 2) }
                        }
                    ],
                    fillStyle: { color: variant.color, opacity: 1 }
                });
            } else if (variant.key === "C") {
                items.push({
                    tag: "Shapes",
                    key: "probe-c",
                    global: true,
                    primitives: [polygon],
                    fillStyle: { color: variant.color, opacity: 1 }
                });
            } else if (variant.key === "D") {
                items.push({
                    tag: "Shapes",
                    key: "probe-d",
                    global: true,
                    primitives: [polygon],
                    fillStyle: { color: variant.color, opacity: 0.45 }
                });
            } else if (variant.key === "E") {
                items.push({
                    tag: "Shapes",
                    key: "probe-e",
                    global: true,
                    primitives: [polygon],
                    fillStyle: { color: variant.color }
                });
            } else if (variant.key === "F") {
                items.push({
                    tag: "Shapes",
                    key: "probe-f",
                    primitives: [polygon],
                    fillStyle: { color: variant.color }
                });
            } else if (variant.key === "G") {
                items.push({
                    tag: "ContourShapes",
                    key: "probe-g",
                    global: true,
                    primitives: [polygon],
                    lineStyle: { color: variant.color, lineWidth: 2 }
                });
            } else if (variant.key === "H") {
                items.push({
                    tag: "Instancing",
                    key: "probe-h",
                    global: true,
                    instances: [
                        {
                            position: { x: du(xMid), y: du(center) },
                            size: { width: px(150), height: px(18) },
                            color: { r: 0.93, g: 0.25, b: 0.55 }
                        }
                    ]
                });
            }

            items.push({
                tag: "Text",
                key: "probe-t-" + variant.key,
                global: true,
                point: { x: du(x2 + 2), y: du(center) },
                text: variant.label,
                style: { fontSize: 12, fontWeight: "bold", fill: variant.color },
                textAlignment: "leftMiddle"
            });
        }

        // Referencia: una linea del mismo ancho que las barras, que sabemos que
        // si se dibuja. Si esta no aparece, el problema no son las formas.
        items.push({
            tag: "LineSegments",
            key: "probe-ref",
            global: true,
            lines: [
                {
                    tag: "Line",
                    a: { x: du(x1), y: du(centerOf(VARIANTS.length)) },
                    b: { x: du(x2), y: du(centerOf(VARIANTS.length)) }
                }
            ],
            lineStyle: { color: "#FFFFFF", lineWidth: 2 }
        });
        items.push({
            tag: "Text",
            key: "probe-t-ref",
            global: true,
            point: { x: du(x2 + 2), y: du(centerOf(VARIANTS.length)) },
            text: "REF linea (control)",
            style: { fontSize: 12, fontWeight: "bold", fill: "#FFFFFF" },
            textAlignment: "leftMiddle"
        });

        return { graphics: { items: items } };
    }
}

module.exports = {
    name: "graphicsProbe",
    description: "Graphics Probe (diagnostico)",
    calculator: GraphicsProbe,
    inputType: (meta && meta.InputType && meta.InputType.BARS) || "bars",
    areaChoice: (meta && meta.AreaChoice && meta.AreaChoice.OVERLAY) || "overlay",
    tags: ["Volume-based"],
    params: {
        widthBars: predef.paramSpecs.number(30, 1, 5)
    }
};
