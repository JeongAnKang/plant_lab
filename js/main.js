// ==========================================
// 🌟 선생님 컨트롤 패널 (수업 진도 관리) 🌟
// ==========================================
// 💡 GitHub에서 이 숫자만 바꾸고 배포(Push)하세요!
// 지정한 숫자 이하의 미션은 학생들이 이전 단계를 못 깼어도 강제로 열립니다.
// 예: 3으로 설정하면 1, 2, 3 미션이 모두 잠금 해제됨. (보상은 클리어해야만 줌)
const TEACHER_ACCESS = Object.freeze({
  unlockedMission: 2,
  unlockedSteps: Object.freeze({ 1: 5, 2: 1, 3: 1, 4: 1, 5: 1 })
});
const MISSION_STEP_TOTALS = Object.freeze({ 1: 5, 2: 5, 3: 5, 4: 4, 5: 1 });


// ==========================================
// 공통 앱 진행도 관리 (LocalStorage)
// ==========================================
function getProgress() {
  let p = JSON.parse(localStorage.getItem('plantVitalProgress'));
  
  if (!p) {
    p = {
      isStarted: false, 
      completedMissions: [], // 🔥 핵심: 학생이 실제로 '완료'한 미션 번호 배열
      maxMission: 0,         // (기존 코드 호환성 유지용)
      m1MaxStep: 1, 
      m2MaxStep: 1, 
      m3MaxStep: 1, 
      m4MaxStep: 1, 
      m5MaxStep: 1,
      rewards: [],
      completedSteps: { 1: [], 2: [], 3: [], 4: [], 5: [] }
    };
  }

  // 기존 사용자 데이터 호환성 패치 (maxMission 기반으로 completedMissions 자동 복구)
  if (p.completedMissions === undefined) {
      p.completedMissions = [];
      for(let i=1; i < p.maxMission; i++) {
          p.completedMissions.push(i);
      }
  }
  
  if (!Array.isArray(p.completedMissions)) p.completedMissions = [];
  if (!Array.isArray(p.rewards)) p.rewards = [];
  if (!p.completedSteps || typeof p.completedSteps !== 'object') p.completedSteps = {};
  for (let m = 1; m <= 5; m++) {
    if (!Array.isArray(p.completedSteps[m])) p.completedSteps[m] = [];
  }
  for (let m = 1; m <= 5; m++) {
    const key = `m${m}MaxStep`;
    p[key] = Math.max(1, Number.parseInt(p[key], 10) || 1);
  }
  return p;
}

function saveProgress(p) {
  localStorage.setItem('plantVitalProgress', JSON.stringify(p));
  renderNav();
  if (window.RewardSystem) window.RewardSystem.renderRewards();
}

function startResearch() {
  let p = getProgress();
  p.isStarted = true;
  saveProgress(p);
  launchConfetti();
}

function resetAllProgress() {
  if(confirm("정말로 모든 진행 상황을 초기화하시겠습니까? (처음 화면으로 돌아가며 획득한 보상도 초기화됩니다.)")) {
    // 1. 기존 메인 미션 진행도 초기화
    localStorage.removeItem('plantVitalProgress');
    
    // 2. 💡 히든 프로젝트 방문 기록 및 총 보상 획득 수 초기화 추가
    localStorage.removeItem('hidden_project_visited'); 
    localStorage.removeItem('reward_count'); 

    alert("모든 데이터가 초기화되었습니다.");
    location.href = 'index.html';
  }
}

function getAccessibleMaxStep(mNum) {
  const p = getProgress();
  const total = MISSION_STEP_TOTALS[mNum] || 1;
  const studentStep = p.completedMissions.includes(mNum) ? total : (p[`m${mNum}MaxStep`] || 1);
  const teacherStep = mNum <= TEACHER_ACCESS.unlockedMission
    ? (TEACHER_ACCESS.unlockedSteps[mNum] || 1)
    : 0;
  return Math.min(total, Math.max(1, studentStep, teacherStep));
}

function canAccessStep(mNum, step) {
  return step >= 1 && step <= getAccessibleMaxStep(mNum);
}

// 🌟 미션을 최종 완료했을 때 호출하는 함수 (각 미션의 마지막 스텝에서 실행)
// 예: 미션 1을 다 깼으면 completeMission(1) 실행
function markStepCompleted(mNum, stepNum) {
  return window.RewardSystem ? window.RewardSystem.completeStep(mNum, stepNum) : false;
}

function completeMission(mNum) {
    const total = MISSION_STEP_TOTALS[mNum] || 1;
    // 마지막 스텝의 보상 기록도 공통 보상 엔진에 위임한다.
    if (window.RewardSystem) window.RewardSystem.completeStep(mNum, total);

    let p = getProgress();
    p[`m${mNum}MaxStep`] = total;
    if (!p.completedMissions.includes(mNum)) p.completedMissions.push(mNum);
    saveProgress(p);
}

window.getProgress = getProgress;
window.saveProgress = saveProgress;
window.completeMission = completeMission;
window.markStepCompleted = markStepCompleted;
window.getAccessibleMaxStep = getAccessibleMaxStep;
window.canAccessStep = canAccessStep;
window.TEACHER_ACCESS = TEACHER_ACCESS;

function renderNav() {
  const p = getProgress();
  const overlay = document.getElementById('start-overlay');
  if(overlay) overlay.style.display = p.isStarted ? 'none' : 'flex';

  const navLinks = document.querySelectorAll('#stage-nav .nav-btn');
  if(!navLinks.length) return;

  const files = ['mission1.html', 'mission2.html', 'mission3.html', 'mission4.html', 'mission5.html'];
  const mNames = ["M1 식물의 밥", "M2 최적 조건", "M3 식물의 숨", "M4 햇빛 금고", "M5 히든 프로젝트"];
  
  navLinks.forEach((link, idx) => {
    const mNum = idx + 1;
    link.classList.remove('disabled');
    link.onclick = null;
    
    // 💡 잠금 해제 조건 판단 (Unlocked)
    // 1. 선생님이 강제로 열어둔 단계이거나
    // 2. 1단계이거나 (기본 오픈)
    // 3. 학생이 바로 이전 단계를 '완료' 했거나
    const isUnlocked = p.isStarted && (
        mNum <= TEACHER_ACCESS.unlockedMission || 
        mNum === 1 || 
        p.completedMissions.includes(mNum - 1) 
    );

    // 💡 완료 조건 판단 (Completed)
    const isCompleted = p.completedMissions.includes(mNum);

    if (isUnlocked) {
      // 완료한 미션은 이름 앞에 체크 표시 추가
      link.innerText = isCompleted ? `✅ ${mNames[idx]}` : mNames[idx];
      link.href = files[idx];
    } else {
      link.classList.add('disabled');
      link.innerText = `🔒 ${mNames[idx]}`;
      link.removeAttribute('href');
      link.onclick = (e) => { 
        e.preventDefault(); 
        alert(p.isStarted ? "이전 미션을 완료해야 잠금이 해제됩니다!" : "🚀 연구 시작 버튼을 먼저 눌러주세요!"); 
      };
    }
    
    if(location.pathname.includes(files[idx])) link.classList.add('active');
    else link.classList.remove('active');
  });
}

// 보상 계산/지급/렌더링은 js/rewards.js의 RewardSystem이 담당합니다.

function showUnlockPopup(title, msg, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.style.zIndex = '10000';
  overlay.innerHTML = `
    <div class="modal-card" style="max-width: 400px; text-align: center; border: 4px solid #fbc02d; background: #fffde7;">
      <h2 style="color: #f57f17; margin-top:0; font-size: 1.8rem;">🔓 잠금 해제!</h2>
      <h3 style="color: #2e7d32; margin-top: 10px; font-size: 1.2rem;">${title}</h3>
      <p style="font-size:0.95rem; color:#546e7a; margin-bottom: 20px;">${msg}</p>
      <button class="btn-action" style="width:100%; font-size:1.05rem;" id="btn-unlock-confirm">확인 및 이동 ➔</button>
    </div>
  `;
  document.body.appendChild(overlay);
  launchConfetti();
  document.getElementById('btn-unlock-confirm').onclick = () => {
    overlay.remove();
    if(callback) callback();
  };
}

function handleStepUnlock(mNum, targetStep, title, msg, proceedCallback) {
  // 다음 스텝을 여는 순간 = 바로 이전 스텝을 학생이 실제 완료한 순간
  if (window.RewardSystem) window.RewardSystem.completeStep(mNum, targetStep - 1);
  let p = getProgress();
  if (targetStep > (p[`m${mNum}MaxStep`] || 1)) {
     p[`m${mNum}MaxStep`] = targetStep;
     saveProgress(p);
     showUnlockPopup(title, msg, proceedCallback);
  } else { proceedCallback(); }
}

function updateStepUI(missionStr, totalSteps, currentStep) {
  const mNum = parseInt(missionStr.replace('m', ''));
  const p = getProgress();
  const maxAllowed = getAccessibleMaxStep(mNum);

  for(let i=1; i<=totalSteps; i++) {
    let dot = document.getElementById(`${missionStr}-dot-${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'completed');
    
    if (i < currentStep) dot.classList.add('completed');
    else if (i === currentStep) dot.classList.add('active');

    if (i <= maxAllowed) {
        dot.style.opacity = '1';
        dot.style.cursor = 'pointer';
        dot.onclick = () => {
            if (mNum === 2 && typeof goCustomM2Step === 'function') goCustomM2Step(i);
            else if (mNum === 3 && typeof goM3Step === 'function') goM3Step(i);
        };
    } else {
        dot.style.opacity = '0.5';
        dot.style.cursor = 'not-allowed';
        dot.onclick = () => { alert("이전 단계를 먼저 완료해야 접근할 수 있습니다!"); };
    }
  }
}

// ... 이후 launchConfetti, launchMasterConfetti, setupTouchDragAndDrop, window.onload 등은 기존 코드 그대로 유지 ...
// (분량 관계상 생략되었으나 기존에 가지고 계신 코드를 그대로 이어 붙이시면 됩니다)

function launchConfetti() {
  const canvasConf = document.getElementById('confetti-canvas');
  if(!canvasConf) return;
  const ctxConf = canvasConf.getContext('2d');
  canvasConf.width = window.innerWidth;
  canvasConf.height = window.innerHeight;
  let confettiPieces = [];
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
  for (let i = 0; i < 90; i++) {
    confettiPieces.push({ x: canvasConf.width / 2, y: canvasConf.height / 2, w: Math.random() * 8 + 4, h: Math.random() * 6 + 4, color: colors[Math.floor(Math.random() * colors.length)], vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.7) * 16, gravity: 0.35, rotation: Math.random() * 360, spin: (Math.random() - 0.5) * 10 });
  }
  function renderConfetti() {
    ctxConf.clearRect(0, 0, canvasConf.width, canvasConf.height);
    let alive = false;
    confettiPieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rotation += p.spin;
      if (p.y < canvasConf.height) { alive = true; ctxConf.save(); ctxConf.translate(p.x, p.y); ctxConf.rotate((p.rotation * Math.PI) / 180); ctxConf.fillStyle = p.color; ctxConf.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctxConf.restore(); }
    });
    if (alive) requestAnimationFrame(renderConfetti);
    else ctxConf.clearRect(0, 0, canvasConf.width, canvasConf.height);
  }
  renderConfetti();
}

function launchMasterConfetti() {
  const canvasConf = document.getElementById('confetti-canvas');
  if(!canvasConf) return;
  const ctxConf = canvasConf.getContext('2d');
  canvasConf.width = window.innerWidth;
  canvasConf.height = window.innerHeight;
  let confettiPieces = [];
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
  let isGenerating = true;
  setTimeout(() => { isGenerating = false; }, 5000);
  function addPieces() {
     if (isGenerating && confettiPieces.length < 200) {
         for(let i=0; i<5; i++) {
             confettiPieces.push({ x: canvasConf.width / 2, y: canvasConf.height / 2, w: Math.random() * 8 + 4, h: Math.random() * 6 + 4, color: colors[Math.floor(Math.random() * colors.length)], vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.7) * 16 - 5, gravity: 0.35, rotation: Math.random() * 360, spin: (Math.random() - 0.5) * 10 });
         }
     }
  }
  function renderConfetti() {
    addPieces();
    ctxConf.clearRect(0, 0, canvasConf.width, canvasConf.height);
    let alive = false;
    confettiPieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rotation += p.spin;
      if (p.y < canvasConf.height) { alive = true; ctxConf.save(); ctxConf.translate(p.x, p.y); ctxConf.rotate((p.rotation * Math.PI) / 180); ctxConf.fillStyle = p.color; ctxConf.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctxConf.restore(); }
    });
    if (alive || isGenerating) requestAnimationFrame(renderConfetti);
    else ctxConf.clearRect(0, 0, canvasConf.width, canvasConf.height);
  }
  renderConfetti();
}


window.addEventListener('load', function() { 
  renderNav();
  if (window.RewardSystem) window.RewardSystem.renderRewards();
  // dragdrop.js의 통합 엔진만 사용합니다.

  let p = getProgress();
  if (location.pathname.includes('mission1.html')) {
     if(document.getElementById('val-plant')) updateStage1(100); 
  } else if (location.pathname.includes('mission2.html')) {
     if(typeof goCustomM2Step === 'function') goCustomM2Step(p.m2MaxStep || 1); 
  } else if (location.pathname.includes('mission3.html')) {
     if(typeof goM3Step === 'function') goM3Step(p.m3MaxStep || 1);
  }
});
