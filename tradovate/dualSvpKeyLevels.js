/**
 * Dual SVP HD + Key Levels Pro
 * ---------------------------------------------------------------------------
 * Port a JavaScript (Tradovate Custom Indicators) del indicador Pine v6
 * "DualSVP_KeyLevels_Integrated".
 *
 * Incluye:
 *   1. Session Volume Profile doble (RTH + Overnight) con POC / VAH / VAL,
 *      histograma Total o Up/Down, valor area resaltada y estadisticas.
 *   2. Key Levels: ONH/ONL, PDH/PDL (RTH previo), IBH/IBL, YPOC, PWH/PWL,
 *      P2WH/P2WL, Open, GAP y Half Gap, con sistema de probabilidades.
 *   3. VWAP con dos bandas de desviacion estandar.
 *
 * Modo HD: si el grafico se pide con histograma (requirements.volumeProfiles),
 * cada vela trae su perfil real por precio via d.profile(), con volumen de bid y
 * de ask. En ese caso el perfil es exacto, no una aproximacion. Si no esta
 * disponible se reparte el volumen de la vela proporcionalmente al solapamiento
 * con cada fila, usando offerVolume/bidVolume para el reparto up/down.
 *
 * Diferencias inevitables respecto de Pine (ver README.md):
 *   - No existe request.security: los niveles semanales se calculan a partir del
 *     historial del propio grafico y el VXN se introduce manualmente.
 *   - No existen tablas: el dashboard se dibuja con objetos Text globales
 *     anclados a una esquina del marco.
 *
 * El dibujo usa la API declarativa `graphics` del retorno de map(), no el
 * plotter de canvas: el canvas solo expone drawLine/drawPath/drawHeatmap,
 * mientras que graphics ofrece Rectangle, Text y LineSegments.
 *
 * El objeto module.exports._internals se expone unicamente para los tests
 * unitarios del repositorio; Tradovate lo ignora.
 */

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const { op, px, du } = require("./tools/graphics");

// ===========================================================================
// 1. Utilidades de tiempo (zona horaria del exchange, sin dependencias)
// ===========================================================================

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

/** Milisegundos UTC del enesimo domingo de un mes. */
function nthSundayUtc(year, monthIndex, nth) {
    const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    const day = 1 + ((7 - firstDow) % 7) + (nth - 1) * 7;
    return Date.UTC(year, monthIndex, day);
}

/**
 * Offset de America/New_York en horas para un instante dado.
 * DST: 2do domingo de marzo 02:00 EST -> 1er domingo de noviembre 02:00 EDT.
 */
function easternOffsetHours(ms) {
    const year = new Date(ms).getUTCFullYear();
    const dstStart = nthSundayUtc(year, 2, 2) + 7 * MS_HOUR;
    const dstEnd = nthSundayUtc(year, 10, 1) + 6 * MS_HOUR;
    return ms >= dstStart && ms < dstEnd ? -4 : -5;
}

/** Descompone un instante en la hora local del exchange. */
function exchangeTime(ms, autoNewYork, manualOffset) {
    const offset = autoNewYork ? easternOffsetHours(ms) : manualOffset;
    const shifted = new Date(ms + offset * MS_HOUR);
    const dayNumber = Math.floor(
        Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) / MS_DAY
    );
    return {
        ms,
        offset,
        minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
        dow: shifted.getUTCDay(),
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        dayNumber,
        dayKey: dayNumber,
        weekKey: dayNumber - shifted.getUTCDay()
    };
}

/** True si `minutes` cae dentro de la ventana [startMin, endMin), con vuelta de dia. */
function inWindow(minutes, startMin, endMin) {
    if (startMin === endMin) {
        return false;
    }
    return startMin < endMin
        ? minutes >= startMin && minutes < endMin
        : minutes >= startMin || minutes < endMin;
}

/**
 * Clave del dia de negociacion: el dia rueda al abrir la sesion overnight,
 * de modo que la tarde del lunes pertenece a la sesion del martes.
 */
function tradingDayKey(t, rollMinute) {
    return t.minutes >= rollMinute ? t.dayNumber + 1 : t.dayNumber;
}

// ===========================================================================
// 2. Matematica del perfil de volumen
// ===========================================================================

function rowIndexOf(price, low, rowSize, numRows) {
    const idx = Math.floor((price - low) / rowSize);
    if (idx < 0) return 0;
    if (idx > numRows - 1) return numRows - 1;
    return idx;
}

/**
 * Fraccion del volumen de una vela que cuenta como compradora.
 * Usa offerVolume/bidVolume reales si el feed los trae; si no, el signo de la vela.
 */
function upShareOf(bar) {
    const upVol = typeof bar.up === "number" && bar.up >= 0 ? bar.up : null;
    const downVol = typeof bar.down === "number" && bar.down >= 0 ? bar.down : null;
    if (upVol !== null && downVol !== null && upVol + downVol > 0) {
        return upVol / (upVol + downVol);
    }
    return bar.dir >= 0 ? 1 : 0;
}

/**
 * Construye el perfil de volumen de una sesion.
 *
 * Si la vela trae su perfil real (`bar.levels`, de d.profile()), se acumula
 * precio a precio. Si no, reparte el volumen proporcionalmente al solapamiento
 * entre el rango de la vela y cada fila (identico al Pine original).
 *
 * @param {Array} bars  {h, l, v, dir, up?, down?, levels?}
 * @returns {Object|null} perfil o null si no hay datos utilizables.
 */
function buildProfile(bars, low, high, numRows, valueAreaPct) {
    if (!bars || bars.length === 0 || !(high > low) || numRows < 1) {
        return null;
    }

    const rowSize = (high - low) / numRows;
    const vol = new Array(numRows).fill(0);
    const up = new Array(numRows).fill(0);
    const down = new Array(numRows).fill(0);

    for (let i = 0; i < bars.length; i += 1) {
        const bar = bars[i];

        // Perfil real de la vela: reparto exacto por precio.
        if (bar.levels && bar.levels.length > 0) {
            for (let k = 0; k < bar.levels.length; k += 1) {
                const level = bar.levels[k];
                const levelVol = level.vol > 0 ? level.vol : 0;
                if (levelVol <= 0) {
                    continue;
                }
                const r = rowIndexOf(level.price, low, rowSize, numRows);
                vol[r] += levelVol;
                const ask = level.askVol > 0 ? level.askVol : 0;
                const bid = level.bidVol > 0 ? level.bidVol : 0;
                if (ask + bid > 0) {
                    up[r] += ask;
                    down[r] += bid;
                } else if (bar.dir >= 0) {
                    up[r] += levelVol;
                } else {
                    down[r] += levelVol;
                }
            }
            continue;
        }

        const barVol = bar.v > 0 ? bar.v : 0;
        if (barVol <= 0) {
            continue;
        }
        const barHigh = Math.max(bar.h, bar.l);
        const barLow = Math.min(bar.h, bar.l);
        const upShare = upShareOf(bar);

        if (barHigh === barLow) {
            const r = rowIndexOf(barHigh, low, rowSize, numRows);
            vol[r] += barVol;
            up[r] += barVol * upShare;
            down[r] += barVol * (1 - upShare);
            continue;
        }

        const bottomRow = rowIndexOf(barLow, low, rowSize, numRows);
        const topRow = rowIndexOf(barHigh, low, rowSize, numRows);
        const range = barHigh - barLow;

        for (let r = bottomRow; r <= topRow; r += 1) {
            const rowLow = low + r * rowSize;
            const rowHigh = rowLow + rowSize;
            const overlap = Math.max(0, Math.min(barHigh, rowHigh) - Math.max(barLow, rowLow));
            if (overlap <= 0) {
                continue;
            }
            const part = (barVol * overlap) / range;
            vol[r] += part;
            up[r] += part * upShare;
            down[r] += part * (1 - upShare);
        }
    }

    let total = 0;
    let maxVol = 0;
    let weightedSum = 0;
    for (let r = 0; r < numRows; r += 1) {
        total += vol[r];
        if (vol[r] > maxVol) {
            maxVol = vol[r];
        }
        weightedSum += (low + (r + 0.5) * rowSize) * vol[r];
    }

    if (maxVol <= 0 || total <= 0) {
        return null;
    }

    // POC = fila de mayor volumen; empates se resuelven por cercania al precio
    // ponderado por volumen.
    const weightedPrice = weightedSum / total;
    let pocRow = 0;
    let bestDistance = null;
    for (let r = 0; r < numRows; r += 1) {
        if (vol[r] !== maxVol) {
            continue;
        }
        const distance = Math.abs(low + (r + 0.5) * rowSize - weightedPrice);
        if (bestDistance === null || distance < bestDistance) {
            bestDistance = distance;
            pocRow = r;
        }
    }

    // Expansion del value area desde el POC hacia el lado de mas volumen.
    const target = (total * valueAreaPct) / 100;
    let cumulative = vol[pocRow];
    let vahRow = pocRow;
    let valRow = pocRow;
    let upRow = pocRow + 1;
    let downRow = pocRow - 1;

    while (cumulative < target && (upRow < numRows || downRow >= 0)) {
        const upVol = upRow < numRows ? vol[upRow] : -1;
        const downVol = downRow >= 0 ? vol[downRow] : -1;

        if (upVol >= downVol && upRow < numRows) {
            cumulative += upVol;
            vahRow = upRow;
            upRow += 1;
        } else if (downRow >= 0) {
            cumulative += downVol;
            valRow = downRow;
            downRow -= 1;
        } else {
            break;
        }
    }

    let upTotal = 0;
    let downTotal = 0;
    for (let r = 0; r < numRows; r += 1) {
        upTotal += up[r];
        downTotal += down[r];
    }

    return {
        low,
        high,
        rowSize,
        numRows,
        vol,
        up,
        down,
        maxVol,
        total,
        upTotal,
        downTotal,
        delta: upTotal - downTotal,
        pocRow,
        vahRow,
        valRow,
        poc: low + (pocRow + 0.5) * rowSize,
        vah: low + (vahRow + 1) * rowSize,
        val: low + valRow * rowSize
    };
}

// ===========================================================================
// 3. VWAP acumulado
// ===========================================================================

function newVwapState() {
    return { key: null, sumSrcVol: 0, sumVol: 0, sumSrcSrcVol: 0 };
}

function vwapUpdate(state, key, src, volume) {
    if (state.key !== key) {
        state.key = key;
        state.sumSrcVol = 0;
        state.sumVol = 0;
        state.sumSrcSrcVol = 0;
    }
    const vol = volume > 0 ? volume : 0;
    state.sumSrcVol += src * vol;
    state.sumVol += vol;
    state.sumSrcSrcVol += vol * src * src;
}

function vwapValues(state, mult1, mult2) {
    if (!(state.sumVol > 0)) {
        return null;
    }
    const value = state.sumSrcVol / state.sumVol;
    const variance = Math.max(0, state.sumSrcSrcVol / state.sumVol - value * value);
    const sd = Math.sqrt(variance);
    return {
        value,
        upper1: value + sd * mult1,
        lower1: value - sd * mult1,
        upper2: value + sd * mult2,
        lower2: value - sd * mult2,
        sd
    };
}

// ===========================================================================
// 4. Formato
// ===========================================================================

function formatPrice(value, decimals) {
    if (value === null || value === undefined || !isFinite(value)) {
        return "n/a";
    }
    return value.toFixed(decimals);
}

function formatVolume(value) {
    if (value === null || value === undefined || !isFinite(value)) {
        return "n/a";
    }
    const abs = Math.abs(value);
    if (abs >= 1e6) {
        return (value / 1e6).toFixed(2) + "M";
    }
    if (abs >= 1e3) {
        return (value / 1e3).toFixed(1) + "K";
    }
    return String(Math.round(value));
}

/** Decimales necesarios para representar un tick (0.25 -> 2, 0.00005 -> 5). */
function decimalsForTick(tick) {
    if (!(tick > 0)) {
        return 2;
    }
    let decimals = 0;
    let value = tick;
    while (decimals < 10 && Math.abs(value - Math.round(value)) > 1e-9) {
        value *= 10;
        decimals += 1;
    }
    return decimals;
}

function formatTicks(value, tickSize) {
    if (value === null || value === undefined || !isFinite(value) || !(tickSize > 0)) {
        return "n/a";
    }
    return String(Math.round(value / tickSize));
}

function probabilityText(prob) {
    return Math.round(prob) + "%";
}

// ===========================================================================
// 5. Calculadora
// ===========================================================================

const SESSION_BREAK_MS = 6 * MS_HOUR; // corte forzado de sesion (fin de semana)
const MAX_HISTORIC_POCS = 5;
const MAX_SERIES_POINTS = 20000;

function newSessionState(kind) {
    return {
        kind,
        active: false,
        counter: 0,
        startX: null,
        startMs: null,
        lastMs: null,
        high: null,
        low: null,
        bars: []
    };
}

function newKeyLevelsState() {
    return {
        curRthHigh: null,
        curRthLow: null,
        curRthClose: null,
        finishedRthHigh: null,
        finishedRthLow: null,
        finishedRthClose: null,
        prevRthHigh: null,
        prevRthLow: null,
        prevRthClose: null,
        curOvnHigh: null,
        curOvnLow: null,
        lastOvnHigh: null,
        lastOvnLow: null,
        ibHigh: null,
        ibLow: null,
        ibEndMs: null,
        todayOpen: null,
        halfGap: null,
        expectedRange: null,
        ovnStartX: null,
        lastOvnStartX: null,
        rthStartX: null,
        cycleStartX: null,
        probOnHigh: 97,
        probOnLow: 97,
        probPdh: 76,
        probPdl: 76,
        probIbHigh: 96,
        probIbLow: 96,
        probHalfGap: 94,
        probGapClose: 55,
        probYpoc: 55,
        touchedOnHigh: false,
        touchedOnLow: false,
        touchedPdh: false,
        touchedPdl: false,
        ibHighTouchedFirst: false,
        ibLowTouchedFirst: false,
        ibProbApplied: false
    };
}

function readBar(d, fallbackIndex) {
    const timestamp = typeof d.timestamp === "function" ? d.timestamp() : d.timestamp;
    let ms = NaN;
    if (timestamp instanceof Date) {
        ms = timestamp.getTime();
    } else if (typeof timestamp === "number") {
        ms = timestamp;
    } else if (typeof timestamp === "string") {
        ms = Date.parse(timestamp);
    }

    const value = function (name) {
        const fn = d[name];
        const raw = typeof fn === "function" ? fn.call(d) : d[name];
        return typeof raw === "number" && isFinite(raw) ? raw : null;
    };

    let x;
    if (typeof d.index === "function") {
        x = d.index();
    } else if (typeof d.index === "number") {
        x = d.index;
    }

    // Perfil real de la vela (solo si el grafico se pidio con histograma).
    let levels = null;
    if (typeof d.profile === "function") {
        const raw = d.profile();
        if (raw && raw.length > 0) {
            levels = raw;
        }
    }

    return {
        x: typeof x === "number" && isFinite(x) ? x : fallbackIndex,
        ms,
        open: value("open"),
        high: value("high"),
        low: value("low"),
        close: value("close"),
        volume: value("volume") || 0,
        offerVolume: value("offerVolume"),
        bidVolume: value("bidVolume"),
        levels: levels,
        isLast: typeof d.isLast === "function" ? d.isLast() : false
    };
}

class DualSvpKeyLevels {
    init() {
        const p = this.props;

        this.cfg = {
            showRth: p.showRth,
            showOvernight: p.showOvernight,
            rthStart: p.rthStartHour * 60 + p.rthStartMinute,
            rthEnd: p.rthEndHour * 60 + p.rthEndMinute,
            ovnStart: p.ovnStartHour * 60 + p.ovnStartMinute,
            ovnEnd: p.ovnEndHour * 60 + p.ovnEndMinute,
            autoNewYork: p.autoNewYorkTime,
            manualOffset: p.manualUtcOffset,
            ibMinutes: Math.max(1, Math.round(p.ibMinutes)),
            numRows: Math.max(10, Math.round(p.numRows)),
            splitVolume: p.volumeMode === "updown",
            valueAreaPct: Math.min(99, Math.max(50, p.valueAreaPct)),
            maxSessions: Math.max(1, Math.round(p.maxSessions)),
            vaFadeOutside: Math.min(90, Math.max(0, p.vaFadeOutside))
        };

        // El tick sale del contrato; el parametro solo actua como override.
        const contractTick =
            this.contractInfo && this.contractInfo.tickSize > 0 ? this.contractInfo.tickSize : 0;
        this.cfg.tickSize = p.tickSizeOverride > 0 ? p.tickSizeOverride : contractTick || 0.25;
        this.cfg.decimals = decimalsForTick(this.cfg.tickSize);

        // Perfil real por vela, disponible solo si el grafico incluye histograma.
        this.hasVolumeProfiles = !!(this.chartDescription && this.chartDescription.withHistogram);

        this.rth = newSessionState("rth");
        this.ovn = newSessionState("ovn");
        this.completedRth = [];
        this.completedOvn = [];
        this.historicPocs = [];

        this.prevProfile = { poc: null, vah: null, val: null };

        this.kl = newKeyLevelsState();
        this.week = { key: null, high: null, low: null, close: null, startX: null, closed: [] };

        this.vwapState = newVwapState();
        this.series = [];

        this.prevInRth = false;
        this.prevInOvn = false;
        this.inRth = false;
        this.inOvn = false;

        this.lastBarIndex = null;
        this.lastBar = null;

        this.snapshotIndex = null;
        this.snapshot = null;
        this.drawErrors = [];
    }

    // -- Snapshot / rollback -------------------------------------------------
    // Tradovate vuelve a llamar map() sobre la vela en formacion en cada tick,
    // por lo que el estado mutable debe poder rebobinarse a como estaba antes
    // de procesar esa vela.

    takeSnapshot() {
        const snapSession = function (s) {
            return {
                ref: s,
                active: s.active,
                counter: s.counter,
                startX: s.startX,
                startMs: s.startMs,
                lastMs: s.lastMs,
                high: s.high,
                low: s.low,
                bars: s.bars,
                barCount: s.bars.length
            };
        };

        return {
            rth: snapSession(this.rth),
            ovn: snapSession(this.ovn),
            completedRth: this.completedRth.slice(),
            completedOvn: this.completedOvn.slice(),
            historicPocs: this.historicPocs.slice(),
            prevProfile: Object.assign({}, this.prevProfile),
            kl: Object.assign({}, this.kl),
            week: {
                key: this.week.key,
                high: this.week.high,
                low: this.week.low,
                close: this.week.close,
                startX: this.week.startX,
                closed: this.week.closed.slice()
            },
            vwapState: Object.assign({}, this.vwapState),
            seriesLength: this.series.length,
            prevInRth: this.prevInRth,
            prevInOvn: this.prevInOvn,
            inRth: this.inRth,
            inOvn: this.inOvn
        };
    }

    restoreSnapshot(snap) {
        const restoreSession = function (target, s) {
            target.active = s.active;
            target.counter = s.counter;
            target.startX = s.startX;
            target.startMs = s.startMs;
            target.lastMs = s.lastMs;
            target.high = s.high;
            target.low = s.low;
            target.bars = s.bars;
            target.bars.length = s.barCount;
        };

        restoreSession(this.rth, snap.rth);
        restoreSession(this.ovn, snap.ovn);
        this.completedRth = snap.completedRth.slice();
        this.completedOvn = snap.completedOvn.slice();
        this.historicPocs = snap.historicPocs.slice();
        this.prevProfile = Object.assign({}, snap.prevProfile);
        this.kl = Object.assign({}, snap.kl);
        this.week = {
            key: snap.week.key,
            high: snap.week.high,
            low: snap.week.low,
            close: snap.week.close,
            startX: snap.week.startX,
            closed: snap.week.closed.slice()
        };
        this.vwapState = Object.assign({}, snap.vwapState);
        this.series.length = snap.seriesLength;
        this.prevInRth = snap.prevInRth;
        this.prevInOvn = snap.prevInOvn;
        this.inRth = snap.inRth;
        this.inOvn = snap.inOvn;
    }

    /** Rango de precio de las ultimas `count` velas, para posicionar textos. */
    recentRange(count) {
        const series = this.series;
        if (series.length === 0) {
            return null;
        }
        let high = -Infinity;
        let low = Infinity;
        for (let i = Math.max(0, series.length - count); i < series.length; i += 1) {
            if (series[i].h !== null && series[i].h > high) {
                high = series[i].h;
            }
            if (series[i].l !== null && series[i].l < low) {
                low = series[i].l;
            }
        }
        if (!isFinite(high) || !isFinite(low) || !(high > low)) {
            return null;
        }
        return { high: high, low: low, size: high - low };
    }

    // -- Sesiones ------------------------------------------------------------

    finishSession(session) {
        const cfg = this.cfg;
        const bars = session.bars;
        const endX = bars.length > 0 ? bars[bars.length - 1].x : session.startX;
        const profile = buildProfile(bars, session.low, session.high, cfg.numRows, cfg.valueAreaPct);

        session.active = false;
        session.bars = [];
        const store = session.kind === "rth" ? this.completedRth : this.completedOvn;

        if (profile) {
            const record = {
                kind: session.kind,
                counter: session.counter,
                startX: session.startX,
                endX: endX,
                profile
            };
            store.push(record);
            while (store.length > cfg.maxSessions) {
                store.shift();
            }

            if (session.kind === "rth") {
                this.prevProfile = { poc: profile.poc, vah: profile.vah, val: profile.val };
                this.historicPocs.push(profile.poc);
                while (this.historicPocs.length > MAX_HISTORIC_POCS) {
                    this.historicPocs.shift();
                }
            }
        }

        session.high = null;
        session.low = null;
        session.startX = null;
        session.startMs = null;
        session.lastMs = null;
    }

    startSession(session, bar) {
        session.active = true;
        session.counter += 1;
        session.startX = bar.x;
        session.startMs = bar.ms;
        session.lastMs = bar.ms;
        session.high = null;
        session.low = null;
        session.bars = [];
    }

    /**
     * Devuelve {started, ended} para la sesion indicada tras procesar la vela.
     */
    processSession(session, isInSession, bar) {
        const gapBreak =
            session.active &&
            session.lastMs !== null &&
            isFinite(bar.ms) &&
            bar.ms - session.lastMs > SESSION_BREAK_MS;

        let ended = false;
        let started = false;

        if (session.active && (!isInSession || gapBreak)) {
            this.finishSession(session);
            ended = true;
        }

        if (isInSession && !session.active) {
            this.startSession(session, bar);
            started = true;
        }

        if (isInSession && bar.high !== null && bar.low !== null) {
            session.high = session.high === null ? bar.high : Math.max(session.high, bar.high);
            session.low = session.low === null ? bar.low : Math.min(session.low, bar.low);
            session.lastMs = bar.ms;
            session.bars.push({
                x: bar.x,
                h: bar.high,
                l: bar.low,
                v: bar.volume,
                dir: bar.close !== null && bar.open !== null && bar.close >= bar.open ? 1 : -1,
                up: bar.offerVolume,
                down: bar.bidVolume,
                levels: bar.levels
            });
        }

        return { started: started, ended: ended };
    }

    // -- Key Levels ----------------------------------------------------------

    updateKeyLevels(bar, t, flags) {
        const cfg = this.cfg;
        const kl = this.kl;
        const p = this.props;

        if (flags.rthEnded) {
            kl.finishedRthHigh = kl.curRthHigh;
            kl.finishedRthLow = kl.curRthLow;
            kl.finishedRthClose = kl.curRthClose;
        }

        if (flags.ovnStarted) {
            kl.prevRthHigh = kl.finishedRthHigh === null ? kl.curRthHigh : kl.finishedRthHigh;
            kl.prevRthLow = kl.finishedRthLow === null ? kl.curRthLow : kl.finishedRthLow;
            kl.prevRthClose = kl.finishedRthClose === null ? kl.curRthClose : kl.finishedRthClose;
            kl.curOvnHigh = bar.high;
            kl.curOvnLow = bar.low;
            kl.ovnStartX = bar.x;
            kl.cycleStartX = bar.x;
            kl.todayOpen = null;
            kl.halfGap = null;
            kl.ibHigh = null;
            kl.ibLow = null;
            kl.ibEndMs = null;
            kl.rthStartX = null;
            kl.probOnHigh = 97;
            kl.probOnLow = 97;
            kl.touchedOnHigh = false;
            kl.touchedOnLow = false;
        } else if (this.inOvn) {
            kl.curOvnHigh = kl.curOvnHigh === null ? bar.high : Math.max(kl.curOvnHigh, bar.high);
            kl.curOvnLow = kl.curOvnLow === null ? bar.low : Math.min(kl.curOvnLow, bar.low);
        }

        if (flags.rthStarted) {
            if (kl.curRthHigh !== null) {
                kl.prevRthHigh = kl.curRthHigh;
                kl.prevRthLow = kl.curRthLow;
                kl.prevRthClose = kl.curRthClose;
            }
            kl.lastOvnHigh = kl.curOvnHigh;
            kl.lastOvnLow = kl.curOvnLow;
            kl.lastOvnStartX = kl.ovnStartX;
            kl.rthStartX = bar.x;
            kl.cycleStartX = kl.cycleStartX === null || !this.prevInOvn ? bar.x : kl.cycleStartX;
            kl.curRthHigh = bar.high;
            kl.curRthLow = bar.low;
            kl.curRthClose = bar.close;
            kl.todayOpen = bar.open;
            kl.halfGap = kl.prevRthClose === null ? null : (kl.todayOpen + kl.prevRthClose) / 2;
            kl.ibHigh = bar.high;
            kl.ibLow = bar.low;
            kl.ibEndMs = bar.ms + cfg.ibMinutes * MS_MINUTE;
            kl.expectedRange = null;

            kl.probOnHigh = 97;
            kl.probOnLow = 97;
            kl.touchedOnHigh = false;
            kl.touchedOnLow = false;
            kl.touchedPdh = false;
            kl.touchedPdl = false;
            kl.probPdh = 76;
            kl.probPdl = 76;
            kl.probIbHigh = 96;
            kl.probIbLow = 96;
            kl.probHalfGap = 94;
            kl.ibHighTouchedFirst = false;
            kl.ibLowTouchedFirst = false;
            kl.ibProbApplied = false;

            const openInsideRth =
                kl.prevRthHigh !== null &&
                kl.prevRthLow !== null &&
                kl.todayOpen !== null &&
                kl.todayOpen >= kl.prevRthLow &&
                kl.todayOpen <= kl.prevRthHigh;
            kl.probGapClose = openInsideRth ? 88 : 55;
            kl.probYpoc = openInsideRth ? 88 : 55;
        } else if (this.inRth) {
            kl.curRthHigh = kl.curRthHigh === null ? bar.high : Math.max(kl.curRthHigh, bar.high);
            kl.curRthLow = kl.curRthLow === null ? bar.low : Math.min(kl.curRthLow, bar.low);
            kl.curRthClose = bar.close;
        }

        const inIb = this.inRth && kl.ibEndMs !== null && bar.ms < kl.ibEndMs;
        if (inIb && !flags.rthStarted) {
            kl.ibHigh = kl.ibHigh === null ? bar.high : Math.max(kl.ibHigh, bar.high);
            kl.ibLow = kl.ibLow === null ? bar.low : Math.min(kl.ibLow, bar.low);
        }

        // Expected range (1 desviacion estandar diaria) a partir del VXN manual.
        if (p.showExpectedRange && this.inRth && kl.expectedRange === null) {
            if (p.manualVxn > 0 && kl.todayOpen !== null) {
                kl.expectedRange = (p.manualVxn / 100 / 16) * kl.todayOpen;
            }
        }

        this.inIb = inIb;
        this.activeOvnHigh = this.inOvn ? kl.curOvnHigh : kl.lastOvnHigh;
        this.activeOvnLow = this.inOvn ? kl.curOvnLow : kl.lastOvnLow;
        this.activeOvnStartX = this.inOvn ? kl.ovnStartX : kl.lastOvnStartX;

        this.updateProbabilities(bar);
    }

    updateProbabilities(bar) {
        const kl = this.kl;
        if (bar.high === null || bar.low === null) {
            return;
        }

        const showProb = this.inRth;
        const ibFixed = this.inRth && !this.inIb && kl.ibHigh !== null && kl.ibLow !== null;

        // Overnight: al tocar un extremo, el opuesto cae a 28%.
        if (showProb && !kl.touchedOnHigh && this.activeOvnHigh !== null && bar.high >= this.activeOvnHigh) {
            kl.touchedOnHigh = true;
            kl.probOnLow = 28;
        }
        if (showProb && !kl.touchedOnLow && this.activeOvnLow !== null && bar.low <= this.activeOvnLow) {
            kl.touchedOnLow = true;
            kl.probOnHigh = 28;
        }

        // RTH previo: al tocar un extremo, el opuesto cae a 11%.
        if (showProb && !kl.touchedPdh && kl.prevRthHigh !== null && bar.high >= kl.prevRthHigh) {
            kl.touchedPdh = true;
            kl.probPdl = 11;
        }
        if (showProb && !kl.touchedPdl && kl.prevRthLow !== null && bar.low <= kl.prevRthLow) {
            kl.touchedPdl = true;
            kl.probPdh = 11;
        }

        // IB: los niveles son provisionales durante el IB, solo cuentan despues.
        if (ibFixed && !kl.ibHighTouchedFirst && !kl.ibLowTouchedFirst && bar.high >= kl.ibHigh) {
            kl.ibHighTouchedFirst = true;
        }
        if (ibFixed && !kl.ibHighTouchedFirst && !kl.ibLowTouchedFirst && bar.low <= kl.ibLow) {
            kl.ibLowTouchedFirst = true;
        }
        if (ibFixed && !kl.ibProbApplied && (kl.ibHighTouchedFirst || kl.ibLowTouchedFirst)) {
            kl.ibProbApplied = true;
            if (kl.ibHighTouchedFirst) {
                kl.probIbLow = 21;
            } else {
                kl.probIbHigh = 21;
            }
        }
    }

    // -- Semanas -------------------------------------------------------------

    updateWeek(bar, t) {
        const week = this.week;
        if (week.key === null) {
            week.key = t.weekKey;
            week.startX = bar.x;
        } else if (week.key !== t.weekKey) {
            if (week.high !== null) {
                week.closed.push({ high: week.high, low: week.low, close: week.close });
                while (week.closed.length > 4) {
                    week.closed.shift();
                }
            }
            week.key = t.weekKey;
            week.startX = bar.x;
            week.high = null;
            week.low = null;
            week.close = null;
        }

        if (bar.high !== null && bar.low !== null) {
            week.high = week.high === null ? bar.high : Math.max(week.high, bar.high);
            week.low = week.low === null ? bar.low : Math.min(week.low, bar.low);
            week.close = bar.close;
        }
    }

    prevWeekLevels() {
        const closed = this.week.closed;
        const last = closed.length >= 1 ? closed[closed.length - 1] : null;
        const prev = closed.length >= 2 ? closed[closed.length - 2] : null;
        return {
            high: last ? last.high : null,
            low: last ? last.low : null,
            close: last ? last.close : null,
            high2: prev ? prev.high : null,
            low2: prev ? prev.low : null
        };
    }

    // -- map -----------------------------------------------------------------

    map(d, i) {
        const bar = readBar(d, i);

        if (this.snapshotIndex === bar.x && this.snapshot) {
            this.restoreSnapshot(this.snapshot);
        } else {
            this.snapshot = this.takeSnapshot();
            this.snapshotIndex = bar.x;
        }

        this.lastBar = bar;
        this.lastBarIndex = bar.x;

        if (!isFinite(bar.ms) || bar.high === null || bar.low === null) {
            return {};
        }

        const cfg = this.cfg;
        const p = this.props;
        const t = exchangeTime(bar.ms, cfg.autoNewYork, cfg.manualOffset);

        const inRth = cfg.showRth && inWindow(t.minutes, cfg.rthStart, cfg.rthEnd);
        const inOvn = cfg.showOvernight && inWindow(t.minutes, cfg.ovnStart, cfg.ovnEnd);

        const rthFlags = this.processSession(this.rth, inRth, bar);
        const ovnFlags = this.processSession(this.ovn, inOvn, bar);

        this.prevInRth = this.inRth;
        this.prevInOvn = this.inOvn;
        this.inRth = inRth;
        this.inOvn = inOvn;

        this.updateWeek(bar, t);
        this.updateKeyLevels(bar, t, {
            rthStarted: rthFlags.started,
            rthEnded: rthFlags.ended,
            ovnStarted: ovnFlags.started,
            ovnEnded: ovnFlags.ended
        });

        // VWAP
        let vwap = null;
        if (p.showVwap) {
            const rollMinute = cfg.ovnStart;
            let anchorKey;
            switch (p.vwapAnchor) {
                case "week":
                    anchorKey = "w" + t.weekKey;
                    break;
                case "month":
                    anchorKey = "m" + t.year + "-" + t.month;
                    break;
                case "quarter":
                    anchorKey = "q" + t.year + "-" + Math.floor(t.month / 3);
                    break;
                case "year":
                    anchorKey = "y" + t.year;
                    break;
                default:
                    anchorKey = "d" + tradingDayKey(t, rollMinute);
                    break;
            }
            const src = (bar.high + bar.low + bar.close) / 3;
            vwapUpdate(this.vwapState, anchorKey, src, bar.volume);
            vwap = vwapValues(this.vwapState, p.vwapMultiplier1, p.vwapMultiplier2);
        }

        this.series.push({
            x: bar.x,
            h: bar.high,
            l: bar.low,
            vwap: vwap ? vwap.value : null,
            u1: vwap ? vwap.upper1 : null,
            l1: vwap ? vwap.lower1 : null,
            u2: vwap ? vwap.upper2 : null,
            l2: vwap ? vwap.lower2 : null
        });
        while (this.series.length > MAX_SERIES_POINTS) {
            this.series.shift();
        }

        // Todo el dibujo se emite una sola vez, en la ultima vela, como objetos
        // globales con coordenadas absolutas de indice/precio.
        return {
            vwap: vwap ? vwap.value : undefined,
            vwapUpper1: vwap && p.vwapShowBand1 ? vwap.upper1 : undefined,
            vwapLower1: vwap && p.vwapShowBand1 ? vwap.lower1 : undefined,
            vwapUpper2: vwap && p.vwapShowBand2 ? vwap.upper2 : undefined,
            vwapLower2: vwap && p.vwapShowBand2 ? vwap.lower2 : undefined,
            ypoc: this.prevProfile.poc === null ? undefined : this.prevProfile.poc,
            graphics: bar.isLast ? buildGraphics(this) : undefined
        };
    }

    // -- Datos derivados para el plotter -------------------------------------

    developingProfile(session) {
        if (!session.active || session.bars.length === 0) {
            return null;
        }
        const profile = buildProfile(
            session.bars,
            session.low,
            session.high,
            this.cfg.numRows,
            this.cfg.valueAreaPct
        );
        if (!profile) {
            return null;
        }
        return {
            kind: session.kind,
            startX: session.startX,
            endX: this.lastBarIndex,
            profile
        };
    }

    gapInfo() {
        const kl = this.kl;
        const weekly = this.prevWeekLevels();
        const reference = kl.prevRthClose === null ? weekly.close : kl.prevRthClose;
        const size = kl.todayOpen === null || reference === null ? null : kl.todayOpen - reference;
        const valid =
            this.props.showGapLevels &&
            size !== null &&
            Math.abs(size) >= this.props.minGapTicks * this.cfg.tickSize;
        return { reference: reference, size: size, valid: valid };
    }
}


// ===========================================================================
// 6. Dibujo declarativo (graphics)
// ===========================================================================
//
// Coordenadas: du(v) = unidades de dominio (indice de vela en X, precio en Y),
// px(v) = pixeles, op(a, '-', b) = combinacion de ambas.
//
// Los objetos se agrupan por estilo: un unico "Shapes" por color reune todos
// los rectangulos del histograma que comparten relleno, y un unico
// "LineSegments" por estilo reune todas las lineas de ese color/grosor.

const FONT_FAMILY = "Arial, Helvetica, sans-serif";

/** Normaliza un color escrito por el usuario; vacio o invalido -> color por defecto. */
function safeColor(value, fallback) {
    if (typeof value !== "string") {
        return fallback;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Acumulador de objetos graficos. Agrupa formas y lineas por estilo para no
 * emitir miles de items sueltos.
 */
function createGraphicsBuilder() {
    const items = [];
    const shapeGroups = {};
    const shapeOrder = [];
    const lineGroups = {};
    const lineOrder = [];

    return {
        /** Rectangulo definido por dos esquinas; el objeto Rectangle se centra en `position`. */
        rect: function (groupKey, style, x1, yTop, x2, yBottom) {
            const width = Math.abs(x2 - x1);
            const height = Math.abs(yTop - yBottom);
            if (!(width > 0) || !(height > 0)) {
                return;
            }
            if (!shapeGroups[groupKey]) {
                shapeGroups[groupKey] = {
                    tag: "Shapes",
                    key: groupKey,
                    global: true,
                    primitives: [],
                    fillStyle: { color: style.color, opacity: style.opacity }
                };
                shapeOrder.push(groupKey);
            }
            shapeGroups[groupKey].primitives.push({
                tag: "Rectangle",
                position: { x: du((x1 + x2) / 2), y: du((yTop + yBottom) / 2) },
                size: { width: du(width), height: du(height) }
            });
        },

        line: function (groupKey, style, x1, y1, x2, y2) {
            if (!isFinite(y1) || !isFinite(y2) || !isFinite(x1) || !isFinite(x2)) {
                return;
            }
            if (!lineGroups[groupKey]) {
                lineGroups[groupKey] = {
                    tag: "LineSegments",
                    key: groupKey,
                    global: true,
                    lines: [],
                    lineStyle: {
                        color: style.color,
                        lineWidth: style.width,
                        opacity: style.opacity,
                        lineStyle: style.dash
                    }
                };
                lineOrder.push(groupKey);
            }
            lineGroups[groupKey].lines.push({
                tag: "Line",
                a: { x: du(x1), y: du(y1) },
                b: { x: du(x2), y: du(y2) }
            });
        },

        text: function (key, x, y, value, style) {
            if (!isFinite(y) || !isFinite(x) || !value) {
                return;
            }
            items.push({
                tag: "Text",
                key: key,
                global: true,
                point: { x: du(x), y: du(y) },
                text: value,
                style: {
                    fontFamily: FONT_FAMILY,
                    fontSize: style.size,
                    fontWeight: style.weight || "normal",
                    fill: style.color
                },
                textAlignment: style.align || "leftMiddle"
            });
        },

        /** Texto anclado a una esquina del marco del grafico, en pixeles. */
        frameText: function (key, corner, dx, dy, value, style) {
            items.push({
                tag: "Text",
                key: key,
                global: true,
                origin: { cs: "frame", h: corner.h, v: corner.v },
                point: { x: px(dx), y: px(dy) },
                text: value,
                style: {
                    fontFamily: FONT_FAMILY,
                    fontSize: style.size,
                    fontWeight: style.weight || "normal",
                    fill: style.color
                },
                textAlignment: corner.h === "right" ? "rightMiddle" : "leftMiddle"
            });
        },

        build: function () {
            const result = [];
            for (let i = 0; i < shapeOrder.length; i += 1) {
                const group = shapeGroups[shapeOrder[i]];
                if (group.primitives.length > 0) {
                    result.push(group);
                }
            }
            for (let i = 0; i < lineOrder.length; i += 1) {
                const group = lineGroups[lineOrder[i]];
                if (group.lines.length > 0) {
                    result.push(group);
                }
            }
            for (let i = 0; i < items.length; i += 1) {
                result.push(items[i]);
            }
            return result;
        }
    };
}

const DASH_SOLID = 1;
const DASH_DOTTED = 3;
const DASH_DASHED = 4;

function profileColors(props, kind) {
    if (kind === "rth") {
        return {
            poc: safeColor(props.rthPocColor, "#FF6B6B"),
            vahVal: safeColor(props.rthVahValColor, "#4ECDC4"),
            up: safeColor(props.rthUpVolColor, "#26A69A"),
            down: safeColor(props.rthDownVolColor, "#EF5350"),
            total: safeColor(props.rthTotalVolColor, "#8A8A8A"),
            valueArea: safeColor(props.rthValueAreaColor, "#00BCD4")
        };
    }
    return {
        poc: safeColor(props.ovnPocColor, "#FFB74D"),
        vahVal: safeColor(props.ovnVahValColor, "#B39DDB"),
        up: safeColor(props.ovnUpVolColor, "#42A5F5"),
        down: safeColor(props.ovnDownVolColor, "#FF8A65"),
        total: safeColor(props.ovnTotalVolColor, "#607D8B"),
        valueArea: safeColor(props.ovnValueAreaColor, "#7E57C2")
    };
}

function addProfile(builder, instance, record, id) {
    const props = instance.props;
    const cfg = instance.cfg;
    const profile = record.profile;
    const colors = profileColors(props, record.kind);
    const rightSide = props.profileSide === "right";

    const sessionBars = Math.max(1, record.endX - record.startX + 1);
    const gap = Math.min(props.gapBars, Math.max(0, sessionBars - 1));
    const availableWidth = Math.max(1, sessionBars - 1 - gap);
    const width = Math.max(1, (availableWidth * props.widthPercent) / 100);
    const anchorX = rightSide ? record.endX - gap : record.startX + gap;

    if (props.showHistogram) {
        const opacity = Math.min(1, Math.max(0.05, props.histogramOpacity));
        const fadedOpacity = opacity * Math.max(0, 1 - cfg.vaFadeOutside / 100);

        for (let r = 0; r < profile.numRows; r += 1) {
            const rowVol = profile.vol[r];
            if (!(rowVol > 0)) {
                continue;
            }
            const len = (rowVol / profile.maxVol) * width;
            if (!(len > 0)) {
                continue;
            }

            const rowLow = profile.low + r * profile.rowSize;
            const rowHigh = rowLow + profile.rowSize;
            const leftX = rightSide ? anchorX - len : anchorX;
            const rightX = rightSide ? anchorX : anchorX + len;
            const inValueArea = r >= profile.valRow && r <= profile.vahRow;

            if (cfg.splitVolume) {
                const upVol = profile.up[r];
                const downVol = profile.down[r];
                let upLen;
                if (upVol > 0 && downVol > 0) {
                    upLen = (len * upVol) / rowVol;
                } else {
                    upLen = upVol > 0 ? len : 0;
                }
                upLen = Math.max(0, Math.min(len, upLen));

                const suffix = inValueArea ? "va" : "out";
                const rowOpacity = inValueArea ? opacity : fadedOpacity;

                if (upLen > 0) {
                    builder.rect(
                        id + "-s-up-" + suffix,
                        { color: colors.up, opacity: rowOpacity },
                        leftX,
                        rowHigh,
                        leftX + upLen,
                        rowLow
                    );
                }
                if (len - upLen > 0) {
                    builder.rect(
                        id + "-s-dn-" + suffix,
                        { color: colors.down, opacity: rowOpacity },
                        leftX + upLen,
                        rowHigh,
                        rightX,
                        rowLow
                    );
                }
            } else {
                builder.rect(
                    id + (inValueArea ? "-s-va" : "-s-total"),
                    {
                        color: inValueArea ? colors.valueArea : colors.total,
                        opacity: inValueArea ? opacity : opacity * 0.75
                    },
                    leftX,
                    rowHigh,
                    rightX,
                    rowLow
                );
            }
        }
    }

    const lineX1 = record.startX;
    const lineX2 = props.extendRight
        ? Math.max(instance.lastBarIndex + props.labelOffset, record.startX + 1)
        : Math.max(record.endX, record.startX + 1);

    if (props.showPoc) {
        builder.line(
            id + "-l-poc",
            { color: colors.poc, width: props.profileLineWidth + 1, dash: DASH_SOLID, opacity: 1 },
            lineX1,
            profile.poc,
            lineX2,
            profile.poc
        );
    }
    if (props.showVah) {
        builder.line(
            id + "-l-va",
            { color: colors.vahVal, width: props.profileLineWidth, dash: DASH_DOTTED, opacity: 1 },
            lineX1,
            profile.vah,
            lineX2,
            profile.vah
        );
    }
    if (props.showVal) {
        builder.line(
            id + "-l-va",
            { color: colors.vahVal, width: props.profileLineWidth, dash: DASH_DOTTED, opacity: 1 },
            lineX1,
            profile.val,
            lineX2,
            profile.val
        );
    }

    if (props.showProfileLabels) {
        const labelX = record.endX + 1;
        const size = props.fontSize;
        builder.text(id + "-t-poc", labelX, profile.poc, "POC", { color: colors.poc, size: size });
        builder.text(id + "-t-vah", labelX, profile.vah, "VAH", { color: colors.vahVal, size: size });
        builder.text(id + "-t-val", labelX, profile.val, "VAL", { color: colors.vahVal, size: size });
    }

    if (props.showProfileStats) {
        const range = profile.high - profile.low;
        builder.text(
            id + "-t-sum",
            record.startX,
            profile.low - range * 0.06,
            "Σ " + formatVolume(profile.total) + " / " + formatPrice(range, instance.cfg.decimals),
            { color: safeColor(props.statsTextColor, "#DCDCDC"), size: props.fontSize }
        );
        builder.text(
            id + "-t-delta",
            record.startX,
            profile.low - range * 0.1,
            "Delta: " + Math.round(profile.delta),
            {
                color:
                    profile.delta >= 0
                        ? safeColor(props.deltaUpColor, "#00E676")
                        : safeColor(props.deltaDownColor, "#FF5252"),
                size: props.fontSize
            }
        );
    }
}

function addKeyLevel(builder, instance, id, options) {
    if (!options.visible || options.price === null || options.price === undefined) {
        return;
    }
    if (!isFinite(options.price)) {
        return;
    }

    const props = instance.props;
    const lastX = instance.lastBarIndex;
    const startX =
        options.startX === null || options.startX === undefined ? lastX : Math.min(options.startX, lastX);
    const endX = Math.max(lastX + props.labelOffset, startX + 1);

    builder.line(
        id,
        {
            color: options.color,
            width: options.width,
            dash: options.dash || DASH_SOLID,
            opacity: 1
        },
        startX,
        options.price,
        endX,
        options.price
    );

    if (props.showKeyLevelLabels) {
        const text =
            options.probability === null || options.probability === undefined
                ? options.text
                : options.text + " " + probabilityText(options.probability);
        builder.text(id + "-t", endX + 1, options.price, text, {
            color: options.color,
            size: props.fontSize,
            weight: "bold"
        });
    }
}

function dashboardCorner(position) {
    switch (position) {
        case "topLeft":
            return { h: "left", v: "top" };
        case "bottomRight":
            return { h: "right", v: "bottom" };
        case "bottomLeft":
            return { h: "left", v: "bottom" };
        default:
            return { h: "right", v: "top" };
    }
}

function addDashboard(builder, instance) {
    const props = instance.props;
    const kl = instance.kl;
    const cfg = instance.cfg;
    const gap = instance.gapInfo();
    const corner = dashboardCorner(props.dashboardPosition);

    const rows = [
        {
            label: "Session",
            value: instance.inRth ? "RTH" : instance.inOvn ? "ON" : "Outside",
            color: safeColor(props.dashboardTextColor, "#FFFFFF")
        },
        {
            label: "Gap",
            value: formatPrice(gap.size, cfg.decimals) + " / " + formatTicks(gap.size, cfg.tickSize) + "t",
            color:
                gap.size === null
                    ? safeColor(props.openColor, "#2196F3")
                    : gap.size >= 0
                      ? safeColor(props.gapUpColor, "#00C853")
                      : safeColor(props.gapDownColor, "#FF5252")
        },
        {
            label: "IB",
            value:
                kl.ibHigh === null || kl.ibLow === null
                    ? "n/a"
                    : formatPrice(kl.ibHigh - kl.ibLow, cfg.decimals),
            color: safeColor(props.ibHighColor, "#5EC3B2")
        },
        {
            label: "ON",
            value:
                instance.activeOvnHigh === null ||
                instance.activeOvnLow === null ||
                instance.activeOvnHigh === undefined ||
                instance.activeOvnLow === undefined
                    ? "n/a"
                    : formatPrice(instance.activeOvnHigh - instance.activeOvnLow, cfg.decimals),
            color: safeColor(props.onHighColor, "#5EC3B2")
        }
    ];

    if (props.showExpectedRange) {
        rows.push({
            label: "Exp Range",
            value: formatPrice(kl.expectedRange, cfg.decimals),
            color: safeColor(props.dashboardTextColor, "#FFFFFF")
        });
    }

    const lineHeight = props.fontSize + 5;
    for (let i = 0; i < rows.length; i += 1) {
        builder.frameText(
            "dash-" + i,
            corner,
            props.dashboardMarginX,
            props.dashboardMarginY + i * lineHeight,
            rows[i].label + ": " + rows[i].value,
            { color: rows[i].color, size: props.fontSize, weight: i === 0 ? "bold" : "normal" }
        );
    }
}

/**
 * Construye la lista completa de objetos graficos a partir del estado del
 * calculador. Se invoca una sola vez, en la ultima vela.
 */
function buildGraphics(instance) {
    if (instance.lastBarIndex === null || instance.lastBarIndex === undefined) {
        return undefined;
    }

    const props = instance.props;
    const builder = createGraphicsBuilder();

    // 1. Perfiles cerrados y en desarrollo.
    if (props.showRth) {
        for (let i = 0; i < instance.completedRth.length; i += 1) {
            addProfile(builder, instance, instance.completedRth[i], "r" + i);
        }
    }
    if (props.showOvernight) {
        for (let i = 0; i < instance.completedOvn.length; i += 1) {
            addProfile(builder, instance, instance.completedOvn[i], "o" + i);
        }
    }
    if (props.showDeveloping) {
        if (props.showRth) {
            const dev = instance.developingProfile(instance.rth);
            if (dev) {
                addProfile(builder, instance, dev, "rdev");
            }
        }
        if (props.showOvernight) {
            const dev = instance.developingProfile(instance.ovn);
            if (dev) {
                addProfile(builder, instance, dev, "odev");
            }
        }
    }

    // 2. Key Levels.
    const kl = instance.kl;
    const weekly = instance.prevWeekLevels();
    const gap = instance.gapInfo();
    const showProb = instance.inRth;

    const onHigh = safeColor(props.onHighColor, "#5EC3B2");
    const onLow = safeColor(props.onLowColor, "#F77C80");
    const gapClose = safeColor(props.gapCloseColor, "#FF9800");
    const weekColor = safeColor(props.weekColor, "#2962FF");

    addKeyLevel(builder, instance, "kl-onh", {
        visible: props.showOvernightLevels && props.showOnHigh,
        price: instance.activeOvnHigh,
        startX: instance.activeOvnStartX,
        color: onHigh,
        width: props.onLineWidth,
        text: "ONH",
        probability: showProb ? kl.probOnHigh : null
    });
    addKeyLevel(builder, instance, "kl-onl", {
        visible: props.showOvernightLevels && props.showOnLow,
        price: instance.activeOvnLow,
        startX: instance.activeOvnStartX,
        color: onLow,
        width: props.onLineWidth,
        text: "ONL",
        probability: showProb ? kl.probOnLow : null
    });
    addKeyLevel(builder, instance, "kl-pdh", {
        visible: props.showPrevRth && props.showPdh,
        price: kl.prevRthHigh,
        startX: kl.cycleStartX,
        color: safeColor(props.prevRthHighColor, "#5EC3B2"),
        width: props.prevRthLineWidth,
        text: "YEH",
        probability: showProb ? kl.probPdh : null
    });
    addKeyLevel(builder, instance, "kl-pdl", {
        visible: props.showPrevRth && props.showPdl,
        price: kl.prevRthLow,
        startX: kl.cycleStartX,
        color: safeColor(props.prevRthLowColor, "#F77C80"),
        width: props.prevRthLineWidth,
        text: "YEL",
        probability: showProb ? kl.probPdl : null
    });
    addKeyLevel(builder, instance, "kl-gap", {
        visible: props.showGapLevels && props.showGapClose,
        price: kl.prevRthClose,
        startX: kl.cycleStartX,
        color: gapClose,
        width: props.gapLineWidth,
        text: "GAP",
        probability: showProb ? kl.probGapClose : null
    });
    addKeyLevel(builder, instance, "kl-ibh", {
        visible: props.showIbLevels && props.showIbHigh,
        price: kl.ibHigh,
        startX: kl.rthStartX,
        color: safeColor(props.ibHighColor, "#5EC3B2"),
        width: props.ibLineWidth,
        text: "IBH",
        probability: showProb ? kl.probIbHigh : null
    });
    addKeyLevel(builder, instance, "kl-ibl", {
        visible: props.showIbLevels && props.showIbLow,
        price: kl.ibLow,
        startX: kl.rthStartX,
        color: safeColor(props.ibLowColor, "#F77C80"),
        width: props.ibLineWidth,
        text: "IBL",
        probability: showProb ? kl.probIbLow : null
    });
    addKeyLevel(builder, instance, "kl-ypoc", {
        visible: props.showYpoc,
        price: instance.prevProfile.poc,
        startX: kl.cycleStartX,
        color: safeColor(props.ypocColor, "#E91E63"),
        width: props.ypocLineWidth,
        text: "YPOC",
        probability: showProb ? kl.probYpoc : null
    });
    addKeyLevel(builder, instance, "kl-pwh", {
        visible: props.showPrevWeek && props.showPwh,
        price: weekly.high,
        startX: instance.week.startX,
        color: weekColor,
        width: props.weekLineWidth,
        text: "PWH",
        probability: null
    });
    addKeyLevel(builder, instance, "kl-pwl", {
        visible: props.showPrevWeek && props.showPwl,
        price: weekly.low,
        startX: instance.week.startX,
        color: weekColor,
        width: props.weekLineWidth,
        text: "PWL",
        probability: null
    });
    addKeyLevel(builder, instance, "kl-p2wh", {
        visible: props.showWeek2 && props.showP2wh,
        price: weekly.high2,
        startX: instance.week.startX,
        color: weekColor,
        width: props.weekLineWidth,
        dash: DASH_DASHED,
        text: "P2WH",
        probability: null
    });
    addKeyLevel(builder, instance, "kl-p2wl", {
        visible: props.showWeek2 && props.showP2wl,
        price: weekly.low2,
        startX: instance.week.startX,
        color: weekColor,
        width: props.weekLineWidth,
        dash: DASH_DASHED,
        text: "P2WL",
        probability: null
    });
    addKeyLevel(builder, instance, "kl-open", {
        visible: props.showGapLevels && props.showTodayOpen,
        price: kl.todayOpen,
        startX: kl.rthStartX,
        color: safeColor(props.openColor, "#2196F3"),
        width: props.gapLineWidth,
        text: "OPEN",
        probability: null
    });
    addKeyLevel(builder, instance, "kl-halfgap", {
        visible: props.showGapLevels && props.showHalfGap && gap.valid,
        price: kl.halfGap,
        startX: kl.rthStartX,
        color: gapClose,
        width: props.gapLineWidth,
        dash: DASH_DASHED,
        text: "HALF GAP",
        probability: showProb ? kl.probHalfGap : null
    });

    // 3. POCs historicos, con opacidad decreciente (el mas antiguo, mas tenue).
    if (props.showYpoc && props.showHistoricPocs) {
        const pocs = instance.historicPocs;
        const ypocColor = safeColor(props.ypocColor, "#E91E63");
        for (let i = 0; i < pocs.length; i += 1) {
            const age = pocs.length - 1 - i;
            const opacity = Math.max(0.15, 1 - (0.75 * age) / Math.max(1, pocs.length - 1));
            builder.line(
                "poc-hist-" + i,
                { color: ypocColor, width: 1, dash: DASH_SOLID, opacity: opacity },
                instance.lastBarIndex - props.labelOffset,
                pocs[i],
                instance.lastBarIndex + props.labelOffset,
                pocs[i]
            );
        }
    }

    // 4. Dashboard.
    if (props.showDashboard) {
        addDashboard(builder, instance);
    }

    const items = builder.build();
    return items.length > 0 ? { items: items } : undefined;
}

// ===========================================================================
// 7. Exports
// ===========================================================================

const boolSpec = predef.paramSpecs.bool;
const numberSpec = predef.paramSpecs.number;
const enumSpec = predef.paramSpecs.enum;
// meta.ParamType no define COLOR, asi que los colores son parametros de texto
// (hex o color web con nombre).
const colorSpec = predef.paramSpecs.text;

module.exports = {
    name: "dualSvpKeyLevels",
    description: "Dual SVP HD + Key Levels Pro",
    calculator: DualSvpKeyLevels,
    inputType: meta.InputType.BARS,
    areaChoice: meta.AreaChoice.OVERLAY,
    tags: ["Volume Profile", "Key Levels"],

    // Pide al grafico que incluya el perfil de volumen por vela (modo HD).
    requirements: {
        volumeProfiles: true
    },

    params: {
        // --- Sesiones ---
        showRth: boolSpec(true),
        rthStartHour: numberSpec(9, 1, 0),
        rthStartMinute: numberSpec(30, 1, 0),
        rthEndHour: numberSpec(17, 1, 0),
        rthEndMinute: numberSpec(0, 1, 0),
        showOvernight: boolSpec(true),
        ovnStartHour: numberSpec(17, 1, 0),
        ovnStartMinute: numberSpec(0, 1, 0),
        ovnEndHour: numberSpec(9, 1, 0),
        ovnEndMinute: numberSpec(30, 1, 0),
        autoNewYorkTime: boolSpec(true),
        manualUtcOffset: numberSpec(-5, 1, -12),
        ibMinutes: numberSpec(60, 5, 1),

        // --- Perfil ---
        numRows: numberSpec(60, 5, 10),
        volumeMode: enumSpec({ total: "Total", updown: "Up / Down" }, "total"),
        valueAreaPct: numberSpec(68, 1, 50),
        vaFadeOutside: numberSpec(35, 5, 0),
        maxSessions: numberSpec(5, 1, 1),

        // --- Visualizacion del perfil ---
        showDeveloping: boolSpec(true),
        showHistogram: boolSpec(true),
        showPoc: boolSpec(true),
        showVah: boolSpec(true),
        showVal: boolSpec(true),
        showProfileLabels: boolSpec(true),
        showProfileStats: boolSpec(true),
        extendRight: boolSpec(false),
        profileSide: enumSpec({ left: "Left", right: "Right" }, "left"),
        widthPercent: numberSpec(50, 5, 5),
        gapBars: numberSpec(0, 1, 0),
        profileLineWidth: numberSpec(2, 1, 1),
        histogramOpacity: numberSpec(0.45, 0.05, 0.05),
        fontSize: numberSpec(11, 1, 6),

        // --- Colores del perfil (hex o color web) ---
        rthPocColor: colorSpec("#FF6B6B"),
        rthVahValColor: colorSpec("#4ECDC4"),
        rthUpVolColor: colorSpec("#26A69A"),
        rthDownVolColor: colorSpec("#EF5350"),
        rthTotalVolColor: colorSpec("#8A8A8A"),
        rthValueAreaColor: colorSpec("#00BCD4"),
        ovnPocColor: colorSpec("#FFB74D"),
        ovnVahValColor: colorSpec("#B39DDB"),
        ovnUpVolColor: colorSpec("#42A5F5"),
        ovnDownVolColor: colorSpec("#FF8A65"),
        ovnTotalVolColor: colorSpec("#607D8B"),
        ovnValueAreaColor: colorSpec("#7E57C2"),
        statsTextColor: colorSpec("#DCDCDC"),
        deltaUpColor: colorSpec("#00E676"),
        deltaDownColor: colorSpec("#FF5252"),

        // --- Key Levels ---
        showKeyLevelLabels: boolSpec(true),
        labelOffset: numberSpec(8, 1, 0),
        showDashboard: boolSpec(true),
        dashboardPosition: enumSpec(
            {
                topRight: "Top Right",
                topLeft: "Top Left",
                bottomRight: "Bottom Right",
                bottomLeft: "Bottom Left"
            },
            "topRight"
        ),
        dashboardMarginX: numberSpec(14, 1, 0),
        dashboardMarginY: numberSpec(16, 1, 0),
        dashboardTextColor: colorSpec("#FFFFFF"),

        showOvernightLevels: boolSpec(true),
        showOnHigh: boolSpec(true),
        showOnLow: boolSpec(true),
        onHighColor: colorSpec("#5EC3B2"),
        onLowColor: colorSpec("#F77C80"),
        onLineWidth: numberSpec(1, 1, 1),

        showPrevRth: boolSpec(true),
        showPdh: boolSpec(true),
        showPdl: boolSpec(true),
        prevRthHighColor: colorSpec("#5EC3B2"),
        prevRthLowColor: colorSpec("#F77C80"),
        prevRthLineWidth: numberSpec(1, 1, 1),

        showIbLevels: boolSpec(true),
        showIbHigh: boolSpec(true),
        showIbLow: boolSpec(true),
        ibHighColor: colorSpec("#5EC3B2"),
        ibLowColor: colorSpec("#F77C80"),
        ibLineWidth: numberSpec(1, 1, 1),

        showYpoc: boolSpec(true),
        showHistoricPocs: boolSpec(true),
        ypocColor: colorSpec("#E91E63"),
        ypocLineWidth: numberSpec(2, 1, 1),

        showPrevWeek: boolSpec(true),
        showPwh: boolSpec(true),
        showPwl: boolSpec(true),
        showWeek2: boolSpec(true),
        showP2wh: boolSpec(true),
        showP2wl: boolSpec(true),
        weekColor: colorSpec("#2962FF"),
        weekLineWidth: numberSpec(2, 1, 1),

        showGapLevels: boolSpec(true),
        showTodayOpen: boolSpec(true),
        showHalfGap: boolSpec(true),
        showGapClose: boolSpec(true),
        minGapTicks: numberSpec(1, 1, 0),
        openColor: colorSpec("#2196F3"),
        gapCloseColor: colorSpec("#FF9800"),
        gapUpColor: colorSpec("#00C853"),
        gapDownColor: colorSpec("#FF5252"),
        gapLineWidth: numberSpec(1, 1, 1),

        showExpectedRange: boolSpec(true),
        manualVxn: numberSpec(0, 0.5, 0),

        // --- VWAP ---
        showVwap: boolSpec(true),
        vwapAnchor: enumSpec(
            { session: "Session", week: "Week", month: "Month", quarter: "Quarter", year: "Year" },
            "session"
        ),
        vwapShowBand1: boolSpec(true),
        vwapMultiplier1: numberSpec(1, 0.5, 0),
        vwapShowBand2: boolSpec(true),
        vwapMultiplier2: numberSpec(2, 0.5, 0),

        // --- Instrumento ---
        tickSizeOverride: numberSpec(0, 0.01, 0)
    },

    // El VWAP se dibuja como plot nativo (estilos editables desde la UI);
    // el resto del indicador se dibuja con graphics desde map().
    plots: {
        vwap: { title: "VWAP" },
        vwapUpper1: { title: "VWAP +1" },
        vwapLower1: { title: "VWAP -1" },
        vwapUpper2: { title: "VWAP +2" },
        vwapLower2: { title: "VWAP -2" },
        ypoc: { title: "YPOC" }
    },

    plotter: predef.plotters.multiline([
        "vwap",
        "vwapUpper1",
        "vwapLower1",
        "vwapUpper2",
        "vwapLower2"
    ]),

    scaler: predef.scalers.multiPath(["vwap"]),

    schemeStyles: {
        dark: {
            vwap: { color: "#2962FF", lineWidth: 2 },
            vwapUpper1: { color: "#9598A1", lineWidth: 1, lineStyle: 3 },
            vwapLower1: { color: "#9598A1", lineWidth: 1, lineStyle: 3 },
            vwapUpper2: { color: "#9598A1", lineWidth: 1, lineStyle: 5 },
            vwapLower2: { color: "#9598A1", lineWidth: 1, lineStyle: 5 },
            ypoc: { color: "#E91E63", lineWidth: 1 }
        }
    },

    // Solo para los tests unitarios del repositorio.
    _internals: {
        nthSundayUtc,
        easternOffsetHours,
        exchangeTime,
        inWindow,
        tradingDayKey,
        rowIndexOf,
        upShareOf,
        buildProfile,
        newVwapState,
        vwapUpdate,
        vwapValues,
        formatPrice,
        formatVolume,
        formatTicks,
        decimalsForTick,
        readBar,
        safeColor,
        createGraphicsBuilder,
        buildGraphics,
        SESSION_BREAK_MS
    }
};
