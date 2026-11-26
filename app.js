if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) {
            regs.item(i).unregister();
        }
    });
}

function getTodayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function parseCleanNumber(val) {
    if (!val) return 0;
    var s = String(val);
    var out = '';
    for (var i = 0; i < s.length; i++) {
        var code = s.charCodeAt(i);
        if (code >= 1632 && code <= 1641) {
            out += String(code - 1632);
        } else if (code >= 1776 && code <= 1785) {
            out += String(code - 1776);
        } else if (s.charAt(i) === '\u066B' || s.charAt(i) === '\u060C') {
            out += '.';
        } else {
            out += s.charAt(i);
        }
    }
    return parseFloat(out.replace(/[^0-9.-]/g, '')) || 0;
}

var saved = localStorage.getItem('sadaqatTrackerDataV4');
var data = saved ? JSON.parse(saved) : {
    carriedOver: 0,
    baseBudget: 0,
    startDate: getTodayStr(),
    expenses: [],
    archive: []
};

document.getElementById('newStartDate').value = getTodayStr();
function formatKWD(n) {
    var r = Math.round(n * 1000) / 1000;
    return r.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    }) + ' د.ك';
}

function saveData() {
    localStorage.setItem('sadaqatTrackerDataV4', JSON.stringify(data));
    render();
}

function calculateDuration(s, e) {
    var st = new Date(s);
    var en = new Date(e);
    if (isNaN(st) || isNaN(en) || en < st) return '0 يوم';
    var m = (en.getFullYear() - st.getFullYear()) * 12 + (en.getMonth() - st.getMonth());
    var t = new Date(st);
    t.setMonth(st.getMonth() + m);
    if (t > en) {
        m--;
        t = new Date(st);
        t.setMonth(st.getMonth() + m);
    }
    var d = Math.floor((en - t) / 86400000);
    var p = [];
    if (m > 0) p.push(m + ' شهر');
    if (d > 0 || m === 0) p.push(d + ' يوم');
    return p.join(' و ');
}

function doSwitchTab(tabId) {
    var tabs = ['donate', 'cycle', 'stats'];
    for (var i = 0; i < tabs.length; i++) {
        var name = tabs.slice(i, i + 1).pop();
        document.getElementById('tab-' + name).classList.remove('active');
        document.getElementById('nav-' + name).classList.remove('active');
    }
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('nav-' + tabId).classList.add('active');
    window.scrollTo(0, 0);
}

function doAddExpense() {
    var amt = parseCleanNumber(document.getElementById('expenseAmount').value);
    var entity = document.getElementById('expenseEntity').value.trim() || 'جهة عامة';
    var project = document.getElementById('expenseProject').value.trim() || 'صدقة عامة';
    if (!amt || amt <= 0) {
        alert('الرجاء إدخال مبلغ صحيح');
        return;
    }
    data.expenses.unshift({
        id: Date.now(),
        amount: amt,
        entity: entity,
        project: project,
        date: getTodayStr()
    });
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseEntity').value = '';
    document.getElementById('expenseProject').value = '';
    saveData();
}

function doDeleteExpense(id) {
    data.expenses = data.expenses.filter(function(e) {
        return e.id !== id;
    });
    saveData();
}
function doStartCycle() {
    var newAmt = parseCleanNumber(document.getElementById('newBudgetAmount').value);
    var newDate = document.getElementById('newStartDate').value;
    if (!newDate) {
        alert('اختر تاريخ البداية');
        return;
    }
    var tot = data.baseBudget + data.carriedOver;
    var spent = data.expenses.reduce(function(s, e) { return s + e.amount; }, 0);
    var rem = tot - spent;
    var last = data.expenses.length > 0 ? data.expenses.slice(0, 1).pop().date : getTodayStr();
    if (tot > 0 || spent > 0) {
        data.archive.unshift({
            id: Date.now(),
            startDate: data.startDate,
            endDate: last,
            totalAvailable: tot,
            spent: spent,
            remaining: rem,
            duration: calculateDuration(data.startDate, last),
            count: data.expenses.length,
            expenses: data.expenses.slice()
        });
    }
    data.carriedOver = rem;
    data.baseBudget = newAmt;
    data.startDate = newDate;
    data.expenses = [];
    document.getElementById('newBudgetAmount').value = '';
    saveData();
    alert('تم اعتماد الدورة الجديدة وترحيل (' + formatKWD(rem) + ')');
    doSwitchTab('donate');
}

function doResetAll() {
    if (confirm('هل أنت متأكد من مسح كافة البيانات؟')) {
        data = { carriedOver: 0, baseBudget: 0, startDate: getTodayStr(), expenses: [], archive: [] };
        saveData();
    }
}

function doExportPDF() {
    var element = document.getElementById('tab-stats');
    var opt = {
        margin: 10,
        filename: 'تقرير-صدقات-' + getTodayStr() + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#232A34' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        document.getElementById('printDate').textContent = 'تاريخ استخراج التقرير: ' + getTodayStr();
        window.print();
    }
}

function render() {
    var tot = data.baseBudget + data.carriedOver;
    var spent = data.expenses.reduce(function(s, e) { return s + e.amount; }, 0);
    var rem = tot - spent;
    var remEl = document.getElementById('remainingDisplay');
    remEl.textContent = formatKWD(rem);
    remEl.style.color = rem >= 0 ? '#232A34' : '#D9534F';
    document.getElementById('totalBudgetDisplay').textContent = formatKWD(tot);
    document.getElementById('cycleCarryPreview').textContent = formatKWD(rem);
    document.getElementById('headerStartDate').textContent = 'منذ ' + data.startDate;
    var pct = tot > 0 ? Math.max(0, Math.min(100, (rem / tot) * 100)) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    var last = data.expenses.length > 0 ? data.expenses.slice(0, 1).pop().date : getTodayStr();
    document.getElementById('durationDisplay').textContent = calculateDuration(data.startDate, last);

    var listEl = document.getElementById('expensesList');
    if (data.expenses.length === 0) {
        listEl.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px 0;font-size:0.9rem">لا توجد صدقات مسجلة في هذه الدورة</div>';
    } else {
        listEl.innerHTML = data.expenses.map(function(e) {
            return '<div class="list-item"><div><div style="font-weight:700;margin-bottom:4px">' +
                '' + (e.entity || 'جهة عامة') + '</span>' +
                '<span>' + (e.project || 'صدقة عامة') + '</span></div>' +
                '<div style="font-size:0.78rem;color:var(--text-muted)">' + e.date + '</div></div>' +
                '<div style="display:flex;align-items:center;gap:8px">' +
                '<span style="font-weight:800;color:#15B87E">' + formatKWD(e.amount) + '</span>' +
                '<button type="button" class="del-btn" onclick="doDeleteExpense(' + e.id + ')">حذف</button>' +
                '</div></div>';
        }).join('');
    }

    var pSpent = data.archive.reduce(function(s, a) { return s + a.spent; }, 0);
    var pCount = data.archive.reduce(function(s, a) { return s + (a.count || 0); }, 0);
    var gTot = pSpent + spent;
    var tOps = pCount + data.expenses.length;
    document.getElementById('grandTotalDisplay').textContent = formatKWD(gTot);
    document.getElementById('totalCountDisplay').textContent = tOps.toLocaleString('en-US') + ' عملية';
    document.getElementById('avgDonationDisplay').textContent = formatKWD(tOps > 0 ? gTot / tOps : 0);
    document.getElementById('cyclesCountDisplay').textContent = (data.archive.length + 1).toLocaleString('en-US') + ' دورة';

    var eMap = new Map();
    var all = data.expenses.slice();
    data.archive.forEach(function(a) {
        if (a.expenses) a.expenses.forEach(function(x) { all.push(x); });
    });
    all.forEach(function(e) {
        var k = e.entity || 'جهة عامة';
        eMap.set(k, (eMap.get(k) || 0) + e.amount);
    });
    var keys = Array.from(eMap.keys()).sort(function(a, b) { return eMap.get(b) - eMap.get(a); });
    var entEl = document.getElementById('entityStatsList');
    if (keys.length === 0) {
        entEl.innerHTML = '<div style="color:var(--text-muted);text-align:center;font-size:0.88rem">لا توجد بيانات بعد</div>';
    } else {
        entEl.innerHTML = keys.map(function(k) {
            var v = eMap.get(k);
            var sh = gTot > 0 ? Math.round((v / gTot) * 100) : 0;
            return '' +
                '<span>' + k + ' (' + sh.toLocaleString('en-US') + '%)</span>' +
                '<span>' + formatKWD(v) + '</span></div>' +
                '<div class="progress-wrap" style="margin-bottom:0;height:6px">' +
                '<div class="progress-fill" style="width:' + sh + '%"></div></div></div>';
        }).join('');
    }

    var arcEl = document.getElementById('archiveList');
    if (data.archive.length === 0) {
        arcEl.innerHTML = '<div style="color:var(--text-muted);text-align:center;font-size:0.88rem">لا توجد دورات سابقة</div>';
    } else {
        arcEl.innerHTML = data.archive.map(function(a) {
            return '<div class="archive-item"><div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:6px;color:#232A34">' +
                '<span>من ' + a.startDate + ' إلى ' + a.endDate + '</span>' +
                '<span style="color:#15B87E">' + formatKWD(a.spent) + '</span></div>' +
                '<div style="font-size:0.82rem;color:var(--text-muted);display:flex;justify-content:space-between">' +
                '<span>المدة: ' + a.duration + ' (' + Number(a.count).toLocaleString('en-US') + ' عمليات)</span>' +
                '<span>المُرحّل: ' + formatKWD(a.remaining) + '</span></div></div>';
        }).join('');
    }
}

render();
