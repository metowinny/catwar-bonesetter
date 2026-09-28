const PLAN_HEIGHTS = Object.keys(WEAR_PLANS).map(Number).sort((a, b) => a - b);

function slotsForHeight(height) {
    for (const [from, to, slots] of MOUTH_SLOTS) {
        if (height >= from && height <= to) return slots;
    }
    return 1;
}

function snapHeight(height) {
    for (const key of PLAN_HEIGHTS) {
        if (key >= height) return key;
    }
    return PLAN_HEIGHTS[PLAN_HEIGHTS.length - 1];
}

function ageToHeight(moons) {
    const age = moons < 0 ? 0 : moons;
    for (const [m, p] of AGE_TO_HEIGHT) {
        if (m >= age) return p;
    }
    return AGE_TO_HEIGHT[AGE_TO_HEIGHT.length - 1][1];
}

function heightToAge(percent) {
    if (percent < 45) return 0;
    let best = 0;
    for (const [m, p] of AGE_TO_HEIGHT) {
        if (p <= percent) best = m;
        else break;
    }
    return best;
}

function planWear(health, heightPercent, slots) {
    let key = Math.round(heightPercent);
    if (!Object.prototype.hasOwnProperty.call(WEAR_PLANS, key)) {
        key = snapHeight(heightPercent);
    }

    const plan = WEAR_PLANS[key];
    const steps = plan.hours
        .map((hours, i) => ({ hours: hours, heal: plan.heal[i] }))
        .sort((a, b) => a.hours - b.hours);

    for (const step of steps) {
        for (let k = 1; k <= slots; k++) {
            if (k * step.heal >= health - 0.0001) {
                return { found: true, hours: step.hours, count: k, each: step.heal, total: k * step.heal };
            }
        }
    }

    return { found: false, maxTotal: Math.max(...steps.map(s => slots * s.heal)) };
}
