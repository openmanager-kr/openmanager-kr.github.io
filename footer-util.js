/* ===========================================================
   오픈매니저 공통 푸터
   - 회사 정보 / 문의 채널 / 로고
   - 사업자등록 후 아래 OM_COMPANY 값만 채우면 자동 반영됨
   =========================================================== */
(function(){
  // ── 회사 정보 (확정되는 대로 값만 채우면 됨. 빈 값은 자동으로 숨겨짐) ──
  window.OM_COMPANY = {
    serviceName : '오픈매니저 OpenManager',
    companyName : '',            // 예: '오픈매니저'
    ceo         : '',            // 예: '감병주'
    bizNo       : '',            // 예: '000-00-00000'
    address     : '',
    tel         : '',
    email       : 'sgersg@naver.com',   // 문의·건의 채널 (필수)
    adEmail     : 'sgersg@naver.com'    // 광고 문의
  };

  const esc = s => String(s??'').replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /**
   * 푸터 렌더링
   * @param {string} elId  삽입할 요소 id
   * @param {string} tone  'light' (밝은 배경) | 'dark' (어두운 사이드바)
   */
  window.renderFooter = function(elId, tone){
    const el = document.getElementById(elId);
    if(!el) return;
    const c = OM_COMPANY;
    const dark = tone === 'dark';

    const rows = [];
    if(c.companyName) rows.push(`상호 ${esc(c.companyName)}`);
    if(c.ceo)         rows.push(`대표 ${esc(c.ceo)}`);
    if(c.bizNo)       rows.push(`사업자등록번호 ${esc(c.bizNo)}`);
    if(c.address)     rows.push(esc(c.address));
    if(c.tel)         rows.push(`전화 ${esc(c.tel)}`);

    const logo = dark ? 'logo-symbol-white.png' : 'logo-symbol.png';
    const tCls = dark ? 'text-slate-500' : 'text-slate-400';
    const lCls = dark ? 'text-slate-400 hover:text-indigo-300' : 'text-slate-500 hover:text-indigo-600';

    el.innerHTML = `
      <div class="flex items-start gap-2.5">
        <img src="${logo}" alt="오픈매니저" class="w-8 h-6 object-contain shrink-0 opacity-70">
        <div class="min-w-0">
          <div class="text-[11.5px] font-bold ${tCls}">${esc(c.serviceName)}</div>
          ${rows.length ? `<div class="text-[10.5px] ${tCls} mt-1 leading-relaxed">${rows.join(' · ')}</div>` : ''}
          <div class="text-[10.5px] mt-1.5 space-x-2">
            <button type="button" onclick="openContact('ask')" class="${lCls} font-semibold transition">문의·건의</button>
            <span class="${tCls}">|</span>
            <button type="button" onclick="openContact('ad')" class="${lCls} font-semibold transition">광고 문의</button>
          </div>
          <div class="text-[10px] ${tCls} mt-1.5">© ${new Date().getFullYear()} ${esc(c.serviceName)}</div>
        </div>
      </div>`;
  };

  /** 문의 안내 팝업 — 메일 앱이 없어도 주소 복사가 가능하도록 */
  window.openContact = function(kind){
    const c = OM_COMPANY;
    const isAd = kind === 'ad';
    const addr = isAd ? c.adEmail : c.email;
    const title = isAd ? '광고 게재 문의' : '문의 · 건의';
    const desc = isAd
      ? '오픈매니저 광고 지면 게재를 원하시면 아래 이메일로 연락해 주세요. 지면 종류와 희망 기간을 알려주시면 안내해 드립니다.'
      : '서비스 이용 중 불편한 점이나 개선 아이디어가 있으시면 아래 이메일로 보내주세요. 확인 후 답변드리겠습니다.';

    let box = document.getElementById('omContactBox');
    if(!box){
      box = document.createElement('div');
      box.id = 'omContactBox';
      box.className = 'fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-[200]';
      box.onclick = e => { if(e.target===box) box.remove(); };
      document.body.appendChild(box);
    }
    const info = [];
    if(c.companyName) info.push(`상호 ${esc(c.companyName)}`);
    if(c.ceo)         info.push(`대표 ${esc(c.ceo)}`);
    if(c.bizNo)       info.push(`사업자등록번호 ${esc(c.bizNo)}`);
    if(c.tel)         info.push(`전화 ${esc(c.tel)}`);

    box.innerHTML = `
      <div class="bg-white rounded-2xl max-w-sm w-full p-7">
        <div class="flex items-center gap-2.5">
          <img src="logo-symbol.png" alt="" class="w-9 h-7 object-contain">
          <h3 class="font-bold text-slate-900 text-[15px]">${title}</h3>
        </div>
        <p class="text-[12.5px] text-slate-500 mt-3 leading-relaxed">${desc}</p>
        <div class="mt-4">
          <div class="text-[12.5px] font-semibold text-slate-600 mb-1.5">이메일</div>
          <div class="flex gap-2">
            <input readonly value="${esc(addr)}" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-600 select-all">
            <button onclick="omCopyContact(this,'${esc(addr)}')" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition shrink-0">복사</button>
          </div>
          <a href="mailto:${esc(addr)}?subject=[오픈매니저] ${encodeURIComponent(title)}"
             class="block mt-2 text-center text-[12px] text-slate-400 hover:text-indigo-600 transition">메일 앱으로 바로 열기</a>
        </div>
        ${info.length ? `<div class="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">${info.join(' · ')}</div>` : ''}
        <button onclick="document.getElementById('omContactBox').remove()"
          class="w-full mt-5 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">닫기</button>
      </div>`;
  };

  window.omCopyContact = function(btn, addr){
    navigator.clipboard.writeText(addr).then(()=>{
      const t = btn.textContent; btn.textContent='복사됨';
      setTimeout(()=>btn.textContent=t, 1500);
    }).catch(()=>alert(addr));
  };
})();