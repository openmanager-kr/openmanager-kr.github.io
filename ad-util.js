/* ===========================================================
   오픈매니저 공통 광고 유틸
   - 지면(slot)에 게재중인 광고를 찾아 렌더링
   - 광고가 없으면 "광고 문의" 플레이스홀더 표시
     → 지면 위치가 항상 눈에 보이고, 동시에 광고 영업 채널이 됨
   =========================================================== */
(function(){
  // 지면 정의 (설계문서 5-1 기준)
  window.OM_AD_SLOTS = {
    store_view_top:      { size:'banner' },
    store_view_left:     { size:'tower'  },
    store_view_left_2:   { size:'tower'  },
    store_view_right:    { size:'tower'  },
    store_view_right_2:  { size:'tower'  },
    main_top:            { size:'banner' },
    main_right:          { size:'tower'  },
    main_right_2:        { size:'tower'  },
    tab_dashboard_bottom:        { size:'banner' },
    integrated_dashboard_bottom: { size:'banner' }
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
    const meta = OM_AD_SLOTS[slot] || { size:'banner' };
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

    // 빈 지면 — 광고 자리임을 알리는 안내 (등급·단가 등 내부 정보는 노출하지 않음)
    const tower = meta.size === 'tower';
    const box = tower
      ? 'w-full min-h-[420px] py-10 px-4 flex flex-col items-center justify-center text-center'
      : 'w-full py-7 px-5 flex flex-col items-center justify-center text-center';
    el.innerHTML =
      `<button type="button" onclick="openAdInquiry('${slot}')"
          class="${box} rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white
                 hover:border-indigo-300 hover:from-indigo-50/40 transition group cursor-pointer">
         <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200
                      text-[10.5px] font-bold text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-200 transition">
           <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition"></span> 광고 자리
         </span>
         <div class="text-[15px] sm:text-[16px] font-extrabold text-slate-500 group-hover:text-slate-700 transition mt-3 leading-snug break-keep">
           현재 비어 있는 자리입니다
         </div>
         <div class="text-[12.5px] text-slate-400 mt-1.5 break-keep">광고를 신청하실 수 있습니다</div>
         <span class="mt-4 inline-block px-4 py-2 rounded-lg bg-white border border-slate-200
                      text-[12.5px] font-bold text-slate-500
                      group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition">
           문의하기
         </span>
       </button>`;
  };

  /** 광고 문의 안내 팝업 (mailto 미작동 환경 대비 — 주소 복사 제공) */
  window.openAdInquiry = function(slot){
    let box = document.getElementById('omAdInquiry');
    if(!box){
      box = document.createElement('div');
      box.id = 'omAdInquiry';
      box.className = 'fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-[200] overflow-y-auto py-8';
      box.onclick = e => { if(e.target===box) box.remove(); };
      document.body.appendChild(box);
    }
    box.innerHTML =
      `<div class="bg-white rounded-2xl max-w-sm w-full p-6 sm:p-7 my-auto max-h-[90vh] overflow-y-auto overscroll-contain">
         <div class="flex items-center gap-2.5">
           <img src="logo-symbol.png" alt="" class="w-9 h-7 object-contain">
           <h3 class="font-bold text-slate-900 text-[15px]">광고 문의</h3>
         </div>
         <p class="text-[13px] text-slate-500 mt-3.5 leading-relaxed break-keep">
           오픈매니저는 프랜차이즈 <b class="text-slate-700">가맹본부와 신규 매장 점주</b>가 사용하는 서비스입니다.
           매장을 새로 여는 시점에 필요한 업종이라면 좋은 자리가 됩니다.
         </p>
         <div class="mt-4 rounded-lg bg-slate-50 px-3.5 py-3 text-[12.5px] text-slate-500 leading-relaxed break-keep">
           지면당 <b class="text-slate-700">한 광고주만</b> 게재됩니다.<br>
           PC·모바일에 함께 노출되며 추가 비용이 없습니다.
         </div>
         <div class="mt-4">
           <div class="text-[12.5px] font-semibold text-slate-600 mb-1.5">문의 이메일</div>
           <div class="flex gap-2">
             <input readonly value="${OM_AD_CONTACT}" class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[13px] text-slate-600 select-all">
             <button onclick="omCopyAdEmail(this)" class="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition shrink-0">복사</button>
           </div>
         </div>
         <div class="flex gap-2.5 mt-5">
           <a href="ads.html" class="flex-1 py-2.5 rounded-lg border border-indigo-200 text-indigo-600 text-[13px] font-bold hover:bg-indigo-50 transition text-center">자세히 보기</a>
           <button onclick="document.getElementById('omAdInquiry').remove()" class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition">닫기</button>
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
