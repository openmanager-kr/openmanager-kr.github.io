/* ===========================================================
   오픈매니저 자동 로그아웃
   - 일정 시간 아무 조작이 없으면 자동으로 로그아웃한다
   - 공용 PC에서 로그아웃하지 않고 자리를 뜨는 경우를 대비
   - 여러 탭을 열어둔 경우에도 함께 동작한다
   =========================================================== */
(function(){
  const IDLE_MIN = 60;                     // 무동작 기준 (분)
  const WARN_SEC = 60;                     // 종료 몇 초 전에 알릴지
  const KEY = 'omLastActive';              // 탭 간 공유용

  let timer = null, warnBox = null, countdown = null, onLogout = null;

  const now = () => Date.now();

  function stamp(){
    try{ localStorage.setItem(KEY, String(now())); }catch(e){}
  }
  function lastActive(){
    try{ return parseInt(localStorage.getItem(KEY) || '0', 10) || now(); }
    catch(e){ return now(); }
  }

  /** 활동 감지 — 타이머를 처음부터 다시 잰다 */
  function refresh(){
    stamp();
    closeWarn();
  }

  function closeWarn(){
    if(warnBox){ warnBox.remove(); warnBox = null; }
    if(countdown){ clearInterval(countdown); countdown = null; }
  }

  /** 종료 임박 안내 — 계속 쓸지 물어본다 */
  function showWarn(secLeft){
    if(warnBox) return;
    warnBox = document.createElement('div');
    warnBox.id = 'omIdleWarn';
    warnBox.className = 'fixed inset-0 bg-slate-900/50 flex items-center justify-center px-4 z-[400]';
    warnBox.innerHTML = `
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3 class="font-bold text-slate-900 text-[15px] mt-4">잠시 후 자동으로 로그아웃됩니다</h3>
        <p class="text-[13px] text-slate-500 mt-2 leading-relaxed break-keep">
          보안을 위해 <b class="text-slate-700">${IDLE_MIN}분간</b> 사용하지 않으면 로그아웃됩니다.<br>
          계속 이용하시려면 아래 버튼을 눌러 주세요.
        </p>
        <div class="text-[26px] font-extrabold text-amber-600 mt-3" id="omIdleCount">${secLeft}</div>
        <div class="flex gap-2.5 mt-5">
          <button onclick="omIdleLogout()"
            class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition">지금 로그아웃</button>
          <button onclick="omIdleStay()"
            class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition">계속 이용하기</button>
        </div>
      </div>`;
    document.body.appendChild(warnBox);

    let left = secLeft;
    countdown = setInterval(() => {
      left--;
      const el = document.getElementById('omIdleCount');
      if(el) el.textContent = left;
      if(left <= 0){ clearInterval(countdown); countdown = null; doLogoutNow(); }
    }, 1000);
  }

  function doLogoutNow(){
    closeWarn();
    try{ sessionStorage.setItem('omIdleOut', '1'); }catch(e){}
    if(typeof onLogout === 'function') onLogout();
  }

  window.omIdleStay = function(){ refresh(); };
  window.omIdleLogout = function(){ doLogoutNow(); };

  function tick(){
    const idleMs = now() - lastActive();
    const limitMs = IDLE_MIN * 60 * 1000;
    const leftMs = limitMs - idleMs;

    if(leftMs <= 0){ doLogoutNow(); return; }
    if(leftMs <= WARN_SEC * 1000) showWarn(Math.ceil(leftMs / 1000));
    else closeWarn();
  }

  /**
   * 자동 로그아웃 시작
   * @param {Function} logoutFn 로그아웃을 수행할 함수
   */
  window.startIdleLogout = function(logoutFn){
    onLogout = logoutFn;
    stamp();
    ['click','keydown','scroll','touchstart','mousemove','input'].forEach(ev =>
      window.addEventListener(ev, throttled, { passive:true }));
    // 다른 탭에서 활동하면 이 탭도 함께 연장된다
    window.addEventListener('storage', e => { if(e.key === KEY) closeWarn(); });
    // 화면을 다시 보게 됐을 때 즉시 확인 (절전 후 복귀 등)
    document.addEventListener('visibilitychange', () => { if(!document.hidden) tick(); });
    if(timer) clearInterval(timer);
    timer = setInterval(tick, 5000);
  };

  // 활동 감지는 자주 일어나므로 10초에 한 번만 기록
  let lastStamp = 0;
  function throttled(){
    const t = now();
    if(t - lastStamp > 10000){ lastStamp = t; stamp(); }
    if(warnBox) return;   // 경고 중에는 버튼으로만 연장
  }

  /** 자동 로그아웃으로 끝났는지 (로그인 화면에서 안내용) */
  window.wasIdleLogout = function(){
    try{
      const v = sessionStorage.getItem('omIdleOut') === '1';
      if(v) sessionStorage.removeItem('omIdleOut');
      return v;
    }catch(e){ return false; }
  };
})();
