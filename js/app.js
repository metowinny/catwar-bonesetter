(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const T = TEXTS;

    const healthInput = $('healthInput'), heightInput = $('heightInput'), mouthInput = $('mouthInput');
    const resultDiv = $('result');
    const healthHint = $('healthHint'), heightHint = $('heightHint'), mouthHint = $('mouthHint');
    const heightUnit = $('heightUnit');
    let currentMode = 'moon'; 
    let mouthManuallySet = false; 

    function plural(n, forms) {
        if (n % 10 === 1 && n % 100 !== 11) return forms[0];
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1];
        return forms[2];
    }
    function setHint(el, text) {
        el.textContent = text || '';
        el.hidden = !text;
    }
    function fillTexts() {
        document.title = T.pageTitle;
        $('title').textContent = T.title;
        $('tagline').textContent = T.tagline;
        $('tagline').hidden = !T.tagline;
        $('description').innerHTML = T.description;
        $('thanks').innerHTML = T.thanksUrl
            ? T.thanksText + ' <a href="' + T.thanksUrl + '" target="_blank" rel="noopener">' + T.thanksLinkText + '</a> ' + T.thanksAfter
            : '';
        $('thanks').hidden = !T.thanksUrl;
        $('healthLabel').textContent = T.health.label;
        $('healthUnit').textContent = T.health.unit;
        setHint(healthHint, T.health.hint);
        $('heightLabel').textContent = T.height.label;
        $('mouthLabel').textContent = T.mouth.label;
        $('mouthUnit').textContent = T.mouth.unit;
        $('calcBtn').textContent = T.button;
        $('footer').textContent = T.footer || '';
        $('footer').hidden = !T.footer;
    }

    function parseLocaleFloat(str) {
        if (typeof str !== 'string') return NaN;
        return parseFloat(str.trim().replace(',', '.'));
    }

    function formatDateTime(date) {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return date.getDate() + ' ' + T.months[date.getMonth()] + ' ' + T.at + ' ' + hh + ':' + mm;
    }
    function getStartDate() { return formatDateTime(new Date()); }
    function getEndDate(hours) {
        const d = new Date();
        d.setMinutes(d.getMinutes() + Math.round(hours * 60));
        return formatDateTime(d);
    }

    function getHeightPercent() {
        const raw = parseLocaleFloat(heightInput.value);
        if (isNaN(raw)) return NaN;
        return currentMode === 'percent' ? raw : moonToPercent(Math.floor(raw));
    }

    function updateAutoMouth() {
        const h = getHeightPercent();
        let auto = null;
        if (!isNaN(h) && h >= 45 && h <= 100) auto = getMouthFromHeight(h);
        setHint(mouthHint, T.mouth.autoHint + (auto === null ? '—' : auto));
        if (!mouthManuallySet && auto !== null) mouthInput.value = auto;
    }

    function configureHeightInput(mode) {
        if (mode === 'percent') {
            heightInput.type = 'number';
            heightInput.min = 45; heightInput.max = 100; heightInput.step = 1;
            heightInput.removeAttribute('inputmode');
            heightInput.placeholder = '';
            heightUnit.textContent = T.height.unitPercent;
            heightUnit.title = 'Сейчас: проценты. Нажмите, чтобы ввести рост в лунах';
            setHint(heightHint, T.height.hintPercent);
        } else {
            heightInput.type = 'text';
            heightInput.setAttribute('inputmode', 'decimal');
            heightInput.removeAttribute('min'); heightInput.removeAttribute('max'); heightInput.removeAttribute('step');
            heightInput.placeholder = '44' + T.height.decimalSeparator + '3';
            heightUnit.textContent = T.height.unitMoon;
            heightUnit.title = 'Сейчас: луны. Нажмите, чтобы ввести рост в процентах';
            setHint(heightHint, T.height.hintMoon);
        }
    }

    function toggleHeightMode() {
        const mode = currentMode === 'percent' ? 'moon' : 'percent';
        const v = parseLocaleFloat(heightInput.value);
        if (mode === 'percent') {
            heightInput.value = isNaN(v) ? 45 : moonToPercent(Math.floor(v));
        } else {
            heightInput.value = isNaN(v) ? 0 : percentToMoons(v);
        }
        configureHeightInput(mode);
        currentMode = mode;
        updateAutoMouth();
    }

    function showError(text) { resultDiv.innerHTML = '<span class="error">' + text + '</span>'; }

    function calculate() {
        const health = parseLocaleFloat(healthInput.value);
        const heightPercent = getHeightPercent();
        const mouth = parseInt(mouthInput.value, 10);

        if (isNaN(health) || health < 0) return showError(T.errHealth);
        if (isNaN(heightPercent) || heightPercent < 45 || heightPercent > 100) return showError(T.errHeight);
        if (isNaN(mouth) || mouth < 1 || mouth > 5) return showError(T.errMouth);
        if (health === 0) {
            resultDiv.innerHTML = '<span class="success">' + T.noHealing + '</span>';
            return;
        }

        const r = computeHealing(health, heightPercent, mouth);

        if (r.found) {
            const hoursStr = Number.isInteger(r.hours) ? r.hours.toString() : r.hours.toFixed(1);
            const note = T.perItem.replace('{each}', r.each.toFixed(2)).replace('{total}', r.total.toFixed(2));
            resultDiv.innerHTML =
                '<div class="success">' +
                    '<p class="result-line">' + T.wearVerb +
                        ' <strong>' + r.count + ' ' + plural(r.count, T.forms.item) + '</strong> ' +
                        T.wearOn + ' <strong>' + hoursStr + ' ' + plural(r.hours, T.forms.hour) + '</strong>.' +
                    '</p>' +
                    '<dl class="result-rows">' +
                        '<div class="result-row"><dt>' + T.putOnLabel + '</dt><dd>' + getStartDate() + '</dd></div>' +
                        '<div class="result-row result-row--accent"><dt>' + T.takeOff + '</dt><dd>' + getEndDate(r.hours) + '</dd></div>' +
                    '</dl>' +
                    '<p class="note">' + note + '</p>' +
                '</div>';
        } else {
            const text = T.cannotHeal
                .replace('{health}', health.toFixed(1))
                .replace('{mouthWord}', mouth + ' ' + plural(mouth, T.forms.withItem))
                .replace('{max}', r.maxTotal.toFixed(2));
            showError(text);
        }
    }

    heightUnit.addEventListener('click', toggleHeightMode);
    heightInput.addEventListener('input', updateAutoMouth);
    mouthInput.addEventListener('input', function () {
        mouthManuallySet = mouthInput.value !== '';
        if (!mouthManuallySet) updateAutoMouth();
    });
    $('calcBtn').addEventListener('click', calculate);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && ['healthInput', 'heightInput', 'mouthInput'].includes(document.activeElement && document.activeElement.id)) {
            e.preventDefault();
            calculate();
        }
    });

    fillTexts();
    configureHeightInput(currentMode);
    resultDiv.innerHTML = '<span class="placeholder">' + T.placeholder + '</span>';
    updateAutoMouth();
    setTimeout(calculate, 80);
})();
