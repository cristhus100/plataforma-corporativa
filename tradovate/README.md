# Dual SVP HD + Key Levels Pro — versión Tradovate

Port a JavaScript del indicador Pine v6 `DualSVP_KeyLevels_Integrated.pine`, para
cargarlo como **Custom Indicator** en Tradovate Trader.

Archivo a subir: [`dualSvpKeyLevels.js`](./dualSvpKeyLevels.js) (autocontenido; solo
requiere `./tools/predef`, `./tools/meta` y `./tools/graphics`, que provee Tradovate).

---

## 1. Instalación

1. En Tradovate Trader: menú **Archivo → Custom Indicators** (el editor de código).
2. Crear un indicador nuevo, pegar el contenido completo del archivo y **guardar**.
   El panel *Errores de sintaxis* debe quedar vacío.
3. **Para añadirlo al gráfico**: en la barra del gráfico, botón de **indicadores**
   (`f(x)` / *Indicators*) → buscar **"Dual SVP HD + Key Levels Pro"**, agrupado bajo
   las etiquetas *Volume Profile* / *Key Levels* → doble clic para añadirlo.
4. Ajustar los parámetros con el engranaje del indicador en la leyenda del gráfico.

**Timeframe recomendado: 1 minuto** (o 30 segundos). Ver el punto 3 sobre el modo HD.

No hace falta configurar el tick size: se toma de `contractInfo.tickSize` del propio
contrato. `tickSizeOverride` existe solo por si quieres forzar otro valor.

---

## 2. Qué incluye

### Perfil de volumen doble (SVP)
- Sesión **RTH** (por defecto 09:30–17:00 NY) y **Overnight** (17:00–09:30 NY).
- **POC** (fila de mayor volumen, desempate por cercanía al precio ponderado),
  **VAH** y **VAL** por expansión desde el POC hasta cubrir el % de value area.
- Histograma **Total** o **Up / Down**, con atenuación configurable de las filas
  fuera del value area (`vaFadeOutside`).
- Perfil en desarrollo de la sesión en curso, más los últimos `maxSessions`
  perfiles cerrados de cada sesión.
- Estadísticas bajo cada perfil: `Σ volumen / rango` (`showProfileStats`) y
  `Delta` (`showProfileDelta`, desactivado por defecto).

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

Se dibuja como **plot nativo**, así que su color, grosor y estilo de línea se
editan desde la sección de estilos del editor de indicadores, como cualquier
indicador de Tradovate.

### Dashboard
Sesión activa (RTH / ON / Outside), Gap en puntos y ticks, rango del IB, rango del
overnight y Expected Range. Va anclado a una esquina del marco del gráfico
(`dashboardPosition`), no al precio.

---

## 3. Modo HD: perfil de volumen real

El indicador declara `requirements: { volumeProfiles: true }`, así que Tradovate
carga el historial **con el perfil de volumen de cada vela**. Cuando está
disponible, cada vela aporta su distribución real precio a precio vía
`d.profile()`, incluyendo `askVol` y `bidVol`:

- El perfil es **exacto**, no una aproximación — mejor que el original en Pine,
  que tenía que repartir el volumen de la vela entre filas.
- El reparto **Up / Down** usa volumen real ejecutado en ask vs bid, no la
  heurística `close >= open`.

Si el gráfico no trae perfiles, hay dos niveles de degradación automática:

1. Reparto **proporcional al solapamiento** del rango de la vela con cada fila
   (idéntico al Pine original), con el split up/down tomado de
   `offerVolume()` / `bidVolume()` si el feed los expone.
2. Si tampoco hay esos volúmenes, el split cae a `close >= open`.

Por eso conviene un timeframe bajo: cuanto más fina la vela, mejor el perfil en
los modos degradados.

---

## 4. Diferencias respecto del Pine original

| Pine | Tradovate | Consecuencia |
|------|-----------|--------------|
| `request.security_lower_tf` (modo HD) | `d.profile()` | **Mejor**: perfil real por precio en vez de aproximación. Se eliminaron `useHD` / `lowerTf`. |
| `request.security(..., "W", ...)` | No existe | PWH/PWL y P2WH/P2WL se calculan con el historial del propio gráfico. **Requiere al menos 3 semanas de velas cargadas** para mostrar P2WH/P2WL. |
| `request.security("CBOE:VXN")` | No hay símbolos externos | El Expected Range usa el parámetro `manualVxn`. Con `manualVxn = 0` queda en `n/a`. Fórmula sin cambios: `(VXN/100)/16 × open RTH`, congelado en la apertura. |
| `table.new()` | No hay tablas | El dashboard son objetos `Text` globales anclados a una esquina del marco. |
| `alertcondition()` | Modelo de alertas distinto | No portado. Las alertas se configuran desde Tradovate sobre los niveles. |
| `timezone` como string IANA | Sin base de datos de zonas | Hora de Nueva York calculada con las reglas de DST de EE. UU. (2.º domingo de marzo → 1.er domingo de noviembre). Para otro huso: `autoNewYorkTime = false` + `manualUtcOffset`. |
| Límite de 500 boxes | Sin ese límite | Se eliminó la reducción automática de sesiones visibles; `maxSessions` se respeta tal cual. |
| `input.color` | `ParamType` no tiene `COLOR` | Los colores son parámetros de **texto**: acepta hex (`#FF6B6B`) o nombre web (`red`). Si se deja vacío se usa el color por defecto. |
| Textos de etiqueta configurables | — | Fijos (`ONH`, `ONL`, `YEH`, `YEL`, `IBH`, `IBL`, `YPOC`, `PWH`, `PWL`, `P2WH`, `P2WL`, `OPEN`, `GAP`, `HALF GAP`). |
| Transparencia 0–100 por color | `opacity` 0–100 | `histogramOpacity` (45 ≈ transparencia 55 del original) y `vaFadeOutside` en %. |

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

## 5. Cómo se dibuja

El `Canvas` de los plotters personalizados solo expone `drawLine`, `drawPath` y
`drawHeatmap` — no hay rectángulos ni texto. Por eso el indicador **no usa
`predef.plotters.custom`**, sino la API declarativa `graphics` del retorno de
`map()`, que sí tiene formas rellenas, `Text` y `LineSegments`:

```js
map(d) {
    return {
        vwap: ...,                    // plots nativos
        graphics: d.isLast() && {     // dibujo completo, una sola vez
            items: [ /* DisplayObjects */ ]
        }
    }
}
```

Coordenadas con `du()` (unidades de dominio: índice de vela en X, precio en Y),
`px()` (píxeles) y `op()` para combinarlas. Todo el dibujo se emite en la última
vela como objetos `global: true` con claves estables, y se agrupa por estilo: un
solo `Shapes` por color reúne todas las barras del histograma en vez de emitir un
objeto por fila.

Dos detalles que se descubrieron probando contra la aplicación real:

- Las barras del histograma se emiten como **`Polygon`** (cuatro puntos), no como
  `Rectangle`. El primitivo `Rectangle` se define con `size`, y el renderer no
  dibuja nada cuando ese tamaño va en unidades de dominio — los ejemplos de la API
  solo lo usan en píxeles. Los puntos de un `Polygon` sí aceptan `du()`.
- **`textAlignment` indica de qué lado del punto se dibuja el texto**, no cómo se
  alinea respecto a él: `"rightMiddle"` pone el texto a la derecha del ancla. Las
  etiquetas de nivel lo usan para no quedar debajo de su propia línea, separadas
  además por `labelGap` velas.
- El dashboard se ancla con `cs: "grid"`, no `"frame"`: el marco incluye la escala
  de precios, así que anclar a él deja el panel encima del eje y recortado.
- **La opacidad va en escala 0–100, no 0–1.** Las definiciones de tipos dicen
  "0..1 fraction", pero el código real de `tools/predef.js` usa
  `opacity: style.opacity || 100`. Pasar `opacity: 1` pinta al 1 % y el trazo es
  invisible — que no es lo mismo que omitir el campo, lo cual da opaco. Por eso
  el indicador omite `opacity` en lo que va opaco y usa 0–100 en lo demás.

---

## 6. Parámetros

- **Sesiones**: `showRth`, `rthStartHour/Minute`, `rthEndHour/Minute`,
  `showOvernight`, `ovnStartHour/Minute`, `ovnEndHour/Minute`,
  `autoNewYorkTime`, `manualUtcOffset`, `ibMinutes`.
- **Perfil**: `numRows`, `volumeMode`, `valueAreaPct`, `vaFadeOutside`, `maxSessions`.
- **Visualización**: `showDeveloping`, `showHistogram`, `showPoc`, `showVah`,
  `showVal`, `showProfileLabels`, `showProfileStats`, `extendRight`,
  `profileSide`, `widthPercent`, `gapBars`, `profileLineWidth`,
  `histogramOpacity`, `fontSize`.
- **Colores** (texto: hex o nombre web): `rth*` y `ovn*` (POC, VAH/VAL, up, down,
  total, value area), `statsTextColor`, `deltaUpColor`, `deltaDownColor`.
- **Key Levels**: `showKeyLevelLabels`, `labelOffset`, `showDashboard`,
  `dashboardPosition`, `dashboardMarginX/Y`, y por grupo `showOvernightLevels`,
  `showPrevRth`, `showIbLevels`, `showYpoc`, `showHistoricPocs`, `showPrevWeek`,
  `showWeek2`, `showGapLevels` con sus colores y anchos.
- **VWAP**: `showVwap`, `vwapAnchor`, `vwapShowBand1/2`, `vwapMultiplier1/2`
  (colores y grosores en la sección de estilos del editor).
- **Instrumento**: `tickSizeOverride` (0 = usar el tick del contrato).

---

## 7. Tests

```bash
npm test                                              # toda la suite del repo
npx vitest run tradovate/__tests__/dualSvpKeyLevels.test.js
```

58 tests cargan el archivo real en un sandbox con `predef`/`meta`/`graphics`
simulados y cubren: conversión horaria con DST, ventanas de sesión, perfil real de
`d.profile()` y los dos modos degradados, POC/VAH/VAL, delta up/down, VWAP y sus
bandas, Initial Balance, propagación de RTH previo/YPOC, niveles semanales,
transiciones de probabilidad, idempotencia del recálculo por tick, y el árbol
`graphics` completo (tags válidos, claves únicas, coordenadas finitas, agrupación
por estilo, anclaje del dashboard y respeto de las opciones de visualización).

`module.exports._internals` existe solo para estos tests; Tradovate lo ignora.
