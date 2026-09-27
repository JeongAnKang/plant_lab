// ==========================================
// mission4.js - 햇빛 금고 미션 로직 및 보상 시스템 연동
// ==========================================

let step2WaterCount = 0;
let step2SugarCount = 0;

// 공통 저장소(plantVitalProgress)를 사용하여 진행 상황 저장
function saveM4Progress(step) {
    if (typeof window.markStepCompleted === 'function') {
        window.markStepCompleted(4, step);
    }
    if (typeof window.getProgress === 'function' && typeof window.saveProgress === 'function') {
        let p = window.getProgress();
        if ((p.m4MaxStep || 1) <= step) {
            p.m4MaxStep = step + 1; 
            window.saveProgress(p);
        }
    }
}

// 공통 저장소를 읽어와 새로고침 시에도 보상(햇빛) 복원
function syncWithRewards() {
    if (typeof window.markStepCompleted === 'function' && typeof window.getProgress === 'function') {
        let p = window.getProgress();
        let max = p.m4MaxStep || 1;
        for (let i = 1; i < max; i++) {
            window.markStepCompleted(4, i);
        }
    }
}

window.goM4Step = function(step) {
    for (let i = 1; i <= 4; i++) {
        const box = document.getElementById(`step${i}-box`);
        if (box) box.style.display = 'none';
    }
    
    const targetBox = document.getElementById(`step${step}-box`);
    if (targetBox) targetBox.style.display = 'block';
    
    if (step === 2) { document.body.classList.add('night-theme'); } 
    else { document.body.classList.remove('night-theme'); }
    
    let p = (typeof window.getProgress === 'function') ? window.getProgress() : {};
    let maxAllowed = p.m4MaxStep || 1;

    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (!dot) continue;
        dot.classList.remove('active', 'completed');
        
        if (i === step) { 
            dot.classList.add('active'); 
        } else if (i < maxAllowed || i < step) { 
            dot.classList.add('completed'); 
        }
        
        const isUnlocked = i <= maxAllowed;
        if (isUnlocked) {
            dot.style.cursor = 'pointer'; 
            dot.onclick = () => window.goM4Step(i);
        } else {
            dot.style.cursor = 'not-allowed'; 
            dot.onclick = () => alert("이전 단계를 먼저 완료해야 접근할 수 있습니다!");
        }
    }
    
    if (step === 4) {
        initStep4Pool();
        window.addEventListener('resize', renderLines);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    syncWithRewards();
    replenishPool();
    replenishPool2();

    const observer = new MutationObserver(() => {
        replenishPool();
        replenishPool2();
        processConversions();
        processStep2Conversions();
        enforceStep4Unique(); // 💡 4단계 중복 배치 차단 로직 추가
        checkStep4Vault(); 
    });

    const leafDz = document.getElementById('dz-leaf'); const poolDz = document.getElementById('pool1');
    if (leafDz) observer.observe(leafDz, { childList: true }); if (poolDz) observer.observe(poolDz, { childList: true }); 
    const cytoDz = document.getElementById('dz-cytoplasm'); const pool2Dz = document.getElementById('pool2'); 
    const x1 = document.getElementById('dz-xylem-1'); const x2 = document.getElementById('dz-xylem-2');
    const p1 = document.getElementById('dz-phloem-1'); const p2 = document.getElementById('dz-phloem-2');
    if (cytoDz) observer.observe(cytoDz, { childList: true }); if (pool2Dz) observer.observe(pool2Dz, { childList: true });
    if (x1) observer.observe(x1, { childList: true }); if (x2) observer.observe(x2, { childList: true });
    if (p1) observer.observe(p1, { childList: true }); if (p2) observer.observe(p2, { childList: true });

    const vault = document.getElementById('step4-vault');
    if(vault) observer.observe(vault, { childList: true, subtree: true });

    setInterval(() => {
        replenishPool();
        replenishPool2();
        processConversions();
        processStep2Conversions();
    }, 400);

    let p = (typeof window.getProgress === 'function') ? window.getProgress() : {};
    let maxStep = p.m4MaxStep || 1;
    let startStep = maxStep > 4 ? 4 : maxStep;
    window.goM4Step(startStep); 
});

function fireSuccessConfetti(duration = 2000) {
    const animationEnd = Date.now() + duration;
    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) { clearInterval(interval); return; }
        if (typeof window.launchMasterConfetti === 'function') { window.launchMasterConfetti(); } 
        else if (typeof window.launchConfetti === 'function') { window.launchConfetti(); }
    }, 300);
}

// ==========================================
// 💡 Step 1 (낮)
// ==========================================
function replenishPool() {
    const pool = document.getElementById('pool1'); if (!pool) return;
    
    const types = [ 
        { type: 'water', html: '💧 6 물' }, 
        { type: 'co2', html: '💨 6 이산화탄소' }, 
        { type: 'light', html: '☀️ 빛' } 
    ];
    
    let isInitialLoad = pool.children.length === 0;

    types.forEach(t => {
        const count = pool.querySelectorAll(`.badge[data-type="${t.type}"]`).length;
        for (let i = count; i < 5; i++) {
            const b = document.createElement('div');
            b.className = 'badge m4-badge m4-badge-small';
            b.dataset.type = t.type; b.innerHTML = t.html;
            b.draggable = true; b.tabIndex = 0; b.setAttribute('role', 'button'); b.style.touchAction = 'none';
            const children = pool.children;
            if (children.length === 0) pool.appendChild(b);
            else {
                const randomIndex = Math.floor(Math.random() * (children.length + 1));
                if (randomIndex === children.length) pool.appendChild(b);
                else pool.insertBefore(b, children[randomIndex]);
            }
        }
    });
    if (isInitialLoad) {
        const badges = Array.from(pool.children);
        badges.sort(() => Math.random() - 0.5);
        badges.forEach(b => pool.appendChild(b));
    }
}

function processConversions() {
    const leafDz = document.getElementById('dz-leaf'); if (!leafDz) return;
    const waters = Array.from(leafDz.querySelectorAll('.badge[data-type="water"]')).filter(b => b.dataset.converting !== "true");
    const co2s = Array.from(leafDz.querySelectorAll('.badge[data-type="co2"]')).filter(b => b.dataset.converting !== "true");
    const lights = Array.from(leafDz.querySelectorAll('.badge[data-type="light"]')).filter(b => b.dataset.converting !== "true");

    const setsToConvert = Math.min(waters.length, co2s.length, lights.length);
    const totalRaw = Array.from(leafDz.querySelectorAll('.badge')).length;

    if (totalRaw >= 20 && setsToConvert === 0) {
        if (totalRaw > 20) {
            const allRaw = Array.from(leafDz.querySelectorAll('.badge')).filter(b => b.dataset.converting !== "true" && (b.dataset.type==="water" || b.dataset.type==="co2" || b.dataset.type==="light"));
            const poolDz = document.getElementById('pool1'); const overflowCount = totalRaw - 20;
            for(let i = 0; i < overflowCount; i++) {
                const badgeToReturn = allRaw[allRaw.length - 1 - i];
                if(badgeToReturn && poolDz) poolDz.appendChild(badgeToReturn);
            }
        }
        if (!leafDz.dataset.capacityBlocked) {
            setTimeout(() => { alert('엽록체가 포화상태입니다. 원료가 비율에 맞게 결합할 수 있도록 조절해 주세요.'); }, 50);
            leafDz.dataset.capacityBlocked = "true";
        }
        return; 
    } else { 
        if (leafDz.dataset.capacityBlocked) delete leafDz.dataset.capacityBlocked; 
    }

    for (let i = 0; i < setsToConvert; i++) {
        waters[i].dataset.converting = "true"; co2s[i].dataset.converting = "true"; lights[i].dataset.converting = "true";
        setTimeout(() => {
            if (waters[i].parentNode) waters[i].remove();
            if (co2s[i].parentNode) co2s[i].remove();
            if (lights[i].parentNode) lights[i].remove();
            
            const glucose = document.createElement('div');
            glucose.className = 'badge m4-badge temp-glucose'; glucose.dataset.type = 'glucose'; glucose.innerHTML = '🍬 포도당';
            glucose.style.animation = 'popIn 0.3s ease-out'; glucose.style.pointerEvents = 'none';
            leafDz.appendChild(glucose);

            const oxygen = document.createElement('div');
            oxygen.className = 'badge m4-badge'; oxygen.dataset.type = 'oxygen'; oxygen.innerHTML = '💨 6 산소';
            oxygen.style.animation = 'popIn 0.3s ease-out'; 
            oxygen.style.backgroundColor = '#e1f5fe'; oxygen.style.borderColor = '#4fc3f7';
            oxygen.style.pointerEvents = 'none';
            leafDz.appendChild(oxygen);

        }, 200); 
    }

    const glucoses = Array.from(leafDz.querySelectorAll('.temp-glucose')).filter(b => b.dataset.converting !== "true");
    if (glucoses.length >= 5) {
        const targetGlucoses = glucoses.slice(0, 5); targetGlucoses.forEach(b => b.dataset.converting = "true");
        setTimeout(() => {
            targetGlucoses.forEach(b => { if (b.parentNode) b.remove(); });
            
            const starchBadge = document.createElement('div');
            starchBadge.className = 'badge m4-badge'; starchBadge.dataset.type = 'starch'; starchBadge.innerHTML = '🥔 녹말';
            starchBadge.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            starchBadge.style.backgroundColor = '#fffde7'; starchBadge.style.borderColor = '#fbc02d';
            starchBadge.style.pointerEvents = 'none'; starchBadge.style.transform = 'scale(1.1)'; 
            leafDz.appendChild(starchBadge);
            
            setTimeout(() => {
                const starchCount = leafDz.querySelectorAll('.badge[data-type="starch"]').length;
                if (starchCount >= 2) {
                    const quizArea = document.getElementById('step1-quiz-area');
                    if (quizArea.style.display !== 'block') { quizArea.style.display = 'block'; quizArea.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                    leafDz.querySelectorAll('.badge').forEach(b => b.style.pointerEvents = 'none');
                    const poolDz = document.getElementById('pool1');
                    if(poolDz) poolDz.querySelectorAll('.badge').forEach(b => b.style.pointerEvents = 'none');
                }
            }, 600);
        }, 250);
    }
}

window.checkStep1QuizInline = function() {
    const ans = document.getElementById('q1-inline-input').value.replace(/\s/g, '');
    if (ans.includes('녹말')) {
        saveM4Progress(1); 
        document.getElementById('q1-inline-input').disabled = true; document.getElementById('btn-check-inline-quiz').style.display = 'none';
        const msgEl = document.getElementById('step1-msg');
        msgEl.innerHTML = '✅ 광합성 성공! 양분(녹말)이 만들어져 엽록체에 저장되었습니다.'; msgEl.style.display = 'block'; msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const nextBtn = document.getElementById('btn-next-2'); if (nextBtn) nextBtn.style.display = 'block'; 
        const nextDot = document.getElementById('dot-2');
        if (nextDot) { nextDot.style.cursor = 'pointer'; nextDot.onclick = () => window.goM4Step(2); }
        fireSuccessConfetti(); 
    } else { alert('❌ 오답입니다. (힌트: 물에 녹지 않고 아이오딘 용액과 반응하여 청람색으로 변하는 물질)'); }
}

// ==========================================
// 💡 Step 2 (밤)
// ==========================================
window.startStep2Interactive = function() {
    document.getElementById('step2-intro').style.display = 'none';
    const interactiveArea = document.getElementById('step2-interactive');
    interactiveArea.style.display = 'block'; interactiveArea.scrollIntoView({ behavior: 'smooth' });
}

function replenishPool2() {
    const pool2 = document.getElementById('pool2'); if (!pool2 || pool2.style.pointerEvents === 'none') return;
    const starchCount = pool2.querySelectorAll('.badge[data-type="starch"]').length;
    for (let i = starchCount; i < 2; i++) {
        const starch = document.createElement('div'); starch.className = 'badge m4-badge'; starch.dataset.type = 'starch'; starch.innerHTML = '🥔 녹말';
        starch.draggable = true; starch.tabIndex = 0; starch.setAttribute('role', 'button'); starch.style.touchAction = 'none'; pool2.appendChild(starch);
    }
    const waterCount = pool2.querySelectorAll('.badge[data-type="water"]').length;
    for (let i = waterCount; i < 2; i++) {
        const water = document.createElement('div'); water.className = 'badge m4-badge'; water.dataset.type = 'water'; water.innerHTML = '💧 물';
        water.draggable = true; water.tabIndex = 0; water.setAttribute('role', 'button'); water.style.touchAction = 'none'; pool2.appendChild(water);
    }
}

function processStep2Conversions() {
    const cytoplasm = document.getElementById('dz-cytoplasm');
    if (cytoplasm) {
        const starchesInCyto = Array.from(cytoplasm.querySelectorAll('.badge[data-type="starch"]')).filter(b => b.dataset.cytoProcessing !== "true");
        starchesInCyto.forEach(starch => {
            starch.dataset.cytoProcessing = "true"; starch.style.pointerEvents = 'none'; starch.style.transition = 'opacity 0.5s'; starch.style.opacity = '0.3'; 
            setTimeout(() => {
                if(starch.parentElement !== cytoplasm) return; 
                if(starch.parentNode) starch.remove();
                for(let i=0; i<3; i++){
                    const sugar = document.createElement('div'); sugar.className = 'badge m4-badge temp-sugar'; sugar.dataset.type = 'sugar'; sugar.innerHTML = '🧊 설탕';
                    sugar.draggable = true; sugar.tabIndex = 0; sugar.setAttribute('role', 'button'); sugar.style.animation = 'popIn 0.3s ease-out'; sugar.style.touchAction = 'none';
                    cytoplasm.appendChild(sugar);
                }
            }, 500); 
        });
    }

    const processVesselDrop = (dzId, validBadgeType, onValidDrop) => {
        const dz = document.getElementById(dzId); if (!dz) return;
        const badges = Array.from(dz.querySelectorAll('.badge')).filter(b => b.dataset.vesselProcessing !== "true");
        badges.forEach(badge => {
            if (badge.dataset.type === validBadgeType) {
                badge.dataset.vesselProcessing = "true"; badge.style.pointerEvents = 'none'; 
                setTimeout(() => {
                    if(badge.parentNode) badge.remove(); 
                    onValidDrop(); checkStep2Progress();
                }, 1000); 
            } 
        });
    };
    processVesselDrop('dz-xylem-1', 'water', () => { step2WaterCount++; }); processVesselDrop('dz-xylem-2', 'water', () => { step2WaterCount++; });
    processVesselDrop('dz-phloem-1', 'sugar', () => { step2SugarCount++; }); processVesselDrop('dz-phloem-2', 'sugar', () => { step2SugarCount++; });
}

function checkStep2Progress() {
    if (step2WaterCount >= 1 && step2SugarCount >= 6) {
        step2WaterCount = -999; 
        const successMsg = document.getElementById('step2-success-msg');
        successMsg.style.display = 'block'; successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            const quizArea = document.getElementById('step2-quiz-area');
            quizArea.style.display = 'block'; quizArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const pool2Dz = document.getElementById('pool2'); if(pool2Dz) pool2Dz.style.pointerEvents = 'none';
        }, 2000);
    }
}

window.checkStep2Quiz = function() {
    const ans1 = document.getElementById('q2-input-1').value.replace(/\s/g, ''); 
    const ans2 = document.getElementById('q2-input-2').value.replace(/\s/g, '');
    const ans3 = document.getElementById('q2-input-3').value.replace(/\s/g, '');

    if (ans1.includes('설탕') && ans2.includes('체관') && ans3.includes('기공')) {
        saveM4Progress(2); 
        document.getElementById('q2-input-1').disabled = true; 
        document.getElementById('q2-input-2').disabled = true; 
        document.getElementById('q2-input-3').disabled = true; 
        document.getElementById('btn-check-step2-quiz').style.display = 'none';
        const nextBtn = document.getElementById('btn-next-3'); if (nextBtn) nextBtn.style.display = 'block';
        const nextDot = document.getElementById('dot-3'); if (nextDot) { nextDot.style.cursor = 'pointer'; nextDot.onclick = () => window.goM4Step(3); }
        fireSuccessConfetti(); 
    } else { 
        alert('❌ 오답입니다.\n\n[힌트]\n- Q1: 달콤하고 물에 잘 녹는 성질을 가진 양분\n- Q2: 잎에서 만들어진 양분이 이동하는 통로\n- Q3: 잎의 표면에 있는 작은 구멍 (기O)'); 
    }
}

// ==========================================
// 💡 Step 3 (이동 복습 & 애니메이션)
// ==========================================
window.checkS3Review = function() {
    const a1 = document.getElementById('s3-q1').value.replace(/\s/g, ''); const a2 = document.getElementById('s3-q2').value.replace(/\s/g, '');
    if(a1.includes('설탕') && a2.includes('체관')) {
        document.getElementById('s3-q1').disabled = true; document.getElementById('s3-q2').disabled = true; document.getElementById('btn-s3-review').style.display = 'none';
        const startBtn = document.getElementById('btn-s3-start-main'); startBtn.style.display = 'inline-block';
        fireSuccessConfetti(); startBtn.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else { alert('❌ 오답입니다. (힌트: 낮에 만든 녹말이 밤에 변하는 형태와 그 통로)'); }
}

window.startS3Main = function() {
    document.getElementById('btn-s3-start-main').style.display = 'none';
    const mainArea = document.getElementById('s3-main-area'); mainArea.style.display = 'flex';
    showS3Question(1); mainArea.scrollIntoView({behavior: 'smooth'});
}

function showS3Question(qNum) {
    for(let i=1; i<=5; i++) { const block = document.getElementById(`s3-qb-${i}`); if(block) block.style.display = 'none'; }
    document.getElementById('s3-harvest-result').style.display = 'none'; document.getElementById('s3-final-quiz-area').style.display = 'none';
    if (qNum === 'harvest') { document.getElementById('s3-harvest-result').style.display = 'block'; } 
    else if (qNum === 'final') { document.getElementById('s3-final-quiz-area').style.display = 'block'; } 
    else { const target = document.getElementById(`s3-qb-${qNum}`); if(target) target.style.display = 'block'; }
}

window.checkS3Answer = function(qNum, keyword) {
    const ans = document.getElementById(`s3-ans-${qNum}`).value.replace(/\s/g, '');
    if(ans.includes(keyword)) {
        document.getElementById(`s3-ans-${qNum}`).disabled = true; document.getElementById(`s3-btn-check-${qNum}`).style.display = 'none'; document.getElementById(`s3-next-${qNum}`).style.display = 'block';
        fireSuccessConfetti();
    } else { alert(`❌ 오답입니다. (힌트: '${keyword}' 와/과 관련된 단어)`); }
}

window.growPlant = function(qNum) {
    const plant = document.getElementById('plant-stage');
    if (qNum === 1) { plant.innerHTML = '🌿'; plant.style.fontSize = '6.5rem'; showS3Question(2); } 
    else if (qNum === 2) { plant.innerHTML = '🪴'; plant.style.fontSize = '7.5rem'; showS3Question(3); } 
    else if (qNum === 3) { plant.innerHTML = '🌳'; plant.style.fontSize = '8.5rem'; showS3Question(4); } 
    else if (qNum === 4) {
        plant.innerHTML = '<span style="position:relative; display:inline-block;">🌳' +
                          '<span style="position:absolute; top:15%; left:10%; font-size:0.35em;">🍎</span>' +
                          '<span style="position:absolute; top:35%; left:25%; font-size:0.35em;">🍎</span>' +
                          '<span style="position:absolute; top:20%; right:15%; font-size:0.35em;">🍎</span>' +
                          '<span style="position:absolute; top:45%; right:25%; font-size:0.35em;">🍎</span>' +
                          '<span style="position:absolute; top:5%; left:45%; font-size:0.35em;">🍎</span>' +
                          '</span>';
        plant.style.fontSize = '10rem'; plant.style.textShadow = '0 0 20px #ffeb3b'; 
        showS3Question(5);
    } else if (qNum === 5) { document.getElementById('harvest-modal').style.display = 'block'; }
}

window.harvestPlant = function(isYes) {
    document.getElementById('harvest-modal').style.display = 'none';
    if(isYes) {
        const plant = document.getElementById('plant-stage');
        plant.innerHTML = '<span style="position:relative; display:inline-block;">🧺' +
                          '<span style="position:absolute; top:5%; left:15%; font-size:0.4em; z-index:-1;">🍎🍎</span>' +
                          '<span style="position:absolute; top:-10%; left:25%; font-size:0.4em; z-index:-1;">🍎🍎🍎</span>' +
                          '</span>';
        plant.style.fontSize = '8rem'; plant.style.textShadow = 'none';
        showS3Question('harvest'); fireSuccessConfetti();
    } else {
        alert('조금 더 감상하고 싶으시군요! 준비가 완료되면 다시 수확 버튼을 눌러주세요.');
        const btn5 = document.getElementById(`s3-next-5`); if(btn5) btn5.style.display = 'block';
    }
}

window.showS3FinalQuiz = function() { showS3Question('final'); }

window.checkS3FinalQuiz = function() {
    const f1 = document.getElementById('s3-fq-1').value.replace(/\s/g, '');
    const f2 = document.getElementById('s3-fq-2').value.replace(/\s/g, '');
    const f3 = document.getElementById('s3-fq-3').value.replace(/\s/g, '');
    const f4 = document.getElementById('s3-fq-4').value.replace(/\s/g, '');
    const f123 = [f1, f2, f3];
    
    const hasHoheub = f123.some(ans => ans.includes('호흡'));
    const hasSaengjang = f123.some(ans => ans.includes('생장') || ans.includes('성장'));
    const hasBeonsik = f123.some(ans => ans.includes('번식'));
    const hasJeojang = f4.includes('저장');

    if (hasHoheub && hasSaengjang && hasBeonsik && hasJeojang) {
        saveM4Progress(3); 
        document.getElementById('btn-check-s3-final').style.display = 'none';
        ['s3-fq-1', 's3-fq-2', 's3-fq-3', 's3-fq-4'].forEach(id => document.getElementById(id).disabled = true);
        const msgEl = document.getElementById('step3-msg');
        msgEl.innerHTML = '✅ 식물의 양분 이용 과정을 완벽하게 이해했습니다!'; msgEl.style.display = 'block';
        const nextBtn = document.getElementById('btn-next-4');
        if (nextBtn) { nextBtn.style.display = 'block'; nextBtn.scrollIntoView({behavior: 'smooth', block: 'center'}); }
        const nextDot = document.getElementById('dot-4');
        if (nextDot) { nextDot.style.cursor = 'pointer'; nextDot.onclick = () => window.goM4Step(4); }
        fireSuccessConfetti();
    } else {
        alert('❌ 빈칸에 알맞은 말을 정확히 입력해주세요.\n(힌트: Q1~Q4에서 학습한 단어들입니다. 앞의 세 칸은 순서가 바뀌어도 괜찮습니다.)');
    }
}

// ==========================================
// 💡 Step 4 (햇빛 금고 정리 & 선긋기 & 엔딩)
// ==========================================

function initStep4Pool() {
    const pool = document.getElementById('s4-pool');
    if (!pool || pool.children.length > 0) return; 

    const items = [
        {name: '콩', emoji: '🫘'}, {name: '콩', emoji: '🫘'},
        {name: '참깨', emoji: '🫘'}, {name: '참깨', emoji: '🫘'}, 
        {name: '땅콩', emoji: '🥜'}, {name: '땅콩', emoji: '🥜'},
        {name: '수박', emoji: '🍉'}, {name: '수박', emoji: '🍉'},
        {name: '사탕수수', emoji: '🎋'}, {name: '사탕수수', emoji: '🎋'},
        {name: '감자', emoji: '🥔'}, {name: '감자', emoji: '🥔'},
        {name: '고구마', emoji: '🍠'}, {name: '고구마', emoji: '🍠'}
    ];

    items.sort(() => Math.random() - 0.5);

    items.forEach(item => {
        const b = document.createElement('div');
        b.className = 'badge m4-badge';
        b.dataset.type = 'nutrient'; 
        b.dataset.name = item.name;  
        b.innerHTML = `${item.emoji} ${item.name}`;
        b.draggable = true; b.tabIndex = 0; b.setAttribute('role', 'button'); b.style.touchAction = 'none';
        pool.appendChild(b);
    });
}

// 💡 4단계 햇빛 금고 같은 종 중복 배치 방지 로직
function enforceStep4Unique() {
    const slots = Array.from(document.querySelectorAll('#step4-vault .s4-slot'));
    const groups = {};
    
    // HTML의 data-accept (예: '수박,사탕수수') 단위로 2칸짜리 짝을 묶음
    slots.forEach(slot => {
        const acc = slot.getAttribute('data-accept');
        if (!acc) return;
        if (!groups[acc]) groups[acc] = [];
        groups[acc].push(slot);
    });

    for (let acc in groups) {
        const groupSlots = groups[acc];
        if (groupSlots.length > 1) { // 2칸짜리 분류에서만 검사
            const foundNames = new Set();
            groupSlots.forEach(slot => {
                const badge = slot.querySelector('.badge');
                if (badge) {
                    const name = badge.getAttribute('data-name');
                    if (foundNames.has(name)) {
                        // 중복 시 경고를 띄우고 뱃지를 창고로 되돌림
                        alert(`❌ '${name}' 뱃지는 같은 분류에 중복해서 넣을 수 없습니다!\n다양한 식물로 빈칸을 채워보세요.`);
                        const pool = document.getElementById('s4-pool');
                        if (pool) pool.appendChild(badge);
                    } else {
                        foundNames.add(name);
                    }
                }
            });
        }
    }
}

function checkStep4Vault() {
    const slots = document.querySelectorAll('#step4-vault .s4-slot');
    if(slots.length === 0) return;
    
    const isFull = Array.from(slots).every(slot => slot.querySelector('.badge'));
    const doneMsg = document.getElementById('s4-vault-done');
    
    if (isFull && doneMsg.style.display !== 'block') {
        doneMsg.style.display = 'block';
        doneMsg.scrollIntoView({behavior: 'smooth', block: 'center'});
        fireSuccessConfetti(2000); 
    } else if (!isFull) {
        doneMsg.style.display = 'none';
    }
}

let s4SelectedNode = null;
let s4Connections = {}; 

window.startS4LineQuiz = function() {
    document.getElementById('s4-vault-done').style.display = 'none';
    const quizArea = document.getElementById('s4-quiz-area');
    quizArea.style.display = 'block';
    quizArea.scrollIntoView({behavior: 'smooth'});
    setTimeout(renderLines, 100);
}

window.selectLineItem = function(id) {
    document.querySelectorAll('.plant-img').forEach(el => el.classList.remove('selected'));
    const el = document.getElementById(id);
    if(el) {
        el.classList.add('selected');
        s4SelectedNode = id;
    }
}

window.selectLineTarget = function(centerId) {
    if (s4SelectedNode) {
        s4Connections[s4SelectedNode] = centerId;
        
        document.getElementById(s4SelectedNode).classList.remove('selected');
        document.getElementById(s4SelectedNode).classList.add('connected');
        
        s4SelectedNode = null;
        renderLines();
    } else {
        alert("연결할 식물 사진을 양쪽에서 먼저 선택해주세요!");
    }
}

window.renderLines = function() {
    const svg = document.getElementById('line-svg');
    const container = document.getElementById('line-container');
    if(!svg || !container) return;
    
    svg.innerHTML = ''; 
    const containerRect = container.getBoundingClientRect();

    for (const [plantId, centerId] of Object.entries(s4Connections)) {
        const plantEl = document.getElementById(plantId);
        const centerEl = document.getElementById(centerId);
        if(!plantEl || !centerEl) continue;

        const pRect = plantEl.getBoundingClientRect();
        const cRect = centerEl.getBoundingClientRect();

        let x1, y1, x2, y2;
        
        if (plantEl.closest('#line-col-left')) {
            x1 = pRect.right - containerRect.left;
            y1 = pRect.top + pRect.height/2 - containerRect.top;
            x2 = cRect.left - containerRect.left;
            y2 = cRect.top + cRect.height/2 - containerRect.top;
        } else {
            x1 = pRect.left - containerRect.left;
            y1 = pRect.top + pRect.height/2 - containerRect.top;
            x2 = cRect.right - containerRect.left;
            y2 = cRect.top + cRect.height/2 - containerRect.top;
        }

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#fbc02d');
        line.setAttribute('stroke-width', '5');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
    }
}

window.addEventListener('scroll', () => {
    if (document.getElementById('s4-quiz-area') && document.getElementById('s4-quiz-area').style.display === 'block') {
        renderLines();
    }
});

window.checkS4LineQuiz = function() {
    const answers = {
        'l-radish': 'c-root',       
        'l-cabbage': 'c-leaf',      
        'l-tangerine': 'c-fruit',   
        'l-sweetpotato': 'c-root',  
        'l-potato': 'c-stem',       
        'r-sugarcane': 'c-stem',    
        'r-bean': 'c-seed',         
        'r-peanut': 'c-seed',       
        'r-watermelon': 'c-fruit',  
        'r-onion': 'c-leaf'         
    };
    
    let allCorrect = true;
    let answeredCount = Object.keys(s4Connections).length;
    
    if (answeredCount < 10) {
        alert('아직 짝을 맺지 않은 식물이 있습니다. 모두 연결해 주세요!');
        return;
    }

    for (const [plant, organ] of Object.entries(answers)) {
        if (s4Connections[plant] !== organ) {
            allCorrect = false;
            break;
        }
    }

    if (allCorrect) {
        saveM4Progress(4); 
        if (typeof window.completeMission === 'function') window.completeMission(4); 
        
        document.getElementById('btn-check-s4-line').style.display = 'none';
        
        document.querySelectorAll('.plant-img, .center-target').forEach(el => el.style.pointerEvents = 'none');
        
        const endingArea = document.getElementById('s4-ending-area');
        endingArea.style.display = 'block';
        endingArea.scrollIntoView({behavior: 'smooth', block: 'center'});
        
        // 💡 만석꾼 엔딩 폭죽을 5초(5000ms)로 조절
        fireSuccessConfetti(5000);
        
    } else {
        alert('❌ 잘못 연결된 짝이 있습니다. 다시 확인해 보세요!\n(식물 사진을 다시 누르고 중앙을 누르면 선을 다시 그을 수 있습니다.)');
    }
}