/* =====================================================================
   ИНТЕРФЕЙС: подставляет тексты из config.js, читает поля, показывает результат.
   ===================================================================== */
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const T = TEXTS;

    const healthInput = $('healthInput'), heightInput = $('heightInput'), mouthInput = $('mouthInput');
    const manualCheck = $('manualCheck'), resultDiv = $('result'), mouthHint = $('mouthHint');
    const heightUnit = $('heightUnit'), modePercent = $('modePercent'), modeMoon = $('modeMoon');
    let currentMode = 'moon'; // 'percent' или 'moon' — по умолчанию луны

    // ---------- Тексты ----------
    function plural(n, forms) {
        if (n % 10 === 1 && n % 100 !== 11) return forms[0];
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1];
        return forms[2];
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
        $('healthHint').textContent = T.health.hint || '';
        $('healthUnit').textContent = T.health.unit;
        $('heightLabel').textContent = T.height.label;
        modePercent.textContent = T.height.unitPercent;
        modeMoon.textContent = T.height.unitMoon;
        modePercent.title = T.height.modePercentTitle;
        modeMoon.title = T.height.modeMoonTitle;
        $('mouthLabel').textContent = T.mouth.label;
        $('mouthUnit').textContent = T.mouth.unit;
        $('manualLabel').textContent = T.mouth.manualLabel;
        $('calcBtn').textContent = T.button;
        $('footer').textContent = T.footer || '';
        $('footer').hidden = !T.footer;
    }

    // ---------- Числа с поддержкой запятой ----------
    function parseLocaleFloat(str) {
        if (typeof str !== 'string') return NaN;
        return parseFloat(str.trim().replace(',', '.'));
    }

    // ---------- Даты ----------
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

    // ---------- Рост с учётом режима ----------
    function getHeightPercent() {
        const raw = parseLocaleFloat(heightInput.value);
        if (isNaN(raw)) return NaN;
        return currentMode === 'percent' ? raw : moonToPercent(Math.round(raw));
    }

    function updateAutoMouth() {
        const h = getHeightPercent();
        if (!isNaN(h) && h >= 45 && h <= 100) {
            const auto = getMouthFromHeight(h);
            mouthHint.textContent = '(' + T.mouth.autoHint + auto + ')';
            if (!manualCheck.checked) mouthInput.value = auto;
        } else {
            mouthHint.textContent = '(' + T.mouth.autoHint + '—)';
        }
    }

    // Настраивает атрибуты поля роста под режим: в лунах разрешена запятая/точка,
    // поэтому это текстовое поле, а не number.
    function configureHeightInput(mode) {
        if (mode === 'percent') {
            heightInput.type = 'number';
            heightInput.min = 45; heightInput.max = 100; heightInput.step = 1;
            heightInput.removeAttribute('inputmode');
            heightInput.placeholder = '';
            heightUnit.textContent = T.height.unitPercent;
        } else {
            heightInput.type = 'text';
            heightInput.setAttribute('inputmode', 'decimal');
            heightInput.removeAttribute('min'); heightInput.removeAttribute('max'); heightInput.removeAttribute('step');
            heightInput.placeholder = '44' + T.height.decimalSeparator + '3';
            heightUnit.textContent = T.height.unitMoon;
        }
        modePercent.classList.toggle('active', mode === 'percent');
        modeMoon.classList.toggle('active', mode === 'moon');
        modePercent.setAttribute('aria-pressed', mode === 'percent');
        modeMoon.setAttribute('aria-pressed', mode === 'moon');
    }

    function setMode(mode) {
        if (mode === currentMode) return;
        const v = parseLocaleFloat(heightInput.value);
        if (mode === 'percent') {
            heightInput.value = isNaN(v) ? 45 : moonToPercent(Math.round(v));
        } else {
            heightInput.value = isNaN(v) ? 0 : percentToMoons(v);
        }
        configureHeightInput(mode);
        currentMode = mode;
        updateAutoMouth();
    }

    // ---------- Расчёт и вывод ----------
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
                        ' <span class="chip">' + r.count + ' ' + plural(r.count, T.forms.item) + '</span> ' +
                        T.wearOn + ' <span class="chip">' + hoursStr + ' ' + plural(r.hours, T.forms.hour) + '</span>.' +
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

    // ---------- События ----------
    modePercent.addEventListener('click', () => setMode('percent'));
    modeMoon.addEventListener('click', () => setMode('moon'));
    heightInput.addEventListener('input', updateAutoMouth);
    manualCheck.addEventListener('change', function () {
        mouthInput.disabled = !this.checked;
        if (this.checked) mouthInput.focus(); else updateAutoMouth();
    });
    $('calcBtn').addEventListener('click', calculate);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && ['healthInput', 'heightInput', 'mouthInput'].includes(document.activeElement && document.activeElement.id)) {
            e.preventDefault();
            calculate();
        }
    });

    // ---------- Запуск ----------
    fillTexts();
    configureHeightInput(currentMode);
    resultDiv.innerHTML = '<span class="placeholder">' + T.placeholder + '</span>';
    updateAutoMouth();
    setTimeout(calculate, 80);
})();
