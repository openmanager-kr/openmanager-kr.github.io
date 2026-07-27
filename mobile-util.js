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
    document.body.style.overflow = 'hidden';
    opened = true;
  };

  window.omDrawerClose = function(){
    const side = el('omSidebar'), ov = el('omOverlay');
    if(!side) return;
    // 데스크톱에서는 항상 열린 상태이므로 클래스만 정리
    if(window.matchMedia('(min-width: 768px)').matches){
      document.body.style.overflow = '';
      opened = false;
      return;
    }
    side.classList.add('-translate-x-full');
    if(ov){
      ov.classList.add('opacity-0');
      setTimeout(()=>ov.classList.add('hidden'), 200);
    }
    document.body.style.overflow = '';
    opened = false;
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

  /** 현재 기기 구분 — 광고 통계·소재 분기용 */
  window.omDevice = function(){
    return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
  };
})();
