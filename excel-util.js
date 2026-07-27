/* ===========================================================
   오픈매니저 엑셀 백업 / 가져오기 유틸
   - SheetJS(xlsx) 기반
   - 탭별 내보내기 · 가져오기 · 중복 처리 · 업로드 전 미리보기
   =========================================================== */
(function(){
  const esc = s => String(s??'').replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /** 파일명용 날짜 */
  function stamp(){
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }

  /**
   * 엑셀 내보내기
   * @param {string} sheetName  시트 이름
   * @param {Array<{key,label}>} cols  컬럼 정의
   * @param {Array<Object>} rows  데이터
   * @param {string} fileBase  파일명 앞부분
   */
  window.exportExcel = function(sheetName, cols, rows, fileBase){
    if(typeof XLSX === 'undefined'){ alert('엑셀 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'); return; }
    if(!rows.length && !confirm('내보낼 데이터가 없습니다. 빈 양식만 저장할까요?')) return;

    const data = rows.map(r => {
      const o = {};
      cols.forEach(c => o[c.label] = r[c.key] ?? '');
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: cols.map(c=>c.label) });
    ws['!cols'] = cols.map(c => ({ wch: c.w || 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `오픈매니저_${fileBase}_${stamp()}.xlsx`);
  };

  /** 빈 양식(헤더만) 내려받기 — 가져오기용 템플릿 */
  window.exportTemplate = function(sheetName, cols, fileBase){
    const ws = XLSX.utils.json_to_sheet([], { header: cols.map(c=>c.label) });
    ws['!cols'] = cols.map(c => ({ wch: c.w || 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `오픈매니저_${fileBase}_양식.xlsx`);
  };

  /** 파일 → 행 배열 (라벨 → key 변환) */
  window.readExcel = function(file, cols){
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = e => {
        try{
          const wb = XLSX.read(e.target.result, { type:'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { defval:'', raw:false });
          const map = {}; cols.forEach(c => map[c.label] = c.key);
          const rows = raw.map(r => {
            const o = {};
            Object.keys(r).forEach(k => {
              const key = map[String(k).trim()];
              if(key) o[key] = String(r[k] ?? '').trim();
            });
            return o;
          });
          resolve(rows);
        }catch(err){ reject(err); }
      };
      fr.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
      fr.readAsArrayBuffer(file);
    });
  };

  /**
   * 가져오기 미리보기 모달
   * @param {Object} opt
   *   title, cols, rows, existing, keyOf, validate, onConfirm
   */
  window.openImportPreview = function(opt){
    const { title, rows, existing, keyOf, validate } = opt;

    const news = [], dups = [], errs = [];
    const seen = new Set();
    rows.forEach((r, i) => {
      const msg = validate ? validate(r) : null;
      if(msg){ errs.push({ i:i+2, r, msg }); return; }
      const k = keyOf(r);
      if(seen.has(k)){ errs.push({ i:i+2, r, msg:'파일 내 중복' }); return; }
      seen.add(k);
      (existing.some(e => keyOf(e) === k) ? dups : news).push(r);
    });

    let box = document.getElementById('omImportBox');
    if(!box){
      box = document.createElement('div');
      box.id = 'omImportBox';
      box.className = 'fixed inset-0 bg-slate-900/40 flex items-center justify-center px-4 z-[200] overflow-y-auto py-8';
      document.body.appendChild(box);
    }
    box.innerHTML = `
      <div class="bg-white rounded-2xl max-w-lg w-full p-7 my-auto">
        <h3 class="font-bold text-slate-900 text-[15px]">${esc(title)} 가져오기 확인</h3>
        <p class="text-[12.5px] text-slate-500 mt-1.5">아래 내용대로 반영됩니다. 확인 후 진행해 주세요.</p>

        <div class="grid grid-cols-3 gap-3 mt-5">
          <div class="border border-emerald-200 bg-emerald-50 rounded-xl p-4 text-center">
            <div class="text-[11.5px] font-semibold text-emerald-700">신규 추가</div>
            <div class="text-2xl font-extrabold text-emerald-600 mt-1">${news.length}</div>
          </div>
          <div class="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
            <div class="text-[11.5px] font-semibold text-amber-700">기존과 중복</div>
            <div class="text-2xl font-extrabold text-amber-600 mt-1">${dups.length}</div>
          </div>
          <div class="border border-rose-200 bg-rose-50 rounded-xl p-4 text-center">
            <div class="text-[11.5px] font-semibold text-rose-700">오류·제외</div>
            <div class="text-2xl font-extrabold text-rose-600 mt-1">${errs.length}</div>
          </div>
        </div>

        ${dups.length ? `
        <div class="mt-5">
          <div class="text-[12.5px] font-semibold text-slate-600 mb-2">중복된 ${dups.length}건을 어떻게 할까요?</div>
          <label class="flex items-start gap-2 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
            <input type="radio" name="omDupMode" value="skip" checked class="mt-0.5 accent-indigo-600">
            <span class="text-[13px]"><b class="text-slate-800">건너뛰기</b>
              <span class="block text-[12px] text-slate-400 mt-0.5">기존 데이터를 그대로 두고, 새 항목만 추가합니다. (권장)</span></span>
          </label>
          <label class="flex items-start gap-2 p-3 mt-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
            <input type="radio" name="omDupMode" value="overwrite" class="mt-0.5 accent-indigo-600">
            <span class="text-[13px]"><b class="text-slate-800">덮어쓰기</b>
              <span class="block text-[12px] text-slate-400 mt-0.5">파일 내용으로 기존 데이터를 갱신합니다. 되돌릴 수 없습니다.</span></span>
          </label>
        </div>` : ''}

        ${errs.length ? `
        <div class="mt-5 border border-rose-200 bg-rose-50 rounded-xl p-3.5 max-h-40 overflow-y-auto">
          <div class="text-[12.5px] font-bold text-rose-700 mb-1.5">제외되는 행 (${errs.length}건)</div>
          ${errs.slice(0,20).map(e=>`<div class="text-[12px] text-rose-600">· ${e.i}행 — ${esc(e.msg)}</div>`).join('')}
          ${errs.length>20 ? `<div class="text-[12px] text-rose-400 mt-1">외 ${errs.length-20}건</div>` : ''}
        </div>` : ''}

        <div class="mt-5 text-[12px] text-slate-400 leading-relaxed">
          ※ 가져오기 전에 <b class="text-slate-600">내보내기로 백업</b>해 두시길 권합니다.
        </div>

        <p id="omImportMsg" class="hidden mt-3 text-[13px] font-medium"></p>
        <div class="flex gap-2.5 mt-5">
          <button onclick="document.getElementById('omImportBox').remove()"
            class="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition">취소</button>
          <button id="omImportBtn" class="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition">
            ${news.length + dups.length}건 반영하기
          </button>
        </div>
      </div>`;

    document.getElementById('omImportBtn').onclick = async () => {
      const mode = (document.querySelector('input[name=omDupMode]:checked')||{}).value || 'skip';
      const btn = document.getElementById('omImportBtn');
      const msg = document.getElementById('omImportMsg');
      btn.disabled = true; btn.textContent = '반영 중...';
      try{
        const n = await opt.onConfirm(news, dups, mode);
        box.remove();
        alert(`가져오기 완료 — ${n}건이 반영되었습니다.`);
      }catch(e){
        msg.textContent = '반영 실패: ' + (e.message || e.code || '알 수 없는 오류');
        msg.className = 'mt-3 text-[13px] font-medium text-rose-600';
        btn.disabled = false; btn.textContent = '다시 시도';
      }
    };
  };

  /** 파일 선택 → 읽기 → 미리보기 (한 번에) */
  window.pickAndPreview = function(opt){
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = async () => {
      const f = inp.files[0];
      if(!f) return;
      try{
        const rows = await readExcel(f, opt.cols);
        if(!rows.length){ alert('읽을 수 있는 데이터가 없습니다.\n첫 행에 항목명(헤더)이 있는지 확인해 주세요.'); return; }
        openImportPreview({ ...opt, rows });
      }catch(e){
        alert('파일을 읽지 못했습니다: ' + (e.message||e));
      }
    };
    inp.click();
  };

  /** 탭 상단 엑셀 버튼 묶음 HTML */
  window.excelButtons = function(exportFn, importFn, templateFn){
    return `<div class="flex gap-1.5">
      <button onclick="${exportFn}" title="현재 목록을 엑셀로 내려받습니다"
        class="px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-[12.5px] font-bold hover:bg-emerald-50 transition">⬇ 내보내기</button>
      <button onclick="${importFn}" title="엑셀 파일에서 데이터를 가져옵니다"
        class="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-[12.5px] font-bold hover:bg-slate-50 transition">⬆ 가져오기</button>
      <button onclick="${templateFn}" title="가져오기용 빈 엑셀 양식을 내려받습니다"
        class="px-3 py-2 rounded-lg border border-slate-200 text-slate-400 text-[12.5px] font-bold hover:bg-slate-50 transition">양식</button>
    </div>`;
  };
})();
