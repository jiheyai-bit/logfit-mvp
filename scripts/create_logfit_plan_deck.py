from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'docs' / 'LogFit_2.0_1차기획안.pptx'

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

BG = RGBColor(14, 27, 36)
PANEL = RGBColor(24, 43, 54)
PANEL2 = RGBColor(31, 55, 66)
TEXT = RGBColor(244, 247, 246)
MUTED = RGBColor(174, 193, 193)
TEAL = RGBColor(46, 211, 183)
ORANGE = RGBColor(255, 138, 101)
YELLOW = RGBColor(245, 202, 92)
RED = RGBColor(255, 105, 105)
WHITE = RGBColor(255, 255, 255)


def set_bg(slide, color=BG):
    fill = slide.background.fill
    fill.solid(); fill.fore_color.rgb = color


def rect(slide, x, y, w, h, fill=PANEL, radius=False, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line or fill
    if radius:
        shape.adjustments[0] = 0.12
    return shape


def text(slide, value, x, y, w, h, size=18, color=TEXT, bold=False, align=PP_ALIGN.LEFT, font='Aptos', valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True; tf.margin_left = Pt(2); tf.margin_right = Pt(2); tf.margin_top = Pt(1); tf.margin_bottom = Pt(1); tf.vertical_anchor = valign
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = value; r.font.name = font; r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
    return box


def rich_text(slide, runs, x, y, w, h, size=18, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True; tf.margin_left = Pt(2); tf.margin_right = Pt(2)
    p = tf.paragraphs[0]; p.alignment = align
    for value, color, bold in runs:
        r = p.add_run(); r.text = value; r.font.name = 'Aptos'; r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
    return box


def title(slide, kicker, heading, sub=None):
    text(slide, kicker.upper(), 0.65, 0.38, 4.5, 0.25, 10, TEAL, True)
    text(slide, heading, 0.65, 0.72, 12.0, 0.55, 28, TEXT, True)
    if sub: text(slide, sub, 0.68, 1.33, 11.8, 0.35, 13, MUTED)


def footer(slide, num):
    text(slide, 'LOGFIT 2.0 · 1차 기획안 · 2026.11', 0.68, 7.12, 5.0, 0.18, 8, MUTED)
    text(slide, f'{num:02d}', 12.2, 7.08, 0.45, 0.2, 9, TEAL, True, PP_ALIGN.RIGHT)


def card(slide, x, y, w, h, heading, body, accent=TEAL, body_size=14):
    rect(slide, x, y, w, h, PANEL, True)
    rect(slide, x, y, 0.07, h, accent)
    text(slide, heading, x+0.22, y+0.18, w-0.42, 0.28, 15, TEXT, True)
    text(slide, body, x+0.22, y+0.58, w-0.42, h-0.72, body_size, MUTED)


def add_slide(kicker, heading, sub=None):
    slide = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(slide); title(slide, kicker, heading, sub); footer(slide, len(prs.slides)); return slide

# 1 cover
s = prs.slides.add_slide(prs.slide_layouts[6]); set_bg(s)
rect(s, 0, 0, 13.333, 7.5, BG)
rect(s, 0, 0, 13.333, 0.16, TEAL)
text(s, 'LOGFIT', 0.75, 0.72, 2.0, 0.4, 18, TEAL, True)
text(s, '개인 Wellness Agent', 0.78, 1.78, 8.0, 0.45, 20, MUTED)
text(s, '기록을 기다리는 앱에서\n먼저 도와주는 코치로', 0.75, 2.3, 9.4, 1.55, 38, TEXT, True)
text(s, 'LogFit 2.0 · 1차 기획안', 0.8, 4.35, 5, 0.35, 18, ORANGE, True)
text(s, '날씨 제안 · Telegram 선제 알림 · 완료 기록 · 주간 루틴 관리 · Google Calendar 시간 추천', 0.8, 4.85, 10.5, 0.35, 14, MUTED)
rect(s, 9.55, 1.55, 2.7, 4.2, PANEL, True)
text(s, '05:30', 9.85, 1.95, 2.1, 0.5, 30, TEAL, True, PP_ALIGN.CENTER)
text(s, '오늘의 조건', 9.9, 2.55, 2.0, 0.3, 13, MUTED, False, PP_ALIGN.CENTER)
text(s, '기온 12℃\n강수확률 10%\n바람 9km/h', 9.9, 3.1, 2.0, 1.0, 16, TEXT, True, PP_ALIGN.CENTER)
text(s, '한강 5km\n러닝을 제안해요', 9.85, 4.55, 2.1, 0.7, 16, ORANGE, True, PP_ALIGN.CENTER)
text(s, '2026.11 · 1차 검토용', 0.8, 6.85, 4, 0.25, 10, MUTED)

# 2 executive
s=add_slide('01 · 방향', 'LogFit 2.0의 한 문장', '기록을 놓친 뒤 분석하는 앱이 아니라, 행동 전에 도와주는 개인 Agent')
card(s,0.7,2.05,3.8,2.25,'기존 MVP','자연어 기록\n저장 전 확인\n일간·주간 리포트',ORANGE,16)
text(s,'→',4.75,2.75,0.7,0.5,28,TEAL,True,PP_ALIGN.CENTER)
card(s,5.35,2.05,3.8,2.25,'LogFit 2.0','미래 운동 계획 이해\n날씨·캘린더 맥락 반영\nTelegram 선제 알림',TEAL,16)
text(s,'→',9.4,2.75,0.7,0.5,28,TEAL,True,PP_ALIGN.CENTER)
card(s,10.0,2.05,2.65,2.25,'검증 가능한 변화','수용률\n완료율\n루틴 지속률',YELLOW,15)
rect(s,0.7,4.8,11.95,1.2,PANEL2,True)
text(s,'핵심 성공 기준',0.98,5.08,1.8,0.25,12,TEAL,True)
text(s,'“알림을 보냈다”가 아니라 “Agent 개입 뒤 실제 운동 행동이 달라졌는가”를 측정한다.',2.55,5.02,9.5,0.4,20,TEXT,True)

# 3 user problem
s=add_slide('02 · 문제', '사용자가 LogFit을 필요로 하는 순간','바빠서 기록을 놓치는 순간, 운동 계획이 실제 행동으로 이어지지 않는 순간')
card(s,0.7,2.0,3.85,3.2,'상황 A · 기록 누락','“오늘 운동했는데 일지를 못 썼어.”\n\n기록 입력의 부담이 커질수록 데이터가 비고, 빈 데이터는 분석 품질을 떨어뜨린다.',ORANGE,15)
card(s,4.75,2.0,3.85,3.2,'상황 B · 계획 이탈','“오늘 저녁에 요가할 거야.”\n\n계획은 있지만 시간이 불명확하거나, 알림이 없으면 실행되지 않는다.',TEAL,15)
card(s,8.8,2.0,3.85,3.2,'상황 C · 피드백 부재','“이번 주에 운동을 몇 번 했지?”\n\n기록·알림·완료 확인이 분리되면 루틴 변화가 보이지 않는다.',YELLOW,15)

# 4 principles
s=add_slide('03 · 제품 원칙','Agent가 지켜야 할 5가지 원칙')
principles=[('01','먼저 확인','시간이 불명확하면 임의 확정하지 않는다.'),('02','먼저 제안','날씨·캘린더를 근거로 선택지를 제시한다.'),('03','승인 경계','사용자 승인 전에는 일정·알림을 등록하지 않는다.'),('04','실행 후 확인','완료 응답 전에는 운동량에 포함하지 않는다.'),('05','근거 기반','측정된 기록·추정치·외부 맥락을 구분한다.')]
for i,(n,h,b) in enumerate(principles):
    x=0.75+(i%3)*4.1; y=1.95+(i//3)*2.15
    rect(s,x,y,3.55,1.55,PANEL,True); text(s,n,x+0.2,y+0.18,0.5,0.25,14,TEAL,True); text(s,h,x+0.85,y+0.17,2.35,0.28,16,TEXT,True); text(s,b,x+0.2,y+0.67,3.05,0.58,12,MUTED)

# 5 current status
s=add_slide('04 · 현재 구현','현재까지 실제로 동작하는 범위','코드·테스트·실제 Telegram 수신까지 확인된 상태')
card(s,0.7,1.9,3.75,3.95,'완료 · LogFit','자연어 식사·운동 기록\n미래 운동 계획 분류\n계획 확인·승인\n완료 메시지 파싱\n거리·페이스 저장\n중복 기록 방지',TEAL,14)
card(s,4.8,1.9,3.75,3.95,'완료 · Agent','Open-Meteo 날씨 조회\n05:30 Telegram 알림\n흐린 날 실내 운동 제안\n05:40·05:50 무응답 후속\n주 3회 목표 push\nGateway Hook 수신',ORANGE,14)
card(s,8.9,1.9,3.75,3.95,'완료 · 운영','dev standalone Gateway\nTelegram polling 정상\nCron doctor 정상\nGoogle OAuth 재인증\nCalendar 읽기 API 준비\n기존 회귀 테스트 통과',YELLOW,14)
text(s,'주의: Git commit·push는 아직 하지 않음',0.75,6.25,6,0.3,13,RED,True)

# 6 journey
s=add_slide('05 · 사용자 흐름','하루의 Agent 경험','한 번의 알림이 기록·완료·리포트로 이어지는 최소 완결 루프')
steps=[('05:30','날씨 확인','한강 조건이 좋으면 러닝 제안'),('05:40','무응답 1차','응답이 없을 때만 후속 알림'),('05:50','무응답 2차','여전히 무응답일 때만 마지막 알림'),('운동 후','완료 메시지','5km·평균 페이스 추출'),('주간','루틴 분석','주 3회 달성 여부와 다음 행동 제안')]
for i,(t,h,b) in enumerate(steps):
    x=0.75+i*2.48
    rect(s,x,2.25,2.12,2.5,PANEL,True)
    text(s,t,x+0.15,2.52,1.82,0.35,18,TEAL,True,PP_ALIGN.CENTER)
    text(s,h,x+0.15,3.1,1.82,0.32,15,TEXT,True,PP_ALIGN.CENTER)
    text(s,b,x+0.2,3.7,1.72,0.72,11,MUTED,False,PP_ALIGN.CENTER)
    if i<4: text(s,'→',x+2.18,3.2,0.3,0.3,18,ORANGE,True,PP_ALIGN.CENTER)

# 7 weather rules
s=add_slide('06 · 날씨 정책','날씨는 결정을 대신하지 않고 선택지를 만든다')
card(s,0.75,2.0,3.7,2.5,'야외 러닝 제안','기온 5~25℃\n강수확률 30% 이하\n비·눈 없음\n풍속 25km/h 이하',TEAL,17)
card(s,4.82,2.0,3.7,2.5,'흐린 날 제안','구름량 70% 이상\n\n야외 러닝 대신\n실내 근력운동·요가 제안',YELLOW,17)
card(s,8.89,2.0,3.7,2.5,'알림 생략','비·눈·강풍\n기온 기준 미달\n날씨 API 실패\n\n운동 불가를 단정하지 않음',RED,16)
text(s,'현재 위치: 한강 여의도 인근 · 데이터 출처: Open-Meteo · 모든 수치는 추정·예보 정보',0.78,5.35,11,0.28,11,MUTED)

# 8 telegram
s=add_slide('07 · Telegram','Telegram은 알림 채널이면서 완료 입력 채널이다')
rect(s,0.75,1.9,5.0,3.8,PANEL,True)
text(s,'LogFit Coach',1.05,2.2,2.4,0.3,17,TEAL,True)
text(s,'오늘 한강 5km 러닝 조건이 좋아요.\n기온 12℃ · 강수확률 10%\n\n컨디션이 괜찮다면\n한강 5km 공복 유산소를 해보세요.',1.05,2.8,4.2,1.55,17,TEXT,False)
text(s,'[ 완료 후 자연어 응답 ]',1.05,4.75,3.5,0.3,12,MUTED,True)
rect(s,6.2,1.9,6.45,3.8,PANEL,True)
text(s,'사용자 입력',6.55,2.25,2.2,0.28,13,ORANGE,True)
text(s,'5km 공복 유산소 완료,\n평균 1km 6분 40초',6.55,2.75,5.4,0.75,24,TEXT,True)
text(s,'자동 추출',6.55,3.85,2.2,0.28,13,TEAL,True)
text(s,'거리 5km  ·  평균 페이스 6:40/km\n총 운동 시간 약 33.33분\n완료 상태 → 주간 리포트 반영',6.55,4.3,5.6,0.8,16,MUTED)

# 9 architecture
s=add_slide('08 · 아키텍처','현재 권장 시스템 구조','Telegram은 Hermes가 단독으로 polling하고, LogFit은 Gateway Hook으로 수신 이벤트를 받는다')
boxes=[('Google Calendar','읽기 전용\n바쁜 시간'),('Open-Meteo','날씨 예보\n강수·구름·바람'),('Hermes Cron','05:30 / 05:40 / 05:50\n주간 목표'),('Telegram Gateway','Bot polling\n사용자 메시지'),('Gateway Hook','agent:start\n완료 문장 감지'),('LogFit Bridge','로컬 JSON 상태\nrecords / events'),('LogFit Web','대시보드\n일간·주간 리포트')]
coords=[(0.7,1.9),(0.7,3.4),(3.6,1.9),(3.6,3.4),(6.5,3.4),(9.4,3.4),(9.4,1.9)]
for (h,b),(x,y) in zip(boxes,coords):
    rect(s,x,y,2.35,1.0,PANEL,True); text(s,h,x+0.12,y+0.15,2.1,0.25,14,TEAL,True,PP_ALIGN.CENTER); text(s,b,x+0.12,y+0.48,2.1,0.35,10,MUTED,False,PP_ALIGN.CENTER)
text(s,'→',3.0,2.23,0.35,0.3,20,ORANGE,True,PP_ALIGN.CENTER); text(s,'→',5.9,3.73,0.35,0.3,20,ORANGE,True,PP_ALIGN.CENTER); text(s,'→',8.8,3.73,0.35,0.3,20,ORANGE,True,PP_ALIGN.CENTER); text(s,'→',10.55,3.05,0.35,0.3,20,ORANGE,True,PP_ALIGN.CENTER)
text(s,'원칙: Telegram Bot Token은 브라우저·Git·LogFit 코드에 넣지 않는다.',0.75,5.35,10,0.3,13,RED,True)

# 10 data model
s=add_slide('09 · 데이터','기록과 계획과 개입 이벤트를 분리한다')
card(s,0.7,1.9,3.8,3.9,'schedule · 계획','schedule_id\nplanned_start_at\nreminder_at\nstatus\ncron_job_id\nnotification_status\nlinked_record_id',TEAL,14)
card(s,4.78,1.9,3.8,3.9,'record · 실제 운동','record_id\nactivity_name\nrecord_date\ndistance_km\npace_sec_per_km\nduration_min\ncompletion = completed',ORANGE,14)
card(s,8.86,1.9,3.8,3.9,'event · Agent 개입','suggestion_shown\nweather_alert_sent\ntelegram_message\nfollowup_sent\ncompletion_confirmed\noccured_at · metadata',YELLOW,14)
text(s,'완료 확인 전에는 record를 만들지 않는다. 같은 schedule·같은 메시지는 idempotent(중복 실행에도 결과 1건)하게 저장한다.',0.75,6.25,12,0.3,12,MUTED)

# 11 calendar
s=add_slide('10 · Google Calendar','캘린더는 업무 알림이 아니라 운동 가능 시간 계산용이다')
rect(s,0.75,1.9,4.4,3.75,PANEL,True)
text(s,'오늘 일정',1.05,2.22,2.0,0.28,15,TEAL,True)
text(s,'18:00~19:00 회의\n19:00~19:30 이동\n\n캘린더 상세 내용은 저장하지 않음',1.05,2.75,3.6,1.1,18,TEXT)
rect(s,6.0,1.9,6.65,3.75,PANEL,True)
text(s,'운동 가능 시간',6.35,2.22,2.2,0.28,15,ORANGE,True)
text(s,'05:30~06:00\n05:45~06:15\n19:45~20:15\n20:00~20:30',6.35,2.75,3.4,1.35,24,TEXT,True)
text(s,'→ 날씨 조건과 결합해 최종 제안',6.35,4.65,4.9,0.3,14,MUTED)
text(s,'현재 Google OAuth 재인증·실제 조회 성공 · 오늘 일정 0건 · 읽기 전용',0.78,6.05,9,0.28,11,MUTED)

# 12 metrics
s=add_slide('11 · 평가','Agent가 개입해서 달라진 것을 측정한다')
metrics=[('제안 수용률','수락한 제안 / 노출한 제안'),('완료율','완료 확인 / 승인 일정'),('알림 반응률','응답 / 발송 성공'),('주간 지속률','완료 조깅 / 목표 3회'),('개입 효과','개입 후 완료율 - 기준선'),('알림 피로도','무시·거절 / 전체 알림')]
for i,(h,b) in enumerate(metrics):
    x=0.75+(i%3)*4.1; y=1.95+(i//3)*2.0
    rect(s,x,y,3.55,1.45,PANEL,True); text(s,h,x+0.2,y+0.2,3.1,0.3,17,TEAL if i<3 else ORANGE,True); text(s,b,x+0.2,y+0.78,3.05,0.35,13,MUTED)
text(s,'비교 기준: Agent 개입 전 2주 vs 개입 후 4주 · 단일 사용자 결과는 제품 가설 검증용으로 해석',0.75,6.2,11.5,0.3,12,MUTED)

# 13 scope
s=add_slide('12 · 범위','목요일까지의 MVP와 이후 확장')
card(s,0.75,1.9,5.65,3.8,'이번 단계 · 구현 완료/검증 중','날씨 기반 러닝·실내 제안\nTelegram 05:30 알림\n무응답 05:40·05:50\n완료 메시지 → 운동 기록\n주 3회 조깅 목표\nGoogle Calendar 읽기 전용',TEAL,16)
card(s,6.9,1.9,5.65,3.8,'다음 단계 · 2차 검토 이후','운동 일정과 Calendar 이벤트 연결\n캘린더 기반 날씨 시간 추천\n알림 수용률 대시보드\n알림 시간 개인화\n주간 회고·루틴 재설계\n더 많은 운동 종류',ORANGE,16)

# 14 risks
s=add_slide('13 · 위험·경계','건강 제품으로서 지켜야 할 경계')
risks=[('공복 운동','권장·진단하지 않음\n컨디션·수분 섭취 확인'),('날씨','가능·불가능 단정 금지\n예보 기반 제안'),('데이터','실제·샘플·추정치 구분\n출처와 갱신 시각 표시'),('알림','무응답 후 2회까지만\n응답 시 즉시 중단'),('개인정보','캘린더 상세 저장 금지\n토큰은 Hermes에만 보관')]
for i,(h,b) in enumerate(risks):
    x=0.75+i*2.48; rect(s,x,2.1,2.15,3.1,PANEL,True); text(s,h,x+0.15,2.42,1.85,0.35,15,YELLOW if i in (0,1) else TEAL,True,PP_ALIGN.CENTER); text(s,b,x+0.18,3.15,1.78,1.1,13,MUTED,False,PP_ALIGN.CENTER)

# 15 demo acceptance
s=add_slide('14 · 검증','발표 데모 시나리오')
items=[('1','05:30','날씨가 좋은 날 Telegram 러닝 제안 수신'),('2','응답 없음','05:40 후속 → 05:50 후속, 응답하면 중단'),('3','완료 입력','“5km 공복 유산소 완료, 평균 1km 6분 40초”'),('4','LogFit','거리·페이스·시간이 실제 운동 기록으로 표시'),('5','주간','완료 2회면 월요일에 “1회 더” push'),('6','Calendar','바쁜 시간을 제외한 운동 가능 시간 확인')]
for i,(n,t,b) in enumerate(items):
    y=1.75+i*0.78; rect(s,0.85,y,0.55,0.48,TEAL,True); text(s,n,0.85,y+0.09,0.55,0.25,16,BG,True,PP_ALIGN.CENTER); text(s,t,1.65,y+0.08,1.5,0.26,14,ORANGE,True); text(s,b,3.15,y+0.08,8.8,0.3,15,TEXT)

# 16 decisions
s=add_slide('15 · 1차 검토','2차 검토에서 결정할 것','이번 기획안은 구현 내역과 다음 제품 결정을 분리해 검토한다')
card(s,0.75,1.9,3.75,3.75,'제품 결정','주 3회 목표가 적절한가?\n무응답 2회가 부담스럽지 않은가?\n흐린 날 실내 제안이 유용한가?',TEAL,15)
card(s,4.8,1.9,3.75,3.75,'정책 결정','운동 가능 날씨 기준\n캘린더 여유 시간·버퍼\n캘린더 상세 정보 최소화 범위',ORANGE,15)
card(s,8.85,1.9,3.75,3.75,'발표 결정','어떤 사용자 여정 시연?\n실제 Telegram 수신 증빙?\nAgent 개입 효과 지표를 어디까지 공개?',YELLOW,15)
text(s,'검토 후 2차 기획안에서 범위·정책·데모 시나리오를 확정합니다.',0.78,6.25,11,0.3,16,TEXT,True)

# save
OUT.parent.mkdir(parents=True, exist_ok=True)
prs.save(str(OUT))
print(OUT)
print('slides=', len(prs.slides))
