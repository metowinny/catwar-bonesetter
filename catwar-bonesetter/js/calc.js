/* =====================================================================
   ЛОГИКА РАСЧЁТА. Алгоритм перенесён из исходного сайта без изменений.
   Зависит только от data.js (MOON_TABLE, HEAL_TABLE).
   ===================================================================== */

// Места во рту по росту (%)
function getMouthFromHeight(height) {
    if (height >= 45 && height <= 65) return 1;
    if (height >= 66 && height <= 75) return 2;
    if (height >= 76 && height <= 84) return 3;
    if (height >= 85 && height <= 94) return 4;
    if (height >= 95 && height <= 100) return 5;
    return 1;
}

// Ближайший рост из таблицы лечения (не меньше введённого)
function getNearestHeight(height) {
    const available = Object.keys(HEAL_TABLE).map(Number).sort((a, b) => a - b);
    for (let val of available) {
        if (val >= height) return val;
    }
    return available[available.length - 1];
}

// луны -> проценты (ближайший больший)
function moonToPercent(moons) {
    if (moons < 0) moons = 0;
    for (let entry of MOON_TABLE) {
        if (entry.m >= moons) return entry.p;
    }
    return MOON_TABLE[MOON_TABLE.length - 1].p; // максимум 100
}

// проценты -> луны (ближайший меньший или равный)
function percentToMoons(percent) {
    if (percent < 45) return 0;
    let best = 0;
    for (let entry of MOON_TABLE) {
        if (entry.p <= percent) best = entry.m;
        else break;
    }
    return best;
}

// Основной расчёт. Возвращает { found, hours, count, each, total } или { found:false, maxTotal }
function computeHealing(health, heightPercent, mouth) {
    let heightKey = Math.round(heightPercent);
    if (!HEAL_TABLE.hasOwnProperty(heightKey)) {
        heightKey = getNearestHeight(heightPercent);
    }

    const sorted = HEAL_TABLE[heightKey].slice().sort((a, b) => a.h - b.h);

    let foundTime = null, foundCount = 0, foundP = 0;

    for (const entry of sorted) {
        const p = entry.p;
        for (let k = 1; k <= mouth; k++) {
            if (k * p >= health - 0.0001) {
                foundTime = entry.h;
                foundCount = k;
                foundP = p;
                break;
            }
        }
        if (foundTime !== null) break;
    }

    if (foundTime !== null) {
        return { found: true, hours: foundTime, count: foundCount, each: foundP, total: foundCount * foundP };
    }
    return { found: false, maxTotal: Math.max(...sorted.map(e => mouth * e.p)) };
}
