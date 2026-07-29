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
      adCache = snap.docs.map(d=>({ id:d.id, ...d.data() }))
        .filter(a => a.active !== false && (a.startDate||'') <= t && (a.endDate||'') >= t);
    }catch(e){
      console.warn('광고 로드 실패:', e);
      adCache = [];
    }
    return adCache;
  };

  // ===== 광고 성과 집계 =====
  // 원칙 ① 같은 기기에서 하루 1회만 카운트 (중복 방지)
  //      ② 화면에 50% 이상 1초 넘게 보여야 노출 인정
  //      ③ 개별 로그를 남기지 않고 날짜별 합계에만 +1 (쓰기 최소화)
  let _db = null, _fs = null;
  window.initAdStats = function(db, fsApi){ _db = db; _fs = fsApi; };

  function today(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  // 'omAdV2:' 접두사 — 이전 버전에서 잘못 남은 표시는 자동으로 무시됨
  const KEY = 'omAdV2:';
  function alreadyCounted(key){
    try{ return !!localStorage.getItem(KEY + key + ':' + today()); }
    catch(e){ return false; }   // 저장 불가 환경이면 매번 집계 시도
  }
  function markCounted(key){
    try{
      localStorage.setItem(KEY + key + ':' + today(), '1');
      // 7일 지난 표시 정리
      const cut = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
      Object.keys(localStorage).forEach(x=>{
        if(x.startsWith(KEY) && x.split(':').pop() < cut) localStorage.removeItem(x);
      });
    }catch(e){}
  }

  async function bump(adId, field){
    if(!_db || !_fs || !adId) return;
    const { doc, setDoc, increment } = _fs;
    const id = `${adId}_${today()}`;
    // 보안규칙이 4개 카운터의 존재와 증가폭을 검사하므로 항상 전부 포함해서 보낸다
    // (해당 항목만 +1, 나머지는 +0 → 최초 생성 시 0으로 초기화됨)
    const n = f => increment(field === f ? 1 : 0);
    try{
      await setDoc(doc(_db,'ad_daily_stats',id), {
        adId, date: today(),
        desktopImpressions: n('desktopImpressions'),
        mobileImpressions:  n('mobileImpressions'),
        desktopClicks:      n('desktopClicks'),
        mobileClicks:       n('mobileClicks')
      }, { merge:true });
      return true;
    }catch(e){
      console.warn('[오픈매니저] 광고 통계 기록 실패:', e.code || e.message, e);
      return false;
    }
  }

  /** 집계 시도 — 성공한 경우에만 "오늘 셌음" 표시 */
  async function countOnce(key, adId, field){
    if(alreadyCounted(key)) return;
    const ok = await bump(adId, field);
    if(ok){
      markCounted(key);
      console.info('[오픈매니저] 집계 기록:', field, adId);
    }
  }

  /** 노출 집계 — 화면에 실제로 보였을 때만 */
  function watchImpression(el, ad){
    if(!('IntersectionObserver' in window)) return;
    const dev = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    let timer = null;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting && en.intersectionRatio >= 0.5){
          if(timer) return;
          timer = setTimeout(() => {                    // 1초 이상 노출
            io.disconnect();
            countOnce('imp:' + ad.id, ad.id, dev + 'Impressions');
          }, 1000);
        }else{
          clearTimeout(timer); timer = null;
        }
      });
    }, { threshold:[0, 0.5, 1] });
    io.observe(el);
  }

  /** 클릭 집계 — 이동 전에 기록 */
  window.omAdClick = function(adId){
    const dev = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    countOnce('clk:' + adId, adId, dev + 'Clicks');
  };

  /** 진단용 — 브라우저 콘솔에서 omAdDebug() 실행하면 상태 확인 */
  window.omAdDebug = function(){
    console.log('DB 연결:', !!_db, '| Firestore API:', !!_fs);
    console.log('오늘 날짜:', today());
    const marks = Object.keys(localStorage).filter(k=>k.startsWith(KEY));
    console.log('오늘 집계 표시:', marks);
    console.log('표시 지우기: omAdReset()');
  };
  window.omAdReset = function(){
    Object.keys(localStorage).filter(k=>k.startsWith(KEY)).forEach(k=>localStorage.removeItem(k));
    console.log('집계 표시를 지웠습니다. 새로고침 후 다시 시도하세요.');
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
      // 업로드한 이미지(imageData)가 있으면 우선 사용, 없으면 주소 방식
      const mobileSrc  = ad.mobileImageData || ad.mobileImageUrl;
      const desktopSrc = ad.imageData || ad.imageUrl || ad.desktopImageUrl;
      const src  = (isMobile && mobileSrc) ? mobileSrc : desktopSrc;
      const link = (isMobile && ad.mobileLinkUrl)  ? ad.mobileLinkUrl  : ad.linkUrl;
      // 배너는 잘라내지 않고 전체가 보이도록 (규격이 달라도 문구가 안 잘림)
      // 규격대로(가로 6:1, 세로 2:7) 보내면 여백 없이 꽉 차고,
      // 규격이 달라도 잘리지 않도록 object-contain + 넉넉한 상한
      const imgCls = meta.size === 'tower'
        ? 'w-full h-auto max-h-[800px] object-contain rounded-xl border border-slate-200 bg-white'
        : 'w-full h-auto max-h-[200px] object-contain rounded-xl border border-slate-200 bg-white';
      const ratio = '';
      el.innerHTML =
        `<a href="${esc(link)}" target="_blank" rel="noopener sponsored" class="block"
            onclick="omAdClick('${esc(ad.id)}')">
           <img src="${esc(src)}" alt="${esc(ad.company||ad.advertiser||'광고')}" class="${imgCls}" ${ratio}
                onerror="this.parentElement.parentElement.innerHTML=''">
         </a>
         <div class="text-[10px] text-slate-300 text-center mt-0.5">광고 · AD</div>`;
      watchImpression(el, ad);
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
      `<div class="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-7 max-h-[90vh] overflow-y-auto overscroll-contain">
         <h3 class="font-bold text-slate-900 text-[15px]">광고 게재 안내</h3>
         <div class="mt-4 space-y-2 text-[13px]">
           <div class="flex justify-between gap-3"><span class="text-slate-500 shrink-0">지면</span><b class="text-slate-800 text-right">${m.grade}급 · ${esc(m.label)}</b></div>
           <div class="flex justify-between"><span class="text-slate-500 shrink-0">노출 대상</span><span class="text-slate-700 text-right">${esc(m.who)}</span></div>
           <div class="flex justify-between"><span class="text-slate-500 shrink-0">권장 규격</span><span class="text-slate-700 text-right">${esc(m.px)} px</span></div>
           <div class="flex justify-between"><span class="text-slate-500 shrink-0">월 단가</span><b class="text-indigo-600 text-right">${price}원</b></div>
         </div>
         <div class="mt-4 rounded-lg bg-slate-50 px-3.5 py-3 text-[12.5px] text-slate-500 leading-relaxed">
           6개월 정가 · 12개월 10% 할인<br>
           <b class="text-slate-700">첫 계약 시 1개월 무상 추가 게재</b> (6개월 → 7개월)
         </div>
         <div class="mt-4">
           <div class="text-[12.5px] font-semibold text-slate-600 mb-1.5">문의 이메일</div>
           <div class="flex gap-2">
             <input readonly value="${OM_AD_CONTACT}" class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-600 select-all">
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
