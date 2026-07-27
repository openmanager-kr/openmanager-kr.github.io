/* ===========================================================
   오픈매니저 메일 발송 설정 (EmailJS)
   설정 완료됨 — 2026.07.24
   =========================================================== */

window.OM_MAIL = {
  // EmailJS Public Key
  publicKey:  'qOfZHVKU_P3SSyuQW',

  // Email Service (Gmail)
  serviceId:  'service_sgersg',

  // 템플릿 ① 가입신청 알림 → 관리자에게 발송
  tplSignup:  'template_9d5c7hh',

  // 템플릿 ② 승인 완료 안내 → 신청 회사에 발송
  tplApproved:'template_dmntkef',

  // 가입신청 알림을 받을 관리자 이메일
  adminEmail: 'sgersg@naver.com'
};
