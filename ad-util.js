/* ===========================================================
   오픈매니저 공통 광고 유틸
   - 지면(slot)에 게재중인 광고를 찾아 렌더링
   - 광고가 없으면 "광고 문의" 플레이스홀더 표시
     → 지면 위치가 항상 눈에 보이고, 동시에 광고 영업 채널이 됨
   =========================================================== */
(function(){
  // 지면 정의 (설계문서 5-1 기준)
  window.OM_AD_SLOTS = {
    store_view_top:   { grade:'S', label:'점주페이지 상단', size:'banner', px:'1200 x 200', price:100000, who:'점주' },
    store_view_left:  { grade:'S', label:'점주페이지 좌측', size:'tower',  px:'300 x 1050', price:100000, who:'점주' },
    store_view_right: { grade:'S', label:'점주페이지 우측', size:'tower',  px:'300 x 1050', price:100000, who:'점주' },
    main_top:         { grade:'A', label:'메인 상단',       size:'banner', px:'1200 x 200', price:80000,  who:'본부 관리자' },
    main_right:       { grade:'A', label:'메인 우측',       size:'tower',  px:'300 x 1050', price:80000,  who:'본부 관리자' },
    tab_dashboard_bottom:        { grade:'B', label:'탭 하단',           size:'banner', px:'1200 x 200', price:60000, who:'본부 관리자' },
    integrated_dashboard_bottom: { grade:'B', label:'통합 대시보드 하단', size:'banner', px:'1200 x 200', price:60000, who:'본부 관리자' },
    tab_new_bottom:   { grade:'C', label:'신규등록 화면 하단', size:'banner', px:'1200 x 200', price:50000, who:'본부 관리자' }
  };

  // 광고 문의 연락처 (푸터와 동일)
  window.OM_AD_CONTACT = 'sgersg@naver.com';

  const esc = s => String(s??'').replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let adCache = null;

  /** 게재중인 광고 목록 로드 (1회 캐시) */
  window.loadAdsOnce = async function(db, getDocs, collection){
    if(adCache) return adCache;
    try{
      const snap = await getDocs(collection(db,'ads'));
      const today = new Date();
      const t = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      adCache = snap.docs.map(d=>d.data())
        .filter(a => a.active !== false && (a.startDate||'') <= t && (a.endDate||'') >= t);
    }catch(e){
      console.warn('광고 로드 실패:', e);
      adCache = [];
    }
    return adCache;
  };

  /** 지면 렌더링 — 광고 있으면 배너, 없으면 문의 플레이스홀더 */
  window.renderAdSlot = function(elId, slot){
    const el = document.getElementById(elId);
    if(!el) return;
    const meta = OM_AD_SLOTS[slot] || { grade:'-', label:slot, size:'banner' };
    const ad = (adCache||[]).find(a => a.slot === slot);

    if(ad){
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      // 모바일 소재가 있으면 우선 사용, 없으면 PC 소재를 잘라내지 않고 contain 으로 표시
      const src  = (isMobile && ad.mobileImageUrl) ? ad.mobileImageUrl : (ad.imageUrl || ad.desktopImageUrl);
      const link = (isMobile && ad.mobileLinkUrl)  ? ad.mobileLinkUrl  : ad.linkUrl;
      const fit  = (isMobile && !ad.mobileImageUrl) ? 'object-contain bg-slate-50' : 'object-cover';
      const imgCls = meta.size === 'tower'
        ? 'w-full rounded-xl border border-slate-200'
        : `w-full max-h-24 ${fit} rounded-xl border border-slate-200`;
      // 로딩 중 높이 변동 방지
      const ratio = meta.size === 'tower' ? '' : 'style="aspect-ratio:6/1"';
      el.innerHTML =
        `<a href="${esc(link)}" target="_blank" rel="noopener sponsored" class="block">
           <img src="${esc(src)}" alt="${esc(ad.company||ad.advertiser||'광고')}" class="${imgCls}" ${ratio}
                onerror="this.parentElement.parentElement.innerHTML=''">
         </a>
         <div class="text-[10px] text-slate-300 text-center mt-0.5">광고 · AD</div>`;
      return;
    }

    // 빈 지면 — 위치 표시 + 광고 문의 안내 (클릭 시 안내 팝업)
    const tower = meta.size === 'tower';
    const box = tower ? 'w-full h-full min-h-[420px] py-8 px-3 flex flex-col items-center justify-center text-center'
                      : 'w-full py-4 px-4 text-center';
    el.innerHTML =
      `<button type="button" onclick="openAdInquiry('${slot}')"
          class="${box} rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition group cursor-pointer">
         <div class="text-[11px] font-bold text-slate-300 group-hover:text-indigo-400 transition">${meta.grade}급 · ${esc(meta.label)}</div>
         <div class="text-[12px] text-slate-400 group-hover:text-indigo-500 transition mt-1 ${tower?'leading-relaxed':''}">이 자리에 광고를<br class="${tower?'':'hidden'}"> 게재하실 수 있습니다</div>
         <div class="text-[11px] text-slate-300 group-hover:text-indigo-400 transition mt-1.5">문의 : ${OM_AD_CONTACT}</div>
         <div class="text-[10.5px] text-indigo-300 opacity-0 group-hover:opacity-100 transition mt-1.5 font-bold">클릭하면 안내를 볼 수 있어요</div>
       </button>`;
  };

  /** 광고 문의 안내 팝업 (mailto 미작동 환경 대비 — 주소 복사 제공) */
  window.openAdInquiry = function(slot){
    const m = OM_AD_SLOTS[slot] || {};
    let box = document.getElementById('omAdInquiry');
    if(!box){
      box = document.createElement('div');
      box.id = 'omAdInquiry';
      box.className = 'fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-[200]';
      box.onclick = e => { if(e.target===box) box.remove(); };
      document.body.appendChild(box);
    }
    const price = m.price ? m.price.toLocaleString('ko-KR') : '-';
    box.innerHTML =
      `<div class="bg-white rounded-2xl max-w-sm w-full p-7">
         <h3 class="font-bold text-slate-900 text-[15px]">광고 게재 안내</h3>
         <div class="mt-4 space-y-2 text-[13px]">
           <div class="flex justify-between"><span class="text-slate-500">지면</span><b class="text-slate-800">${m.grade}급 · ${esc(m.label)}</b></div>
           <div class="flex justify-between"><span class="text-slate-500">노출 대상</span><span class="text-slate-700">${esc(m.who)}</span></div>
           <div class="flex justify-between"><span class="text-slate-500">권장 규격</span><span class="text-slate-700">${esc(m.px)} px</span></div>
           <div class="flex justify-between"><span class="text-slate-500">월 단가</span><b class="text-indigo-600">${price}원</b></div>
         </div>
         <div class="mt-4 rounded-lg bg-slate-50 px-3.5 py-3 text-[12.5px] text-slate-500 leading-relaxed">
           3개월 정가 · 6개월 10% · 12개월 20% 할인<br>
           <b class="text-slate-700">최초 1회 1개월 무료 체험</b> 가능합니다.
         </div>
         <div class="mt-4">
           <div class="text-[12.5px] font-semibold text-slate-600 mb-1.5">문의 이메일</div>
           <div class="flex gap-2">
             <input readonly value="${OM_AD_CONTACT}" class="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-600 select-all">
             <button onclick="omCopyAdEmail(this)" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition shrink-0">복사</button>
           </div>
         </div>
         <div class="flex gap-2.5 mt-5">
           <a href="ads.html" class="flex-1 py-2.5 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-bold hover:bg-indigo-50 transition text-center">전체 지면 보기</a>
           <button onclick="document.getElementById('omAdInquiry').remove()" class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">닫기</button>
         </div>
       </div>`;
  };

  window.omCopyAdEmail = function(btn){
    navigator.clipboard.writeText(OM_AD_CONTACT).then(()=>{
      const t = btn.textContent; btn.textContent = '복사됨';
      setTimeout(()=>btn.textContent = t, 1500);
    }).catch(()=>alert(OM_AD_CONTACT));
  };

  /** 여러 지면 한 번에 */
  window.renderAdSlots = function(pairs){
    pairs.forEach(([elId, slot]) => renderAdSlot(elId, slot));
  };
})();
