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
 * Diferencias inevitables respecto de Pine (ver README.md):
 *   - No existe request.security_lower_tf: el perfil se construye con las velas
 *     del grafico. Usar 1m o 30s para una precision equivalente al modo HD.
 *   - No existe request.security: los niveles semanales se calculan a partir del
 *     historial del propio grafico y el VXN se introduce manualmente.
 *   - No existen tablas: el dashboard se dibuja como texto anclado al precio.
 *
 * El objeto module.exports._internals se expone unicamente para los tests
 * unitarios del repositorio; Tradovate lo ignora.
 */

const predef = require("./tools/predef");
const meta = require("./tools/meta");

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
 * Construye el perfil de volumen de una sesion.
 *
 * Reparte el volumen de cada vela proporcionalmente al solapamiento entre el
 * rango de la vela y cada fila del perfil (identico al Pine original).
 *
 * @param {Array} bars  {h, l, v, dir}
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
        const barVol = bar.v > 0 ? bar.v : 0;
        if (barVol <= 0) {
            continue;
        }
        const barHigh = Math.max(bar.h, bar.l);
        const barLow = Math.min(bar.h, bar.l);

        if (barHigh === barLow) {
            const r = rowIndexOf(barHigh, low, rowSize, numRows);
            vol[r] += barVol;
            if (bar.dir >= 0) {
                up[r] += barVol;
            } else {
                down[r] += barVol;
            }
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
            if (bar.dir >= 0) {
                up[r] += part;
            } else {
                down[r] += part;
            }
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
// 5. Parametros
// ===========================================================================

/** predef.paramSpecs.color no existe en builds antiguos: se degrada con gracia. */
function colorSpec(defaultValue) {
    if (predef && predef.paramSpecs && typeof predef.paramSpecs.color === "function") {
        return predef.paramSpecs.color(defaultValue);
    }
    return { type: "color", def: defaultValue };
}

function boolSpec(defaultValue) {
    return predef.paramSpecs.bool(defaultValue);
}

function numberSpec(defaultValue, step, min) {
    return predef.paramSpecs.number(defaultValue, step, min);
}

function enumSpec(options, defaultValue) {
    return predef.paramSpecs.enum(options, defaultValue);
}

// ===========================================================================
// 6. Calculadora
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

    return {
        x: typeof x === "number" && isFinite(x) ? x : fallbackIndex,
        ms,
        open: value("open"),
        high: value("high"),
        low: value("low"),
        close: value("close"),
        volume: value("volume") || 0
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
            tickSize: p.tickSize > 0 ? p.tickSize : 0.25,
            decimals: Math.max(0, Math.round(p.priceDecimals))
        };

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
                dir: bar.close !== null && bar.open !== null && bar.close >= bar.open ? 1 : -1
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

        return {
            vwap: vwap ? vwap.value : undefined,
            vwapUpper1: vwap && p.vwapShowBand1 ? vwap.upper1 : undefined,
            vwapLower1: vwap && p.vwapShowBand1 ? vwap.lower1 : undefined,
            vwapUpper2: vwap && p.vwapShowBand2 ? vwap.upper2 : undefined,
            vwapLower2: vwap && p.vwapShowBand2 ? vwap.lower2 : undefined,
            ypoc: this.prevProfile.poc === null ? undefined : this.prevProfile.poc
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
// 7. Dibujo
// ===========================================================================

/**
 * Envoltura sobre el canvas de Tradovate. Detecta que primitivas existen y
 * degrada con gracia (rectangulo -> poligono -> linea gruesa) para no romper
 * el render completo si una build no expone alguna de ellas.
 */
function makePainter(canvas, errors) {
    const has = function (name) {
        return canvas && typeof canvas[name] === "function";
    };
    const caps = {
        line: has("drawLine"),
        rect: has("drawRectangle"),
        polygon: has("drawPolygon"),
        text: has("drawText")
    };

    const report = function (where, error) {
        if (errors.length < 5) {
            errors.push(where + ": " + (error && error.message ? error.message : String(error)));
        }
    };

    return {
        caps: caps,

        line: function (x1, y1, x2, y2, style) {
            if (!caps.line) {
                return;
            }
            try {
                canvas.drawLine(
                    { x: x1, y: y1 },
                    { x: x2, y: y2 },
                    Object.assign({ relativeX: false, relativeY: false, lineStyle: "solid", lineWidth: 1 }, style)
                );
            } catch (e) {
                report("drawLine", e);
            }
        },

        rect: function (x1, yTop, x2, yBottom, style) {
            const opts = Object.assign({ relativeX: false, relativeY: false }, style);
            try {
                if (caps.rect) {
                    canvas.drawRectangle({ x: x1, y: yTop }, { x: x2, y: yBottom }, opts);
                    return;
                }
                if (caps.polygon) {
                    canvas.drawPolygon(
                        [
                            { x: x1, y: yTop },
                            { x: x2, y: yTop },
                            { x: x2, y: yBottom },
                            { x: x1, y: yBottom }
                        ],
                        opts
                    );
                    return;
                }
                if (caps.line) {
                    // Ultimo recurso: una linea horizontal en el centro de la fila.
                    canvas.drawLine(
                        { x: x1, y: (yTop + yBottom) / 2 },
                        { x: x2, y: (yTop + yBottom) / 2 },
                        Object.assign({ lineWidth: 2, lineStyle: "solid" }, opts)
                    );
                }
            } catch (e) {
                report("drawRectangle", e);
            }
        },

        text: function (x, y, value, style) {
            if (!caps.text) {
                return;
            }
            try {
                canvas.drawText(
                    { x: x, y: y },
                    value,
                    Object.assign(
                        {
                            relativeX: false,
                            relativeY: false,
                            textAlign: "left",
                            textBaseline: "middle",
                            fontSize: 11,
                            fontFamily: "11px Arial"
                        },
                        style
                    )
                );
            } catch (e) {
                report("drawText", e);
            }
        }
    };
}

function profileColors(props, kind) {
    if (kind === "rth") {
        return {
            poc: props.rthPocColor,
            vahVal: props.rthVahValColor,
            up: props.rthUpVolColor,
            down: props.rthDownVolColor,
            total: props.rthTotalVolColor,
            valueArea: props.rthValueAreaColor
        };
    }
    return {
        poc: props.ovnPocColor,
        vahVal: props.ovnVahValColor,
        up: props.ovnUpVolColor,
        down: props.ovnDownVolColor,
        total: props.ovnTotalVolColor,
        valueArea: props.ovnValueAreaColor
    };
}

function drawProfile(painter, instance, record) {
    const props = instance.props;
    const cfg = instance.cfg;
    const profile = record.profile;
    const colors = profileColors(props, record.kind);
    const rightSide = props.profileSide === "right";

    const sessionBars = Math.max(1, record.endX - record.startX + 1);
    const gap = Math.min(props.gapBars, Math.max(0, sessionBars - 1));
    const availableWidth = Math.max(1, sessionBars - 1 - gap);
    const width = Math.max(1, Math.round((availableWidth * props.widthPercent) / 100));
    const anchorX = rightSide ? record.endX - gap : record.startX + gap;

    if (props.showHistogram) {
        for (let r = 0; r < profile.numRows; r += 1) {
            const rowVol = profile.vol[r];
            if (!(rowVol > 0)) {
                continue;
            }
            const len = Math.round((rowVol / profile.maxVol) * width);
            if (len <= 0) {
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
                    upLen = Math.round((len * upVol) / rowVol);
                } else {
                    upLen = upVol > 0 ? len : 0;
                }
                upLen = Math.max(0, Math.min(len, upLen));
                const downLen = len - upLen;

                const fade = inValueArea ? 1 : Math.max(0, 1 - props.vaFadeOutside / 100);

                if (upLen > 0) {
                    painter.rect(leftX, rowHigh, leftX + upLen, rowLow, {
                        color: colors.up,
                        opacity: props.histogramOpacity * fade
                    });
                }
                if (downLen > 0) {
                    painter.rect(leftX + upLen, rowHigh, rightX, rowLow, {
                        color: colors.down,
                        opacity: props.histogramOpacity * fade
                    });
                }
            } else {
                painter.rect(leftX, rowHigh, rightX, rowLow, {
                    color: inValueArea ? colors.valueArea : colors.total,
                    opacity: inValueArea ? props.histogramOpacity : props.histogramOpacity * 0.75
                });
            }
        }
    }

    const lineX1 = record.startX;
    const lineX2 = props.extendRight
        ? Math.max(instance.lastBarIndex + props.labelOffset, record.startX + 1)
        : Math.max(record.endX, record.startX + 1);

    if (props.showPoc) {
        painter.line(lineX1, profile.poc, lineX2, profile.poc, {
            color: colors.poc,
            lineWidth: props.profileLineWidth + 1,
            lineStyle: "solid",
            opacity: 1
        });
    }
    if (props.showVah) {
        painter.line(lineX1, profile.vah, lineX2, profile.vah, {
            color: colors.vahVal,
            lineWidth: props.profileLineWidth,
            lineStyle: "dotted",
            opacity: 1
        });
    }
    if (props.showVal) {
        painter.line(lineX1, profile.val, lineX2, profile.val, {
            color: colors.vahVal,
            lineWidth: props.profileLineWidth,
            lineStyle: "dotted",
            opacity: 1
        });
    }

    if (props.showProfileLabels) {
        const labelX = record.endX + 1;
        painter.text(labelX, profile.poc, "POC", { color: colors.poc });
        painter.text(labelX, profile.vah, "VAH", { color: colors.vahVal });
        painter.text(labelX, profile.val, "VAL", { color: colors.vahVal });
    }

    if (props.showProfileStats) {
        const range = profile.high - profile.low;
        painter.text(
            record.startX,
            profile.low - range * 0.09,
            "Σ " + formatVolume(profile.total) + " / " + formatPrice(range, instance.cfg.decimals),
            { color: props.statsTextColor }
        );
        painter.text(record.startX, profile.low - range * 0.13, "Delta: " + Math.round(profile.delta), {
            color: profile.delta >= 0 ? props.deltaUpColor : props.deltaDownColor
        });
    }
}

function drawKeyLevel(painter, instance, options) {
    if (!options.visible || options.price === null || options.price === undefined || !isFinite(options.price)) {
        return;
    }
    const props = instance.props;
    const lastX = instance.lastBarIndex;
    const startX = options.startX === null || options.startX === undefined ? lastX : Math.min(options.startX, lastX);
    const endX = Math.max(lastX + props.labelOffset, startX + 1);

    painter.line(startX, options.price, endX, options.price, {
        color: options.color,
        lineWidth: options.width,
        lineStyle: options.lineStyle || "solid",
        opacity: 1
    });

    if (props.showKeyLevelLabels) {
        const text =
            options.probability === null || options.probability === undefined
                ? options.text
                : options.text + " " + probabilityText(options.probability);
        painter.text(endX + 1, options.price, text, { color: options.color });
    }
}

function drawVwap(painter, instance) {
    const props = instance.props;
    const series = instance.series;
    if (!props.showVwap || series.length < 2) {
        return;
    }

    const segments = [
        { key: "vwap", color: props.vwapColor, width: props.vwapLineWidth, show: true },
        { key: "u1", color: props.vwapBandColor, width: 1, show: props.vwapShowBand1 },
        { key: "l1", color: props.vwapBandColor, width: 1, show: props.vwapShowBand1 },
        { key: "u2", color: props.vwapBandColor, width: 1, show: props.vwapShowBand2 },
        { key: "l2", color: props.vwapBandColor, width: 1, show: props.vwapShowBand2 }
    ];

    for (let s = 0; s < segments.length; s += 1) {
        const segment = segments[s];
        if (!segment.show) {
            continue;
        }
        for (let i = 1; i < series.length; i += 1) {
            const previous = series[i - 1];
            const current = series[i];
            const a = previous[segment.key];
            const b = current[segment.key];
            if (a === null || b === null || a === undefined || b === undefined) {
                continue;
            }
            if (current.x - previous.x !== 1) {
                continue; // corte de ancla o hueco de datos
            }
            painter.line(previous.x, a, current.x, b, {
                color: segment.color,
                lineWidth: segment.width,
                lineStyle: "solid",
                opacity: 1
            });
        }
    }
}

function drawDashboard(painter, instance) {
    const props = instance.props;
    if (!props.showDashboard || instance.lastBarIndex === null) {
        return;
    }

    const kl = instance.kl;
    const cfg = instance.cfg;
    const gap = instance.gapInfo();
    const recent = instance.recentRange(200);
    if (!recent) {
        return;
    }

    const step = recent.size * 0.06;
    const x = instance.lastBarIndex + props.labelOffset + props.dashboardOffset;
    let y = recent.high + step * 2;

    const rows = [
        { label: "Levels Pro", value: instance.inRth ? "RTH" : instance.inOvn ? "ON" : "Outside", color: props.dashboardTextColor },
        {
            label: "Gap",
            value: formatPrice(gap.size, cfg.decimals) + " / " + formatTicks(gap.size, cfg.tickSize) + "t",
            color: gap.size === null ? props.openColor : gap.size >= 0 ? props.gapUpColor : props.gapDownColor
        },
        {
            label: "IB Range",
            value:
                kl.ibHigh === null || kl.ibLow === null
                    ? "n/a"
                    : formatPrice(kl.ibHigh - kl.ibLow, cfg.decimals),
            color: props.ibHighColor
        },
        {
            label: "ON Range",
            value:
                instance.activeOvnHigh === null || instance.activeOvnLow === null || instance.activeOvnHigh === undefined
                    ? "n/a"
                    : formatPrice(instance.activeOvnHigh - instance.activeOvnLow, cfg.decimals),
            color: props.onHighColor
        }
    ];

    if (props.showExpectedRange) {
        rows.push({
            label: "Exp Range",
            value: formatPrice(kl.expectedRange, cfg.decimals),
            color: props.dashboardTextColor
        });
    }

    for (let i = 0; i < rows.length; i += 1) {
        painter.text(x, y, rows[i].label + ": " + rows[i].value, { color: rows[i].color });
        y -= step;
    }
}

const plotter = predef.plotters.custom(function (canvas, instance) {
    if (!instance || !instance.cfg || instance.lastBarIndex === null) {
        return;
    }

    instance.drawErrors = [];
    const painter = makePainter(canvas, instance.drawErrors);
    const props = instance.props;

    // 1. Perfiles completados y en desarrollo.
    const records = [];
    if (props.showRth) {
        for (let i = 0; i < instance.completedRth.length; i += 1) {
            records.push(instance.completedRth[i]);
        }
    }
    if (props.showOvernight) {
        for (let i = 0; i < instance.completedOvn.length; i += 1) {
            records.push(instance.completedOvn[i]);
        }
    }
    if (props.showDeveloping) {
        if (props.showRth) {
            const dev = instance.developingProfile(instance.rth);
            if (dev) {
                records.push(dev);
            }
        }
        if (props.showOvernight) {
            const dev = instance.developingProfile(instance.ovn);
            if (dev) {
                records.push(dev);
            }
        }
    }

    for (let i = 0; i < records.length; i += 1) {
        drawProfile(painter, instance, records[i]);
    }

    // 2. Key Levels.
    const kl = instance.kl;
    const weekly = instance.prevWeekLevels();
    const gap = instance.gapInfo();
    const showProbabilities = instance.inRth;

    drawKeyLevel(painter, instance, {
        visible: props.showOvernightLevels && props.showOnHigh,
        price: instance.activeOvnHigh,
        startX: instance.activeOvnStartX,
        color: props.onHighColor,
        width: props.onLineWidth,
        text: "ONH",
        probability: showProbabilities ? kl.probOnHigh : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showOvernightLevels && props.showOnLow,
        price: instance.activeOvnLow,
        startX: instance.activeOvnStartX,
        color: props.onLowColor,
        width: props.onLineWidth,
        text: "ONL",
        probability: showProbabilities ? kl.probOnLow : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showPrevRth && props.showPdh,
        price: kl.prevRthHigh,
        startX: kl.cycleStartX,
        color: props.prevRthHighColor,
        width: props.prevRthLineWidth,
        text: "YEH",
        probability: showProbabilities ? kl.probPdh : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showPrevRth && props.showPdl,
        price: kl.prevRthLow,
        startX: kl.cycleStartX,
        color: props.prevRthLowColor,
        width: props.prevRthLineWidth,
        text: "YEL",
        probability: showProbabilities ? kl.probPdl : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showGapLevels && props.showGapClose,
        price: kl.prevRthClose,
        startX: kl.cycleStartX,
        color: props.gapCloseColor,
        width: props.gapLineWidth,
        text: "GAP",
        probability: showProbabilities ? kl.probGapClose : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showIbLevels && props.showIbHigh,
        price: kl.ibHigh,
        startX: kl.rthStartX,
        color: props.ibHighColor,
        width: props.ibLineWidth,
        text: "IBH",
        probability: showProbabilities ? kl.probIbHigh : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showIbLevels && props.showIbLow,
        price: kl.ibLow,
        startX: kl.rthStartX,
        color: props.ibLowColor,
        width: props.ibLineWidth,
        text: "IBL",
        probability: showProbabilities ? kl.probIbLow : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showYpoc,
        price: instance.prevProfile.poc,
        startX: kl.cycleStartX,
        color: props.ypocColor,
        width: props.ypocLineWidth,
        text: "YPOC",
        probability: showProbabilities ? kl.probYpoc : null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showPrevWeek && props.showPwh,
        price: weekly.high,
        startX: instance.week.startX,
        color: props.weekHighColor,
        width: props.weekLineWidth,
        text: "PWH",
        probability: null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showPrevWeek && props.showPwl,
        price: weekly.low,
        startX: instance.week.startX,
        color: props.weekLowColor,
        width: props.weekLineWidth,
        text: "PWL",
        probability: null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showWeek2 && props.showP2wh,
        price: weekly.high2,
        startX: instance.week.startX,
        color: props.week2HighColor,
        width: props.week2LineWidth,
        text: "P2WH",
        probability: null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showWeek2 && props.showP2wl,
        price: weekly.low2,
        startX: instance.week.startX,
        color: props.week2LowColor,
        width: props.week2LineWidth,
        text: "P2WL",
        probability: null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showGapLevels && props.showTodayOpen,
        price: kl.todayOpen,
        startX: kl.rthStartX,
        color: props.openColor,
        width: props.gapLineWidth,
        text: "OPEN",
        probability: null
    });
    drawKeyLevel(painter, instance, {
        visible: props.showGapLevels && props.showHalfGap && gap.valid,
        price: kl.halfGap,
        startX: kl.rthStartX,
        color: props.gapCloseColor,
        width: props.gapLineWidth,
        lineStyle: "dashed",
        text: "HALF GAP",
        probability: showProbabilities ? kl.probHalfGap : null
    });

    // 3. POCs historicos, con opacidad decreciente (el mas antiguo, mas tenue).
    if (props.showYpoc && props.showKeyLevelLabels) {
        const pocs = instance.historicPocs;
        for (let i = 0; i < pocs.length; i += 1) {
            const age = pocs.length - 1 - i;
            const opacity = Math.max(0.15, 1 - (0.75 * age) / Math.max(1, pocs.length - 1));
            painter.line(
                instance.lastBarIndex - props.labelOffset,
                pocs[i],
                instance.lastBarIndex + props.labelOffset,
                pocs[i],
                { color: props.ypocColor, lineWidth: 1, lineStyle: "solid", opacity: opacity }
            );
        }
    }

    // 4. VWAP y bandas.
    drawVwap(painter, instance);

    // 5. Dashboard.
    drawDashboard(painter, instance);
});

// ===========================================================================
// 8. Exports
// ===========================================================================

module.exports = {
    name: "dualSvpKeyLevels",
    description: "Dual SVP HD + Key Levels Pro",
    calculator: DualSvpKeyLevels,
    inputType: meta.InputType.BARS,
    plotter: plotter,
    tags: ["Volume Profile", "Key Levels"],

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

        // --- Colores RTH ---
        rthPocColor: colorSpec("#FF6B6B"),
        rthVahValColor: colorSpec("#4ECDC4"),
        rthUpVolColor: colorSpec("#26A69A"),
        rthDownVolColor: colorSpec("#EF5350"),
        rthTotalVolColor: colorSpec("#8A8A8A"),
        rthValueAreaColor: colorSpec("#00BCD4"),

        // --- Colores Overnight ---
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
        dashboardOffset: numberSpec(4, 1, 0),
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
        ypocColor: colorSpec("#E91E63"),
        ypocLineWidth: numberSpec(2, 1, 1),

        showPrevWeek: boolSpec(true),
        showPwh: boolSpec(true),
        showPwl: boolSpec(true),
        weekHighColor: colorSpec("#2962FF"),
        weekLowColor: colorSpec("#2962FF"),
        weekLineWidth: numberSpec(2, 1, 1),

        showWeek2: boolSpec(true),
        showP2wh: boolSpec(true),
        showP2wl: boolSpec(true),
        week2HighColor: colorSpec("#2962FF"),
        week2LowColor: colorSpec("#2962FF"),
        week2LineWidth: numberSpec(2, 1, 1),

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
        vwapColor: colorSpec("#2962FF"),
        vwapBandColor: colorSpec("#9598A1"),
        vwapLineWidth: numberSpec(1, 1, 1),

        // --- Instrumento ---
        tickSize: numberSpec(0.25, 0.01, 0.0001),
        priceDecimals: numberSpec(2, 1, 0)
    },

    plots: {
        vwap: { title: "VWAP" },
        vwapUpper1: { title: "VWAP +1" },
        vwapLower1: { title: "VWAP -1" },
        vwapUpper2: { title: "VWAP +2" },
        vwapLower2: { title: "VWAP -2" },
        ypoc: { title: "YPOC" }
    },

    // Solo para los tests unitarios del repositorio.
    _internals: {
        nthSundayUtc,
        easternOffsetHours,
        exchangeTime,
        inWindow,
        tradingDayKey,
        rowIndexOf,
        buildProfile,
        newVwapState,
        vwapUpdate,
        vwapValues,
        formatPrice,
        formatVolume,
        formatTicks,
        readBar,
        makePainter,
        SESSION_BREAK_MS
    }
};
