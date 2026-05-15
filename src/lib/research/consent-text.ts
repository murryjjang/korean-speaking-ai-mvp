// v1.1 단계 10-3: 동의서 본문 (한국어·영어).
//
// 본문이 바뀌면 CONSENT_VERSION을 올린다. 본문 해시(sha256)로 저장 — 운영자가
// 어느 버전 본문에 동의했는지 감사 가능.

export const CONSENT_TEXT_KO = `한국어 말하기 학습 시험운영 참여 동의서

본 시험운영은 한국어 말하기 학습 시스템(KDLI Korean MVP)의 효용성을 확인하기 위한 목적으로 진행됩니다. 학술 연구 및 KDLI 보고에 활용됩니다.

[수집 데이터]
- 학습 활동 기록: 학습 모드·세션 시작·종료 시간
- 발화 데이터: 말하기 음성·음성 인식 텍스트·NPC 응답 텍스트
- 평가 점수: 발음·유창성·문법·어휘 등 항목별 점수와 피드백
- 도구 호출 기록: 검색·날씨·주소 등 시스템 도구 사용 내역
- 기술 정보: 동의 시점의 IP 주소(앞 24비트만 익명화 저장)와 사용자 에이전트

[데이터 활용 범위]
- 학술 연구(논문·학회 발표)
- KDLI 보고
- 시스템 개선

[보관 기간]
연구 종료 후 2년 보관. 보관 기간 종료 시 모든 식별 가능 정보는 삭제됩니다.

[익명화 처리]
보고서·논문에 인용되는 모든 데이터는 참여자 식별이 불가능한 형태로 가공됩니다. 참여자 코드(예: P001)로만 표기하며, 이름·국적·연락처 등은 공개되지 않습니다.

[참여자 권리]
- 언제든 참여를 철회할 수 있습니다 (운영자에게 연락).
- 본인 데이터 열람·삭제 요청이 가능합니다.

[연구자 연락처]
운영자에게 직접 문의해 주세요.

위 내용을 충분히 이해했으며, 시험운영에 참여하는 것에 동의합니다.`

export const CONSENT_TEXT_EN = `Pilot Study Consent for Korean Speaking AI

This pilot is conducted to validate the effectiveness of the Korean Speaking AI system (KDLI Korean MVP). Data collected will be used for academic research and KDLI reporting.

[Data Collected]
- Learning activity: practice mode, session start/end times
- Speech data: audio recordings, transcribed text, NPC responses
- Assessment scores: pronunciation/fluency/grammar/vocabulary scores and feedback
- Tool-use logs: system tool usage (search, weather, address)
- Technical info: IP address at consent time (anonymized — first /24 prefix only) and user agent

[Use of Data]
- Academic research (papers, presentations)
- KDLI reporting
- System improvement

[Retention]
Data retained for 2 years after the study ends. All identifying information is deleted at the end of the retention period.

[Anonymization]
All published data uses participant codes (e.g., P001) only. Names, nationality, and contact info are never disclosed.

[Participant Rights]
- You may withdraw at any time (contact the operator).
- You may request access to or deletion of your own data.

[Researcher Contact]
Please contact the operator directly.

I have understood the above and consent to participating in this pilot study.`

export type ConsentLocale = 'ko' | 'en'
