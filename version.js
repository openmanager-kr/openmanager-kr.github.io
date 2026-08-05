/* ===========================================================
   오픈매니저 버전 정보
   - 업데이트할 때마다 OM_VERSION 과 OM_CHANGELOG 맨 위에 추가
   - 화면 하단과 [업데이트 내역]에 자동 반영됨
   =========================================================== */

window.OM_VERSION = '1.1.3';
window.OM_RELEASED = '2026-08-03';

/**
 * 버전 표기 규칙 (예: 1.2.3)
 *   1 (큰 자리) — 서비스 구조가 크게 바뀔 때
 *   2 (가운데) — 새 기능이 추가될 때
 *   3 (끝자리) — 오류 수정·문구 변경 등 작은 개선
 *
 * type: 'feature'(신규) | 'improve'(개선) | 'fix'(수정)
 */
window.OM_CHANGELOG = [
  {
    version: '1.1.3',
    date: '2026-08-03',
    title: '보안 강화 · 휴대폰 사용 편의 개선',
    items: [
      { type:'feature', text:'1시간 동안 사용하지 않으면 자동으로 로그아웃됩니다 (공용 PC 보안)' },
      { type:'improve', text:'홈 화면 앱 아이콘에 서비스 이름을 넣어 찾기 쉽게 했습니다' },
      { type:'fix',     text:'휴대폰에서 메뉴 하단이 잘려 보이던 문제를 수정했습니다' },
      { type:'feature', text:'홈 화면에 추가 — 앱처럼 바로 열 수 있습니다' },
      { type:'improve', text:'연락 예정·오픈 지연 알림이 휴대폰에서 보기 편하게 정리되었습니다' },
      { type:'improve', text:'등록·수정 창의 저장·취소 버튼이 항상 화면에 보입니다' },
      { type:'improve', text:'새로고침해도 보던 화면이 그대로 유지됩니다' },
      { type:'feature', text:'약관이 개정되면 재동의 안내가 표시됩니다' }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-07-31',
    title: '오픈매니저 첫 공개',
    items: [
      { type:'feature', text:'상담 관리 · 매장 관리 · 오픈 관리 · 파트너사 매칭 · POS 관리' },
      { type:'feature', text:'점주 공유 페이지 — 로그인 없이 진행 현황 열람' },
      { type:'feature', text:'엑셀 내보내기 · 가져오기 (미리보기 확인 후 반영)' },
      { type:'feature', text:'삭제 보관함 — 실수로 지워도 30일 내 복원' },
      { type:'feature', text:'휴대폰 화면 지원' }
    ]
  }
];

(function(){
  const TYPE = {
    feature: { label:'신규', cls:'bg-indigo-50 text-indigo-600' },
    improve: { label:'개선', cls:'bg-emerald-50 text-emerald-600' },
    fix:     { label:'수정', cls:'bg-amber-50 text-amber-700' }
  };
  const esc = v => String(v??'').replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /** 마지막으로 확인한 버전 (새 업데이트 표시용) */
  function lastSeen(){
    try{ return localStorage.getItem('omSeenVersion') || ''; }catch(e){ return ''; }
  }
  function markSeen(){
    try{ localStorage.setItem('omSeenVersion', OM_VERSION); }catch(e){}
  }
  window.omHasUpdate = function(){ return lastSeen() !== OM_VERSION; };

  /** 업데이트 내역 보기 */
  window.showChangelog = function(){
    let box = document.getElementById('omChangelog');
    if(!box){
      box = document.createElement('div');
      box.id = 'omChangelog';
      box.className = 'fixed inset-0 bg-slate-900/50 flex items-center justify-center px-4 py-8 z-[300]';
      box.onclick = e => { if(e.target===box) box.remove(); };
      document.body.appendChild(box);
    }
    const body = OM_CHANGELOG.map((r, i) => `
      <div class="${i ? 'mt-6 pt-6 border-t border-slate-100' : ''}">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[12px] font-extrabold">v${esc(r.version)}</span>
          <span class="text-[12.5px] text-slate-400">${esc(r.date)}</span>
          ${i===0 ? '<span class="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold">최신</span>' : ''}
        </div>
        ${r.title ? `<div class="text-[14px] font-bold text-slate-800 mt-2 break-keep">${esc(r.title)}</div>` : ''}
        <ul class="mt-2.5 space-y-1.5">
          ${r.items.map(it => {
            const t = TYPE[it.type] || TYPE.improve;
            return `<li class="flex gap-2 items-start">
              <span class="px-1.5 py-0.5 rounded ${t.cls} text-[10.5px] font-bold shrink-0 mt-0.5">${t.label}</span>
              <span class="text-[13px] text-slate-600 leading-relaxed break-keep">${esc(it.text)}</span>
            </li>`;
          }).join('')}
        </ul>
      </div>`).join('');

    box.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full max-h-[85dvh] flex flex-col">
        <div class="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div class="min-w-0">
            <h3 class="font-bold text-slate-900 text-[15px]">업데이트 내역</h3>
            <p class="text-[12px] text-slate-400 mt-0.5">현재 버전 v${esc(OM_VERSION)}</p>
          </div>
          <button onclick="document.getElementById('omChangelog').remove()" aria-label="닫기"
            class="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0">&times;</button>
        </div>
        <div class="px-6 py-5 overflow-y-auto overscroll-contain">${body}</div>
        <div class="px-6 py-4 border-t border-slate-100 shrink-0">
          <p class="text-[12px] text-slate-400 leading-relaxed break-keep mb-3">
            개선하고 싶은 점이 있으시면 언제든 알려주세요. 검토 후 반영해 드립니다.
          </p>
          <div class="flex gap-2">
            <button onclick="openContact('ask')"
              class="flex-1 py-2.5 rounded-lg border border-indigo-200 text-indigo-600 text-[13px] font-bold hover:bg-indigo-50 transition">건의하기</button>
            <button onclick="document.getElementById('omChangelog').remove()"
              class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition">닫기</button>
          </div>
        </div>
      </div>`;
    markSeen();
    document.querySelectorAll('.om-update-dot').forEach(d => d.classList.add('hidden'));
  };

  /** 하단 버전 표시 — renderFooter 뒤에 호출 */
  window.renderVersion = function(elId, tone){
    const el = document.getElementById(elId);
    if(!el) return;
    const dark = tone === 'dark';
    const cls = dark ? 'text-slate-500 hover:text-indigo-300' : 'text-slate-400 hover:text-indigo-600';
    el.innerHTML = `
      <button type="button" onclick="showChangelog()"
        class="inline-flex items-center gap-1.5 text-[10.5px] font-semibold ${cls} transition">
        v${esc(OM_VERSION)}
        <span class="om-update-dot ${omHasUpdate() ? '' : 'hidden'} w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
      </button>`;
  };
})();
