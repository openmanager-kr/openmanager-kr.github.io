/* ===========================================================
   오픈매니저 공통 전화번호 유틸
   - type="tel" 입력란은 자동으로 하이픈이 적용됩니다
   - 새로 추가되는 입력란(모달 등)에도 자동 적용
   =========================================================== */
(function(){
  function fmtPhone(v){
    const d = String(v||'').replace(/\D/g,'').slice(0,11);
    if(!d) return '';
    // 서울 02
    if(d.startsWith('02')){
      if(d.length<3)  return d;
      if(d.length<6)  return d.slice(0,2)+'-'+d.slice(2);
      if(d.length<10) return d.slice(0,2)+'-'+d.slice(2,d.length-4)+'-'+d.slice(-4);
      return d.slice(0,2)+'-'+d.slice(2,6)+'-'+d.slice(6,10);
    }
    // 15xx / 16xx / 18xx 대표번호
    if(/^1[5678]\d{2}/.test(d) && d.length<=8){
      return d.length<=4 ? d : d.slice(0,4)+'-'+d.slice(4,8);
    }
    // 그 외 (010, 지역번호 3자리 등)
    if(d.length<4)  return d;
    if(d.length<8)  return d.slice(0,3)+'-'+d.slice(3);
    if(d.length<11) return d.slice(0,3)+'-'+d.slice(3,6)+'-'+d.slice(6);
    return d.slice(0,3)+'-'+d.slice(3,7)+'-'+d.slice(7);
  }
  window.fmtPhone = fmtPhone;

  // 모든 tel 입력란에 자동 적용 (동적으로 생긴 것 포함)
  document.addEventListener('input', function(e){
    const el = e.target;
    if(el && el.tagName==='INPUT' && el.type==='tel'){
      const pos = el.selectionStart, before = el.value;
      el.value = fmtPhone(el.value);
      if(pos === before.length) el.setSelectionRange(el.value.length, el.value.length);
    }
  }, true);

  // 값이 코드로 채워진 경우(수정 모달 등)도 정리
  window.normalizeTelInputs = function(root){
    (root||document).querySelectorAll('input[type=tel]').forEach(el=>{
      if(el.value) el.value = fmtPhone(el.value);
    });
  };
})();
