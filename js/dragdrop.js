/* one pointer/keyboard drag-and-drop engine for every mission. */
(function () {
  'use strict';
  const ITEM = '.badge,.m1-badge,.m2-badge,.m3-badge,.m4-badge,.m5-badge,.ans-badge';
  const ZONE = '#factory-dropzone,#factory-items,#source-badges,.m1-dropzone,.m1-badge-pool,.m2-dropzone,.m2-badge-pool,.m3-dropzone,.m3-badge-pool,.m3s2-dz,.m3s3-dz,.m4-dropzone,.m4-badge-pool,.factory-answer-zone,.dropzone,.badge-pool,.pool,#m5-dropzone,#m5-pool';
  
  let selected = null, gesture = null, activeMode = 'pending', suppressClickUntil = 0;

  function family(el) {
    if (el.matches('.m1-badge')) return 'm1';
    if (el.matches('.m2-badge')) return 'm2';
    if (el.matches('.m3-badge')) return 'm3';
    if (el.matches('.m4-badge')) return 'm4';
    if (el.matches('.m5-badge')) return 'm5';
    if (el.matches('.ans-badge')) return 'answer';
    return el.closest('#m3s2-badge-pool,#m3s3-badge-pool,#m3-factory-pool,#badge-pool') ? 'answer' : 'factory';
  }

  function accepts(item, zone) {
    const f = family(item);
    if (f === 'factory') return zone.matches('#factory-dropzone,#factory-items,#source-badges');
    if (f === 'm1') return zone.matches('.m1-dropzone,.m1-badge-pool');
    if (f === 'm2') return zone.matches('.m2-dropzone,.m2-badge-pool');
    if (f === 'm3') return zone.matches('.m3-dropzone,.m3-badge-pool');
    
    // 💡 미션 4 전용 드롭 규칙
    if (f === 'm4') {
      const from = item.parentElement?.id;
      const to = zone.id;
      const type = item.dataset.type;

      if (item.dataset.cytoProcessing === 'true' || item.dataset.vesselProcessing === 'true' || item.dataset.converting === 'true') {
          return false;
      }

      // Step 2 규칙
      if (from === 'pool2' && to === 'dz-cytoplasm') return type === 'starch' || type === 'water';
      if (from === 'dz-cytoplasm' && /^dz-xylem-[12]$/.test(to)) return type === 'water';
      if (from === 'dz-cytoplasm' && /^dz-phloem-[12]$/.test(to)) return type === 'sugar';

      // 💡 Step 4 금고 규칙 (해당되지 않는 뱃지는 무조건 튕겨냄)
      if (zone.closest('#step4-vault')) {
          const acceptsStr = zone.dataset.accept;
          const badgeName = item.dataset.name;
          if (acceptsStr && badgeName) {
              return acceptsStr.includes(badgeName);
          }
          return false;
      }
      // Step 4 뱃지는 창고(pool)로는 언제든 돌아갈 수 있음
      if (to === 's4-pool') return true;

      // 금고 영역이 아니면 Step 2 구역 간의 허용되지 않은 이동 차단
      if (item.closest('#step2-box') || zone.closest('#step2-box')) return false;

      return zone.matches('.m4-dropzone,.m4-badge-pool');
    }
    
    if (f === 'm5') return zone.matches('#m5-dropzone,#m5-pool');
    return zone.matches('.dropzone,.badge-pool,#m3s2-badge-pool,#m3s3-badge-pool,#m3-factory-pool');
  }

  function sourcePool(item) {
    const f = family(item);
    if (f === 'factory') return document.querySelector('#source-badges');
    if (f === 'm1') return document.querySelector('.m1-badge-pool');
    if (f === 'm2') return item.closest('.m2-step-container')?.querySelector('.m2-badge-pool');
    if (f === 'm3') return document.querySelector('.m3-badge-pool');
    if (f === 'm4') return item.closest('.interactive-box')?.querySelector('.m4-badge-pool') || document.querySelector('.m4-badge-pool');
    if (f === 'm5') return document.querySelector('#m5-pool');
    if (item.closest('#m3s2-badge-pool,.m3s2-dz')) return document.querySelector('#m3s2-badge-pool');
    if (item.closest('#m3s3-badge-pool,.m3s3-dz')) return document.querySelector('#m3s3-badge-pool');
    if (item.closest('#m3-factory-pool,#m3-cell-factory .factory-answer-zone')) return document.querySelector('#m3-factory-pool');
    return document.querySelector('#badge-pool,.badge-pool');
  }

  function clear() {
    document.querySelectorAll('.dnd-selected,.dnd-over').forEach(el => el.classList.remove('dnd-selected','dnd-over'));
    selected = null;
  }

  function move(item, zone) {
    if (!item || !zone || !accepts(item, zone)) return false;
    if (zone.id === 'factory-dropzone') zone = document.querySelector('#factory-items') || zone;
    
    // Step 4 슬롯은 오직 1개만 들어가도록 처리
    const single = zone.matches('.m1-dropzone,.m3s2-dz,.m3s3-dz,.factory-answer-zone,.comp-table .dropzone,.s4-slot') || zone.dataset.capacity === '1';
    
    if (single) {
      const old = Array.from(zone.children).find(el => el !== item && el.matches(ITEM));
      const pool = old && sourcePool(old);
      if (old && pool) pool.appendChild(old);
    }
    zone.appendChild(item); clear();
    zone.classList.add('drop-success');
    setTimeout(() => zone.classList.remove('drop-success'), 220);
    return true;
  }

  function zoneAt(x,y) { const hit = document.elementFromPoint(x,y); return hit && hit.closest(ZONE); }

  function createGhost(item, x, y) {
    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.removeAttribute('role');
    ghost.classList.add('dnd-ghost');
    
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${x - rect.width / 2}px`;
    ghost.style.top = `${y - rect.height / 2}px`;
    
    document.body.appendChild(ghost);
    return ghost;
  }

  function positionGhost(ghost, x, y) {
    if (!ghost) return;
    const width = ghost.offsetWidth;
    const height = ghost.offsetHeight;
    ghost.style.left = `${x - width / 2}px`;
    ghost.style.top = `${y - height / 2 - 12}px`;
  }

  function finishGesture(state) {
    state?.ghost?.remove();
    state?.item?.classList.remove('dnd-source-dragging');
    document.body.classList.remove('dnd-active');
    document.querySelectorAll('.dnd-over').forEach(el => el.classList.remove('dnd-over'));
  }

  function pointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const item = e.target.closest(ITEM); if (!item) return;
    if (item.dataset.cytoProcessing === 'true' || item.dataset.vesselProcessing === 'true' || item.dataset.converting === 'true') return; 
    
    gesture = {item, id:e.pointerId, x:e.clientX, y:e.clientY, moved:false, ghost:null};
    item.setPointerCapture?.(e.pointerId);
  }

  function pointerMove(e) {
    if (!gesture || gesture.id !== e.pointerId) return;
    if (Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y) < 7) return;
    if (!gesture.moved) {
      gesture.moved = true;
      gesture.ghost = createGhost(gesture.item, e.clientX, e.clientY);
      gesture.item.classList.add('dnd-source-dragging');
      document.body.classList.add('dnd-active');
    }
    e.preventDefault();
    positionGhost(gesture.ghost, e.clientX, e.clientY);
    document.querySelectorAll('.dnd-over').forEach(el => el.classList.remove('dnd-over'));
    const zone = zoneAt(e.clientX,e.clientY);
    if (zone && accepts(gesture.item,zone)) zone.classList.add('dnd-over');
  }

  function pointerUp(e) {
    if (!gesture || gesture.id !== e.pointerId) return;
    const state = gesture; gesture = null;
    const zone = zoneAt(e.clientX,e.clientY);
    finishGesture(state);
    if (state.moved) {
      suppressClickUntil = Date.now() + 350;
      e.preventDefault();
      move(state.item,zone);
    }
  }

  function enablePointerMode() {
    activeMode = 'pointer';
    document.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointermove', pointerMove, {passive:false});
    document.addEventListener('pointerup', pointerUp);
    document.addEventListener('pointercancel', () => {
      const state = gesture; gesture=null; finishGesture(state); clear();
    });
  }

  function enableNativeMode() {
    activeMode = 'drag-drop-touch';
    document.querySelectorAll(ITEM).forEach(el => { el.draggable = true; });
    document.addEventListener('dragstart', e => {
      const item = e.target.closest(ITEM);
      if (!item) return;
      if (item.dataset.cytoProcessing === 'true' || item.dataset.vesselProcessing === 'true' || item.dataset.converting === 'true') { e.preventDefault(); return; }
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dnd-source-dragging');
      document.body.classList.add('dnd-active');
    }, true);
    document.addEventListener('dragover', e => {
      const zone = e.target.closest(ZONE);
      if (!zone) return;
      e.preventDefault();
      document.querySelectorAll('.dnd-over').forEach(el => el.classList.remove('dnd-over'));
      const draggingItem = document.querySelector('.dnd-source-dragging');
      if (draggingItem && accepts(draggingItem, zone)) zone.classList.add('dnd-over');
    }, true);
    document.addEventListener('drop', e => {
      const zone = e.target.closest(ZONE);
      const item = document.getElementById(e.dataTransfer.getData('text/plain'));
      if (!zone || !item) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      move(item, zone);
    }, true);
    document.addEventListener('dragend', () => {
      document.querySelectorAll('.dnd-source-dragging').forEach(el => el.classList.remove('dnd-source-dragging'));
      document.querySelectorAll('.dnd-over').forEach(el => el.classList.remove('dnd-over'));
      document.body.classList.remove('dnd-active');
    }, true);
  }

  function enableInteractMode() {
    activeMode = 'interact';
    window.interact(ITEM).draggable({
      listeners: {
        move(event) {
          const el = event.target;
          if (el.dataset.cytoProcessing === 'true' || el.dataset.vesselProcessing === 'true' || el.dataset.converting === 'true') return;
          const x = (parseFloat(el.dataset.dragX) || 0) + event.dx;
          const y = (parseFloat(el.dataset.dragY) || 0) + event.dy;
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.dataset.dragX = x; el.dataset.dragY = y;
        },
        end(event) {
          event.target.style.transform = '';
          delete event.target.dataset.dragX; delete event.target.dataset.dragY;
        }
      }
    });
    window.interact(ZONE).dropzone({
      overlap: 0.2,
      ondrop(event) { move(event.relatedTarget, event.target); }
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function selectEngine() {
    if ('PointerEvent' in window) {
      enablePointerMode();
      return;
    }
    try {
      await loadScript('https://unpkg.com/drag-drop-touch');
      enableNativeMode();
    } catch (error) {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js');
        enableInteractMode();
      } catch (fallbackError) {
        activeMode = 'tap-only';
      }
    }
  }

  document.addEventListener('click', e => {
    if (Date.now() < suppressClickUntil) { e.preventDefault(); return; }
    
    let item = e.target.closest(ITEM);
    const zone = e.target.closest(ZONE);
    
    if (item && (item.dataset.cytoProcessing === 'true' || item.dataset.vesselProcessing === 'true' || item.dataset.converting === 'true')) {
        item = null;
    }

    if (item) {
        clear(); selected = item; item.classList.add('dnd-selected'); 
    } else if (zone && selected) { 
        e.preventDefault(); move(selected, zone); 
    }
  });

  document.addEventListener('keydown', e => {
    let item = e.target.closest(ITEM);
    const zone = e.target.closest(ZONE);

    if (item && (item.dataset.cytoProcessing === 'true' || item.dataset.vesselProcessing === 'true' || item.dataset.converting === 'true')) {
        item = null;
    }

    if ((e.key === 'Enter' || e.key === ' ') && item) {
        e.preventDefault(); clear(); selected = item; item.classList.add('dnd-selected'); 
    } else if ((e.key === 'Enter' || e.key === ' ') && zone && selected) { 
        e.preventDefault(); move(selected, zone); 
    } else if (e.key === 'Escape') {
        clear();
    }
  });

  function init() {
    document.querySelectorAll(ITEM).forEach(el => { el.draggable=false; el.tabIndex=0; el.setAttribute('role','button'); el.style.touchAction='none'; });
    document.querySelectorAll(ZONE).forEach(el => { el.tabIndex=0; el.setAttribute('role','group'); });
    selectEngine();
  }

  document.addEventListener('DOMContentLoaded',init);
  window.ZziritDnD={init,move,clear,get activeMode(){ return activeMode; }};
}());