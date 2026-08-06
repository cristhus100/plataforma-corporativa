# Dual SVP HD + Key Levels Pro — versión Tradovate

Port a JavaScript del indicador Pine v6 `DualSVP_KeyLevels_Integrated.pine`, para
cargarlo como **Custom Indicator** en Tradovate Trader.

Archivo a subir: [`dualSvpKeyLevels.js`](./dualSvpKeyLevels.js) (autocontenido, sin dependencias
más allá de `./tools/predef` y `./tools/meta`, que provee el propio Tradovate).

---

## 1. Instalación

1. En Tradovate Trader, abrir el menú de la aplicación → **Custom Indicators** (o
   *Chart → Indicators → Custom*, según la versión).
2. Crear un indicador nuevo y nombrarlo `dualSvpKeyLevels`.
3. Pegar el contenido completo de `dualSvpKeyLevels.js` y guardar.
4. Añadirlo al gráfico desde la lista de indicadores (aparece bajo las etiquetas
   *Volume Profile* / *Key Levels*).

**Timeframe recomendado: 1 minuto** (o 30 segundos). El perfil se construye con las
velas del gráfico, así que cuanto menor sea el timeframe más se parece al modo "HD"
del original. En 5m o superior el perfil sigue funcionando, pero pierde resolución.

Antes de operar, ajustar dos parámetros al instrumento:

| Parámetro       | ES / NQ / MES / MNQ | CL   | GC  | 6E      |
|-----------------|---------------------|------|-----|---------|
| `tickSize`      | 0.25                | 0.01 | 0.1 | 0.00005 |
| `priceDecimals` | 2                   | 2    | 1   | 5       |

---

## 2. Qué incluye

### Perfil de volumen doble (SVP)
- Sesión **RTH** (por defecto 09:30–17:00 NY) y **Overnight** (17:00–09:30 NY).
- Reparto **proporcional al solapamiento** del rango de cada vela con cada fila,
  igual que el Pine original (no es "volumen entero por fila tocada").
- **POC** (fila de mayor volumen, desempate por cercanía al precio ponderado),
  **VAH** y **VAL** por expansión desde el POC hasta cubrir el % de value area.
- Histograma **Total** o **Up / Down**, con atenuación configurable de las filas
  fuera del value area (`vaFadeOutside`).
- Perfil en desarrollo de la sesión en curso, más los últimos `maxSessions`
  perfiles cerrados de cada sesión.
- Estadísticas bajo cada perfil: `Σ volumen / rango` y `Delta` (verde/rojo).

### Key Levels
ONH, ONL, PDH/PDL del RTH previo (YEH/YEL), IBH/IBL (Initial Balance de
`ibMinutes`), YPOC (POC del último perfil RTH cerrado) con estela de los 5 POC
históricos, PWH/PWL, P2WH/P2WL, OPEN del RTH, GAP (cierre RTH previo) y HALF GAP.

### Sistema de probabilidades
Idéntico al original: las etiquetas muestran el porcentaje y se degradan en tiempo
real al tocarse el nivel (mecha, no cierre).

| Nivel                | Inicial              | Al tocar el opuesto |
|----------------------|----------------------|---------------------|
| ONH / ONL            | 97 %                 | el opuesto → 28 %   |
| PDH / PDL            | 76 %                 | el opuesto → 11 %   |
| IBH / IBL            | 96 %                 | el opuesto → 21 %   |
| HALF GAP             | 94 %                 | —                   |
| GAP CLOSE / YPOC     | 88 % si abre dentro del rango RTH previo, si no 55 % | — |

Los toques del IB solo cuentan **después** de cerrado el IB, porque durante el IB
los niveles todavía se están formando.

### VWAP
VWAP acumulado con dos bandas de desviación estándar, fuente `hlc3`, anclaje
`session` / `week` / `month` / `quarter` / `year`. El anclaje `session` usa el
**día de negociación de futuros**: rota a la hora de apertura del overnight
(17:00 NY por defecto), no a medianoche.

### Dashboard
Sesión activa (RTH / ON / Outside), Gap en puntos y ticks, rango del IB, rango del
overnight y Expected Range.

---

## 3. Diferencias respecto del Pine original

Tradovate no expone algunas de las APIs de TradingView. Estos son los ajustes, y
son deliberados:

| Pine | Tradovate | Consecuencia |
|------|-----------|--------------|
| `request.security_lower_tf` (modo HD) | No existe | El perfil usa las velas del gráfico. Usar 1m/30s para precisión equivalente. Se eliminaron los parámetros `useHD` / `lowerTf`. |
| `request.security(..., "W", ...)` | No existe | PWH/PWL y P2WH/P2WL se calculan con el historial del propio gráfico. **Requiere al menos 3 semanas de velas cargadas** para mostrar P2WH/P2WL. |
| `request.security("CBOE:VXN")` | No hay símbolos externos | El Expected Range usa el parámetro `manualVxn`. Con `manualVxn = 0` el Expected Range queda en `n/a`. Fórmula sin cambios: `(VXN/100)/16 × open RTH`, congelado en la apertura. |
| `table.new()` | No hay tablas | El dashboard se dibuja como texto anclado sobre el precio, a la derecha de la última vela (no queda fijo en una esquina). |
| `alertcondition()` | Modelo de alertas distinto | No portado. Las alertas se configuran desde el propio Tradovate sobre los niveles. |
| `timezone` como string IANA | Sin base de datos de zonas | Hora de Nueva York calculada con las reglas de DST de EE. UU. (2.º domingo de marzo → 1.er domingo de noviembre). Para otro huso: `autoNewYorkTime = false` + `manualUtcOffset`. |
| Límite de 500 boxes | Sin ese límite | Se eliminó la reducción automática de sesiones visibles; `maxSessions` se respeta tal cual. |
| Textos de etiqueta configurables | — | Fijos (`ONH`, `ONL`, `YEH`, `YEL`, `IBH`, `IBL`, `YPOC`, `PWH`, `PWL`, `P2WH`, `P2WL`, `OPEN`, `GAP`, `HALF GAP`) para no inflar el panel de parámetros. |
| Transparencia 0–100 por color | `opacity` 0–1 por trazo | `histogramOpacity` (0.45 ≈ transparencia 58 del original) y `vaFadeOutside` en %. |

### Detalle: fin de sesión y fin de semana
Pine detecta la sesión con `time(session)`, que ya excluye días no hábiles. Aquí la
sesión se detecta por hora local y se añade un **corte forzado si pasan más de 6
horas sin velas dentro de la sesión**, para que el overnight del viernes no se
fusione con el del domingo.

### Detalle: recálculo de la vela en formación
Tradovate vuelve a llamar a `map()` sobre la última vela en cada tick. El estado
mutable (perfiles, niveles, probabilidades, VWAP) se rebobina con un snapshot antes
de reprocesar esa vela, de modo que repetir ticks no duplica volumen ni cierra la
sesión dos veces. Hay tests que lo verifican.

---

## 4. Parámetros

Agrupados por prefijo en el panel de Tradovate:

- **Sesiones**: `showRth`, `rthStartHour/Minute`, `rthEndHour/Minute`,
  `showOvernight`, `ovnStartHour/Minute`, `ovnEndHour/Minute`,
  `autoNewYorkTime`, `manualUtcOffset`, `ibMinutes`.
- **Perfil**: `numRows`, `volumeMode`, `valueAreaPct`, `vaFadeOutside`, `maxSessions`.
- **Visualización**: `showDeveloping`, `showHistogram`, `showPoc`, `showVah`,
  `showVal`, `showProfileLabels`, `showProfileStats`, `extendRight`,
  `profileSide`, `widthPercent`, `gapBars`, `profileLineWidth`, `histogramOpacity`.
- **Colores**: `rth*` y `ovn*` (POC, VAH/VAL, up, down, total, value area),
  `statsTextColor`, `deltaUpColor`, `deltaDownColor`.
- **Key Levels**: `showKeyLevelLabels`, `labelOffset`, `showDashboard`,
  `dashboardOffset`, y por grupo `showOvernightLevels`, `showPrevRth`,
  `showIbLevels`, `showYpoc`, `showPrevWeek`, `showWeek2`, `showGapLevels`
  con sus colores y anchos.
- **VWAP**: `showVwap`, `vwapAnchor`, `vwapShowBand1/2`, `vwapMultiplier1/2`,
  `vwapColor`, `vwapBandColor`, `vwapLineWidth`.
- **Instrumento**: `tickSize`, `priceDecimals`.

---

## 5. Notas de implementación

La documentación pública de la API de Tradovate (`tradovate.github.io`) está
bloqueada por la política de red del entorno donde se escribió este port, así que
el dibujo se hizo **defensivo**: `makePainter()` detecta qué primitivas expone el
canvas y degrada `drawRectangle` → `drawPolygon` → `drawLine`, y captura los
errores de cada primitiva en `instance.drawErrors` en vez de romper el render
completo. Si al cargarlo el histograma no aparece pero sí las líneas, es que esa
build no expone `drawRectangle` ni `drawPolygon`.

`module.exports._internals` existe solo para los tests del repositorio; Tradovate
lo ignora.

---

## 6. Tests

```bash
npm test                                              # toda la suite del repo
npx vitest run tradovate/__tests__/dualSvpKeyLevels.test.js
```

Los tests cargan el archivo real en un sandbox con `predef`/`meta` simulados y
cubren: conversión horaria con DST, ventanas de sesión, reparto proporcional del
volumen, POC/VAH/VAL, delta up/down, VWAP y sus bandas, Initial Balance,
propagación de RTH previo/YPOC, niveles semanales, transiciones de probabilidad,
idempotencia del recálculo por tick y el plotter (incluidos los caminos de
degradación del canvas).
