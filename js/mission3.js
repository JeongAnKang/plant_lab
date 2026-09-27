// ==========================================
// 미션 3 (식물의 숨) 통합 스크립트 (mission3.js)
// ==========================================

// ------------------------------------------
// 💡 1. 화면(Step) 자유 이동 및 상태 저장 로직
// ------------------------------------------
function goM3Step(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`stage3-step${i}`);
    if (el) el.style.display = 'none';
  }
  
  const target = document.getElementById(`stage3-step${step}`);
  if (target) target.style.display = 'block';

  if (typeof getProgress === 'function' && typeof saveProgress === 'function') {
      let p = getProgress();
      if ((p.m3MaxStep || 1) < step) { 
          p.m3MaxStep = step; 
          saveProgress(p); 
      }
      
      const maxAllowed = typeof window.getAccessibleMaxStep === 'function'
          ? window.getAccessibleMaxStep(3)
          : (p.m3MaxStep || 1);
      
      for(let i = 1; i <= 5; i++) {
          let dot = document.getElementById(`m3-dot-${i}`);
          if (!dot) continue;
          
          dot.classList.remove('active', 'completed');
          
          if (i === step) dot.classList.add('active');
          else if (i <= maxAllowed) dot.classList.add('completed');

          if (i <= maxAllowed) {
              dot.style.opacity = '1';
              dot.style.cursor = 'pointer';
              dot.onclick = () => { goM3Step(i); };
          } else {
              dot.style.opacity = '0.5';
              dot.style.cursor = 'not-allowed';
              dot.onclick = () => { alert("이전 단계를 먼저 완료해야 접근할 수 있습니다!"); };
          }
      }
  }
}

// ------------------------------------------
// 💡 2. Step 1 퀴즈 + <세포의 에너지 공장>
// ------------------------------------------
function selectQ2(answer) {
  document.getElementById('m3-q2-ans').value = answer;
  const y = document.getElementById('btn-q2-yes'), n = document.getElementById('btn-q2-no');
  y.style.background = answer === '예' ? '#2e7d32' : '#cfd8dc'; 
  y.style.color = answer === '예' ? '#fff' : '#333';
  n.style.background = answer === '아니오' ? '#2e7d32' : '#cfd8dc'; 
  n.style.color = answer === '아니오' ? '#fff' : '#333';
}

function checkM3Step1() {
  const q1In = document.getElementById('m3-q1-in').value.replace(/\s+/g, '');
  const q1Out = document.getElementById('m3-q1-out').value.replace(/\s+/g, '');
  const q2 = document.getElementById('m3-q2-ans').value;
  const q3_1 = document.getElementById('m3-q3-1').value.replace(/\s+/g, '');
  const q3_2 = document.getElementById('m3-q3-2').value.replace(/\s+/g, '');
  const q3_3 = document.getElementById('m3-q3-3').value.replace(/\s+/g, '');
 
  const ok = (q1In === '산소') && 
             (/이산화\s*탄소/.test(q1Out)) &&
             q2 === '예' && 
             q3_1.includes('에너지') &&
             (q3_2.includes('양분') || q3_2 === '포도당') &&
             q3_3 === '산소';
  
  const msg = document.getElementById('m3-s1-msg');
  const factory = document.getElementById('m3-cell-factory');
  
  if (ok) { 
      msg.style.color = '#2e7d32'; 
      msg.innerText = ' <세포의 에너지 공장> 아래쪽에서 뱃지를 가져와서 완성해 보세요.'; 
      factory.style.display = 'block'; 
      factory.scrollIntoView({behavior: 'smooth', block: 'start'}); 
  } else { 
      msg.style.color = '#c62828'; 
      msg.innerText = '❌ 오타나 띄어쓰기를 확인해 보세요. (예: 이산화탄소, 에너지, 양분, 산소)'; 
      factory.style.display = 'none'; 
      document.getElementById('btn-go-step2').style.display = 'none'; 
  }
}

function checkM3Factory() {
    const zones = [...document.querySelectorAll('#m3-cell-factory .factory-answer-zone')]; 
    let filled = 0;
    
    const userAnswers = [];
    zones.forEach(z => {
        const badge = z.querySelector('.ans-badge'); 
        if (badge) {
            filled++; 
            userAnswers.push(badge.dataset.ans);
        } else {
            userAnswers.push(null);
        }
    });
    
    const msg = document.getElementById('m3-factory-msg');
    const next = document.getElementById('btn-go-step2');
    
    if (filled < zones.length) {
        msg.style.color = '#e65100';
        msg.innerText = '⚠️ 제시어를 모든 빈칸에 배치해 주세요.';
        next.style.display = 'none';
        return;
    }

    let isCorrect = true;

    // 단일 정답 체크
    if (userAnswers[0] !== '에너지') isCorrect = false;
    if (userAnswers[5] !== '양분') isCorrect = false;
    if (userAnswers[6] !== '호흡') isCorrect = false;
    if (userAnswers[7] !== '마이토콘드리아') isCorrect = false;

    // 자리바꿈 허용 (포도당, 산소)
    const group1 = [userAnswers[1], userAnswers[2]].sort().join(',');
    if (group1 !== '산소,포도당') isCorrect = false;

    // 자리바꿈 허용 (이산화탄소, 물)
    const group2 = [userAnswers[3], userAnswers[4]].sort().join(',');
    if (group2 !== '물,이산화탄소') isCorrect = false;
    
    if (isCorrect) {
        msg.style.color = '#2e7d32';
        msg.innerText = '✅ 정답입니다! 세포 호흡 과정을 정확히 완성했습니다.';
        if (window.RewardSystem) window.RewardSystem.completeStep(3, 1);
        
        next.style.display = 'inline-flex';
        next.onclick = () => {
           if (typeof launchConfetti === 'function') launchConfetti();
           setTimeout(() => goM3Step(2), 800);
        };
    } else {
        msg.style.color = '#c62828';
        msg.innerText = '❌ 위치가 잘못된 제시어가 있습니다. 다시 배치해 보세요.';
        next.style.display = 'none';
    }
}

// ------------------------------------------
// 💡 3. Step 2 로직
// ------------------------------------------
function checkM3Step2() {
    const dzList = [
        { id: 'dz-r1', expected: '저장' },
        { id: 'dz-r2', expected: '방출' },
        { id: 'dz-r3', expected: 'M3_s02_r3_glucose' },
        { id: 'dz-r4', expected: 'M3_s02_r4_CO2' },
        { id: 'dz-r5', expected: '마이토콘드리아' },
        { id: 'dz-r6', expected: '엽록체' }
    ];

    let allBadgesMatch = true;
    dzList.forEach(item => {
        const dz = document.getElementById(item.id);
        const child = dz ? dz.children[0] : null;
        if (!child || child.getAttribute('data-ans') !== item.expected) {
            allBadgesMatch = false;
        }
    });

    const q1 = document.getElementById('m3-s2-q1').value;
    const q2 = document.getElementById('m3-s2-q2').value;
    const isSelectMatch = (q1 === '저장' && q2 === '방출');

    const msg = document.getElementById('m3-s2-msg');
    const btnNext = document.getElementById('btn-go-step3');

    if (allBadgesMatch && isSelectMatch) {
        msg.style.color = '#2e7d32';
        msg.innerText = "✅ 완벽합니다! 모식도와 에너지 흐름이 정확히 완성되었습니다.";
        if (window.RewardSystem) window.RewardSystem.completeStep(3, 2);
        
        if (btnNext) {
            btnNext.style.display = 'inline-block';
            btnNext.onclick = () => {
              if (typeof launchConfetti === 'function') launchConfetti();
              setTimeout(() => goM3Step(3), 800);
            };
        }
    } else {
        msg.style.color = '#c62828';
        if (!allBadgesMatch) {
            msg.innerText = "❌ 잘못 배치된 뱃지가 있습니다. 네모 칸을 다시 확인해 보세요.";
        } else if (!isSelectMatch) {
            msg.innerText = "❌ 아래 '관계 정리하기'의 선택칸이 틀렸습니다. 다시 확인해 보세요.";
        }
        if (btnNext) btnNext.style.display = 'none';
    }
}

// ------------------------------------------
// 💡 Step 3 낮/밤 이미지 드롭 활동
// ------------------------------------------
let isDay = true;
const m3s3State = { day: {}, night: {} };

function saveM3S3Placements() {
    const mode = isDay ? 'day' : 'night';
    m3s3State[mode] = {};
    document.querySelectorAll('#dn-drop-layer .m3s3-dz').forEach(z => {
        const b = z.querySelector('.ans-badge');
        if (b) m3s3State[mode][z.id] = b.dataset.ans;
    });
}

function renderM3S3Dropzones() {
    const layer = document.getElementById('dn-drop-layer');
    const pool = document.getElementById('m3s3-badge-pool');
    if (!layer || !pool) return;
    
    layer.querySelectorAll('.ans-badge').forEach(b => pool.appendChild(b));
    layer.innerHTML = '';
    
    const zones = isDay ? [
        { id: 's3-day-co2', target: '이산화탄소', top: 28.4, left: 9.1, w: 19.8, h: 7.2 },
        { id: 's3-day-photo', target: '광합성', top:29.4, left: 42.0, w: 15.0, h: 3.0 },
        { id: 's3-day-o2', target: '산소', top: 28.4, left: 63, w: 19.8, h: 7.2 },
        { id: 's3-day-resp', target: '호흡', top: 48.0, left: 42.0, w: 15.0, h: 3.0 }
    ] : [
        { id: 's3-night-o2', target: '산소', top: 34, left: 16, w: 19.8, h: 7.2 },
        { id: 's3-night-resp', target: '호흡', top: 35.5, left: 43.5, w: 15, h: 3.0 }, 
        { id: 's3-night-co2', target: '이산화탄소', top: 34, left: 67, w: 19.8, h: 7.2 }
    ];

    zones.forEach(z => {
        const d = document.createElement('div');
        d.id = z.id;
        d.className = 'm3s3-dz dropzone img-drop-overlay';
        d.dataset.target = z.target;
        d.dataset.capacity = '1';
        d.style.cssText = `position:absolute; top:${z.top}%; left:${z.left}%; width:${z.w}%; height:${z.h}%; border-width: 2px;`;
        layer.appendChild(d);
    });
    
    const mode = isDay ? 'day' : 'night';
    Object.entries(m3s3State[mode]).forEach(([id, ans]) => {
        const z = document.getElementById(id);
        const b = [...pool.querySelectorAll('.ans-badge')].find(x => x.dataset.ans === ans);
        if (z && b) z.appendChild(b);
    });
}

function toggleDayNight() {
    saveM3S3Placements();
    isDay = !isDay;
    const bg = document.getElementById('dn-bg');
    const img = document.getElementById('dn-image');
    const icon = document.getElementById('dn-icon');
    const text = document.getElementById('dn-text');
    
    if (isDay) {
        bg.className = 'day-night-container dn-day';
        img.src = 'images/M3_s03_mn_184_1.png';
        icon.innerText = '☀️';
        text.innerText = '낮으로 설정됨';
    } else {
        bg.className = 'day-night-container dn-night';
        img.src = 'images/M3_s03_mn_184_2.png';
        icon.innerText = '🌙';
        text.innerText = '밤으로 설정됨';
    }
    renderM3S3Dropzones();
}

function m3s3Correct(mode) {
    const s = m3s3State[mode];
    const e = mode === 'day' ? 
        { 's3-day-co2': '이산화탄소', 's3-day-photo': '광합성', 's3-day-o2': '산소', 's3-day-resp': '호흡' } : 
        { 's3-night-o2': '산소', 's3-night-resp': '호흡', 's3-night-co2': '이산화탄소' };
    return Object.entries(e).every(([id, a]) => s[id] === a);
}

// ------------------------------------------
// 💡 Step 3 관찰 결과 정리 로직 (버튼 클릭 채우기)
// ------------------------------------------
function fillS3Blank(word) {
    const blanks = document.querySelectorAll('.s3-blank');
    const emptyBlank = Array.from(blanks).find(b => !b.classList.contains('filled'));
    
    if (emptyBlank) {
        emptyBlank.innerText = word;
        emptyBlank.classList.add('filled');
    }
}

function checkM3Step3() {
    saveM3S3Placements();
    const msg = document.getElementById('m3-s3-msg');
    const next = document.getElementById('btn-go-step4');
    
    // 1. 낮/밤 모식도(그림) 정답 확인
    const diagrams = m3s3Correct('day') && m3s3Correct('night');
    
    // 2. 버튼으로 채운 10개 빈칸 정답 확인
    const blanks = document.querySelectorAll('.s3-blank');
    let allBlanksFilled = true;
    let allBlanksCorrect = true;

    blanks.forEach(b => {
        if (!b.classList.contains('filled')) {
            allBlanksFilled = false;
        } else if (b.innerText !== b.dataset.ans) {
            allBlanksCorrect = false;
        }
    });
    
    if (!diagrams) {
        msg.style.color = '#c62828';
        msg.innerText = '❌ 낮/밤 그림의 뱃지 위치를 모두 다시 확인해 보세요.';
        next.style.display = 'none';
        return;
    }

    if (!allBlanksFilled) {
        msg.style.color = '#e65100';
        msg.innerText = '⚠️ 관찰 결과 정리의 빈칸을 모두 채워주세요.';
        next.style.display = 'none';
        return;
    }

    if (!allBlanksCorrect) {
        msg.style.color = '#c62828';
        msg.innerText = '❌ 관찰 결과 정리 중 틀린 내용이 있습니다. 다시 확인해 보세요.';
        next.style.display = 'none';
        return;
    }

    // 정답일 경우
    msg.style.color = '#2e7d32';
    msg.innerText = '✅ 정답입니다! 낮과 밤의 광합성과 호흡 관계를 정확히 이해했습니다.';
    if (window.RewardSystem) window.RewardSystem.completeStep(3, 3);
    
    next.style.display = 'inline-flex';
    next.onclick = () => {
      if (typeof launchConfetti === 'function') launchConfetti();
      setTimeout(() => goM3Step(4), 800);
    };
}

// ------------------------------------------
// 💡 Step 4 로직
// ------------------------------------------
function checkM3Step4() {
    const dropzones = document.querySelectorAll('.comp-table .dropzone');
    let allCorrect = true;
    let filledCount = 0;

    // 실제 화면에 보이는 '텍스트 값(data-val)'을 기준으로 정답을 검증합니다.
    const expectedValues = {
        'dz-r-time': '항상 (낮과 밤)',
        'dz-p-time': '낮',
        'dz-r-org': '마이토콘드리아',
        'dz-p-org': '엽록체',
        'dz-r-cell': '모든 살아있는 세포',
        'dz-p-cell': '엽록체가 있는 세포',
        'dz-r-req': '포도당, 산소',
        'dz-p-req': '이산화탄소, 물, 빛에너지',
        'dz-r-prod': '이산화탄소, 물, 에너지',
        'dz-p-prod': '포도당, 산소',
        'dz-r-gas': '산소 흡수, 이산화탄소 방출',
        'dz-p-gas': '이산화탄소 흡수, 산소 방출',
        'dz-r-nut': '분해',
        'dz-p-nut': '합성',
        'dz-r-energy': '에너지 방출',
        'dz-p-energy': '에너지 저장'
    };

    dropzones.forEach(dz => {
        if (dz.children.length > 0) filledCount++;
        const badge = dz.children[0];
        
        if (!badge || badge.getAttribute('data-val') !== expectedValues[dz.id]) {
            allCorrect = false;
        }
    });

    const msg = document.getElementById('m3-s4-msg');
    const btnNext = document.getElementById('btn-go-step5');

    // 16칸(8줄 * 2칸)이 모두 채워졌는지 확인
    if (filledCount < 16) {
        msg.style.color = '#e65100'; 
        msg.innerText = "⚠️ 아직 모든 칸을 채우지 않았습니다. 뱃지를 모두 올려주세요!"; 
        return;
    }

    if (allCorrect) {
        msg.style.color = '#2e7d32'; 
        msg.innerText = "✅ 완벽합니다! 광합성과 호흡의 차이점을 완전히 마스터하셨네요! 다음 스텝에서 최종 정리를 해봅시다.";
        if (window.RewardSystem) window.RewardSystem.completeStep(3, 4);
        btnNext.style.display = "inline-flex";
        
        btnNext.onclick = () => {
            if (typeof launchConfetti === 'function') launchConfetti();
            setTimeout(() => goM3Step(5), 800);
        };
    } else {
        msg.style.color = '#c62828'; 
        msg.innerText = "❌ 잘못 배치된 뱃지가 있습니다. 다시 한번 꼼꼼히 확인해 보세요!";
        btnNext.style.display = "none";
    }
}

// ==========================================
// 💡 Step 5 로직 (최종 정리 및 클리어)
// ==========================================
window.checkM3Step5 = function() {
    const q1 = document.getElementById('m3-s5-q1').value.replace(/\s/g, '');
    const q2 = document.getElementById('m3-s5-q2').value.replace(/\s/g, '');
    const q3 = document.getElementById('m3-s5-q3').value.replace(/\s/g, '');
    const q4 = document.getElementById('m3-s5-q4').value.replace(/\s/g, '');
    const q5 = document.getElementById('m3-s5-q5').value.replace(/\s/g, '');
    const q6 = document.getElementById('m3-s5-q6').value.replace(/\s/g, '');

    const msg = document.getElementById('m3-s5-msg');

    // 정답 확인 (q5에 '분해' 추가, 방출은 '발생'도 정답으로 인정)
    if (q1 === '호흡' && q2 === '광합성' && q3 === '흡수' && q4 === '저장' && q5 === '분해' && (q6 === '방출' || q6 === '발생')) {
        msg.style.color = '#2e7d32';
        msg.innerText = "✅ 정답입니다! 광합성과 호흡의 관계를 완벽하게 정리했습니다!";
        
        document.getElementById('btn-check-s5').style.display = 'none';
        
        // 입력창 비활성화
        ['m3-s5-q1', 'm3-s5-q2', 'm3-s5-q3', 'm3-s5-q4', 'm3-s5-q5', 'm3-s5-q6'].forEach(id => {
            document.getElementById(id).disabled = true;
        });

        // 클리어 메시지 및 버튼 표시
        const clearArea = document.getElementById('m3-clear-area');
        clearArea.style.display = 'block';
        clearArea.scrollIntoView({behavior: 'smooth', block: 'center'});

        // 최종 미션 완료 처리 및 마스터 폭죽 실행
        if (window.RewardSystem) window.RewardSystem.completeStep(3, 5);
        if (typeof launchMasterConfetti === 'function') launchMasterConfetti();
        else if (typeof launchConfetti === 'function') launchConfetti();
        
        if (typeof getProgress === 'function' && typeof saveProgress === 'function') {
            let p = getProgress();
            p.m3MaxStep = 6;
            saveProgress(p);
        }
        if (typeof window.completeMission === 'function') window.completeMission(3);
    } else {
        msg.style.color = '#c62828';
        msg.innerText = "❌ 오답이 있습니다. (힌트: 호흡, 광합성, 흡수, 저장, 분해, 방출 중 알맞은 단어를 적어보세요.)";
    }
};

// ------------------------------------------
// 💡 페이지 초기화 및 이벤트 리스너 추가
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (typeof getProgress === 'function') {
        let p = getProgress();
        saveProgress(p);
    }
    goM3Step(1);
    renderM3S3Dropzones(); 

    // ▶ Step 3 빈칸 클릭 시 글자 지우기 이벤트
    document.querySelectorAll('.s3-blank').forEach(blank => {
        blank.addEventListener('click', function() {
            if (this.classList.contains('filled')) {
                this.innerText = '';
                this.classList.remove('filled');
            }
        });
    });

    // 자동완성 및 맞춤법 검사 끄기
    const allInputs = document.querySelectorAll('input[type="text"], textarea');
    allInputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');   
        input.setAttribute('autocorrect', 'off');    
        input.setAttribute('autocapitalize', 'off'); 
        input.setAttribute('spellcheck', 'false');   
    });

    // Step 1: 인풋박스에서 엔터 키 누르면 자동으로 정답 확인
    const step1Inputs = [
        document.getElementById('m3-q1-in'),
        document.getElementById('m3-q1-out'),
        document.getElementById('m3-q3-1'),
        document.getElementById('m3-q3-2'),
        document.getElementById('m3-q3-3')
    ];
    step1Inputs.forEach(input => {
        if(input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') checkM3Step1();
            });
        }
    });

    // Step 5: 인풋박스에서 엔터 키 누르면 자동으로 정답 확인
    const step5Inputs = [
        document.getElementById('m3-s5-q1'),
        document.getElementById('m3-s5-q2'),
        document.getElementById('m3-s5-q3'),
        document.getElementById('m3-s5-q4'),
        document.getElementById('m3-s5-q5'),
        document.getElementById('m3-s5-q6')
    ];
    step5Inputs.forEach(input => {
        if(input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') window.checkM3Step5();
            });
        }
    });

    // Step 4 뱃지 랜덤 섞기
    const badgePool = document.getElementById('badge-pool');
    if (badgePool) {
        const badges = Array.from(badgePool.querySelectorAll('.ans-badge'));
        badges.sort(() => Math.random() - 0.5);
        badges.forEach(badge => badgePool.appendChild(badge));
    }
});