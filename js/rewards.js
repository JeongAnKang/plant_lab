// ==========================================
// rewards.js - 공통 스텝 완료/보상 엔진
// ==========================================
(function () {
  'use strict';

  const MISSION_COUNT = 5;
  const MAX_REWARD_SLOTS = 20;
  const REWARD_IMAGE_COUNT = 26;

  function normalizeProgress(p) {
    if (!p || typeof p !== 'object') p = {};
    if (!Array.isArray(p.rewards)) p.rewards = [];
    if (!p.completedSteps || typeof p.completedSteps !== 'object') p.completedSteps = {};
    for (let m = 1; m <= MISSION_COUNT; m++) {
      if (!Array.isArray(p.completedSteps[m])) p.completedSteps[m] = [];
    }
    return p;
  }

  function readProgress() {
    if (typeof window.getProgress !== 'function') return normalizeProgress({});
    return normalizeProgress(window.getProgress());
  }

  function writeProgress(p) {
    if (typeof window.saveProgress === 'function') window.saveProgress(p);
  }

  // 학생이 실제로 성공한 스텝만 기록한다. 같은 스텝은 최초 1회만 인정한다.
  function completeStep(missionNumber, stepNumber) {
    const m = Number(missionNumber);
    const s = Number(stepNumber);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 1 || s < 1) return false;

    const p = readProgress();
    if (!p.completedSteps[m]) p.completedSteps[m] = [];
    if (p.completedSteps[m].includes(s)) return false;

    p.completedSteps[m].push(s);
    p.completedSteps[m].sort((a, b) => a - b);
    writeProgress(p);
    return true;
  }

  function isStepCompleted(missionNumber, stepNumber) {
    const p = readProgress();
    return Array.isArray(p.completedSteps[missionNumber]) &&
      p.completedSteps[missionNumber].includes(Number(stepNumber));
  }

  function getCompletedSteps(missionNumber) {
    const p = readProgress();
    return Array.isArray(p.completedSteps[missionNumber])
      ? [...p.completedSteps[missionNumber]] : [];
  }

  function getEarnedCount(progress) {
    const p = normalizeProgress(progress || readProgress());
    let total = 0;
    for (let m = 1; m <= MISSION_COUNT; m++) total += p.completedSteps[m].length;
    return total;
  }

  function getAvailableCount(progress) {
    const p = normalizeProgress(progress || readProgress());
    return Math.max(0, getEarnedCount(p) - p.rewards.length);
  }

  function renderRewards() {
    const p = readProgress();
    const rewardArea = document.getElementById('reward-area');
    const countSpan = document.getElementById('reward-count');
    const btnClaim = document.getElementById('btn-claim-reward');
    if (!rewardArea || !countSpan) return;

    const available = getAvailableCount(p);
    countSpan.innerText = available;

    if (btnClaim) {
      const enabled = available > 0 && p.rewards.length < MAX_REWARD_SLOTS;
      btnClaim.disabled = !enabled;
      btnClaim.style.background = enabled ? '#f57f17' : '#cfd8dc';
      btnClaim.style.color = enabled ? '#fff' : '#78909c';
      btnClaim.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    rewardArea.innerHTML = '';
    for (let i = 0; i < MAX_REWARD_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'reward-slot';
      if (i < p.rewards.length) {
        const img = document.createElement('img');
        img.className = 'reward-item';
        img.src = `images/reward${p.rewards[i]}.png`;
        img.alt = `획득 보상 ${i + 1}`;
        img.onerror = function () { this.style.display = 'none'; };
        slot.appendChild(img);
      }
      rewardArea.appendChild(slot);
    }
  }

  function claimReward() {
    const p = readProgress();
    const available = getAvailableCount(p);

    if (available <= 0) return false;
    if (p.rewards.length >= MAX_REWARD_SLOTS) {
      alert('🎉 20개의 햇빛(보상)을 모두 모았습니다! 대단해요!');
      return false;
    }

    const randomNum = Math.floor(Math.random() * REWARD_IMAGE_COUNT) + 1;
    p.rewards.push(String(randomNum).padStart(2, '0'));
    writeProgress(p);
    if (typeof window.launchConfetti === 'function') window.launchConfetti();
    return true;
  }

  function resetRewards() {
    const p = readProgress();
    p.rewards = [];
    for (let m = 1; m <= MISSION_COUNT; m++) p.completedSteps[m] = [];
    writeProgress(p);
  }

  window.RewardSystem = Object.freeze({
    completeStep,
    isStepCompleted,
    getCompletedSteps,
    getEarnedCount,
    getAvailableCount,
    claimReward,
    renderRewards,
    resetRewards
  });

  // 기존 HTML/미션 코드와의 호환용 전역 함수
  window.markStepCompleted = completeStep;
  window.getEarnedRewardsCount = getEarnedCount;
  window.claimReward = claimReward;
  window.renderRewards = renderRewards;
})();
