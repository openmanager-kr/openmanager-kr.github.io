/* ===========================================================
   오픈매니저 모바일 UI 유틸
   - 모바일 헤더 + 슬라이드 사이드 메뉴(드로어)
   - 외부 클릭 / ESC / 메뉴 선택 시 자동 닫힘
   - 열렸을 때 배경 스크롤 잠금
   - 데스크톱(md 이상)에서는 기존 좌측 사이드바 그대로 유지
   =========================================================== */
(function(){
  let opened = false;

  function el(id){ return document.getElementById(id); }

  window.omDrawerOpen = function(){
    const side = el('omSidebar'), ov = el('omOverlay');
    if(!side) return;
    side.classList.remove('-translate-x-full');
    if(ov){ ov.classList.remove('hidden'); requestAnimationFrame(()=>ov.classList.remove('opacity-0')); }
    opened = true;
    syncScrollLock();
  };

  window.omDrawerClose = function(){
    const side = el('omSidebar'), ov = el('omOverlay');
    if(!side) return;
    // 데스크톱에서는 항상 열린 상태이므로 클래스만 정리
    if(window.matchMedia('(min-width: 768px)').matches){
      opened = false;
      syncScrollLock();
      return;
    }
    side.classList.add('-translate-x-full');
    if(ov){
      ov.classList.add('opacity-0');
      setTimeout(()=>ov.classList.add('hidden'), 200);
    }
    opened = false;
    setTimeout(syncScrollLock, 210);
  };

  window.omDrawerToggle = function(){ opened ? omDrawerClose() : omDrawerOpen(); };

  // ESC 로 닫기
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && opened) omDrawerClose(); });

  // 메뉴 선택 시 자동 닫힘 (사이드바 내부 버튼/링크 클릭)
  document.addEventListener('click', e => {
    const side = el('omSidebar');
    if(!side || !opened) return;
    const t = e.target.closest('button, a');
    if(t && side.contains(t) && !t.hasAttribute('data-keep-open')) omDrawerClose();
  });

  // 데스크톱으로 넓어지면 잠금 해제
  window.addEventListener('resize', () => {
    if(window.matchMedia('(min-width: 768px)').matches && opened) omDrawerClose();
  });

  // ── 모달이 열리면 배경 스크롤 잠금 (모든 모달에 자동 적용) ──
  function anyModalOpen(){
    return [...document.querySelectorAll('.fixed.inset-0')].some(el => {
      if(el.classList.contains('hidden')) return false;
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
  }
  function syncScrollLock(){
    document.body.style.overflow = anyModalOpen() ? 'hidden' : '';
  }
  const mo = new MutationObserver(syncScrollLock);
  document.addEventListener('DOMContentLoaded', () => {
    mo.observe(document.body, { attributes:true, attributeFilter:['class','style'],
                                childList:true, subtree:true });
    syncScrollLock();
  });
  window.omSyncScrollLock = syncScrollLock;

  // ===== 홈 화면에 앱으로 추가 =====
  let installEvent = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvent = e;                 // 안드로이드·크롬: 나중에 버튼으로 띄운다
    showInstallBar();
  });

  window.addEventListener('appinstalled', () => { hideInstallBar(); installEvent = null; });

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
  }
  function isIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function dismissed(){
    try{ return localStorage.getItem('omInstallHidden') === '1'; }catch(e){ return false; }
  }

  function showInstallBar(){
    if(isStandalone() || dismissed() || document.getElementById('omInstallBar')) return;
    const bar = document.createElement('div');
    bar.id = 'omInstallBar';
    bar.className = 'fixed bottom-0 inset-x-0 z-[90] md:hidden bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3';
    bar.innerHTML = `
      <img src="icon-192.png" alt="" class="w-9 h-9 rounded-lg border border-slate-100 shrink-0">
      <div class="flex-1 min-w-0">
        <div class="text-[13px] font-bold text-slate-800">홈 화면에 추가</div>
        <div class="text-[11.5px] text-slate-400 break-keep">앱처럼 바로 열 수 있습니다</div>
      </div>
      <button onclick="omInstall()" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-bold transition shrink-0">추가</button>
      <button onclick="omInstallDismiss()" aria-label="닫기" class="text-slate-300 hover:text-slate-500 text-lg leading-none shrink-0 px-1">&times;</button>`;
    document.body.appendChild(bar);
  }
  function hideInstallBar(){
    const b = document.getElementById('omInstallBar');
    if(b) b.remove();
  }

  /**
   * 상시 설치 버튼 — 원하는 위치에 넣어두면 언제든 설치할 수 있다
   * @param {string} elId  버튼을 넣을 요소 id
   * @param {string} style 'full'(전체폭) | 'inline'(작게)
   */
  window.renderInstallButton = function(elId, style){
    const el = document.getElementById(elId);
    if(!el) return;
    // 이미 앱으로 실행 중이면 버튼을 숨긴다
    if(isStandalone()){ el.innerHTML = ''; el.classList.add('hidden'); return; }
    el.classList.remove('hidden');

    if(style === 'inline'){
      el.innerHTML = `
        <button type="button" onclick="omInstall()"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200
                 text-slate-500 text-[12.5px] font-semibold hover:bg-slate-50 hover:text-indigo-600 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 8v6M9.5 11.5L12 14l2.5-2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          홈 화면에 추가
        </button>`;
    }else{
      el.innerHTML = `
        <button type="button" onclick="omInstall()"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40
                 hover:bg-indigo-50 transition text-left">
          <img src="icon-192.png" alt="" class="w-10 h-10 rounded-lg border border-white shrink-0">
          <span class="flex-1 min-w-0">
            <span class="block text-[13.5px] font-bold text-slate-800">홈 화면에 추가하기</span>
            <span class="block text-[12px] text-slate-500 mt-0.5 break-keep">앱처럼 바로 열 수 있습니다</span>
          </span>
          <span class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[12.5px] font-bold shrink-0">추가</span>
        </button>`;
    }
  };

  window.omInstallDismiss = function(){
    try{ localStorage.setItem('omInstallHidden','1'); }catch(e){}
    hideInstallBar();
  };

  window.omInstall = async function(){
    if(installEvent){
      installEvent.prompt();
      await installEvent.userChoice;
      installEvent = null;
      hideInstallBar();
      return;
    }
    // 자동 설치를 지원하지 않는 브라우저(사파리 등)는 방법을 안내한다
    showInstallGuide();
  };

  /** 설치 방법 안내 (아이폰·미지원 브라우저용) */
  function showInstallGuide(){
    const ios = isIOS();
    let box = document.getElementById('omInstallGuide');
    if(!box){
      box = document.createElement('div');
      box.id = 'omInstallGuide';
      box.className = 'fixed inset-0 bg-slate-900/50 flex items-center justify-center px-4 py-8 z-[300]';
      box.onclick = e => { if(e.target===box) box.remove(); };
      document.body.appendChild(box);
    }
    const steps = ios
      ? [['화면 아래 <b>공유 버튼</b>을 누릅니다', '아래쪽 가운데 ↑ 모양'],
         ['<b>「홈 화면에 추가」</b>를 선택합니다', '목록을 아래로 내리면 있습니다'],
         ['오른쪽 위 <b>「추가」</b>를 누릅니다', '']]
      : [['브라우저 <b>메뉴(⋮)</b>를 엽니다', '오른쪽 위'],
         ['<b>「홈 화면에 추가」</b> 또는 <b>「앱 설치」</b>를 선택합니다', ''],
         ['<b>「추가」</b>를 누릅니다', '']];
    box.innerHTML = `
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 my-auto">
        <div class="flex items-center gap-2.5">
          <img src="icon-192.png" alt="" class="w-10 h-10 rounded-lg border border-slate-100">
          <div class="min-w-0">
            <h3 class="font-bold text-slate-900 text-[15px]">홈 화면에 추가</h3>
            <p class="text-[12px] text-slate-400 mt-0.5">앱처럼 바로 열 수 있습니다</p>
          </div>
        </div>
        <div class="mt-5 space-y-3">
          ${steps.map((s,i)=>`
            <div class="flex gap-3">
              <span class="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">${i+1}</span>
              <span class="text-[13px] text-slate-600 break-keep flex-1">${s[0]}
                ${s[1] ? `<span class="block text-[11.5px] text-slate-400 mt-0.5">${s[1]}</span>` : ''}
              </span>
            </div>`).join('')}
        </div>
        <button onclick="document.getElementById('omInstallGuide').remove()"
          class="w-full mt-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition">확인</button>
      </div>`;
  }

  // 설치 버튼이 화면에 상시 노출되므로, 자동 안내 바는 첫 방문 때만 가볍게 띄운다
  document.addEventListener('DOMContentLoaded', () => {
    if(isIOS() && !isStandalone() && !dismissed()) setTimeout(showInstallBar, 2000);
  });

  /** 현재 기기 구분 — 광고 통계·소재 분기용 */
  window.omDevice = function(){
    return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
  };
})();
